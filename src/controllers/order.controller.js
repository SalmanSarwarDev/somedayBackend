const {
  createOrder,
  listOrders,
  getOrder,
  cancelOrder,
} = require('../services/order.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Order controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
};

const createOrderHandler = async (req, res) => {
  try {
    const order = await createOrder(req.userId, req.body);
    return res.status(201).json({
      succeeded: true,
      message: 'Order placed successfully',
      data: { order },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getOrdersHandler = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await listOrders(req.userId, { status, page, limit });
    return res.json({
      succeeded: true,
      message: 'Orders retrieved successfully',
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getOrderHandler = async (req, res) => {
  try {
    const order = await getOrder(req.userId, req.params.id);
    return res.json({
      succeeded: true,
      message: 'Order retrieved successfully',
      data: { order },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const cancelOrderHandler = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const order = await cancelOrder(req.userId, req.params.id, { reason });
    return res.json({
      succeeded: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  createOrderHandler,
  getOrdersHandler,
  getOrderHandler,
  cancelOrderHandler,
};

