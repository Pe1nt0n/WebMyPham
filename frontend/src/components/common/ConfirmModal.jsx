import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, Trash2, X } from 'lucide-react';
import { useModalDialog } from '../../utils/useModalDialog';

const VARIANT_CONFIG = {
  danger: {
    icon: Trash2,
    iconWrapClass: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
    confirmBtnClass:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm shadow-rose-600/20',
  },
  warning: {
    icon: AlertTriangle,
    iconWrapClass: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    confirmBtnClass:
      'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm shadow-amber-600/20',
  },
  primary: {
    icon: CheckCircle2,
    iconWrapClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    confirmBtnClass:
      'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-700 shadow-sm shadow-slate-900/20',
  },
  info: {
    icon: HelpCircle,
    iconWrapClass: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
    confirmBtnClass:
      'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 shadow-sm shadow-sky-600/20',
  },
};

/**
 * Modal xác nhận hành động dùng chung toàn hệ thống (Xóa SP, Duyệt/Hủy đơn, Khóa/Mở khóa User...)
 * Hỗ trợ variants: 'danger' | 'primary' | 'warning' và trạng thái bất đồng bộ loading.
 */
export function ConfirmModal({
  isOpen,
  open,
  onClose,
  onCancel,
  onConfirm,
  title = 'Xác nhận thao tác',
  message,
  description,
  children,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant = 'primary',
  loading = false,
  isLoading = false,
}) {
  const visible = Boolean(isOpen ?? open);
  const busy = Boolean(loading || isLoading);
  const handleClose = onClose || onCancel || (() => {});

  useModalDialog({
    isOpen: visible,
    onClose: handleClose,
    disabled: busy,
  });

  if (!visible) return null;

  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.primary;
  const IconComponent = config.icon;
  const bodyMessage = message ?? description;
  const resolvedConfirmText = confirmText || confirmLabel || 'Xác nhận';
  const resolvedCancelText = cancelText || cancelLabel || 'Hủy bỏ';

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 no-print print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Lớp phủ mờ nền */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
        onClick={() => {
          if (!busy) handleClose();
        }}
      />

      {/* Hộp nội dung Modal */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5 animate-modal-in">
        <button
          type="button"
          disabled={busy}
          onClick={handleClose}
          aria-label="Đóng hộp thoại"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconWrapClass}`}>
            <IconComponent className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 pr-4">
            <h3
              id="confirm-modal-title"
              className="text-base font-semibold leading-6 text-slate-900"
            >
              {title}
            </h3>

            {bodyMessage && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {bodyMessage}
              </p>
            )}

            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resolvedCancelText}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${config.confirmBtnClass}`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{resolvedConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
