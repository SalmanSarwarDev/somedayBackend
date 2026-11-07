const express = require('express');
const {
  getCategories,
  getCategoryById,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} = require('../controllers/category.controller');
const {
  getProducts,
  getProductById,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} = require('../controllers/product.controller');

const router = express.Router();

// ---------------------------------------------------------------------------
// Category routes — public read, write open for now (add admin guard later)
// ---------------------------------------------------------------------------

router.get('/categories',       getCategories);
router.get('/categories/:id',   getCategoryById);
router.post('/categories',      createCategoryHandler);
router.put('/categories/:id',   updateCategoryHandler);
router.delete('/categories/:id', deleteCategoryHandler);

// ---------------------------------------------------------------------------
// Product routes — public read, write open for now (add admin guard later)
// ---------------------------------------------------------------------------
// GET /api/shop/products?q=samsung&categoryId=...&minPrice=100&maxPrice=500
//                        &sortBy=priceInCents&sortDir=asc&page=1&limit=20

router.get('/products',       getProducts);
router.get('/products/:id',   getProductById);
router.post('/products',      createProductHandler);
router.put('/products/:id',   updateProductHandler);
router.delete('/products/:id', deleteProductHandler);

module.exports = router;

