const express = require('express');
const router = express.Router();
const { authenticate, isCompanyAdmin } = require('../middleware/auth');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoriesController');

router.use(authenticate);
router.get('/', getCategories);
router.post('/', isCompanyAdmin, createCategory);
router.put('/:id', isCompanyAdmin, updateCategory);
router.delete('/:id', isCompanyAdmin, deleteCategory);

module.exports = router;
