const express = require('express');
const { checkDatabaseConnection } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const authRoutes = require('./auth.routes');
const catalogRoutes = require('./catalog.routes');
const orderRoutes = require('./order.routes');
const staffRoutes = require('./staff.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

/**
 * GET /api/health — Kiểm tra nhanh trạng thái hoạt động của Backend & Kết nối MySQL 8.0
 */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await checkDatabaseConnection();
    return sendSuccess(
      res,
      200,
      'Hệ thống Backend Lumière Cosmetics và cơ sở dữ liệu MySQL đang hoạt động ổn định.',
      {
        status: 'OK',
        database: 'CONNECTED',
        service: 'lumiere-cosmetics-api',
        version: 'v1.0',
        timestamp: new Date().toISOString(),
      }
    );
  })
);

// Định tuyến theo 5 nhóm phân hệ chuẩn của API_CONTRACT.md
router.use('/auth', authRoutes);
router.use('/', catalogRoutes); // /api/categories, /api/brands, /api/products
router.use('/orders', orderRoutes);
router.use('/staff', staffRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
