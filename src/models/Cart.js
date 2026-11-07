const mongoose = require('mongoose');

/**
 * Cart Model
 *
 * One cart per user (enforced by unique index on userId).
 * Prices are intentionally NOT stored in the cart — they are always
 * re-fetched from the Product collection at checkout and display time
 * to ensure the backend is always the source of truth for pricing.
 *
 * The cart stores only the product reference and desired quantity.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be a positive integer',
      },
    },
  },
  { _id: false } // No separate _id for sub-documents; product ref is the key
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    collection: 'Cart',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        return value;
      },
    },
  }
);

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

