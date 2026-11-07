const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  createIntent,
  getPayment,
  webhookHandler,
} = require('../controllers/payment.controller');

const router = express.Router();

// ---------------------------------------------------------------------------
// WEBHOOK — Stripe calls this endpoint.
// Raw body parsing is applied in app.js before express.json() so signature
// verification succeeds.
// ---------------------------------------------------------------------------
router.post('/webhook', webhookHandler);

// ---------------------------------------------------------------------------
// Authenticated payment routes
// ---------------------------------------------------------------------------
router.use(requireAuth);

// Create (or retrieve existing) PaymentIntent for an order
router.post('/orders/:orderId/intent', createIntent);

// Get payment status for an order
router.get('/orders/:orderId', getPayment);

module.exports = router;

