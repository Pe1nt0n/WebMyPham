/**
 * Middleware Xác thực JWT & Phân quyền truy cập theo Vai trò (RBAC - Role-Based Access Control)
 * Phục vụ bảo mật cho 3 phân hệ độc lập:
 *   1. CUSTOMER    (Khách hàng mua sắm trực tuyến)
 *   2. SALES_STAFF (Nhân viên bán hàng - Quản lý kho, duyệt đơn, hóa đơn, thống kê)
 *   3. ADMIN       (Quản trị hệ thống - Quản lý tài khoản và phân quyền)
 */
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_ALGORITHM, computePasswordFingerprint } = require('../config/env');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Truy vấn thông tin người dùng mới nhất kèm vai trò & password_hash nội bộ để đối chiếu phiên
 * (Tuyệt đối bóc tách password_hash trước khi trả đối tượng user ra req.user)
 */
async function fetchUserAuthRecordById(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.email, u.phone, u.address,
            u.role_id, r.role_name, u.status, u.created_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) {
    return null;
  }

  const { password_hash: passwordHash, ...safeUser } = rows[0];
  return {
    safeUser,
    passwordFingerprint: computePasswordFingerprint(passwordHash),
  };
}

/**
 * Middleware 1: Bắt buộc đăng nhập (authenticate)
 * Quy trình kiểm tra 5 bước:
 *   Bước 1: Trích xuất chuỗi Bearer Token từ Header Authorization.
 *   Bước 2: Giải mã và xác thực chữ ký số (ghim thuật toán HS256) và hạn sử dụng của JWT.
 *   Bước 3: Truy vấn trực tiếp vào bảng users & roles trong MySQL để lấy dữ liệu thời gian thực.
 *   Bước 4: Kiểm tra dấu vân tay mật khẩu (pwd_v) — tự động thu hồi tức thời các JWT cũ nếu mật khẩu vừa thay đổi.
 *   Bước 5: Chặn tức thời tài khoản bị khóa (status = 'LOCKED') với mã 403 ACCOUNT_LOCKED.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Vui lòng đăng nhập để thực hiện chức năng này (Thiếu Authorization Bearer Token).'
    );
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token xác thực không hợp lệ.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Token xác thực không hợp lệ hoặc đã bị thay đổi.';
    throw new AppError(401, 'UNAUTHORIZED', message);
  }

  if (!decoded || !Number.isInteger(Number(decoded.id))) {
    throw new AppError(401, 'UNAUTHORIZED', 'Dữ liệu định danh trong Token không hợp lệ.');
  }

  // Đối chiếu trực tiếp trạng thái tài khoản và mật khẩu mới nhất trong CSDL
  const authRecord = await fetchUserAuthRecordById(Number(decoded.id));
  if (!authRecord) {
    throw new AppError(401, 'UNAUTHORIZED', 'Tài khoản người dùng không còn tồn tại trong hệ thống.');
  }

  // Thu hồi phiên tức thời nếu mật khẩu đã được thay đổi sau thời điểm cấp JWT
  if (!decoded.pwd_v || decoded.pwd_v !== authRecord.passwordFingerprint) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Mật khẩu tài khoản đã thay đổi. Vui lòng đăng nhập lại.'
    );
  }

  // Kiểm tra khóa tài khoản tức thời (Real-time Account Lockout Enforcement)
  if (authRecord.safeUser.status === 'LOCKED') {
    throw new AppError(
      403,
      'ACCOUNT_LOCKED',
      'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.'
    );
  }

  req.user = authRecord.safeUser;
  next();
});

/**
 * Middleware 2: Xác thực tùy chọn (optionalAuth)
 * Dùng cho các endpoint công khai (VD: GET /api/products?include_hidden=true).
 * Nếu có gửi Bearer Token hợp lệ, chưa đổi mật khẩu và tài khoản đang ACTIVE thì gắn vào req.user;
 * nếu không có token hoặc token lỗi thì bỏ qua nhẹ nhàng, coi như khách vãng lai.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    const authRecord = await fetchUserAuthRecordById(Number(decoded.id));
    const isValidSession =
      authRecord &&
      authRecord.safeUser.status === 'ACTIVE' &&
      decoded.pwd_v &&
      decoded.pwd_v === authRecord.passwordFingerprint;

    req.user = isValidSession ? authRecord.safeUser : null;
  } catch (_err) {
    req.user = null;
  }

  next();
});

/**
 * Middleware 3: Phân quyền theo vai trò RBAC (authorizeRoles)
 * Chỉ cho phép các vai trò nằm trong danh sách allowedRoles đi tiếp vào Controller.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập vào hệ thống.'));
    }

    if (!allowedRoles.includes(req.user.role_name)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Vai trò '${req.user.role_name}' không có quyền truy cập vào phân hệ chức năng này.`
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorizeRoles,
};
