const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getSales, getSale, createSale } = require('../controllers/salesController');

router.use(authenticate);
router.get('/', getSales);
router.get('/:id', getSale);
router.post('/', createSale);

module.exports = router;
