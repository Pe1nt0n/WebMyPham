export { getApiErrorMessage } from '../api/clients.js';

/**
 * Định dạng tiền tệ VNĐ chuẩn Việt Nam (VD: 485000 -> "485.000 ₫")
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
export function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0 ₫';
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(num));
  return `${formatted} ₫`;
}

/**
 * Chuyển đổi chuỗi ngày / đối tượng Date thành đối tượng Date hợp lệ hoặc các thành phần ngày
 */
function toValidDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // Nếu chuỗi thuần YYYY-MM-DD, khởi tạo theo giờ local để tránh lệch múi giờ UTC
  const bareIsoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (bareIsoMatch) {
    const year = Number(bareIsoMatch[1]);
    const month = Number(bareIsoMatch[2]) - 1;
    const day = Number(bareIsoMatch[3]);
    const localDate = new Date(year, month, day);
    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month &&
      localDate.getDate() === day
    ) {
      return localDate;
    }
    return null;
  }

  // Hỗ trợ chuỗi MySQL DATETIME "YYYY-MM-DD HH:mm:ss"
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)
    ? str.replace(' ', 'T')
    : str;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad2(num) {
  return String(num).padStart(2, '0');
}

/**
 * Định dạng ngày theo chuẩn Việt Nam: dd/mm/yyyy (VD: "18/11/2026")
 * @param {string | Date | null | undefined} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Nếu đã ở định dạng dd/mm/yyyy hợp lệ thì chuẩn hóa 2 chữ số và trả về
  const isoFromVN = parseDDMMYYYYToISO(str);
  if (isoFromVN && /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) {
    return isoToDDMMYYYY(isoFromVN);
  }

  const d = toValidDate(dateStr);
  if (!d) return '';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Định dạng giờ & ngày theo chuẩn Việt Nam: HH:mm - dd/mm/yyyy (VD: "10:30 - 18/11/2026")
 * @param {string | Date | null | undefined} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  const d = toValidDate(dateStr);
  if (!d) return '';
  const hours = pad2(d.getHours());
  const minutes = pad2(d.getMinutes());
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

/**
 * Chuyển chuỗi ngày Việt Nam "dd/mm/yyyy" (hoặc "d/m/yyyy", "YYYY-MM-DD") sang chuẩn ISO "YYYY-MM-DD" để gửi API.
 * Trả về null nếu rỗng hoặc sai ngày lịch thực tế (VD: 31/02/2026 -> null).
 * @param {string | null | undefined} str
 * @returns {string | null}
 */
export function parseDDMMYYYYToISO(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (!trimmed) return null;

  // Hỗ trợ trường hợp chuỗi đầu vào đã là YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const check = new Date(year, month - 1, day);
    if (
      year >= 1900 &&
      year <= 2100 &&
      check.getFullYear() === year &&
      check.getMonth() === month - 1 &&
      check.getDate() === day
    ) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
    return null;
  }

  // Phân tích định dạng dd/mm/yyyy hoặc dd-mm-yyyy
  const vnMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (!vnMatch) return null;

  const day = Number(vnMatch[1]);
  const month = Number(vnMatch[2]);
  const year = Number(vnMatch[3]);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Kiểm tra chuỗi người dùng nhập có đúng định dạng ngày Việt Nam dd/mm/yyyy hợp lệ hay không
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDDMMYYYY(str) {
  if (!str || !String(str).trim()) return false;
  if (!/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(String(str).trim())) return false;
  return parseDDMMYYYYToISO(str) !== null;
}

/**
 * Chuyển chuỗi ISO ("YYYY-MM-DD" hoặc ISO datetime) sang định dạng Việt Nam "dd/mm/yyyy"
 * @param {string | Date | null | undefined} iso
 * @returns {string}
 */
export function isoToDDMMYYYY(iso) {
  if (!iso) return '';
  const str = String(iso).trim();
  if (!str) return '';

  const isoPrefixMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (isoPrefixMatch) {
    const [, year, month, day] = isoPrefixMatch;
    return `${day}/${month}/${year}`;
  }

  return formatDate(iso);
}

/**
 * Cấu hình nhãn & màu sắc badge cho Trạng thái Đơn hàng (orders.status)
 */
export const ORDER_STATUS_CONFIG = {
  PENDING: {
    value: 'PENDING',
    label: 'Chờ xác nhận',
    shortLabel: 'Chờ duyệt',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-inset ring-amber-600/15',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClass: 'bg-amber-500',
    description: 'Đơn hàng mới tạo, đang chờ nhân viên kiểm tra tồn kho và xác nhận.',
  },
  APPROVED: {
    value: 'APPROVED',
    label: 'Đã duyệt & Xuất HĐ',
    shortLabel: 'Đã duyệt',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-inset ring-emerald-600/15',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    description: 'Đơn hàng đã được duyệt, trừ tồn kho và phát hành hóa đơn bán lẻ.',
  },
  CANCELLED: {
    value: 'CANCELLED',
    label: 'Đã hủy',
    shortLabel: 'Đã hủy',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 ring-1 ring-inset ring-rose-600/15',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    dotClass: 'bg-rose-500',
    description: 'Đơn hàng đã bị hủy.',
  },
};

/**
 * Nhãn hiển thị tiếng Việt cho Phương thức Thanh toán (orders.payment_method)
 */
export const PAYMENT_METHOD_LABELS = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  E_WALLET: 'Ví điện tử (MoMo / ZaloPay)',
};

/**
 * Cấu hình mở rộng cho Phương thức Thanh toán (phục vụ thẻ chọn Checkout & Badge)
 */
export const PAYMENT_METHOD_CONFIG = {
  COD: {
    value: 'COD',
    label: PAYMENT_METHOD_LABELS.COD,
    shortLabel: 'COD',
    description: 'Kiểm tra mỹ phẩm nguyên tem niêm phong trước khi thanh toán tiền mặt cho shipper.',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  BANK_TRANSFER: {
    value: 'BANK_TRANSFER',
    label: PAYMENT_METHOD_LABELS.BANK_TRANSFER,
    shortLabel: 'Chuyển khoản',
    description: 'Chuyển khoản nhanh 24/7 qua mã VietQR ngân hàng chính thức của Lumière Cosmetics.',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  E_WALLET: {
    value: 'E_WALLET',
    label: PAYMENT_METHOD_LABELS.E_WALLET,
    shortLabel: 'Ví điện tử',
    description: 'Thanh toán tiện lợi qua ví điện tử MoMo, ZaloPay hoặc VNPay.',
    badgeClass: 'bg-pink-50 text-pink-700 border border-pink-200',
  },
};

/**
 * Cấu hình nhãn & màu sắc badge cho 3 Vai trò Hệ thống (roles.role_name)
 */
export const ROLE_CONFIG = {
  ADMIN: {
    value: 'ADMIN',
    role_id: 1,
    label: 'Quản trị viên',
    color: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
    dotClass: 'bg-purple-500',
    portalPath: '/admin',
  },
  SALES_STAFF: {
    value: 'SALES_STAFF',
    role_id: 2,
    label: 'Nhân viên bán hàng',
    color: 'sky',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
    dotClass: 'bg-sky-500',
    portalPath: '/staff',
  },
  CUSTOMER: {
    value: 'CUSTOMER',
    role_id: 3,
    label: 'Khách hàng',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    dotClass: 'bg-rose-500',
    portalPath: '/',
  },
};

/**
 * Cấu hình trạng thái tài khoản người dùng (users.status)
 */
export const USER_STATUS_CONFIG = {
  ACTIVE: {
    value: 'ACTIVE',
    label: 'Đang hoạt động',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  LOCKED: {
    value: 'LOCKED',
    label: 'Đã khóa',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

/**
 * Cấu hình trạng thái hiển thị sản phẩm (products.status)
 */
export const PRODUCT_STATUS_CONFIG = {
  ACTIVE: {
    value: 'ACTIVE',
    label: 'Đang bán',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  HIDDEN: {
    value: 'HIDDEN',
    label: 'Đang ẩn',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

/**
 * Kiểm tra URL hình ảnh an toàn (chặn tuyệt đối scheme độc hại như javascript:, data:text/html, data:image/svg+xml...)
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
export function isSafeImageUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (/^https?:\/\/\S+$/i.test(trimmed)) {
    return true;
  }
  // Cho phép đường dẫn tương đối nội bộ (/images/..., ./assets/...) nhưng chặn protocol-relative (//evil.com)
  if ((trimmed.startsWith('/') && !trimmed.startsWith('//')) || trimmed.startsWith('./')) {
    return true;
  }
  // Cho phép ảnh raster base64 hợp lệ (không cho phép svg+xml để tránh nhúng script)
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Chuẩn hóa URL hình ảnh an toàn trước khi truyền vào thẻ <img>
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function sanitizeImageUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  return isSafeImageUrl(trimmed) ? trimmed : '';
}

/**
 * Danh sách phân loại làn da chuẩn hóa dùng cho bộ lọc Storefront & Form Sản phẩm Staff
 */
export const SKIN_TYPES = [
  'Mọi loại da',
  'Da dầu mụn',
  'Da khô',
  'Da nhạy cảm',
  'Da hỗn hợp',
];
