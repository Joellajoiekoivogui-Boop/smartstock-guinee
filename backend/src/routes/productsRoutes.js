const express = require('express');
const router = express.Router();
const { authenticate, isCompanyAdmin } = require('../middleware/auth');
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productsController');

router.use(authenticate);
router.get('/', getProducts);
router.post('/', isCompanyAdmin, createProduct);
router.put('/:id', isCompanyAdmin, updateProduct);
router.delete('/:id', isCompanyAdmin, deleteProduct);

module.exports = router;
