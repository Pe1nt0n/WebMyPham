import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    container: 'bg-white border-emerald-200/90 shadow-lg shadow-emerald-950/5',
    accentBar: 'bg-emerald-500',
    iconClass: 'text-emerald-600 bg-emerald-50',
    titleClass: 'text-slate-900',
    defaultTitle: 'Thành công',
    defaultDuration: 3500,
  },
  error: {
    icon: AlertCircle,
    container: 'bg-white border-rose-200/90 shadow-lg shadow-rose-950/5',
    accentBar: 'bg-rose-500',
    iconClass: 'text-rose-600 bg-rose-50',
    titleClass: 'text-slate-900',
    defaultTitle: 'Có lỗi xảy ra',
    defaultDuration: 4800,
  },
  warning: {
    icon: AlertTriangle,
    container: 'bg-white border-amber-200/90 shadow-lg shadow-amber-950/5',
    accentBar: 'bg-amber-500',
    iconClass: 'text-amber-600 bg-amber-50',
    titleClass: 'text-slate-900',
    defaultTitle: 'Lưu ý',
    defaultDuration: 4200,
  },
  info: {
    icon: Info,
    container: 'bg-white border-sky-200/90 shadow-lg shadow-sky-950/5',
    accentBar: 'bg-sky-500',
    iconClass: 'text-sky-600 bg-sky-50',
    titleClass: 'text-slate-900',
    defaultTitle: 'Thông báo',
    defaultDuration: 3500,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const recentMessagesRef = useRef(new Map());
  const idCounterRef = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const pushToast = useCallback(
    (type, message, optionsOrDuration) => {
      if (!message) return null;
      const text = String(message).trim();
      if (!text) return null;

      // Chống hiển thị trùng lặp cùng 1 nội dung thông báo trong khoảng 600ms
      const now = Date.now();
      const lastShownAt = recentMessagesRef.current.get(text) || 0;
      if (now - lastShownAt < 600) {
        return null;
      }
      recentMessagesRef.current.set(text, now);

      const styleConfig = TOAST_STYLES[type] || TOAST_STYLES.info;
      const options =
        typeof optionsOrDuration === 'number'
          ? { duration: optionsOrDuration }
          : optionsOrDuration || {};

      const duration = options.duration ?? styleConfig.defaultDuration;
      const title = options.title || null;

      idCounterRef.current += 1;
      const id = `toast-${now}-${idCounterRef.current}`;

      setToasts((prev) => [...prev.slice(-4), { id, type, message: text, title }]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback((msg, opts) => pushToast('success', msg, opts), [pushToast]);
  const error = useCallback((msg, opts) => pushToast('error', msg, opts), [pushToast]);
  const warning = useCallback((msg, opts) => pushToast('warning', msg, opts), [pushToast]);
  const info = useCallback((msg, opts) => pushToast('info', msg, opts), [pushToast]);

  const contextValue = useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      dismiss,
      clearAll,
    }),
    [success, error, warning, info, dismiss, clearAll]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Vùng hiển thị Toast góc trên bên phải - tự ẩn khi in hóa đơn */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none no-print print:hidden"
      >
        {toasts.map((toastItem) => {
          const style = TOAST_STYLES[toastItem.type] || TOAST_STYLES.info;
          const IconComponent = style.icon;

          return (
            <div
              key={toastItem.id}
              role="alert"
              className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 pr-9 transition-all animate-toast-in ${style.container}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accentBar}`} />
              <div className="flex items-start gap-3 pl-1">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconClass}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  {toastItem.title && (
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${style.titleClass}`}>
                      {toastItem.title}
                    </p>
                  )}
                  <p className="text-sm font-medium leading-snug text-slate-700 break-words">
                    {toastItem.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toastItem.id)}
                aria-label="Đóng thông báo"
                className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() phải được sử dụng bên trong <ToastProvider>.');
  }
  return ctx;
}
