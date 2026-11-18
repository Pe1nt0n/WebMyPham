/**
 * Tiện ích chuẩn hóa cấu trúc phản hồi JSON (REST API Response)
 * Đảm bảo 100% API trong hệ thống trả về cấu trúc đồng nhất theo docs/API_CONTRACT.md
 */

function sendSuccess(res, statusCode = 200, message = 'Thành công', data = null) {
  const payload = {
    success: true,
    message,
  };
  if (data !== undefined) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

function sendError(res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'Lỗi hệ thống', errors = []) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    errors,
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
