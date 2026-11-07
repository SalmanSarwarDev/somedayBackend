const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Enrich a raw cart document with live prices fetched from the Product
 * collection. This guarantees that prices are always server-authoritative.
 *
 * Returns a serialisable cart object including per-item and grand totals.
 */
const enrichCart = async (cart) => {
  if (!cart || !cart.items || cart.items.length === 0) {
    return {
      id:    cart ? String(cart._id) : null,
      user:  cart ? String(cart.user) : null,
      items: [],
      subtotalInCents: 0,
      subtotal:        0,
      itemCount:       0,
    };
  }

  // Batch-fetch all products referenced by the cart in one query
  const productIds = cart.items.map((i) => i.product);
  const products   = await Product.find({
    _id:      { $in: productIds },
    isActive: true,
  })
    .populate('category', 'name slug')
    .lean({ virtuals: false });

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let subtotalInCents = 0;
  const enrichedItems = [];

  for (const item of cart.items) {
    const pid     = String(item.product);
    const product = productMap.get(pid);

    if (!product) {
      // Product was deleted or deactivated — skip but do not crash
      continue;
    }

    const lineTotalInCents = product.priceInCents * item.quantity;
    subtotalInCents += lineTotalInCents;

    enrichedItems.push({
      product:         pid,
      name:            product.name,
      slug:            product.slug,
      brand:           product.brand,
      images:          product.images,
      category:        product.category
        ? { id: String(product.category._id), name: product.category.name, slug: product.category.slug }
        : null,
      priceInCents:    product.priceInCents,
      price:           product.priceInCents / 100,
      quantity:        item.quantity,
      stock:           product.stock,
      inStock:         product.stock >= item.quantity,
      lineTotalInCents,
      lineTotal:       lineTotalInCents / 100,
    });
  }

  return {
    id:              String(cart._id),
    user:            String(cart.user),
    items:           enrichedItems,
    subtotalInCents,
    subtotal:        subtotalInCents / 100,
    itemCount:       enrichedItems.reduce((acc, i) => acc + i.quantity, 0),
    updatedAt:       cart.updatedAt,
  };
};

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/** Get the current user's cart with live pricing */
const getCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  return enrichCart(cart);
};

/**
 * Add an item to the cart or increase its quantity.
 * Validates product existence, active status and stock before adding.
 */
const addToCart = async (userId, { productId, quantity = 1 } = {}) => {
  if (!productId) throw createError('productId is required', 400);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw createError('quantity must be a positive integer', 400);
  }

  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw createError('Product not found or is unavailable', 404);

  // Find-or-create cart
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  const existingItem = cart.items.find((i) => String(i.product) === String(productId));
  const newQty = existingItem ? existingItem.quantity + quantity : quantity;

  if (newQty > product.stock) {
    throw createError(
      `Only ${product.stock} unit(s) available. You already have ${existingItem?.quantity ?? 0} in your cart.`,
      409
    );
  }

  if (existingItem) {
    existingItem.quantity = newQty;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();
  return enrichCart(cart);
};

/**
 * Update the quantity of a specific item.
 * Setting quantity to 0 removes the item entirely.
 */
const updateCartItem = async (userId, productId, { quantity } = {}) => {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw createError('quantity must be a non-negative integer', 400);
  }

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw createError('Cart not found', 404);

  const itemIndex = cart.items.findIndex((i) => String(i.product) === String(productId));
  if (itemIndex === -1) throw createError('Item not found in cart', 404);

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) throw createError('Product not found or is unavailable', 404);
    if (quantity > product.stock) {
      throw createError(`Only ${product.stock} unit(s) available`, 409);
    }
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();
  return enrichCart(cart);
};

/** Remove a single item from the cart */
const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw createError('Cart not found', 404);

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => String(i.product) !== String(productId));

  if (cart.items.length === before) throw createError('Item not found in cart', 404);

  await cart.save();
  return enrichCart(cart);
};

/** Empty the entire cart */
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    // Nothing to clear — return empty enriched cart
    return enrichCart(null);
  }
  cart.items = [];
  await cart.save();
  return enrichCart(cart);
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

