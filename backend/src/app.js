/**
 * Khởi tạo ứng dụng Express trung tâm (src/app.js)
 * Tách riêng khỏi server.js để vừa chạy production/dev, vừa có thể nạp trực tiếp vào bộ kiểm thử tự động.
 */
const express = require('express');
const cors = require('cors');
const { IS_PRODUCTION } = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/error.middleware');

const app = express();

// Ẩn thông tin nhận diện framework máy chủ
app.disable('x-powered-by');

// 1. Cấu hình CORS an toàn: chỉ cho phép Origin hợp lệ thay vì phản chiếu tùy ý mọi tên miền lạ
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(
  cors({
    origin(origin, callback) {
      // Cho phép các công cụ không gửi Origin (Postman, curl, script kiểm thử nội bộ)
      if (!origin) {
        return callback(null, true);
      }
      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (!IS_PRODUCTION && LOCALHOST_ORIGIN_REGEX.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// 2. Thiết lập HTTP Security Headers & Header UTF-8 chuẩn cho toàn bộ phản hồi API
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 3. Middleware giải mã JSON & URL-encoded Request Body (giới hạn 100KB chống Payload DoS)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Mount toàn bộ REST API dưới tiền tố /api
app.use('/api', apiRoutes);

// 5. Xử lý đường dẫn không tồn tại (404) & Bắt lỗi toàn cục (Global Error Handler)
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
