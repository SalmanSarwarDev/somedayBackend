const {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../services/category.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Category controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal server error' : error.message,
  });
};

const getCategories = async (req, res) => {
  try {
    const showInactive = req.query.showInactive === 'true';
    const categories = await listCategories({ showInactive });
    return res.json({
      succeeded: true,
      message: 'Categories retrieved successfully',
      data: { categories },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await getCategory(req.params.id);
    return res.json({
      succeeded: true,
      message: 'Category retrieved successfully',
      data: { category },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const createCategoryHandler = async (req, res) => {
  try {
    const category = await createCategory(req.body);
    return res.status(201).json({
      succeeded: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateCategoryHandler = async (req, res) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    return res.json({
      succeeded: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteCategoryHandler = async (req, res) => {
  try {
    const result = await deleteCategory(req.params.id);
    return res.json({ succeeded: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
};

