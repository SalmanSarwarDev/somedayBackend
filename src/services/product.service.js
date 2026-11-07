const Product  = require('../models/Product');
const Category = require('../models/Category');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toSlug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Valid sort field names exposed to the API
const SORT_FIELDS = new Set(['priceInCents', 'name', 'rating', 'createdAt', 'reviewCount']);
const SORT_DIRECTIONS = new Set(['asc', 'desc']);

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List products with optional:
 *  - Full-text search (`q`)
 *  - Category filter (`categoryId`)
 *  - Price range (`minPrice`, `maxPrice` in PKR/dollars, converted to cents)
 *  - Sorting (`sortBy`, `sortDir`)
 *  - Pagination (`page`, `limit`)
 */
const listProducts = async (query = {}) => {
  const {
    q,
    categoryId,
    minPrice,
    maxPrice,
    sortBy    = 'createdAt',
    sortDir   = 'desc',
    page      = 1,
    limit     = 20,
    showInactive = false,
  } = query;

  // --- Build filter ---
  const filter = {};
  if (!showInactive) filter.isActive = true;

  if (q && typeof q === 'string' && q.trim()) {
    filter.$text = { $search: q.trim() };
  }

  if (categoryId) {
    filter.category = categoryId;
  }

  const priceFilter = {};
  if (minPrice !== undefined && !Number.isNaN(Number(minPrice))) {
    priceFilter.$gte = Math.round(Number(minPrice) * 100);
  }
  if (maxPrice !== undefined && !Number.isNaN(Number(maxPrice))) {
    priceFilter.$lte = Math.round(Number(maxPrice) * 100);
  }
  if (Object.keys(priceFilter).length) filter.priceInCents = priceFilter;

  // --- Build sort ---
  const resolvedSortBy  = SORT_FIELDS.has(sortBy)  ? sortBy  : 'createdAt';
  const resolvedSortDir = SORT_DIRECTIONS.has(sortDir) ? sortDir : 'desc';
  const sort = { [resolvedSortBy]: resolvedSortDir === 'asc' ? 1 : -1 };
  // When using $text search, include textScore for relevance ranking
  if (filter.$text) {
    sort.score = { $meta: 'textScore' };
  }

  // --- Pagination ---
  const resolvedPage  = Math.max(1, parseInt(page, 10)  || 1);
  const resolvedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (resolvedPage - 1) * resolvedLimit;

  // --- Execute ---
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(resolvedLimit)
      .lean({ virtuals: false }),
    Product.countDocuments(filter),
  ]);

  const mapped = products.map((p) => {
    p.id    = String(p._id);
    delete p._id;
    p.price = p.priceInCents / 100;
    if (p.category && p.category._id) {
      p.category.id = String(p.category._id);
      delete p.category._id;
    }
    return p;
  });

  return {
    products: mapped,
    pagination: {
      total,
      page: resolvedPage,
      limit: resolvedLimit,
      totalPages: Math.ceil(total / resolvedLimit),
      hasNextPage: resolvedPage * resolvedLimit < total,
      hasPrevPage: resolvedPage > 1,
    },
  };
};

/** Get single product by id or slug */
const getProduct = async (idOrSlug) => {
  const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug);
  const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

  const product = await Product.findOne(filter)
    .populate('category', 'name slug')
    .lean({ virtuals: false });

  if (!product) throw createError('Product not found', 404);

  product.id    = String(product._id);
  delete product._id;
  product.price = product.priceInCents / 100;
  if (product.category && product.category._id) {
    product.category.id = String(product.category._id);
    delete product.category._id;
  }
  return product;
};

/** Create a new product */
const createProduct = async (input = {}) => {
  const {
    name, description, price, category,
    images, stock, brand, tags,
    specifications, isActive,
  } = input;

  if (typeof name !== 'string' || !name.trim()) {
    throw createError('Product name is required', 400);
  }
  if (typeof price !== 'number' || price < 0) {
    throw createError('price must be a non-negative number', 400);
  }
  if (!category) {
    throw createError('category is required', 400);
  }
  if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
    throw createError('stock must be a non-negative integer', 400);
  }

  const categoryDoc = await Category.exists({ _id: category, isActive: true });
  if (!categoryDoc) throw createError('Category not found or is inactive', 404);

  const slug = input.slug ? toSlug(input.slug) : toSlug(name);
  if (!slug) throw createError('Could not generate a valid slug', 400);

  const priceInCents = Math.round(price * 100);

  try {
    const product = await Product.create({
      name: name.trim(),
      slug,
      description: typeof description === 'string' ? description.trim() : '',
      priceInCents,
      category,
      images: Array.isArray(images) ? images : [],
      stock,
      brand: typeof brand === 'string' ? brand.trim() : '',
      tags: Array.isArray(tags) ? tags.map((t) => String(t).toLowerCase().trim()) : [],
      specifications: specifications && typeof specifications === 'object' ? specifications : {},
      isActive: isActive !== false,
    });
    return product.toJSON();
  } catch (error) {
    if (error.code === 11000) {
      throw createError(`A product with slug "${slug}" already exists`, 409);
    }
    throw error;
  }
};

/** Update an existing product */
const updateProduct = async (productId, input = {}) => {
  const product = await Product.findById(productId);
  if (!product) throw createError('Product not found', 404);

  const {
    name, description, price, category,
    images, stock, brand, tags,
    specifications, isActive, slug,
  } = input;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) throw createError('Product name cannot be empty', 400);
    product.name = name.trim();
  }
  if (slug !== undefined) {
    const newSlug = toSlug(slug);
    if (!newSlug) throw createError('Invalid slug', 400);
    product.slug = newSlug;
  }
  if (description !== undefined) product.description = String(description).trim();
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) throw createError('price must be a non-negative number', 400);
    product.priceInCents = Math.round(price * 100);
  }
  if (category !== undefined) {
    const categoryDoc = await Category.exists({ _id: category, isActive: true });
    if (!categoryDoc) throw createError('Category not found or is inactive', 404);
    product.category = category;
  }
  if (Array.isArray(images))   product.images = images;
  if (stock !== undefined) {
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
      throw createError('stock must be a non-negative integer', 400);
    }
    product.stock = stock;
  }
  if (brand !== undefined)          product.brand = String(brand).trim();
  if (Array.isArray(tags))          product.tags = tags.map((t) => String(t).toLowerCase().trim());
  if (specifications !== undefined) product.specifications = specifications;
  if (isActive !== undefined)       product.isActive = Boolean(isActive);

  try {
    await product.save();
    return product.toJSON();
  } catch (error) {
    if (error.code === 11000) throw createError('A product with that slug already exists', 409);
    throw error;
  }
};

/** Soft-delete a product */
const deleteProduct = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) throw createError('Product not found', 404);
  product.isActive = false;
  await product.save();
  return { message: 'Product deactivated successfully' };
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};

