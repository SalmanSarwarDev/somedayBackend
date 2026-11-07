const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  createOrderHandler,
  getOrdersHandler,
  getOrderHandler,
  cancelOrderHandler,
} = require('../controllers/order.controller');

const router = express.Router();

// All order endpoints require authentication
router.use(requireAuth);

router.post('/',              createOrderHandler);
router.get('/',               getOrdersHandler);
router.get('/:id',            getOrderHandler);
router.patch('/:id/cancel',   cancelOrderHandler);

module.exports = router;

