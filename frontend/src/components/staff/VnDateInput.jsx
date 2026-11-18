import { useEffect, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import {
  isoToDDMMYYYY,
  isValidDDMMYYYY,
  parseDDMMYYYYToISO,
} from '../../utils/format';

/**
 * Ô nhập ngày chuẩn Việt Nam (dd/mm/yyyy) kết hợp nút chọn lịch nhanh.
 * - Hiển thị và cho phép gõ trực tiếp định dạng dd/mm/yyyy (VD: 15/09/2026)
 * - Tự động hỗ trợ chèn dấu '/' mượt mà khi gõ số liên tiếp ở cuối chuỗi (không làm lệch khi sửa giữa chuỗi)
 * - Có nút mở lịch native tự chuyển sang dd/mm/yyyy qua isoToDDMMYYYY
 */
export function VnDateInput({
  label,
  value = '',
  onChange,
  placeholder = 'dd/mm/yyyy',
  id,
  className = '',
}) {
  const hiddenDateRef = useRef(null);
  const [touched, setTouched] = useState(false);

  const trimmed = String(value || '').trim();
  const hasValue = trimmed.length > 0;
  const validVN = hasValue && isValidDDMMYYYY(trimmed);

  useEffect(() => {
    if (!hasValue || validVN) {
      setTouched(false);
    }
  }, [hasValue, validVN]);

  // Cảnh báo khi đã nhập >= 8 ký tự sai lịch thực tế (VD: 31/02/2026) hoặc khi đã rời ô (onBlur) mà ngày chưa hợp lệ
  const isInvalid = hasValue && !validVN && (trimmed.length >= 8 || touched);
  const isoValue = parseDDMMYYYYToISO(trimmed) || '';

  const handleTextChange = (e) => {
    const raw = e.target.value;
    const isTypingAtEnd = e.target.selectionStart === raw.length;

    // Nếu người dùng đang xóa ký tự hoặc đang sửa ở giữa chuỗi thì giữ nguyên để không nhảy con trỏ
    if (raw.length < value.length || !isTypingAtEnd) {
      onChange(raw.slice(0, 10));
      return;
    }

    // Nếu người dùng gõ hoàn toàn là chữ số liên tiếp ở cuối chuỗi (VD: 15092026), tự chèn dấu '/'
    const digitsOnly = raw.replace(/\D/g, '');
    if (/^\d+$/.test(raw.replace(/\//g, '')) && !raw.includes('-')) {
      if (digitsOnly.length <= 2) {
        onChange(raw);
      } else if (digitsOnly.length <= 4) {
        onChange(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`);
      } else {
        onChange(
          `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`
        );
      }
      return;
    }

    onChange(raw.slice(0, 10));
  };

  const handleBlur = () => {
    if (!hasValue) {
      setTouched(false);
      return;
    }
    setTouched(true);
    // Tự chuẩn hóa d/m/yyyy hợp lệ sang dd/mm/yyyy (VD: 5/9/2026 -> 05/09/2026)
    const normalizedIso = parseDDMMYYYYToISO(trimmed);
    if (normalizedIso) {
      const formattedVN = isoToDDMMYYYY(normalizedIso);
      if (formattedVN !== value) {
        onChange(formattedVN);
      }
    }
  };

  const handleNativePickerChange = (e) => {
    const pickedIso = e.target.value;
    if (!pickedIso) {
      setTouched(false);
      onChange('');
      return;
    }
    setTouched(false);
    onChange(isoToDDMMYYYY(pickedIso));
  };

  const openNativePicker = () => {
    const el = hiddenDateRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // Fallback focus/click nếu trình duyệt chặn showPicker
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1 text-xs font-semibold text-slate-600 flex items-center justify-between"
        >
          <span>{label}</span>
          <span className="font-normal text-[11px] text-slate-400">dd/mm/yyyy</span>
        </label>
      )}

      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={10}
          aria-invalid={isInvalid}
          className={`w-full rounded-xl border bg-white pl-3 pr-16 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 ${
            isInvalid
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
              : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
          }`}
        />

        {/* Input date ẩn phục vụ chọn lịch nhanh rồi tự chuyển về dd/mm/yyyy */}
        <input
          ref={hiddenDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={isoValue}
          onChange={handleNativePickerChange}
          className="pointer-events-none absolute right-2 top-1/2 h-0 w-0 -translate-y-1/2 opacity-0"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {hasValue && (
            <button
              type="button"
              onClick={() => {
                setTouched(false);
                onChange('');
              }}
              aria-label="Xóa ngày"
              title="Xóa ngày"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={openNativePicker}
            aria-label="Chọn ngày từ lịch"
            title="Chọn ngày từ lịch"
            className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isInvalid && (
        <span className="mt-1 text-[11px] font-medium text-rose-600">
          Ngày không hợp lệ hoặc không tồn tại (định dạng dd/mm/yyyy)
        </span>
      )}
    </div>
  );
}

export default VnDateInput;
