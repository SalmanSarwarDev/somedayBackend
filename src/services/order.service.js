const mongoose = require('mongoose');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const Cart    = require('../models/Cart');
const { refundPayment } = require('./payment.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/** Generate a human-readable, sortable order number: ORD-YYYYMMDD-XXXX */
const generateOrderNumber = () => {
  const date    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random  = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${date}-${random}`;
};

/** Statuses from which a user may cancel */
const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed']);

// ---------------------------------------------------------------------------
// Order creation (with transaction where available)
// ---------------------------------------------------------------------------

/**
 * Place an order.
 *
 * Strategy:
 *  1. Re-fetch prices from the Product collection — never trust frontend prices.
 *  2. Deduct stock atomically using `findOneAndUpdate` with a `$gte` guard.
 *  3. If any stock deduction fails (insufficient stock), roll back already-
 *     deducted items and abort.
 *  4. Create the Order document.
 *  5. Clear the user's cart.
 *
 * MongoDB transactions require a replica set. When running standalone (dev),
 * we fall back to a manual compensation pattern. The code detects the
 * availability of transactions at runtime.
 */
const createOrder = async (userId, input = {}) => {
  const { items, shippingAddress, notes } = input;

  // --- Validate items input ---
  if (!Array.isArray(items) || items.length === 0) {
    throw createError('items must be a non-empty array', 400);
  }

  const parsedItems = items.map((item, idx) => {
    const productId = item.productId || item.product;
    if (!productId) throw createError(`items[${idx}].productId is required`, 400);
    const qty = parseInt(item.quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      throw createError(`items[${idx}].quantity must be a positive integer`, 400);
    }
    return { productId: String(productId), quantity: qty };
  });

  // Guard against duplicate productIds in the same order
  const uniqueIds = new Set(parsedItems.map((i) => i.productId));
  if (uniqueIds.size !== parsedItems.length) {
    throw createError('Duplicate productId entries in order items are not allowed', 400);
  }

  // --- Fetch products & validate ---
  const productDocs = await Product.find({
    _id:      { $in: [...uniqueIds] },
    isActive: true,
  });

  if (productDocs.length !== uniqueIds.size) {
    const foundIds = new Set(productDocs.map((p) => String(p._id)));
    const missing  = [...uniqueIds].filter((id) => !foundIds.has(id));
    throw createError(`Product(s) not found or unavailable: ${missing.join(', ')}`, 404);
  }

  const productMap = new Map(productDocs.map((p) => [String(p._id), p]));

  // Build order line items using server-authoritative prices
  let subtotalInCents = 0;
  const orderItems = [];

  for (const { productId, quantity } of parsedItems) {
    const product = productMap.get(productId);
    if (product.stock < quantity) {
      throw createError(
        `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${quantity}.`,
        409
      );
    }
    const lineTotalInCents = product.priceInCents * quantity;
    subtotalInCents += lineTotalInCents;
    orderItems.push({
      product:         product._id,
      name:            product.name,
      priceInCents:    product.priceInCents,
      quantity,
      lineTotalInCents,
    });
  }

  const totalInCents = subtotalInCents; // shipping/tax/discount reserved for later

  // ---------------------------------------------------------------------------
  // Try to use a Mongoose session (replica set), fall back to manual
  // ---------------------------------------------------------------------------

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (_err) {
    // Standalone MongoDB — session not available
    session = null;
  }

  const deductedItems = []; // For compensation if no transaction support

  const run = async (sess) => {
    // --- Atomically deduct stock for each item ---
    for (const { productId, quantity } of parsedItems) {
      const result = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, ...(sess ? { session: sess } : {}) }
      );
      if (!result) {
        throw createError(
          `Insufficient stock for "${productMap.get(productId).name}" (concurrent update detected)`,
          409
        );
      }
      deductedItems.push({ productId, quantity });
    }

    // --- Create Order ---
    const orderData = {
      user:     userId,
      orderNumber: generateOrderNumber(),
      items:    orderItems,
      subtotalInCents,
      totalInCents,
      status:   'pending',
      shippingAddress: shippingAddress && typeof shippingAddress === 'object'
        ? shippingAddress
        : {},
      notes: typeof notes === 'string' ? notes.trim() : '',
    };

    const [order] = sess
      ? await Order.create([orderData], { session: sess })
      : [await Order.create(orderData)];

    // --- Clear the cart ---
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { ...(sess ? { session: sess } : {}) }
    );

    return order;
  };

  if (session) {
    // Transaction path
    let order;
    try {
      session.startTransaction();
      order = await run(session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    return order.toJSON();
  } else {
    // Compensation path (standalone MongoDB)
    try {
      const order = await run(null);
      return order.toJSON();
    } catch (error) {
      // Restore stock for items already deducted before the failure
      if (deductedItems.length) {
        await Promise.allSettled(
          deductedItems.map(({ productId, quantity }) =>
            Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } })
          )
        );
      }
      throw error;
    }
  }
};

// ---------------------------------------------------------------------------
// Order history / details
// ---------------------------------------------------------------------------

const listOrders = async (userId, query = {}) => {
  const { status, page = 1, limit = 20 } = query;

  const filter = { user: userId };
  if (status) filter.status = status;

  const resolvedPage  = Math.max(1, parseInt(page,  10) || 1);
  const resolvedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (resolvedPage - 1) * resolvedLimit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resolvedLimit),
    Order.countDocuments(filter),
  ]);

  return {
    orders: orders.map((o) => o.toJSON()),
    pagination: {
      total,
      page:  resolvedPage,
      limit: resolvedLimit,
      totalPages:  Math.ceil(total / resolvedLimit),
      hasNextPage: resolvedPage * resolvedLimit < total,
      hasPrevPage: resolvedPage > 1,
    },
  };
};

const getOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw createError('Order not found', 404);
  return order.toJSON();
};

// ---------------------------------------------------------------------------
// Cancellation with stock restoration guard
// ---------------------------------------------------------------------------

/**
 * Cancel an order.
 *
 * Uses `findOneAndUpdate` with a compound filter that ensures:
 *  1. The order belongs to the authenticated user.
 *  2. The order is in a cancellable status.
 *  3. `stockRestored` is still false (prevents duplicate restoration).
 *
 * This makes the operation idempotent — a second concurrent cancel
 * will find no matching document and receive a clear error.
 */
const cancelOrder = async (userId, orderId, { reason } = {}) => {
  // First confirm the order exists and belongs to the user
  const order = await Order.findOne({ _id: orderId, user: userId }).select('+stockRestored');
  if (!order) throw createError('Order not found', 404);

  if (!CANCELLABLE_STATUSES.has(order.status)) {
    throw createError(
      `Order cannot be cancelled in its current status: "${order.status}". Only pending or confirmed orders can be cancelled.`,
      409
    );
  }

  if (order.stockRestored) {
    throw createError('Order has already been cancelled', 409);
  }

  // Atomically mark stockRestored = true while confirming it was false
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, user: userId, stockRestored: false },
    {
      $set: {
        status:              'cancelled',
        stockRestored:       true,
        cancelledAt:         new Date(),
        cancellationReason:  typeof reason === 'string' ? reason.trim() : '',
      },
    },
    { new: true }
  );

  if (!updated) {
    // Another concurrent request beat us to it
    throw createError('Order has already been cancelled', 409);
  }

  // Restore stock for each line item
  await Promise.allSettled(
    updated.items.map(({ product, quantity }) =>
      Product.findByIdAndUpdate(product, { $inc: { stock: quantity } })
    )
  );

  // If the order was paid, issue a Stripe refund automatically
  try {
    await refundPayment(orderId, typeof reason === 'string' ? reason.trim() : '');
  } catch (refundError) {
    // Log but don't fail the cancellation — refund can be retried manually
    console.error(`Refund failed for order ${orderId}:`, refundError.message);
  }

  return updated.toJSON();
};

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  cancelOrder,
};

