const stripe = require('../config/stripe');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/** Map a Stripe PaymentIntent status to our internal Payment status */
const mapStripeStatus = (stripeStatus) => {
  const map = {
    requires_payment_method: 'requires_payment_method',
    requires_confirmation: 'requires_confirmation',
    requires_action: 'requires_action',
    processing: 'processing',
    succeeded: 'succeeded',
    canceled: 'cancelled', // Stripe spells it 'canceled' (one 'l')
  };
  return map[stripeStatus] || stripeStatus;
};

// ---------------------------------------------------------------------------
// Create PaymentIntent for an order
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe PaymentIntent for the given order.
 *
 * Rules:
 * - Order must belong to the requesting user.
 * - Order must be in 'pending' status (not yet paid or cancelled).
 * - Only one Payment record per Order (idempotency: if one already exists
 *   and is not in a terminal state, return the existing client_secret).
 *
 * Returns the `clientSecret` the frontend passes to `stripe.confirmCardPayment()`.
 */
const createPaymentIntent = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw createError('Order not found', 404);

  if (order.status === 'cancelled') {
    throw createError('Cannot pay for a cancelled order', 409);
  }
  if (order.status === 'delivered') {
    throw createError('This order has already been delivered', 409);
  }

  // Idempotency: return existing PaymentIntent if already created and not terminal
  const existing = await Payment.findOne({ order: orderId }).select('+stripeClientSecret');
  if (existing) {
    if (existing.status === 'succeeded') {
      throw createError('Payment for this order has already been completed', 409);
    }
    if (['cancelled', 'failed'].includes(existing.status)) {
      throw createError(
        `Payment is in a terminal state (${existing.status}). Please contact support.`,
        409
      );
    }
    // Return the existing client_secret — Stripe client can re-confirm it
    return {
      clientSecret: existing.stripeClientSecret,
      paymentIntentId: existing.stripePaymentIntentId,
      amountInCents: existing.amountInCents,
      amount: existing.amountInCents / 100,
      currency: existing.currency,
      status: existing.status,
      isExisting: true,
    };
  }

  const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

  // Create the PaymentIntent on Stripe
  const intent = await stripe.paymentIntents.create({
    amount: order.totalInCents,
    currency,
    metadata: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      userId: String(userId),
    },
    // Automatically confirm with payment_method from frontend
    automatic_payment_methods: { enabled: true },
  });

  // Persist to our database
  const payment = await Payment.create({
    order: order._id,
    user: userId,
    stripePaymentIntentId: intent.id,
    stripeClientSecret: intent.client_secret,
    amountInCents: order.totalInCents,
    currency,
    status: mapStripeStatus(intent.status),
    stripeMetadata: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    },
  });

  return {
    clientSecret: payment.stripeClientSecret,
    paymentIntentId: intent.id,
    amountInCents: payment.amountInCents,
    amount: payment.amountInCents / 100,
    currency: payment.currency,
    status: payment.status,
    isExisting: false,
  };
};

// ---------------------------------------------------------------------------
// Get payment status for an order
// ---------------------------------------------------------------------------

const getPaymentByOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw createError('Order not found', 404);

  const payment = await Payment.findOne({ order: orderId });
  if (!payment) throw createError('No payment has been initiated for this order', 404);

  // Auto-sync with Stripe if not yet succeeded.
  // This ensures localhost development works seamlessly even when Stripe
  // webhooks cannot reach localhost without a tunnel.
  if (payment.status !== 'succeeded') {
    try {
      const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      if (intent && intent.status === 'succeeded') {
        const charge = intent.latest_charge;
        let cardLast4 = '';
        let cardBrand = '';
        const paymentMethod = intent.payment_method_types?.[0] || 'card';

        if (charge && typeof charge === 'object') {
          cardLast4 = charge.payment_method_details?.card?.last4 || '';
          cardBrand = charge.payment_method_details?.card?.brand || '';
        }

        payment.status = 'succeeded';
        payment.paidAt = new Date();
        payment.cardLast4 = cardLast4;
        payment.cardBrand = cardBrand;
        payment.paymentMethod = paymentMethod;
        payment.lastWebhookEvent = 'client_sync';
        await payment.save();

        await Order.findByIdAndUpdate(orderId, { $set: { status: 'confirmed' } });
      }
    } catch (_syncErr) {
      // If Stripe retrieve fails, return existing payment without crashing
    }
  }

  return payment.toJSON();
};

// ---------------------------------------------------------------------------
// Webhook handler — called by Stripe to notify us of payment events
// ---------------------------------------------------------------------------

/**
 * Handles Stripe webhook events.
 *
 * IMPORTANT: This function receives the RAW request body (Buffer) so Stripe
 * can verify the webhook signature. The route that calls this must use
 * `express.raw()` middleware instead of `express.json()`.
 *
 * Events handled:
 *  - payment_intent.succeeded       → mark payment succeeded, order confirmed
 *  - payment_intent.payment_failed  → mark payment failed
 *  - payment_intent.canceled        → mark payment cancelled
 *  - charge.refunded                → mark payment refunded
 */
const handleWebhook = async (rawBody, signature) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ [Stripe Webhook] STRIPE_WEBHOOK_SECRET is missing from environment');
    throw createError('STRIPE_WEBHOOK_SECRET is not configured', 500);
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ [Stripe Webhook] Signature verification failed: ${err.message}`);
    throw createError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  const { type, data } = event;
  const object = data.object;

  console.log(`⚡ [Stripe Webhook] Event verified: ${type} (ID: ${event.id})`);

  // -------------------------------------------------------------------------
  // payment_intent.succeeded
  // -------------------------------------------------------------------------
  if (type === 'payment_intent.succeeded') {
    const payment = await Payment.findOne({ stripePaymentIntentId: object.id });
    if (!payment) {
      console.warn(`⚠️ [Stripe Webhook] No matching payment found in DB for Intent: ${object.id}`);
      return { received: true };
    }

    // Idempotency guard — skip if already processed
    if (payment.status === 'succeeded') {
      console.log(`ℹ️ [Stripe Webhook] Intent ${object.id} is already processed as succeeded.`);
      return { received: true };
    }

    // Extract card details from the latest charge
    const charge = object.latest_charge;
    let cardLast4 = '';
    let cardBrand = '';
    let paymentMethod = object.payment_method_types?.[0] || 'card';

    if (charge && typeof charge === 'object') {
      cardLast4 = charge.payment_method_details?.card?.last4 || '';
      cardBrand = charge.payment_method_details?.card?.brand || '';
    }

    await Payment.findByIdAndUpdate(payment._id, {
      $set: {
        status: 'succeeded',
        paidAt: new Date(),
        lastWebhookEvent: type,
        cardLast4,
        cardBrand,
        paymentMethod,
      },
    });

    // Advance order to 'confirmed'
    await Order.findByIdAndUpdate(payment.order, {
      $set: { status: 'confirmed' },
    });

    console.log(`💳 [Stripe Webhook] Payment marked SUCCEEDED for Order: ${payment.order}`);
    console.log(`✅ [Stripe Webhook] Order ${payment.order} status updated to CONFIRMED!`);

    return { received: true };
  }

  // -------------------------------------------------------------------------
  // payment_intent.payment_failed
  // -------------------------------------------------------------------------
  if (type === 'payment_intent.payment_failed') {
    console.warn(`❌ [Stripe Webhook] Payment failed for Intent: ${object.id}`);
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: object.id },
      { $set: { status: 'failed', lastWebhookEvent: type } }
    );
    return { received: true };
  }

  // -------------------------------------------------------------------------
  // payment_intent.canceled
  // -------------------------------------------------------------------------
  if (type === 'payment_intent.canceled') {
    console.log(`ℹ️ [Stripe Webhook] Payment cancelled for Intent: ${object.id}`);
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: object.id },
      { $set: { status: 'cancelled', lastWebhookEvent: type } }
    );
    return { received: true };
  }

  // -------------------------------------------------------------------------
  // charge.refunded
  // -------------------------------------------------------------------------
  if (type === 'charge.refunded') {
    const intentId = object.payment_intent;
    if (!intentId) return { received: true };

    const refund = object.refunds?.data?.[0];
    const refundedAmount = object.amount_refunded || 0;
    const isFullRefund = refundedAmount >= object.amount;

    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: intentId },
      {
        $set: {
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          refundedAmountInCents: refundedAmount,
          refundedAt: new Date(),
          lastWebhookEvent: type,
          ...(refund ? { refundId: refund.id } : {}),
        },
      }
    );
    console.log(`🔄 [Stripe Webhook] Refund processed for Intent: ${intentId} ($${refundedAmount / 100})`);
    return { received: true };
  }

  console.log(`ℹ️ [Stripe Webhook] Acknowledged unhandled event: ${type}`);
  return { received: true };
};

// ---------------------------------------------------------------------------
// Refund — triggered on order cancellation
// ---------------------------------------------------------------------------

/**
 * Issues a full refund for a paid order via Stripe.
 *
 * Guards:
 * - Only processes if payment status is 'succeeded'.
 * - Checks `refundId` to prevent duplicate refunds (idempotency).
 *
 * Note: This is called internally from cancelOrder in order.service.js.
 * It does NOT cancel the Stripe PaymentIntent — it issues a Refund object.
 */
const refundPayment = async (orderId, reason = '') => {
  const payment = await Payment.findOne({ order: orderId }).select('+refundId +stripeClientSecret');
  if (!payment) return null; // No payment initiated — nothing to refund

  if (payment.status !== 'succeeded') return null; // Not paid yet — nothing to refund

  // Idempotency: if refund already exists, don't create a second one
  if (payment.refundId) {
    return { alreadyRefunded: true, refundId: payment.refundId };
  }

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      orderId: String(orderId),
      cancellationReason: reason,
    },
  });

  await Payment.findByIdAndUpdate(payment._id, {
    $set: {
      status: 'refunded',
      refundId: refund.id,
      refundedAmountInCents: refund.amount,
      refundedAt: new Date(),
      refundReason: reason,
      lastWebhookEvent: 'manual_refund',
    },
  });

  return { refundId: refund.id, refundedAmountInCents: refund.amount };
};

module.exports = {
  createPaymentIntent,
  getPaymentByOrder,
  handleWebhook,
  refundPayment,
};

