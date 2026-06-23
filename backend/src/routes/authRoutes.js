const express = require('express');
const router = express.Router();
const { register, login, logout, refresh, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators/authValidators');

router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);

module.exports = router;
