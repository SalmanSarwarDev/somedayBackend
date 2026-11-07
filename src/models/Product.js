const mongoose = require('mongoose');

/**
 * Product Model
 *
 * Price is stored in the smallest integer unit (e.g. paisas / cents) to avoid
 * floating-point rounding errors, then exposed as a decimal in toJSON.
 * All price calculations on the backend use the raw integer `priceInCents`.
 *
 * Stock management uses MongoDB's `$inc` with a floor check to prevent
 * negative stock without race conditions.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Stored in smallest unit (cents/paisas) to avoid float rounding issues.
    // e.g. PKR 1,500 → 150000 | USD 29.99 → 2999
    priceInCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'priceInCents must be an integer',
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stock must be a non-negative integer',
      },
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    // Arbitrary key-value specifications (e.g. { RAM: '16GB', Storage: '512GB' })
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Average rating (0–5), updated on review submission (future feature)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    collection: 'Product',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        // Expose price as a human-readable decimal number.
        // The raw priceInCents is NOT removed so callers can still use it if needed.
        value.price = value.priceInCents / 100;
        return value;
      },
    },
  }
);

// Full-text search index on name, description, brand and tags
productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

// Compound index for category + active listing (catalog pages)
productSchema.index({ category: 1, isActive: 1 });

// Price range filtering
productSchema.index({ priceInCents: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

