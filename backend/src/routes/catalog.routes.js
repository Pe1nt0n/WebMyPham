const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Tra cứu danh mục, thương hiệu và mỹ phẩm công khai
router.get('/categories', catalogController.getCategories);
router.get('/brands', catalogController.getBrands);
router.get('/products', optionalAuth, catalogController.getProducts);
router.get('/products/:id', optionalAuth, catalogController.getProductById);

module.exports = router;
