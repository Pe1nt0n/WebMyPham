import { useEffect, useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { staffApi } from '../../api/clients';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, getApiErrorMessage } from '../../utils/format';
import { triggerStaffSidebarRefresh } from './StaffLayout';

const QUICK_CANCEL_REASONS = [
  'Khách hàng liên hệ yêu cầu hủy đơn',
  'Khách muốn thay đổi sang sản phẩm khác',
  'Không liên hệ được số điện thoại người nhận',
];

export function CancelOrderModal({ isOpen, onClose, order, onCancelled }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen, order?.id]);

  if (!order) return null;

  const isApprovedOrder = order.status === 'APPROVED';

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      const res = await staffApi.patch(`/staff/orders/${order.id}/cancel`, {
        reason: reason.trim() || undefined,
      });

      toast.success(
        res.data?.message ||
          (isApprovedOrder
            ? 'Đã hủy đơn hàng và hoàn nhập tồn kho thành công.'
            : 'Đã hủy đơn đặt hàng chờ xác nhận.')
      );
      triggerStaffSidebarRefresh();
      if (onCancelled) onCancelled(res.data?.data);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể hủy đơn hàng này.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirmCancel}
      loading={loading}
      variant="danger"
      title={`Xác nhận hủy đơn đặt hàng #${order.id}`}
      message={`Người nhận: ${order.recipient_name} • Giá trị đơn: ${formatCurrency(
        order.total_amount
      )}`}
      confirmText={
        isApprovedOrder ? 'Hủy đơn & Hoàn nhập kho' : 'Xác nhận hủy đơn'
      }
      cancelText="Giữ lại đơn"
    >
      <div className="space-y-3.5">
        {isApprovedOrder ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-xs leading-relaxed text-amber-950">
            <div className="flex items-start gap-2">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-900">
                  Quy trình hoàn nhập kho &amp; đối soát chứng từ:
                </p>
                <p className="mt-1">
                  Đơn hàng này đã thực hiện xuất kho trước đó. Khi hủy đơn, hệ
                  thống sẽ <strong>tự động cộng hoàn trả</strong> toàn bộ số
                  lượng sản phẩm về tồn kho khả dụng, đồng thời ghi nhận trạng
                  thái hủy trên hóa đơn liên kết và loại trừ khỏi doanh thu thực
                  nhận.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs leading-relaxed text-sky-950">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900">
                  Hủy đơn hàng chưa xuất kho:
                </p>
                <p className="mt-1">
                  Đơn hàng đang ở bước chờ xác nhận và chưa khấu trừ hàng tồn.
                  Hệ thống sẽ chuyển trạng thái đơn sang <strong>Đã hủy</strong>{' '}
                  và giữ nguyên số lượng tồn kho hiện tại.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="cancel-order-reason"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Lý do hủy đơn
          </label>
          <textarea
            id="cancel-order-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do hủy đơn để lưu hồ sơ đối soát nội bộ..."
            className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/15"
          />

          <div className="mt-1.5 flex flex-wrap gap-1">
            {QUICK_CANCEL_REASONS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setReason(sample)}
                className="rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ConfirmModal>
  );
}

export default CancelOrderModal;
