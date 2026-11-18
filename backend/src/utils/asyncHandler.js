/**
 * Hàm bọc (Wrapper) cho các Controller bất đồng bộ (async/await)
 * Tự động bắt mọi ngoại lệ (Promise rejection) và chuyển tới Global Error Middleware,
 * giúp code Controller gọn sạch, không phải lặp lại try/catch ở những hàm không có Transaction.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
