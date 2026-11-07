const mongoose = require('mongoose');

/**
 * Payment Model
 *
 * Tracks the full lifecycle of a Stripe PaymentIntent for each order.
 *
 * Design decisions:
 * - One Payment document per Order (1-to-1 via `order` ref + unique index).
 * - `stripePaymentIntentId` is the canonical Stripe reference for all future
 *   operations (confirm, refund, lookup).
 * - `stripeClientSecret` is stored (hashed in prod, plain in dev) so the
 *   frontend can call stripe.confirmCardPayment() even after a page refresh.
 * - `refundId` is set when a refund is issued — prevents duplicate refunds.
 * - All amounts mirror the Order's `totalInCents` and are in the smallest
 *   currency unit (cents/paisas).
 */

const PAYMENT_STATUSES = [
  'requires_payment_method', // Initial — waiting for card
  'requires_confirmation',   // Card attached, awaiting confirm
  'requires_action',         // 3D Secure / additional auth needed
  'processing',              // Stripe is processing
  'succeeded',               // Payment captured ✅
  'cancelled',               // PaymentIntent cancelled
  'refunded',                // Full refund issued
  'partially_refunded',      // Partial refund issued
  'failed',                  // Terminal failure
];

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Stripe identifiers
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // client_secret is returned to the frontend to confirm payment.
    // It is NOT sensitive on its own (it expires and requires the publishable key),
    // but select: false keeps it out of default queries.
    stripeClientSecret: {
      type: String,
      required: true,
      select: false,
    },
    stripeCustomerId: {
      type: String,
      default: '',
    },

    // Mirrors order total — stored here for quick reconciliation
    amountInCents: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'amountInCents must be an integer' },
    },
    // ISO 4217 currency code, lowercase (e.g. 'usd', 'pkr')
    currency: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'usd',
    },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'requires_payment_method',
      index: true,
    },

    // Populated from webhook / confirm response
    paymentMethod: {
      type: String,
      default: '', // e.g. 'card', 'google_pay'
    },
    // Last 4 digits of card — safe to store, useful for receipts
    cardLast4: {
      type: String,
      default: '',
    },
    cardBrand: {
      type: String,
      default: '', // e.g. 'visa', 'mastercard'
    },

    // Webhook event tracking — prevents double-processing
    lastWebhookEvent: {
      type: String,
      default: '',
    },
    paidAt: { type: Date },

    // Refund tracking
    refundId: {
      type: String,
      default: '',
      select: false, // internal — not exposed by default
    },
    refundedAmountInCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundedAt: { type: Date },
    refundReason: { type: String, trim: true, default: '' },

    // Raw Stripe metadata for debugging / audit
    stripeMetadata: {
      type: Map,
      of: String,
      default: {},
      select: false,
    },
  },
  {
    collection: 'Payment',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        value.amount = value.amountInCents / 100;
        if (value.refundedAmountInCents !== undefined) {
          value.refundedAmount = value.refundedAmountInCents / 100;
        }
        // Never expose internal Stripe metadata or refund id in API
        delete value.stripeMetadata;
        delete value.refundId;
        return value;
      },
    },
  }
);

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

