/**
 * Controller Phân hệ Xác thực & Hồ sơ Cá nhân (/api/auth)
 * Xử lý: Đăng ký khách hàng, Đăng nhập đa cổng (kiểm tra portal & khóa tài khoản),
 * lấy thông tin phiên hiện tại, cập nhật hồ sơ và đổi mật khẩu (tự động thu hồi JWT cũ).
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_ALGORITHM,
  computePasswordFingerprint,
} = require('../config/env');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  USERNAME_REGEX,
  EMAIL_REGEX,
  MAX_BCRYPT_BYTES,
  getPasswordValidationError,
  readRequiredString,
  readOptionalString,
} = require('../utils/validators');

// Chuỗi băm giả lập phục vụ đối chiếu hằng định thời gian (chống dò tồn tại tài khoản qua Timing Attack)
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('lumiere_dummy_timing_guard_2026', 10);

/**
 * Bảng ánh xạ cổng đăng nhập (portal) sang vai trò hệ thống (role_name)
 * Đảm bảo tách biệt nghiêm ngặt 3 cổng: Khách hàng (/), Nhân viên (/staff), Quản trị (/admin)
 */
const PORTAL_ROLE_MAP = {
  CUSTOMER: { roleName: 'CUSTOMER', label: 'Khách hàng mua sắm' },
  STAFF: { roleName: 'SALES_STAFF', label: 'Nhân viên bán hàng' },
  SALES_STAFF: { roleName: 'SALES_STAFF', label: 'Nhân viên bán hàng' },
  ADMIN: { roleName: 'ADMIN', label: 'Quản trị hệ thống' },
};

/**
 * Hàm phụ trợ sinh JWT Access Token (ghim thuật toán HS256 & đính kèm dấu vân tay mật khẩu pwd_v)
 */
function signUserToken(user, passwordHash) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role_name,
      pwd_v: computePasswordFingerprint(passwordHash),
    },
    JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

/**
 * Truy vấn thông tin người dùng chuẩn (loại bỏ tuyệt đối cột password_hash)
 */
async function getUserProfileById(userId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.address,
            u.role_id, r.role_name, u.status, u.created_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/**
 * POST /api/auth/register — Đăng ký tài khoản Khách hàng mới (Mặc định role = CUSTOMER, status = ACTIVE)
 */
const register = asyncHandler(async (req, res) => {
  const errors = [];

  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!username || !USERNAME_REGEX.test(username)) {
    errors.push(
      "Tên đăng nhập phải từ 3–50 ký tự, chỉ gồm chữ cái không dấu, chữ số, dấu '.', '_' hoặc '-' (không chứa khoảng trắng hay '@')."
    );
  }

  const passwordErr = getPasswordValidationError(req.body?.password, 'Mật khẩu');
  if (passwordErr) {
    errors.push(passwordErr);
  }

  const fullName = readRequiredString(
    req.body?.full_name,
    'Họ và tên khách hàng',
    100,
    errors
  );

  const email =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 100 || !EMAIL_REGEX.test(email)) {
    errors.push('Địa chỉ email không đúng định dạng hoặc vượt quá 100 ký tự.');
  }

  const phone = readOptionalString(req.body?.phone, 'Số điện thoại', 20, errors);
  const address = readOptionalString(req.body?.address, 'Địa chỉ', 255, errors);

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  const password = req.body.password;

  // Kiểm tra trùng lặp username hoặc email trước khi thêm mới
  const [existingUsers] = await pool.query(
    'SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );
  if (existingUsers.length > 0) {
    const existed = existingUsers[0];
    if (existed.username.toLowerCase() === username.toLowerCase()) {
      throw new AppError(
        409,
        'DUPLICATE_ENTRY',
        'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.'
      );
    }
    throw new AppError(
      409,
      'DUPLICATE_ENTRY',
      'Địa chỉ email này đã được đăng ký cho tài khoản khác.'
    );
  }

  // Lấy role_id của vai trò CUSTOMER từ bảng roles
  const [roleRows] = await pool.query("SELECT id FROM roles WHERE role_name = 'CUSTOMER' LIMIT 1");
  if (roleRows.length === 0) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Chưa khởi tạo vai trò CUSTOMER trong cơ sở dữ liệu.');
  }
  const customerRoleId = roleRows[0].id;

  // Băm mật khẩu an toàn với bcryptjs (10 salt rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  const [insertResult] = await pool.query(
    `INSERT INTO users (username, password_hash, full_name, email, phone, address, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [username, passwordHash, fullName, email, phone, address, customerRoleId]
  );

  const newUser = await getUserProfileById(insertResult.insertId);
  const token = signUserToken(newUser, passwordHash);

  return sendSuccess(res, 201, 'Đăng ký tài khoản thành công', {
    token,
    user: newUser,
  });
});

/**
 * POST /api/auth/login — Đăng nhập hệ thống & Kiểm tra phân hệ truy cập (portal)
 * Thứ tự kiểm tra bắt buộc theo đặc tả:
 *   1. Kiểm tra tồn tại tài khoản & đối chiếu mật khẩu bcrypt -> sai trả 401 INVALID_CREDENTIALS
 *   2. Kiểm tra trạng thái khóa (status === 'LOCKED') -> khóa trả 403 ACCOUNT_LOCKED
 *   3. Kiểm tra tham số portal (ADMIN | STAFF | CUSTOMER) -> sai cổng trả 403 WRONG_PORTAL
 */
const login = asyncHandler(async (req, res) => {
  if (typeof req.body?.username !== 'string' || typeof req.body?.password !== 'string') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu hợp lệ.'
    );
  }

  const loginIdentifier = req.body.username.trim();
  const password = req.body.password;
  const portalRaw = req.body.portal;

  if (!loginIdentifier || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
  }

  if (loginIdentifier.length > 100) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  // Chặn mật khẩu vượt ngưỡng 72 byte trước khi băm để chống DoS CPU (kèm compare giả lập giữ nhịp thời gian)
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_BYTES) {
    await bcrypt.compare('overlength_password_guard', DUMMY_BCRYPT_HASH);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  // Bước 1: Tìm người dùng theo username hoặc email kèm tên vai trò
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.password_hash, u.full_name, u.email, u.phone, u.address,
            u.role_id, r.role_name, u.status, u.created_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.username = ? OR u.email = ?
     LIMIT 1`,
    [loginIdentifier, loginIdentifier]
  );

  if (rows.length === 0) {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  const userRow = rows[0];
  const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
  }

  // Bước 2: Chặn tài khoản đang bị khóa (LOCKED)
  if (userRow.status === 'LOCKED') {
    throw new AppError(
      403,
      'ACCOUNT_LOCKED',
      'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.'
    );
  }

  // Bước 3: Kiểm tra đúng cổng phân hệ (portal) nếu client truyền lên
  if (portalRaw !== undefined && portalRaw !== null && String(portalRaw).trim() !== '') {
    if (typeof portalRaw !== 'string') {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        "Tham số cổng đăng nhập (portal) chỉ chấp nhận 'CUSTOMER', 'STAFF' hoặc 'ADMIN'."
      );
    }

    const normalizedPortal = portalRaw.trim().toUpperCase();
    const expectedPortal = PORTAL_ROLE_MAP[normalizedPortal];

    if (!expectedPortal) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        "Tham số cổng đăng nhập (portal) chỉ chấp nhận 'CUSTOMER', 'STAFF' hoặc 'ADMIN'."
      );
    }

    if (userRow.role_name !== expectedPortal.roleName) {
      throw new AppError(
        403,
        'WRONG_PORTAL',
        `Tài khoản này không có quyền đăng nhập vào cổng ${expectedPortal.label}!`
      );
    }
  }

  // Loại bỏ password_hash trước khi đóng gói dữ liệu trả về client
  const { password_hash: passwordHash, ...safeUser } = userRow;
  const token = signUserToken(safeUser, passwordHash);

  return sendSuccess(res, 200, 'Đăng nhập thành công', {
    token,
    user: safeUser,
  });
});

/**
 * GET /api/auth/me — Lấy thông tin tài khoản hiện tại từ JWT
 */
const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, 'Lấy thông tin tài khoản thành công', req.user);
});

/**
 * PUT /api/auth/profile — Cập nhật thông tin hồ sơ cá nhân
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const errors = [];

  const fullName =
    req.body?.full_name !== undefined
      ? readRequiredString(req.body.full_name, 'Họ và tên', 100, errors)
      : req.user.full_name;

  let email = req.user.email;
  if (req.body?.email !== undefined) {
    if (typeof req.body.email !== 'string') {
      errors.push('Địa chỉ email không hợp lệ.');
    } else {
      email = req.body.email.trim().toLowerCase();
      if (!email || email.length > 100 || !EMAIL_REGEX.test(email)) {
        errors.push('Địa chỉ email không đúng định dạng hoặc vượt quá 100 ký tự.');
      }
    }
  }

  const phone =
    req.body?.phone !== undefined
      ? readOptionalString(req.body.phone, 'Số điện thoại', 20, errors)
      : req.user.phone;

  const address =
    req.body?.address !== undefined
      ? readOptionalString(req.body.address, 'Địa chỉ', 255, errors)
      : req.user.address;

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  // Kiểm tra email có bị trùng với người dùng khác hay không
  const [dupRows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [
    email,
    userId,
  ]);
  if (dupRows.length > 0) {
    throw new AppError(
      409,
      'DUPLICATE_ENTRY',
      'Địa chỉ email này đã thuộc về một tài khoản khác trong hệ thống.'
    );
  }

  await pool.query(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
    [fullName, email, phone, address, userId]
  );

  const updatedUser = await getUserProfileById(userId);
  return sendSuccess(res, 200, 'Cập nhật hồ sơ thành công', updatedUser);
});

/**
 * PUT /api/auth/change-password — Đổi mật khẩu cá nhân
 * Sau khi đổi mật khẩu thành công:
 *   - Mọi JWT cũ trên các thiết bị khác tự động hết hiệu lực tức thời nhờ dấu vân tay pwd_v.
 *   - Cấp lại ngay JWT mới (data.token) cho phiên hiện tại để người dùng không bị gián đoạn.
 */
const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = req.body?.current_password ?? req.body?.currentPassword;
  const newPassword = req.body?.new_password ?? req.body?.newPassword;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới hợp lệ.'
    );
  }

  if (!currentPassword || !newPassword) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
    );
  }

  const newPwdErr = getPasswordValidationError(newPassword, 'Mật khẩu mới');
  if (newPwdErr) {
    throw new AppError(400, 'VALIDATION_ERROR', newPwdErr);
  }

  if (Buffer.byteLength(currentPassword, 'utf8') > MAX_BCRYPT_BYTES) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu hiện tại không chính xác.');
  }

  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [
    req.user.id,
  ]);
  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
  }

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isMatch) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Mật khẩu hiện tại không chính xác.');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

  const token = signUserToken(req.user, newHash);

  return sendSuccess(res, 200, 'Đổi mật khẩu thành công', { token });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
