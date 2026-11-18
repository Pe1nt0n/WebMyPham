import { useCallback, useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { staffApi } from '../../api/clients';
import { ProductImage } from '../common/ProductImage';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getApiErrorMessage,
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
} from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';
import { CancelOrderModal } from './CancelOrderModal';
import { triggerStaffSidebarRefresh } from './StaffLayout';

const QUICK_APPROVE_NOTES = [
  'Đã xác nhận thông tin người nhận và đóng gói xuất kho',
  'Đã đối soát thanh toán chuyển khoản - Xuất kho giao hàng',
  'Đóng gói chống sốc tiêu chuẩn Lumière Cosmetics',
];

const COMMERCIAL_ORDER_LABELS = {
  PENDING: 'Chờ xác nhận',
  APPROVED: 'Đã duyệt & Xuất kho',
  CANCELLED: 'Đã hủy',
};

export function OrderDetailModal({
  isOpen,
  orderId,
  onClose,
  onOrderUpdated,
}) {
  const toast = useToast();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [approveNote, setApproveNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [justApprovedInvoice, setJustApprovedInvoice] = useState(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setFetchError('');
      const res = await staffApi.get(`/staff/orders/${orderId}`);
      setOrder(res.data?.data || null);
    } catch (err) {
      setFetchError(getApiErrorMessage(err, 'Không thể tải chi tiết đơn hàng.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setApproveNote('');
    setApproveError('');
    setJustApprovedInvoice(null);
    fetchOrderDetail();
  }, [isOpen, orderId, fetchOrderDetail]);

  useModalDialog({
    isOpen,
    onClose,
    disabled: approving,
  });

  if (!isOpen) return null;

  const handleApproveOrder = async () => {
    if (!order) return;
    setApproveError('');

    try {
      setApproving(true);
      const res = await staffApi.patch(`/staff/orders/${order.id}/approve`, {
        note: approveNote.trim() || undefined,
      });

      const createdInvoice = res.data?.data?.invoice || null;
      setJustApprovedInvoice(createdInvoice);

      toast.success(
        res.data?.message ||
          `Đã xác nhận đơn hàng #${order.id}, trừ tồn kho và phát hành hóa đơn bán lẻ.`
      );
      triggerStaffSidebarRefresh();
      await fetchOrderDetail();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Không thể xác nhận xuất kho cho đơn hàng này.'
      );
      setApproveError(msg);
      toast.error(msg, { title: 'Không thể xác nhận xuất kho' });
    } finally {
      setApproving(false);
    }
  };

  const handleAfterCancel = async () => {
    setJustApprovedInvoice(null);
    await fetchOrderDetail();
    if (onOrderUpdated) onOrderUpdated();
  };

  const statusMeta = order
    ? ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING
    : ORDER_STATUS_CONFIG.PENDING;
  const statusLabel = order
    ? COMMERCIAL_ORDER_LABELS[order.status] || statusMeta.label
    : COMMERCIAL_ORDER_LABELS.PENDING;

  const paymentMeta = order
    ? PAYMENT_METHOD_CONFIG[order.payment_method] || PAYMENT_METHOD_CONFIG.COD
    : PAYMENT_METHOD_CONFIG.COD;

  const items = Array.isArray(order?.items) ? order.items : [];
  const insufficientItems =
    order?.status === 'PENDING'
      ? items.filter(
          (item) => Number(item.current_stock) < Number(item.quantity)
        )
      : [];

  const restockProductsLink =
    insufficientItems.length === 1
      ? `/staff/products?search=${encodeURIComponent(insufficientItems[0].product_name)}`
      : insufficientItems.every((item) => Number(item.current_stock) <= 0)
        ? '/staff/products?stock_filter=out_of_stock'
        : '/staff/products?sort=stock_asc';

  return (
    <>
      <div
        className="fixed inset-0 z-[9970] flex items-center justify-center p-3 sm:p-5 no-print print:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-modal-title"
      >
        <div
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={() => {
            if (!approving) onClose();
          }}
        />

        <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-modal-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white text-sm font-bold shadow-sm tabular-nums">
                #{orderId}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    id="order-detail-modal-title"
                    className="text-base sm:text-lg font-bold text-slate-900"
                  >
                    Đơn đặt hàng #{orderId}
                  </h3>
                  {order && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.badgeClass}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                      />
                      {statusLabel}
                    </span>
                  )}
                </div>
                {order && (
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    Thời gian đặt: {formatDateTime(order.order_date)} • Thanh
                    toán:{' '}
                    <span className="font-semibold text-slate-700">
                      {paymentMeta.label}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={approving}
              onClick={onClose}
              aria-label="Đóng hộp thoại"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {loading && !order ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
                <p className="text-sm font-medium text-slate-500">
                  Đang tải thông tin đơn hàng và đối chiếu tồn kho khả dụng...
                </p>
              </div>
            ) : fetchError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {fetchError}
              </div>
            ) : order ? (
              <>
                {/* Banner xác nhận xuất kho & phát hành hóa đơn thành công */}
                {justApprovedInvoice && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            Đã xác nhận xuất kho &amp; phát hành chứng từ bán lẻ
                          </h4>
                          <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
                            Số lượng tồn kho của từng sản phẩm đã được khấu trừ
                            chính xác. Hóa đơn bán lẻ{' '}
                            <span className="font-mono font-bold underline">
                              {justApprovedInvoice.invoice_code}
                            </span>{' '}
                            đã sẵn sàng để in ấn.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(
                            `/staff/invoices/${justApprovedInvoice.id}/print`
                          );
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                        <span>
                          In hóa đơn ({justApprovedInvoice.invoice_code})
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cảnh báo Không đủ tồn kho để xuất */}
                {insufficientItems.length > 0 && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-xs leading-relaxed text-rose-900">
                        <p className="text-sm font-bold text-rose-950">
                          Không đủ tồn kho để xuất ({insufficientItems.length}{' '}
                          mặt hàng thiếu số lượng khả dụng)
                        </p>
                        <p className="mt-1">
                          Một hoặc nhiều sản phẩm trong đơn có số lượng khách
                          đặt lớn hơn tồn kho hiện có. Hệ thống không cho phép
                          xuất âm kho nhằm đảm bảo tính chính xác của hàng tồn
                          thực tế. Vui lòng nhập bổ sung hàng vào kho trước khi
                          duyệt đơn.
                        </p>
                        <div className="mt-2">
                          <Link
                            to={restockProductsLink}
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 font-bold text-rose-700 underline hover:text-rose-900"
                          >
                            Mở Danh mục &amp; Kho hàng để nhập bổ sung &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hiển thị thông báo từ chối xuất kho từ máy chủ */}
                {approveError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-100/60 px-4 py-3 text-xs font-medium text-rose-900 flex items-start gap-2.5">
                    <AlertOctagon className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Yêu cầu xác nhận xuất kho chưa thể thực hiện:
                      </p>
                      <p className="mt-0.5">{approveError}</p>
                    </div>
                  </div>
                )}

                {/* 2 Cột Thông tin Khách nhận & Chứng từ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Khách hàng & Giao nhận */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Thông tin Người nhận &amp; Giao hàng</span>
                    </h4>

                    <div className="space-y-1.5 text-sm">
                      <p className="text-slate-700">
                        <span className="text-slate-500">Người nhận: </span>
                        <strong className="font-semibold text-slate-900">
                          {order.recipient_name}
                        </strong>
                      </p>
                      <p className="text-slate-700 flex items-center gap-1.5 tabular-nums">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500">Điện thoại: </span>
                        <strong className="font-mono font-semibold text-slate-900">
                          {order.recipient_phone}
                        </strong>
                      </p>
                      <p className="text-slate-700 flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-1 shrink-0" />
                        <span>
                          <span className="text-slate-500">Địa chỉ nhận: </span>
                          <span className="font-medium text-slate-800">
                            {order.shipping_address}
                          </span>
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 pt-1.5 border-t border-slate-200/70">
                        Khách hàng thành viên:{' '}
                        <span className="font-semibold text-slate-700">
                          {order.customer_name} (@{order.customer_username})
                        </span>
                      </p>
                      {order.note && (
                        <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 px-3 py-2 text-xs text-amber-900">
                          <span className="font-semibold">
                            Ghi chú của khách:{' '}
                          </span>
                          {order.note}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thanh toán, Nhân sự xử lý & Hóa đơn */}
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Thông tin Xử lý &amp; Chứng từ Bán lẻ</span>
                    </h4>

                    <div className="space-y-2 text-sm">
                      <p className="text-slate-700 flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-500">Thanh toán: </span>
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${paymentMeta.badgeClass}`}
                        >
                          {paymentMeta.label}
                        </span>
                      </p>

                      <p className="text-slate-700">
                        <span className="text-slate-500">
                          Nhân sự phụ trách:{' '}
                        </span>
                        {order.staff_name ? (
                          <strong className="font-semibold text-slate-900">
                            {order.staff_name}
                          </strong>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            Đang chờ tiếp nhận
                          </span>
                        )}
                      </p>

                      {order.invoice ? (
                        <div className="mt-2 rounded-xl border border-emerald-200/90 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs text-slate-500">
                                Chứng từ hóa đơn đã phát hành
                              </p>
                              <p className="font-mono text-sm font-bold text-emerald-700">
                                {order.invoice.invoice_code}
                              </p>
                              <p className="text-[11px] text-slate-400 tabular-nums">
                                Lập lúc:{' '}
                                {formatDateTime(order.invoice.issued_date)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                navigate(
                                  `/staff/invoices/${order.invoice.id}/print`
                                );
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Xem &amp; In phiếu</span>
                            </button>
                          </div>

                          {order.invoice.note && (
                            <p className="mt-2 border-t border-slate-100 pt-1.5 text-xs text-slate-600">
                              <span className="font-semibold">
                                Ghi chú chứng từ:{' '}
                              </span>
                              {order.invoice.note}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
                          Chưa phát hành chứng từ. Hóa đơn bán lẻ kiêm phiếu xuất
                          kho sẽ được khởi tạo tự động ngay khi xác nhận duyệt
                          đơn.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bảng Chi tiết Sản phẩm & Đối soát Tồn kho */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                  <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      Chi tiết Sản phẩm &amp; Đối soát Tồn kho ({items.length}{' '}
                      mặt hàng)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Đối chiếu trực tiếp số lượng đặt mua với tồn kho khả dụng
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Sản phẩm</th>
                          <th className="px-3 py-3 text-right">Đơn giá</th>
                          <th className="px-3 py-3 text-center">SL đặt</th>
                          <th className="px-3 py-3 text-center">
                            Tồn khả dụng
                          </th>
                          <th className="px-3 py-3 text-center">
                            Khả năng đáp ứng
                          </th>
                          <th className="px-4 py-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => {
                          const qty = Number(item.quantity);
                          const stock = Number(item.current_stock);
                          const isShortage =
                            order.status === 'PENDING' && stock < qty;

                          return (
                            <tr
                              key={item.id}
                              className={
                                isShortage
                                  ? 'bg-rose-50/70 hover:bg-rose-50'
                                  : 'hover:bg-slate-50/70'
                              }
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                                    <ProductImage
                                      src={item.image_url}
                                      alt={item.product_name}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 line-clamp-2">
                                      {item.product_name}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {item.brand_name}
                                      {item.volume ? ` • ${item.volume}` : ''} •
                                      Mã SP #{item.product_id}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-3 py-3 text-right font-medium text-slate-700 whitespace-nowrap tabular-nums">
                                {formatCurrency(item.unit_price)}
                              </td>

                              <td className="px-3 py-3 text-center tabular-nums">
                                <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                                  {qty}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-center tabular-nums">
                                <span
                                  className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold ${
                                    isShortage
                                      ? 'border-rose-300 bg-rose-100 text-rose-800'
                                      : stock <= 5
                                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  }`}
                                >
                                  {stock}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                {order.status === 'PENDING' ? (
                                  isShortage ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      <span>
                                        Không đủ tồn kho (Thiếu {qty - stock})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Đủ hàng xuất kho</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-slate-500 tabular-nums">
                                    Tồn hiện tại: {stock}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t border-slate-200/80 bg-slate-50/90">
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-3 text-right text-sm font-semibold text-slate-700"
                          >
                            Tổng giá trị thanh toán:
                          </td>
                          <td className="px-4 py-3 text-right text-base font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                            {formatCurrency(order.total_amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Khu vực Xác nhận & Ghi chú chứng từ (khi đơn chờ xác nhận) */}
                {order.status === 'PENDING' && (
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-emerald-700" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Xác nhận Xuất kho &amp; Phát hành Hóa đơn Bán lẻ
                      </h4>
                    </div>

                    <div>
                      <label
                        htmlFor="order-approve-note"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Ghi chú in trên chứng từ hóa đơn (không bắt buộc)
                      </label>
                      <input
                        id="order-approve-note"
                        type="text"
                        value={approveNote}
                        onChange={(e) => setApproveNote(e.target.value)}
                        placeholder={`Xuất kho theo đơn đặt hàng #${order.id}`}
                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {QUICK_APPROVE_NOTES.map((sample) => (
                          <button
                            key={sample}
                            type="button"
                            onClick={() => setApproveNote(sample)}
                            className="rounded-lg border border-emerald-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                          >
                            + {sample}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer Thao tác */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4">
            <div>
              {order &&
                (order.status === 'PENDING' || order.status === 'APPROVED') && (
                  <button
                    type="button"
                    disabled={approving}
                    onClick={() => setCancelModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50 transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    <span>
                      {order.status === 'APPROVED'
                        ? 'Hủy đơn & Hoàn nhập kho'
                        : 'Hủy đơn đặt hàng'}
                    </span>
                  </button>
                )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={approving}
                onClick={onClose}
                className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>

              {order?.status === 'APPROVED' && order.invoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/staff/invoices/${order.invoice.id}/print`);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>In hóa đơn ({order.invoice.invoice_code})</span>
                </button>
              )}

              {order?.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={approving}
                  onClick={handleApproveOrder}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 ${
                    insufficientItems.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {approving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  <span>
                    {insufficientItems.length > 0
                      ? 'Xác nhận xuất kho'
                      : 'Xác nhận & Xuất hóa đơn'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận hủy đơn */}
      <CancelOrderModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        order={order}
        onCancelled={handleAfterCancel}
      />
    </>
  );
}

export default OrderDetailModal;
