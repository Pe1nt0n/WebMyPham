/**
 * Middleware Giới hạn Tần suất Yêu cầu (In-Memory Rate Limiter) không phụ thuộc thư viện ngoài
 * Bảo vệ các endpoint nhạy cảm (/api/auth/login, /api/auth/register) trước tấn công vét cạn mật khẩu (Brute-force).
 */
const AppError = require('../utils/AppError');

function createRateLimiter({
  windowMsResolver = () => Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  maxResolver = () => Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  keyPrefix = 'global',
} = {}) {
  const bucketMap = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const windowMs = Math.max(1000, windowMsResolver());
    const maxRequests = Math.max(1, maxResolver());

    // Dọn dẹp lười (lazy cleanup) các khóa đã hết hạn khi Map lớn để không rò rỉ bộ nhớ & không giữ timer nền
    if (bucketMap.size > 2000) {
      for (const [key, entry] of bucketMap.entries()) {
        if (entry.resetAt <= now) {
          bucketMap.delete(key);
        }
      }
    }

    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const bucketKey = `${keyPrefix}:${clientIp}`;
    let record = bucketMap.get(bucketKey);

    if (!record || record.resetAt <= now) {
      record = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    record.count += 1;
    bucketMap.set(bucketKey, record);

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(retryAfterSeconds));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(
        new AppError(
          429,
          'RATE_LIMIT_EXCEEDED',
          'Bạn đã gửi quá nhiều yêu cầu liên tiếp. Vui lòng đợi ít phút rồi thử lại.'
        )
      );
    }

    return next();
  };
}

const authRateLimiter = createRateLimiter({ keyPrefix: 'auth' });

module.exports = {
  createRateLimiter,
  authRateLimiter,
};
