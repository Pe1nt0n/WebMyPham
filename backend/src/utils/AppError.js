/**
 * Lớp lỗi nghiệp vụ chuẩn hóa cho toàn bộ ứng dụng Backend
 * Khớp cấu trúc lỗi trong docs/API_CONTRACT.md:
 * { success: false, code: 'ERROR_CODE', message: '...', errors: [] }
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - Mã HTTP Status (400, 401, 403, 404, 409, 500...)
   * @param {string} code - Mã lỗi định danh chuẩn (VALIDATION_ERROR, INSUFFICIENT_STOCK, ...)
   * @param {string} message - Thông báo tiếng Việt hiển thị trực tiếp cho người dùng
   * @param {Array} [errors=[]] - Chi tiết danh sách lỗi (nếu có)
   */
  constructor(statusCode, code, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = Array.isArray(errors) ? errors : [];
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
