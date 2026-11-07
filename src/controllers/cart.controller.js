const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../services/cart.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Cart controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
};

const getCartHandler = async (req, res) => {
  try {
    const cart = await getCart(req.userId);
    return res.json({
      succeeded: true,
      message: 'Cart retrieved successfully',
      data: { cart },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const addToCartHandler = async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    const cart = await addToCart(req.userId, { productId, quantity: parseInt(quantity, 10) || 1 });
    return res.status(201).json({
      succeeded: true,
      message: 'Item added to cart',
      data: { cart },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCartItemHandler = async (req, res) => {
  try {
    const { quantity } = req.body || {};
    const cart = await updateCartItem(req.userId, req.params.productId, {
      quantity: parseInt(quantity, 10),
    });
    return res.json({
      succeeded: true,
      message: quantity === 0 || quantity === '0' ? 'Item removed from cart' : 'Cart item updated',
      data: { cart },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const removeFromCartHandler = async (req, res) => {
  try {
    const cart = await removeFromCart(req.userId, req.params.productId);
    return res.json({
      succeeded: true,
      message: 'Item removed from cart',
      data: { cart },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const clearCartHandler = async (req, res) => {
  try {
    const cart = await clearCart(req.userId);
    return res.json({
      succeeded: true,
      message: 'Cart cleared',
      data: { cart },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getCartHandler,
  addToCartHandler,
  updateCartItemHandler,
  removeFromCartHandler,
  clearCartHandler,
};

