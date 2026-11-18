/**
 * Cấu hình môi trường tập trung & Bảo mật khóa bí mật hệ thống (src/config/env.js)
 * - Hỗ trợ đầy đủ cả Docker MySQL (DB_PASSWORD=123456) lẫn XAMPP/phpMyAdmin (DB_PASSWORD= rỗng).
 * - Chặn khởi chạy Production nếu chưa thiết lập JWT_SECRET riêng biệt hoặc chưa cấu hình DB_PASSWORD.
 */
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DEV_JWT_SECRET = 'lumiere_cosmetics_sgu_secret_2026';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

if (IS_PRODUCTION) {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.trim().length < 16 ||
    process.env.JWT_SECRET.trim() === DEFAULT_DEV_JWT_SECRET
  ) {
    throw new Error(
      '[SECURITY CONFIG] Môi trường production bắt buộc cấu hình JWT_SECRET riêng tối thiểu 16 ký tự.'
    );
  }
  if (process.env.DB_PASSWORD === undefined) {
    throw new Error(
      '[SECURITY CONFIG] Môi trường production bắt buộc khai báo tường minh biến môi trường DB_PASSWORD.'
    );
  }
}

const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== ''
    ? process.env.JWT_SECRET.trim()
    : DEFAULT_DEV_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ALGORITHM = 'HS256';

// Hỗ trợ mật khẩu rỗng "" cho XAMPP/MariaDB (chỉ fallback '123456' khi biến DB_PASSWORD hoàn toàn chưa khai báo)
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '123456',
  database: process.env.DB_NAME || 'cosmetic_store',
};

/**
 * Sinh dấu vân tay một chiều (12 ký tự hex SHA-256) từ password_hash.
 * Nhúng vào JWT payload giúp thu hồi tức thời mọi token cũ ngay khi người dùng đổi mật khẩu
 * hoặc bị Admin đặt lại mật khẩu mà không cần thay đổi cấu trúc bảng users.
 */
function computePasswordFingerprint(passwordHash) {
  return crypto
    .createHash('sha256')
    .update(`${JWT_SECRET}:${String(passwordHash || '')}`)
    .digest('hex')
    .slice(0, 12);
}

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ALGORITHM,
  DB_CONFIG,
  computePasswordFingerprint,
};
