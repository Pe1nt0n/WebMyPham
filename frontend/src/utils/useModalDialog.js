import { useEffect, useRef } from 'react';

/**
 * Bộ đếm khóa cuộn trang toàn cục (Reference-counted scroll lock) & Ngăn xếp Modal (Modal Stack):
 * - Đảm bảo mở nhiều Modal lồng nhau (VD: OrderDetailModal -> CancelOrderModal) hoặc chuyển route
 *   đột ngột (VD: bấm "In Hóa đơn" nhảy sang /staff/invoices/:id/print) luôn khôi phục chính xác
 *   document.body.style.overflow, không bao giờ kẹt cuộn trang hay cắt trang in PDF.
 * - Khi nhấn phím Escape, chỉ đóng đúng hộp thoại đang nằm trên cùng của ngăn xếp.
 */
let activeLockCount = 0;
let savedBodyOverflow = '';
let modalIdSeq = 0;
const openModalStack = [];

export function useModalDialog({ isOpen, onClose, disabled = false }) {
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    disabledRef.current = Boolean(disabled);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    modalIdSeq += 1;
    const instanceId = modalIdSeq;
    openModalStack.push(instanceId);

    if (activeLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeLockCount += 1;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const topModalId = openModalStack[openModalStack.length - 1];
      if (topModalId !== instanceId) return;
      if (disabledRef.current) return;

      event.stopPropagation();
      if (typeof onCloseRef.current === 'function') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      const idx = openModalStack.lastIndexOf(instanceId);
      if (idx !== -1) {
        openModalStack.splice(idx, 1);
      }

      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
    };
  }, [isOpen]);
}

export default useModalDialog;
