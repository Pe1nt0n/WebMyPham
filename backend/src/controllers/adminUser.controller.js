/**
 * Controller Quản trị Hệ thống & Phân quyền Người dùng (/api/admin/* — Role: ADMIN)
 * Xử lý: Danh sách vai trò, tra cứu người dùng, tạo tài khoản mới, cập nhật hồ sơ,
 * phân quyền RBAC, khóa/mở khóa tài khoản, chống tự khóa/tự xóa/tự hạ quyền chính mình,
 * và xóa an toàn khóa ngoại (Soft-Lock vs Hard-Delete).
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  USERNAME_REGEX,
  EMAIL_REGEX,
  getPasswordValidationError,
  readRequiredString,
  readOptionalString,
  isNumericPrimitiveInput,
  escapeLikeKeyword,
  safeRollback,
} = require('../utils/validators');

const ALLOWED_USER_STATUSES = ['ACTIVE', 'LOCKED'];

/**
 * Truy vấn thông tin người dùng chuẩn (Tuyệt đối không trả cột password_hash)
 */
async function fetchSafeUserById(userId, queryExecutor = pool) {
  const [rows] = await queryExecutor.query(
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
 * Giải quyết chặt chẽ tham số vai trò từ role_id (số) và/hoặc role_name / role ('ADMIN' | 'SALES_STAFF' | 'CUSTOMER')
 * - Nếu truyền role_id sai -> báo lỗi 400 ngay (không âm thầm rơi xuống role_name).
 * - Nếu truyền đồng thời cả role_id và role_name -> kiểm tra hai giá trị phải khớp nhau.
 */
async function resolveRole(roleIdInput, roleNameInput) {
  const hasRoleId =
    roleIdInput !== undefined && roleIdInput !== null && String(roleIdInput).trim() !== '';
  const hasRoleName =
    roleNameInput !== undefined && roleNameInput !== null && String(roleNameInput).trim() !== '';

  let roleFromId = null;
  if (hasRoleId) {
    if (!isNumericPrimitiveInput(roleIdInput)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã vai trò (role_id) không hợp lệ.');
    }
    const numericRoleId = Number(
      typeof roleIdInput === 'string' ? roleIdInput.trim() : roleIdInput
    );
    if (!Number.isInteger(numericRoleId) || numericRoleId <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã vai trò (role_id) không hợp lệ.');
    }
    const [[roleRow]] = await pool.query('SELECT id, role_name FROM roles WHERE id = ? LIMIT 1', [
      numericRoleId,
    ]);
    if (!roleRow) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Mã vai trò (role_id) không tồn tại trong hệ thống.');
    }
    roleFromId = roleRow;
  }

  let roleFromName = null;
  if (hasRoleName) {
    if (typeof roleNameInput !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Tên vai trò (role_name) không hợp lệ.');
    }
    const normalizedName = roleNameInput.trim().toUpperCase();
    const [[roleRow]] = await pool.query(
      'SELECT id, role_name FROM roles WHERE role_name = ? LIMIT 1',
      [normalizedName]
    );
    if (!roleRow) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        "Tên vai trò chỉ chấp nhận 'ADMIN', 'SALES_STAFF' hoặc 'CUSTOMER'."
      );
    }
    roleFromName = roleRow;
  }

  if (roleFromId && roleFromName && roleFromId.id !== roleFromName.id) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Tham số role_id và role_name gửi lên không khớp nhau.'
    );
  }

  if (roleFromId) return roleFromId;
  if (roleFromName) return roleFromName;

  throw new AppError(
    400,
    'VALIDATION_ERROR',
    "Vai trò người dùng không hợp lệ (chấp nhận role_id hoặc role_name: 'ADMIN', 'SALES_STAFF', 'CUSTOMER')."
  );
}

/**
 * GET /api/admin/roles — Danh sách vai trò hệ thống kèm số lượng tài khoản thuộc từng vai trò
 */
const getRoles = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT r.id, r.role_name, r.description,
            COUNT(u.id) AS user_count
     FROM roles r
     LEFT JOIN users u ON u.role_id = r.id
     GROUP BY r.id, r.role_name, r.description
     ORDER BY r.id ASC`
  );

  const data = rows.map((row) => ({
    ...row,
    user_count: Number(row.user_count),
  }));

  return sendSuccess(res, 200, 'Lấy danh sách vai trò hệ thống thành công', data);
});

/**
 * GET /api/admin/users — Danh sách & bộ lọc tài khoản người dùng
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, status, search } = req.query;
  const conditions = [];
  const params = [];

  if (role !== undefined && String(role).trim() !== '') {
    const rawRole = String(role).trim();
    if (/^\d+$/.test(rawRole)) {
      conditions.push('u.role_id = ?');
      params.push(Number(rawRole));
    } else {
      conditions.push('r.role_name = ?');
      params.push(rawRole.toUpperCase());
    }
  }

  if (status !== undefined && String(status).trim() !== '') {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_USER_STATUSES.includes(normalizedStatus)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        "Trạng thái tài khoản chỉ nhận 'ACTIVE' hoặc 'LOCKED'."
      );
    }
    conditions.push('u.status = ?');
    params.push(normalizedStatus);
  }

  if (search !== undefined && String(search).trim() !== '') {
    if (typeof search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm tài khoản không hợp lệ.');
    }
    const keyword = `%${escapeLikeKeyword(search, 200)}%`;
    conditions.push(
      "(u.username LIKE ? ESCAPE '\\\\' OR u.full_name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR u.phone LIKE ? ESCAPE '\\\\')"
    );
    params.push(keyword, keyword, keyword, keyword);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.full_name, u.email, u.phone, u.address,
            u.role_id, r.role_name, u.status, u.created_at
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${whereSql}
     ORDER BY u.id ASC`,
    params
  );

  return sendSuccess(res, 200, 'Lấy danh sách tài khoản người dùng thành công', rows);
});

/**
 * POST /api/admin/users — Tạo mới tài khoản người dùng (Nhân viên / Khách hàng / Quản trị viên)
 */
const createUser = asyncHandler(async (req, res) => {
  const errors = [];

  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!username || !USERNAME_REGEX.test(username)) {
    errors.push(
      "Tên đăng nhập phải từ 3–50 ký tự, chỉ gồm chữ cái không dấu, chữ số, dấu '.', '_' hoặc '-' (không chứa khoảng trắng hay '@')."
    );
  }

  const pwdErr = getPasswordValidationError(req.body?.password, 'Mật khẩu');
  if (pwdErr) {
    errors.push(pwdErr);
  }

  const fullName = readRequiredString(req.body?.full_name, 'Họ và tên', 100, errors);

  const email =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 100 || !EMAIL_REGEX.test(email)) {
    errors.push('Địa chỉ email không đúng định dạng hoặc vượt quá 100 ký tự.');
  }

  const phone = readOptionalString(req.body?.phone, 'Số điện thoại', 20, errors);
  const address = readOptionalString(req.body?.address, 'Địa chỉ', 255, errors);

  let status = 'ACTIVE';
  if (req.body?.status !== undefined && req.body?.status !== null) {
    if (typeof req.body.status !== 'string') {
      errors.push("Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'.");
    } else if (req.body.status.trim() !== '') {
      status = req.body.status.trim().toUpperCase();
    }
  }
  if (!ALLOWED_USER_STATUSES.includes(status)) {
    errors.push("Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'.");
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  const targetRole = await resolveRole(req.body?.role_id, req.body?.role_name ?? req.body?.role);

  const [dupRows] = await pool.query(
    'SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
    [username, email]
  );
  if (dupRows.length > 0) {
    const dup = dupRows[0];
    if (dup.username.toLowerCase() === username.toLowerCase()) {
      throw new AppError(409, 'DUPLICATE_ENTRY', 'Tên đăng nhập này đã tồn tại trong hệ thống.');
    }
    throw new AppError(409, 'DUPLICATE_ENTRY', 'Địa chỉ email này đã tồn tại trong hệ thống.');
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);

  const [insertResult] = await pool.query(
    `INSERT INTO users (username, password_hash, full_name, email, phone, address, role_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, passwordHash, fullName, email, phone, address, targetRole.id, status]
  );

  const createdUser = await fetchSafeUserById(insertResult.insertId);
  return sendSuccess(res, 201, 'Tạo tài khoản người dùng thành công', createdUser);
});

/**
 * PUT /api/admin/users/:id — Cập nhật thông tin người dùng (Có bảo vệ chống tự khóa/tự hạ quyền/tự ghi đè mật khẩu)
 */
const updateUser = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã người dùng không hợp lệ.');
  }

  const existing = await fetchSafeUserById(targetUserId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản người dùng cần cập nhật.');
  }

  const errors = [];

  const fullName =
    req.body?.full_name !== undefined
      ? readRequiredString(req.body.full_name, 'Họ và tên', 100, errors)
      : existing.full_name;

  let email = existing.email;
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
      : existing.phone;

  const address =
    req.body?.address !== undefined
      ? readOptionalString(req.body.address, 'Địa chỉ', 255, errors)
      : existing.address;

  let nextStatus = existing.status;
  if (req.body?.status !== undefined && req.body?.status !== null) {
    if (typeof req.body.status !== 'string' || !req.body.status.trim()) {
      errors.push("Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'.");
    } else {
      nextStatus = req.body.status.trim().toUpperCase();
      if (!ALLOWED_USER_STATUSES.includes(nextStatus)) {
        errors.push("Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'.");
      }
    }
  } else if (req.body?.status === null) {
    errors.push("Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'.");
  }

  // Kiểm tra trường mật khẩu tùy chọn (chấp nhận undefined / null / "" là giữ nguyên mật khẩu cũ)
  let shouldUpdatePassword = false;
  if (req.body?.password !== undefined && req.body?.password !== null) {
    if (typeof req.body.password !== 'string') {
      errors.push('Mật khẩu mới không hợp lệ (bắt buộc là chuỗi ký tự).');
    } else if (req.body.password !== '') {
      const pwdErr = getPasswordValidationError(req.body.password, 'Mật khẩu mới');
      if (pwdErr) {
        errors.push(pwdErr);
      } else {
        shouldUpdatePassword = true;
      }
    }
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  let nextRoleId = existing.role_id;
  let nextRoleName = existing.role_name;
  const hasRoleField =
    (req.body?.role_id !== undefined && req.body?.role_id !== null) ||
    (req.body?.role_name !== undefined && req.body?.role_name !== null) ||
    (req.body?.role !== undefined && req.body?.role !== null);

  if (hasRoleField) {
    const resolved = await resolveRole(req.body?.role_id, req.body?.role_name ?? req.body?.role);
    nextRoleId = resolved.id;
    nextRoleName = resolved.role_name;
  }

  // Quy tắc bảo vệ an toàn quản trị: Admin không được phép tự khóa, tự hạ quyền hoặc tự ghi đè mật khẩu không qua xác minh
  if (targetUserId === req.user.id) {
    if (nextStatus === 'LOCKED') {
      throw new AppError(
        400,
        'SELF_ACTION_FORBIDDEN',
        'Không thể tự khóa tài khoản đang đăng nhập của chính mình!'
      );
    }
    if (nextRoleName !== 'ADMIN') {
      throw new AppError(
        400,
        'SELF_ACTION_FORBIDDEN',
        'Không thể tự thay đổi vai trò của chính tài khoản đang đăng nhập!'
      );
    }
    if (shouldUpdatePassword) {
      throw new AppError(
        400,
        'SELF_ACTION_FORBIDDEN',
        'Để bảo mật phiên quản trị, vui lòng đổi mật khẩu của chính bạn qua chức năng Đổi mật khẩu (/api/auth/change-password) kèm mật khẩu hiện tại.'
      );
    }
  }

  // Kiểm tra trùng email với người dùng khác
  const [dupEmail] = await pool.query(
    'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
    [email, targetUserId]
  );
  if (dupEmail.length > 0) {
    throw new AppError(409, 'DUPLICATE_ENTRY', 'Địa chỉ email này đã thuộc về tài khoản khác.');
  }

  if (shouldUpdatePassword) {
    const newHash = await bcrypt.hash(req.body.password, 10);
    await pool.query(
      `UPDATE users
       SET full_name = ?, email = ?, phone = ?, address = ?, password_hash = ?, role_id = ?, status = ?
       WHERE id = ?`,
      [fullName, email, phone, address, newHash, nextRoleId, nextStatus, targetUserId]
    );
  } else {
    await pool.query(
      `UPDATE users
       SET full_name = ?, email = ?, phone = ?, address = ?, role_id = ?, status = ?
       WHERE id = ?`,
      [fullName, email, phone, address, nextRoleId, nextStatus, targetUserId]
    );
  }

  const updatedUser = await fetchSafeUserById(targetUserId);
  return sendSuccess(res, 200, 'Cập nhật thông tin tài khoản thành công', updatedUser);
});

/**
 * PATCH /api/admin/users/:id/role — Thay đổi vai trò phân quyền (RBAC)
 */
const changeUserRole = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã người dùng không hợp lệ.');
  }

  if (targetUserId === req.user.id) {
    throw new AppError(
      400,
      'SELF_ACTION_FORBIDDEN',
      'Không thể tự thay đổi vai trò của chính tài khoản đang đăng nhập!'
    );
  }

  const existing = await fetchSafeUserById(targetUserId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
  }

  const targetRole = await resolveRole(req.body?.role_id, req.body?.role_name ?? req.body?.role);

  await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [targetRole.id, targetUserId]);

  const updatedUser = await fetchSafeUserById(targetUserId);
  return sendSuccess(res, 200, 'Cập nhật vai trò thành công', updatedUser);
});

/**
 * PATCH /api/admin/users/:id/status — Khóa / Mở khóa tài khoản người dùng (ACTIVE / LOCKED)
 */
const changeUserStatus = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã người dùng không hợp lệ.');
  }

  if (targetUserId === req.user.id) {
    throw new AppError(
      400,
      'SELF_ACTION_FORBIDDEN',
      'Không thể tự khóa tài khoản của chính mình!'
    );
  }

  const existing = await fetchSafeUserById(targetUserId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản người dùng.');
  }

  const nextStatus =
    typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
  if (!ALLOWED_USER_STATUSES.includes(nextStatus)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      "Trạng thái tài khoản chỉ chấp nhận 'ACTIVE' hoặc 'LOCKED'."
    );
  }

  await pool.query('UPDATE users SET status = ? WHERE id = ?', [nextStatus, targetUserId]);

  const updatedUser = await fetchSafeUserById(targetUserId);
  return sendSuccess(res, 200, 'Đã cập nhật trạng thái tài khoản thành công', updatedUser);
});

/**
 * DELETE /api/admin/users/:id — Xóa tài khoản an toàn bảo toàn Khóa ngoại (Soft-Lock vs Hard-Delete)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const targetUserId = Number(req.params.id);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0 || targetUserId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã người dùng không hợp lệ.');
  }

  if (targetUserId === req.user.id) {
    throw new AppError(
      400,
      'SELF_ACTION_FORBIDDEN',
      'Không thể tự xóa tài khoản đang đăng nhập!'
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [lockedUsers] = await connection.query(
      'SELECT id FROM users WHERE id = ? FOR UPDATE',
      [targetUserId]
    );

    if (lockedUsers.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản người dùng cần xóa.');
    }

    const [[orderRef]] = await connection.query(
      'SELECT COUNT(*) AS count FROM orders WHERE customer_id = ? OR staff_id = ?',
      [targetUserId, targetUserId]
    );
    const [[invoiceRef]] = await connection.query(
      'SELECT COUNT(*) AS count FROM invoices WHERE issued_by = ?',
      [targetUserId]
    );

    const totalRefs = Number(orderRef.count) + Number(invoiceRef.count);

    if (totalRefs > 0) {
      await connection.query("UPDATE users SET status = 'LOCKED' WHERE id = ?", [targetUserId]);
      await connection.commit();

      return sendSuccess(
        res,
        200,
        'Tài khoản đã phát sinh đơn hàng/hóa đơn nên được chuyển sang trạng thái Khóa (LOCKED) để bảo toàn lịch sử hệ thống.',
        {
          id: targetUserId,
          action: 'SOFT_LOCKED',
          status: 'LOCKED',
        }
      );
    }

    try {
      await connection.query('DELETE FROM users WHERE id = ?', [targetUserId]);
      await connection.commit();

      return sendSuccess(res, 200, 'Đã xóa tài khoản người dùng khỏi hệ thống.', {
        id: targetUserId,
        action: 'DELETED',
      });
    } catch (delErr) {
      if (delErr && (delErr.code === 'ER_ROW_IS_REFERENCED_2' || delErr.errno === 1451)) {
        await connection.query("UPDATE users SET status = 'LOCKED' WHERE id = ?", [targetUserId]);
        await connection.commit();

        return sendSuccess(
          res,
          200,
          'Tài khoản đã phát sinh đơn hàng/hóa đơn nên được chuyển sang trạng thái Khóa (LOCKED) để bảo toàn lịch sử hệ thống.',
          {
            id: targetUserId,
            action: 'SOFT_LOCKED',
            status: 'LOCKED',
          }
        );
      }
      throw delErr;
    }
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getRoles,
  getUsers,
  createUser,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
};
