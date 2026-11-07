const mongoose = require('mongoose');

/**
 * Category Model
 *
 * Supports flat categories and nested subcategories via a self-referencing
 * `parent` field. A null/undefined parent means it is a top-level category.
 * This keeps the schema scalable for future tree-based navigation.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 120,
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
    image: {
      type: String,
      default: '',
    },
    // Self-referencing parent enables unlimited depth subcategory trees.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Display ordering within the same level
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'Category',
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

// Slug must be globally unique across all categories/subcategories
categorySchema.index({ slug: 1 }, { unique: true });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);

