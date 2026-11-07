const {
  createPaymentIntent,
  getPaymentByOrder,
  handleWebhook,
} = require('../services/payment.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Payment controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
};

/**
 * POST /api/payments/orders/:orderId/intent
 *
 * Creates (or retrieves an existing) PaymentIntent for the given order.
 * Returns `clientSecret` which the frontend passes to stripe.confirmCardPayment().
 */
const createIntent = async (req, res) => {
  try {
    const result = await createPaymentIntent(req.userId, req.params.orderId);
    return res.status(result.isExisting ? 200 : 201).json({
      succeeded: true,
      message: result.isExisting
        ? 'Existing PaymentIntent retrieved'
        : 'PaymentIntent created successfully',
      data: { payment: result },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * GET /api/payments/orders/:orderId
 *
 * Returns the current payment record for an order (status, card info, refund, etc.)
 */
const getPayment = async (req, res) => {
  try {
    const payment = await getPaymentByOrder(req.userId, req.params.orderId);
    return res.json({
      succeeded: true,
      message: 'Payment retrieved successfully',
      data: { payment },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/**
 * POST /api/payments/webhook
 *
 * Stripe webhook endpoint. Must use raw body parser (not JSON).
 * Verifies Stripe-Signature header before processing.
 */
const webhookHandler = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  console.log('\n🔔 [Webhook Incoming] Received request on /api/payments/webhook');

  if (!signature) {
    console.error('❌ [Webhook Error] Missing Stripe-Signature header');
    return res.status(400).json({ succeeded: false, message: 'Missing Stripe-Signature header' });
  }

  try {
    const result = await handleWebhook(req.body, signature);
    // Always return 200 to Stripe — retries happen on non-2xx responses
    return res.json({ succeeded: true, ...result });
  } catch (error) {
    const status = error.status || 500;
    console.error(`❌ [Webhook Error] ${error.message}`);
    return res.status(status).json({ succeeded: false, message: error.message });
  }
};

module.exports = {
  createIntent,
  getPayment,
  webhookHandler,
};

