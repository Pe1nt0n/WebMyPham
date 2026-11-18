const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authRateLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Các endpoint công khai (Public) — Gắn Rate Limiter chống vét cạn mật khẩu & spam tạo tài khoản
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);

// Các endpoint yêu cầu đã đăng nhập (Mọi role đang ACTIVE)
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
