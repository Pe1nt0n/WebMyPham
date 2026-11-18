import { formatDate, isoToDDMMYYYY } from '../../utils/format.js';

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

function readThreeDigits(number, showZeroHundred) {
  const hundreds = Math.floor(number / 100);
  const tens = Math.floor((number % 100) / 10);
  const units = number % 10;
  const parts = [];

  if (hundreds > 0 || showZeroHundred) {
    parts.push(`${DIGITS[hundreds]} trăm`);
  }

  if (tens === 0) {
    if (units > 0 && (hundreds > 0 || showZeroHundred)) {
      parts.push('linh');
    }
  } else if (tens === 1) {
    parts.push('mười');
  } else {
    parts.push(`${DIGITS[tens]} mươi`);
  }

  if (units > 0) {
    if (units === 1 && tens >= 2) {
      parts.push('mốt');
    } else if (units === 5 && tens >= 1) {
      parts.push('lăm');
    } else {
      parts.push(DIGITS[units]);
    }
  }

  return parts.join(' ');
}

/**
 * Đọc số tiền VNĐ thành chữ tiếng Việt chuẩn chứng từ kế toán.
 * Ví dụ: 1235000 -> "Một triệu hai trăm ba mươi lăm nghìn đồng chẵn"
 * @param {number | string} amount
 * @returns {string}
 */
export function readVietnameseMoney(amount) {
  const rawNum = Number(amount);
  if (!Number.isFinite(rawNum)) return 'Không đồng chẵn';
  const numeric = Math.round(rawNum);
  if (numeric <= 0) return 'Không đồng chẵn';

  let remaining = Math.abs(numeric);
  const groups = [];

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const segments = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const groupValue = groups[i];
    if (groupValue === 0) continue;

    const isHighestGroup = i === groups.length - 1;
    const words = readThreeDigits(groupValue, !isHighestGroup);
    const unitLabel = GROUP_UNITS[i] || '';
    segments.push(unitLabel ? `${words} ${unitLabel}` : words);
  }

  const joined = segments.join(' ').replace(/\s+/g, ' ').trim();
  if (!joined) return 'Không đồng chẵn';

  const capitalized = joined.charAt(0).toUpperCase() + joined.slice(1);
  const hasExactThousand = numeric % 1000 === 0;
  return `${capitalized} đồng${hasExactThousand ? ' chẵn' : ''}`;
}

/**
 * Định dạng chuỗi ngày sang kiểu trang trọng trên Hóa đơn ("Ngày 15 tháng 09 năm 2026")
 */
export function formatVietnameseLongDate(dateInput) {
  const ddmmyyyy = formatDate(dateInput);
  if (!ddmmyyyy) return '';
  const [day, month, year] = ddmmyyyy.split('/');
  if (!day || !month || !year) return ddmmyyyy;
  return `Ngày ${day} tháng ${month} năm ${year}`;
}

/**
 * Trả về cấu hình hiển thị trạng thái tồn kho trực quan
 * @param {number} stockQuantity
 */
export function getStockStatusMeta(stockQuantity) {
  const qty = Number(stockQuantity) || 0;
  if (qty <= 0) {
    return {
      code: 'OUT_OF_STOCK',
      label: 'Hết hàng',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      dotClass: 'bg-rose-500',
      numClass: 'text-rose-600 font-bold',
    };
  }
  if (qty <= 5) {
    return {
      code: 'LOW_STOCK',
      label: 'Sắp hết kho',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      dotClass: 'bg-amber-500',
      numClass: 'text-amber-700 font-bold',
    };
  }
  return {
    code: 'IN_STOCK',
    label: 'Còn hàng',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    numClass: 'text-slate-800 font-semibold',
  };
}

/**
 * Định dạng số tiền rút gọn cho trục tung YAxis của biểu đồ Recharts (VD: 1.5tr, 500k)
 */
export function formatCompactVnd(value) {
  const num = Number(value) || 0;
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
  }
  if (num >= 1_000) {
    return `${Math.round(num / 1_000)}k`;
  }
  return String(num);
}

/**
 * Trả về khoảng ngày định dạng dd/mm/yyyy cho các nút chọn nhanh báo cáo / hóa đơn
 */
export function getQuickDateRangeVN(presetKey) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

  if (presetKey === 'all') {
    return { fromVN: '', toVN: '', fromISO: '', toISO: '' };
  }

  if (presetKey === 'year_2026') {
    return {
      fromVN: '01/01/2026',
      toVN: '31/12/2026',
      fromISO: '2026-01-01',
      toISO: '2026-12-31',
    };
  }

  if (presetKey === 'this_month') {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const fISO = toISO(y, m, 1);
    const tISO = toISO(y, m, lastDay);
    return {
      fromVN: isoToDDMMYYYY(fISO),
      toVN: isoToDDMMYYYY(tISO),
      fromISO: fISO,
      toISO: tISO,
    };
  }

  if (presetKey === 'last_3_months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fISO = toISO(start.getFullYear(), start.getMonth() + 1, 1);
    const tISO = toISO(
      endLastDay.getFullYear(),
      endLastDay.getMonth() + 1,
      endLastDay.getDate()
    );
    return {
      fromVN: isoToDDMMYYYY(fISO),
      toVN: isoToDDMMYYYY(tISO),
      fromISO: fISO,
      toISO: tISO,
    };
  }

  return { fromVN: '', toVN: '', fromISO: '', toISO: '' };
}

/**
 * Một số ảnh mỹ phẩm mẫu chất lượng cao (Unsplash) hỗ trợ nhân viên demo thêm mới SP nhanh
 */
export const SAMPLE_PRODUCT_IMAGES = [
  {
    label: 'Serum thủy tinh',
    url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Kem chống nắng',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Son kem cao cấp',
    url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Nước hoa sang trọng',
    url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
  },
];
