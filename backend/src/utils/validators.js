/**
 * Bộ tiện ích kiểm tra kiểu dữ liệu đầu vào nghiêm ngặt & Bảo vệ truy vấn SQL (src/utils/validators.js)
 * Chống lỗi ép kiểu ngầm của JavaScript (null/"" -> 0, {} -> "[object Object]", Infinity, >72 byte bcrypt, LIKE wildcard)
 */
const AppError = require('./AppError');

// Username: 3–50 ký tự chữ, số, dấu chấm, gạch dưới, gạch ngang (CẤM khoảng trắng và '@')
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_HTTP_URL_REGEX = /^https?:\/\/\S+$/i;
const MAX_BCRYPT_BYTES = 72;

/**
 * Kiểm tra mật khẩu đầu vào chuẩn bảo mật bcryptjs:
 * - Bắt buộc kiểu string (chặn {}, [], number, null)
 * - Độ dài >= 6 ký tự và không chỉ toàn khoảng trắng
 * - Kích thước UTF-8 <= 72 byte (chống cắt cụt mật khẩu và chống DoS CPU trên bcryptjs)
 * @returns {string|null} Chuỗi thông báo lỗi nếu vi phạm, hoặc null nếu hợp lệ
 */
function getPasswordValidationError(rawPassword, fieldLabel = 'Mật khẩu') {
  if (typeof rawPassword !== 'string') {
    return `${fieldLabel} không hợp lệ (bắt buộc là chuỗi ký tự).`;
  }
  if (rawPassword.length < 6 || rawPassword.trim().length === 0) {
    return `${fieldLabel} phải có tối thiểu 6 ký tự và không được chỉ chứa khoảng trắng.`;
  }
  if (Buffer.byteLength(rawPassword, 'utf8') > MAX_BCRYPT_BYTES) {
    return `${fieldLabel} vượt quá giới hạn tối đa 72 byte của thuật toán băm bảo mật.`;
  }
  return null;
}

/**
 * Đọc và kiểm tra trường chuỗi bắt buộc (kèm giới hạn độ dài cột VARCHAR trong CSDL)
 */
function readRequiredString(raw, fieldLabel, maxLength, errors = null) {
  if (typeof raw !== 'string') {
    const msg = `${fieldLabel} không được để trống và phải là chuỗi ký tự hợp lệ.`;
    if (errors) {
      errors.push(msg);
      return '';
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    const msg = `${fieldLabel} không được để trống.`;
    if (errors) {
      errors.push(msg);
      return '';
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  if (maxLength && trimmed.length > maxLength) {
    const msg = `${fieldLabel} không được vượt quá ${maxLength} ký tự.`;
    if (errors) {
      errors.push(msg);
      return trimmed;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  return trimmed;
}

/**
 * Đọc và kiểm tra trường chuỗi tùy chọn (chấp nhận undefined / null / "" -> trả về null)
 */
function readOptionalString(raw, fieldLabel, maxLength, errors = null) {
  if (raw === undefined || raw === null) {
    return null;
  }

  if (typeof raw !== 'string') {
    const msg = `${fieldLabel} phải là chuỗi ký tự hợp lệ.`;
    if (errors) {
      errors.push(msg);
      return null;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (maxLength && trimmed.length > maxLength) {
    const msg = `${fieldLabel} không được vượt quá ${maxLength} ký tự.`;
    if (errors) {
      errors.push(msg);
      return trimmed;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  return trimmed;
}

/**
 * Kiểm tra một giá trị thô có phải số hoặc chuỗi số hợp lệ để ép kiểu Number() hay không
 * (Chặn triệt đối null, "", "   ", true/false, mảng [], object {})
 */
function isNumericPrimitiveInput(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return false;
    return Number.isFinite(Number(trimmed));
  }
  return false;
}

/**
 * Phân tích số thực hữu hạn trong miền [min, max] (dùng cho price, min_price, max_price)
 */
function parseFiniteNumber(
  raw,
  fieldLabel,
  { min = 0, max = 9999999999.99, errors = null } = {}
) {
  if (!isNumericPrimitiveInput(raw)) {
    const msg = `${fieldLabel} không hợp lệ (phải là số hữu hạn).`;
    if (errors) {
      errors.push(msg);
      return NaN;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  const num = Number(typeof raw === 'string' ? raw.trim() : raw);
  if (!Number.isFinite(num) || num < min || num > max) {
    const msg =
      min === 0
        ? `${fieldLabel} phải là số hợp lệ từ ${min} đến ${max.toLocaleString('en-US')}.`
        : `${fieldLabel} nằm ngoài phạm vi giá trị hợp lệ.`;
    if (errors) {
      errors.push(msg);
      return NaN;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  return Math.round(num * 100) / 100;
}

/**
 * Phân tích số nguyên dương / không âm trong miền cho phép (dùng cho id, quantity, stock_quantity)
 */
function parseBoundedInt(
  raw,
  fieldLabel,
  { min = 1, max = 2147483647, errors = null } = {}
) {
  if (!isNumericPrimitiveInput(raw)) {
    const msg = `${fieldLabel} phải là số nguyên hợp lệ.`;
    if (errors) {
      errors.push(msg);
      return NaN;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  const num = Number(typeof raw === 'string' ? raw.trim() : raw);
  if (!Number.isInteger(num) || num < min || num > max) {
    const msg = `${fieldLabel} phải là số nguyên trong khoảng từ ${min} đến ${max}.`;
    if (errors) {
      errors.push(msg);
      return NaN;
    }
    throw new AppError(400, 'VALIDATION_ERROR', msg);
  }

  return num;
}

/**
 * Escape ký tự đại diện (\, %, _) cho toán tử SQL LIKE ... ESCAPE '\\'
 */
function escapeLikeKeyword(rawSearch, maxLength = 200) {
  const trimmed = String(rawSearch ?? '')
    .trim()
    .slice(0, maxLength);
  return trimmed.replace(/[\\%_]/g, '\\$&');
}

/**
 * Thực thi rollback an toàn trong khối catch của Transaction (không làm mất lỗi gốc nếu socket DB đứt)
 */
async function safeRollback(connection) {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (_rollbackErr) {
    // Giữ nguyên ngoại lệ gốc để chuyển tới Global Error Handler
  }
}

module.exports = {
  USERNAME_REGEX,
  EMAIL_REGEX,
  SAFE_HTTP_URL_REGEX,
  MAX_BCRYPT_BYTES,
  getPasswordValidationError,
  readRequiredString,
  readOptionalString,
  isNumericPrimitiveInput,
  parseFiniteNumber,
  parseBoundedInt,
  escapeLikeKeyword,
  safeRollback,
};
