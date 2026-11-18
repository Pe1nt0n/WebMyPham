/**
 * Bộ phân tích ngày tháng linh hoạt cho bộ lọc đơn hàng, hóa đơn và báo cáo doanh thu
 * Hỗ trợ đồng thời chuẩn quốc tế ISO (YYYY-MM-DD) và chuẩn Việt Nam (DD/MM/YYYY hoặc DD-MM-YYYY)
 */
const AppError = require('./AppError');

/**
 * Kiểm tra một bộ năm - tháng - ngày có tồn tại thực tế trên lịch dương hay không
 * (Ví dụ: chặn ngày 31/02/2026 hoặc tháng 13)
 */
function isValidCalendarDate(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1970 || year > 2100) {
    return false;
  }
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Chuyển chuỗi ngày đầu vào ('YYYY-MM-DD' hoặc 'DD/MM/YYYY') về chuẩn 'YYYY-MM-DD' dùng cho MySQL
 * @param {string|undefined} rawDate - Giá trị query param từ client
 * @param {string} fieldLabel - Tên trường để báo lỗi tiếng Việt rõ ràng
 * @returns {string|null} Chuỗi 'YYYY-MM-DD' hoặc null nếu không truyền
 */
function parseFlexibleDate(rawDate, fieldLabel = 'Ngày lọc') {
  if (rawDate === undefined || rawDate === null || String(rawDate).trim() === '') {
    return null;
  }

  const trimmed = String(rawDate).trim();

  // Trường hợp 1: Chuẩn ISO YYYY-MM-DD (hoặc YYYY/MM/DD)
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      throw new AppError(400, 'VALIDATION_ERROR', `${fieldLabel} '${trimmed}' không phải là ngày hợp lệ.`);
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Trường hợp 2: Chuẩn Việt Nam DD/MM/YYYY (hoặc DD-MM-YYYY)
  const vnMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vnMatch) {
    const day = Number(vnMatch[1]);
    const month = Number(vnMatch[2]);
    const year = Number(vnMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      throw new AppError(400, 'VALIDATION_ERROR', `${fieldLabel} '${trimmed}' không phải là ngày hợp lệ.`);
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  throw new AppError(
    400,
    'VALIDATION_ERROR',
    `${fieldLabel} '${trimmed}' sai định dạng. Vui lòng nhập theo chuẩn YYYY-MM-DD hoặc DD/MM/YYYY.`
  );
}

/**
 * Phân tích cặp tham số khoảng thời gian (from_date, to_date) và kiểm tra tính hợp lệ
 */
function parseDateRange(fromRaw, toRaw) {
  const fromDate = parseFlexibleDate(fromRaw, 'Từ ngày (from_date)');
  const toDate = parseFlexibleDate(toRaw, 'Đến ngày (to_date)');

  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Ngày bắt đầu (from_date) không được lớn hơn ngày kết thúc (to_date).'
    );
  }

  return { fromDate, toDate };
}

module.exports = {
  parseFlexibleDate,
  parseDateRange,
};
