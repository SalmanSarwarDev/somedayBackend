const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../services/product.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Product controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
};

const getProducts = async (req, res) => {
  try {
    const {
      q, categoryId, minPrice, maxPrice,
      sortBy, sortDir, page, limit, showInactive,
    } = req.query;

    const result = await listProducts({
      q, categoryId, minPrice, maxPrice,
      sortBy, sortDir, page, limit,
      showInactive: showInactive === 'true',
    });

    return res.json({
      succeeded: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await getProduct(req.params.id);
    return res.json({
      succeeded: true,
      message: 'Product retrieved successfully',
      data: { product },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const createProductHandler = async (req, res) => {
  try {
    const product = await createProduct(req.body);
    return res.status(201).json({
      succeeded: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateProductHandler = async (req, res) => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    return res.json({
      succeeded: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteProductHandler = async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    return res.json({ succeeded: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
};

