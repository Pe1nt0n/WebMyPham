/**
 * Middleware xử lý đường dẫn không tồn tại (404) & Bắt lỗi tập trung toàn cục (Global Error Handler)
 * Chuyển đổi mọi lỗi nghiệp vụ (AppError) và lỗi CSDL MySQL (trùng khóa UNIQUE, quá độ dài, sai JSON...)
 * về đúng chuẩn JSON Error Response của docs/API_CONTRACT.md
 */
const AppError = require('../utils/AppError');
const { sendError } = require('../utils/response');

/**
 * Xử lý khi client gọi vào một API URL không tồn tại
 */
function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      404,
      'NOT_FOUND',
      `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`
    )
  );
}

/**
 * Xử lý tập trung toàn bộ lỗi phát sinh trong các tầng Middleware & Controller
 */
function globalErrorHandler(err, _req, res, _next) {
  // 1. Lỗi nghiệp vụ đã định nghĩa tường minh qua lớp AppError
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.errors);
  }

  // 2. Lỗi vượt quá giới hạn kích thước Request Body (413 Payload Too Large)
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return sendError(
      res,
      413,
      'PAYLOAD_TOO_LARGE',
      'Dữ liệu gửi lên vượt quá dung lượng cho phép của máy chủ (tối đa 100KB).'
    );
  }

  // 3. Lỗi cú pháp JSON trong Request Body do client gửi sai định dạng
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Dữ liệu JSON gửi lên không đúng cú pháp.'
    );
  }

  // 4. Lỗi trùng khóa duy nhất (UNIQUE constraint) từ MySQL (ER_DUP_ENTRY - errno 1062)
  if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
    return sendError(
      res,
      409,
      'DUPLICATE_ENTRY',
      'Dữ liệu bị trùng lặp với bản ghi đã tồn tại trong hệ thống (username, email hoặc mã định danh).'
    );
  }

  // 5. Lỗi vi phạm khóa ngoại tham chiếu không tồn tại (errno 1452)
  if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452)) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Dữ liệu tham chiếu (danh mục, thương hiệu hoặc vai trò) không tồn tại trong hệ thống.'
    );
  }

  // 6. Lỗi vi phạm khóa ngoại đang có bản ghi con tham chiếu khi xóa (errno 1451)
  if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
    return sendError(
      res,
      409,
      'CONFLICT',
      'Bản ghi này đã phát sinh dữ liệu giao dịch liên kết nên không thể xóa vật lý.'
    );
  }

  // 7. Lỗi dữ liệu vượt quá độ dài cột VARCHAR, vượt phạm vi số DECIMAL/INT hoặc vi phạm CHECK (1406, 1264, 3819)
  if (
    err &&
    (err.code === 'ER_DATA_TOO_LONG' ||
      err.errno === 1406 ||
      err.code === 'ER_WARN_DATA_OUT_OF_RANGE' ||
      err.errno === 1264 ||
      err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
      err.errno === 3819)
  ) {
    return sendError(
      res,
      400,
      'VALIDATION_ERROR',
      'Dữ liệu đầu vào vượt quá giới hạn độ dài hoặc phạm vi giá trị hợp lệ.'
    );
  }

  // 8. Lỗi xung đột khóa giao dịch đồng thời InnoDB (Deadlock 1213 / Lock wait timeout 1205)
  if (
    err &&
    (err.code === 'ER_LOCK_DEADLOCK' ||
      err.errno === 1213 ||
      err.code === 'ER_LOCK_WAIT_TIMEOUT' ||
      err.errno === 1205)
  ) {
    return sendError(
      res,
      409,
      'CONFLICT',
      'Hệ thống đang xử lý giao dịch đồng thời trên cùng mặt hàng. Vui lòng thử lại sau giây lát.'
    );
  }

  // 9. Các lỗi hệ thống không lường trước (500 INTERNAL_ERROR)
  console.error('[BACKEND ERROR]:', err);
  return sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'Đã xảy ra lỗi hệ thống trên máy chủ. Giao dịch đã được an toàn khôi phục (Rollback).'
  );
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
