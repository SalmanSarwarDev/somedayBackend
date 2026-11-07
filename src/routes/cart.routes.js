const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  getCartHandler,
  addToCartHandler,
  updateCartItemHandler,
  removeFromCartHandler,
  clearCartHandler,
} = require('../controllers/cart.controller');

const router = express.Router();

// All cart endpoints require authentication
router.use(requireAuth);

router.get('/', getCartHandler);
router.post('/items', addToCartHandler);
router.patch('/items/:productId', updateCartItemHandler);
router.delete('/items/:productId', removeFromCartHandler);
router.delete('/', clearCartHandler);

module.exports = router;

