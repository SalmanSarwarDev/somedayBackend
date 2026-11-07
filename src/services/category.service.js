const Category = require('../models/Category');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/** Derive a URL-safe slug from a display name */
const toSlug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List all active (or all, if showInactive) categories.
 * Populates parent name for breadcrumb-style display.
 */
const listCategories = async ({ showInactive = false } = {}) => {
  const filter = showInactive ? {} : { isActive: true };
  const categories = await Category.find(filter)
    .populate('parent', 'name slug')
    .sort({ order: 1, name: 1 })
    .lean({ virtuals: false });

  return categories.map((c) => {
    c.id = String(c._id);
    delete c._id;
    if (c.parent && c.parent._id) {
      c.parent.id = String(c.parent._id);
      delete c.parent._id;
    }
    return c;
  });
};

/** Get a single category by id or slug */
const getCategory = async (idOrSlug) => {
  const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const category = await Category.findOne(filter)
    .populate('parent', 'name slug')
    .lean({ virtuals: false });

  if (!category) throw createError('Category not found', 404);

  category.id = String(category._id);
  delete category._id;
  if (category.parent && category.parent._id) {
    category.parent.id = String(category.parent._id);
    delete category.parent._id;
  }
  return category;
};

/** Create a new category */
const createCategory = async (input = {}) => {
  const { name, description, image, parent, isActive, order } = input;

  if (typeof name !== 'string' || !name.trim()) {
    throw createError('Category name is required', 400);
  }

  const slug = input.slug ? toSlug(input.slug) : toSlug(name);
  if (!slug) throw createError('Could not generate a valid slug from the given name', 400);

  // Validate parent if provided
  if (parent) {
    const parentExists = await Category.exists({ _id: parent });
    if (!parentExists) throw createError('Parent category not found', 404);
  }

  try {
    const category = await Category.create({
      name: name.trim(),
      slug,
      description: typeof description === 'string' ? description.trim() : '',
      image: typeof image === 'string' ? image.trim() : '',
      parent: parent || null,
      isActive: isActive !== false,
      order: typeof order === 'number' ? order : 0,
    });
    return category.toJSON();
  } catch (error) {
    if (error.code === 11000) {
      throw createError(`A category with slug "${slug}" already exists`, 409);
    }
    throw error;
  }
};

/** Update an existing category */
const updateCategory = async (categoryId, input = {}) => {
  const category = await Category.findById(categoryId);
  if (!category) throw createError('Category not found', 404);

  const { name, description, image, parent, isActive, order, slug } = input;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw createError('Category name cannot be empty', 400);
    category.name = name.trim();
  }
  if (slug !== undefined) {
    const newSlug = toSlug(slug);
    if (!newSlug) throw createError('Invalid slug', 400);
    category.slug = newSlug;
  } else if (name !== undefined) {
    // Auto-update slug when name changes, only if slug was auto-generated
    // (guard: only update if the previous slug matched the previous name)
    // We always allow manual override via explicit `slug` field.
  }
  if (description !== undefined) category.description = String(description).trim();
  if (image !== undefined)       category.image = String(image).trim();
  if (isActive !== undefined)    category.isActive = Boolean(isActive);
  if (order !== undefined)       category.order = Number(order);

  if (parent !== undefined) {
    if (parent === null) {
      category.parent = null;
    } else {
      if (String(parent) === String(categoryId)) {
        throw createError('A category cannot be its own parent', 400);
      }
      const parentExists = await Category.exists({ _id: parent });
      if (!parentExists) throw createError('Parent category not found', 404);
      category.parent = parent;
    }
  }

  try {
    await category.save();
    return category.toJSON();
  } catch (error) {
    if (error.code === 11000) {
      throw createError('A category with that slug already exists', 409);
    }
    throw error;
  }
};

/** Soft-delete a category by marking it inactive */
const deleteCategory = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) throw createError('Category not found', 404);

  // Check if any subcategories still reference this as parent
  const childCount = await Category.countDocuments({ parent: categoryId, isActive: true });
  if (childCount > 0) {
    throw createError(
      `Cannot delete category with ${childCount} active subcategory/subcategories. Deactivate or reassign them first.`,
      409
    );
  }

  category.isActive = false;
  await category.save();
  return { message: 'Category deactivated successfully' };
};

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};

