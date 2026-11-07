const mongoose = require('mongoose');

/**
 * Order Model
 *
 * Line items snapshot the product name and price AT THE TIME OF ORDER so the
 * order history remains accurate even if products are later edited or deleted.
 *
 * Stock deduction happens atomically during order creation inside a MongoDB
 * session/transaction (replica set required) or falls back to a guarded
 * findOneAndUpdate with a floor check.
 *
 * Cancellation is guarded by a `stockRestored` flag to prevent duplicate
 * stock restoration on retry or concurrent requests.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Snapshot fields — preserved even if product is later deleted/edited
    name: { type: String, required: true },
    priceInCents: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'priceInCents must be an integer' },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'quantity must be a positive integer' },
    },
    // Computed: priceInCents × quantity, stored for fast retrieval
    lineTotalInCents: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'An order must have at least one item',
      },
    },
    // All monetary values in cents
    subtotalInCents: { type: Number, required: true, min: 0 },
    // Reserved for future use — shipping, tax, discounts, etc.
    shippingInCents: { type: Number, default: 0, min: 0 },
    taxInCents:      { type: Number, default: 0, min: 0 },
    discountInCents: { type: Number, default: 0, min: 0 },
    totalInCents:    { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
      index: true,
    },

    shippingAddress: {
      fullName:   { type: String, trim: true, default: '' },
      line1:      { type: String, trim: true, default: '' },
      line2:      { type: String, trim: true, default: '' },
      city:       { type: String, trim: true, default: '' },
      state:      { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country:    { type: String, trim: true, default: '' },
      phone:      { type: String, trim: true, default: '' },
    },

    notes: { type: String, trim: true, default: '' },

    // Set to true the first time stock is restored on cancellation.
    // Prevents duplicate stock restoration on retries.
    stockRestored: {
      type: Boolean,
      default: false,
      select: false, // Not exposed to API consumers
    },

    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, default: '' },
  },
  {
    collection: 'Order',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        // Expose decimal prices alongside cents for convenience
        value.subtotal = value.subtotalInCents / 100;
        value.shipping = value.shippingInCents / 100;
        value.tax      = value.taxInCents / 100;
        value.discount = value.discountInCents / 100;
        value.total    = value.totalInCents / 100;
        // Expose per-item decimal price
        if (Array.isArray(value.items)) {
          value.items = value.items.map((item) => ({
            ...item,
            price:     item.priceInCents / 100,
            lineTotal: item.lineTotalInCents / 100,
          }));
        }
        return value;
      },
    },
  }
);

// Sparse text index on orderNumber for quick lookup
orderSchema.index({ orderNumber: 1 });
// Compound index for user order history with status filter
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, status: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);

