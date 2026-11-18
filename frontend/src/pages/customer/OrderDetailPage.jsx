import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck2,
  FileText,
  MapPin,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { customerApi, getApiErrorMessage, isCanceledRequest } from '../../api/clients';
import { ProductImage } from '../../components/common/ProductImage';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
} from '../../utils/format';

export function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const justOrdered = Boolean(location.state?.justOrdered);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const triggerReload = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    customerApi
      .get(`/orders/my-orders/${id}`, { signal: controller.signal })
      .then((res) => {
        setOrder(res.data?.data || null);
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
        setError(getApiErrorMessage(err, 'Không tìm thấy thông tin chi tiết đơn hàng.'));
        setOrder(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, reloadTick]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-white border border-stone-200/80" />
        <div className="h-44 rounded-3xl bg-white border border-stone-200/80" />
        <div className="h-64 rounded-3xl bg-white border border-stone-200/80" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="rounded-3xl border border-stone-200/80 bg-white p-10 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-950">
            Không tìm thấy đơn hàng
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {error || 'Đơn hàng này không tồn tại hoặc không thuộc tài khoản thành viên của bạn.'}
          </p>
          <Link
            to="/orders"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white hover:bg-lumiere-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Đơn mua của tôi</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const invoiceCode = order.invoice_code || order.invoice?.invoice_code || null;
  const isApproved = order.status === 'APPROVED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="pb-20">
      {/* Header Banner */}
      <div className="border-b border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-white to-lumiere-50/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-stone-500 mb-3"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <Link to="/orders" className="hover:text-lumiere-700 transition-colors">
              Đơn hàng của tôi
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900">
              Đơn #{String(order.id).padStart(4, '0')}
            </span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">
                  Đơn Hàng #{String(order.id).padStart(4, '0')}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${statusInfo.badgeClass}`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                  <span>{isApproved ? 'Đã duyệt & Xuất hóa đơn' : statusInfo.label}</span>
                </span>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-stone-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                <span>Thời gian đặt mua: {formatDateTime(order.order_date)}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={triggerReload}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm hover:border-stone-900 hover:text-stone-950 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Celebratory Banner Right After Placing Order */}
        {justOrdered && (
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-white to-champagne-50 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-950">
                  Cảm ơn bạn đã đặt mua mỹ phẩm tại Lumière Beauté!
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-stone-600">
                  Đơn hàng của bạn đã được tiếp nhận thành công. Chuyên viên chăm sóc khách hàng sẽ
                  xác nhận đơn và phát hành hóa đơn bán lẻ điện tử trong thời gian sớm nhất.
                </p>
              </div>
            </div>

            <Link
              to="/products"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-lumiere-800 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Tiếp tục mua sắm</span>
            </Link>
          </div>
        )}

        {/* VISUAL ORDER PROGRESS STEPPER */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-950">
              Tiến Trình Đơn Hàng
            </h2>
            <span className="text-xs font-medium text-stone-400">
              Mã tham chiếu: #LUM-{String(order.id).padStart(4, '0')}
            </span>
          </div>

          {isCancelled ? (
            <div className="flex items-start gap-4 rounded-2xl border border-rose-200/90 bg-rose-50/60 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-rose-900">
                  Đơn đặt hàng đã được hủy
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-rose-700">
                  Đơn hàng hiện ở trạng thái Đã hủy. Nếu cần tư vấn đặt lại sản phẩm hoặc hỗ trợ
                  thêm về chu trình chăm sóc da, quý khách vui lòng liên hệ Hotline 1900 6886.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Connecting Track Line on Desktop */}
              <div
                aria-hidden="true"
                className="hidden md:block absolute top-6 left-[16%] right-[16%] h-0.5 bg-stone-200"
              >
                <div
                  className={`h-full transition-all duration-500 ${
                    isApproved ? 'w-full bg-emerald-600' : 'w-1/2 bg-amber-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {/* Step 1: Đặt hàng thành công */}
                <div className="flex md:flex-col md:items-center md:text-center gap-4 md:gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-4 ring-white">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                      Bước 01 • Hoàn tất
                    </span>
                    <p className="mt-0.5 text-sm sm:text-base font-bold text-stone-950">
                      Đặt hàng thành công
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {formatDateTime(order.order_date)}
                    </p>
                  </div>
                </div>

                {/* Step 2: Đang chờ xác nhận / Đã xác nhận */}
                <div className="flex md:flex-col md:items-center md:text-center gap-4 md:gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-4 ring-white transition-all ${
                      isApproved
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-amber-100 text-amber-700 border-2 border-amber-400 shadow-sm'
                    }`}
                  >
                    {isApproved ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                  </div>
                  <div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-widest ${
                        isApproved ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {isApproved ? 'Bước 02 • Đã xác nhận' : 'Bước 02 • Đang thực hiện'}
                    </span>
                    <p className="mt-0.5 text-sm sm:text-base font-bold text-stone-950">
                      {isApproved ? 'Đã xác nhận đơn hàng' : 'Đang chờ xác nhận'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {isApproved
                        ? `Phụ trách: ${order.staff_name || 'Chuyên viên Lumière'}`
                        : 'Chuyên viên đang chuẩn bị kiện hàng'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Đã duyệt & Xuất hóa đơn */}
                <div className="flex md:flex-col md:items-center md:text-center gap-4 md:gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-4 ring-white transition-all ${
                      invoiceCode || isApproved
                        ? 'bg-lumiere-700 text-white shadow-md shadow-lumiere-700/25'
                        : 'bg-stone-100 text-stone-400 border border-stone-200'
                    }`}
                  >
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-widest ${
                        invoiceCode || isApproved ? 'text-lumiere-700' : 'text-stone-400'
                      }`}
                    >
                      {invoiceCode || isApproved ? 'Bước 03 • Đã phát hành' : 'Bước 03 • Tiếp theo'}
                    </span>
                    <p className="mt-0.5 text-sm sm:text-base font-bold text-stone-950">
                      Đã duyệt &amp; Xuất hóa đơn
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {invoiceCode
                        ? `Mã HĐ: ${invoiceCode}`
                        : 'Phát hành ngay sau khi xác nhận đơn'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ELEGANT ELECTRONIC RETAIL INVOICE CARD */}
        {invoiceCode && (
          <div className="overflow-hidden rounded-3xl border border-champagne-300/80 bg-gradient-to-br from-champagne-50/90 via-white to-lumiere-50/60 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-champagne-200/70 bg-stone-950 px-6 py-3.5 text-white">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-champagne-200">
                <Receipt className="h-4 w-4 text-champagne-300" />
                <span>Hóa Đơn Bán Lẻ Điện Tử • Lumière Beauté</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Chứng từ hợp lệ</span>
              </span>
            </div>

            <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-stone-500">Số chứng từ hóa đơn</span>
                <p className="font-serif text-xl sm:text-2xl font-bold text-stone-950">
                  {invoiceCode}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-stone-600">
                  {order.invoice?.issued_date && (
                    <span>Ngày phát hành: <strong>{formatDateTime(order.invoice.issued_date)}</strong></span>
                  )}
                  {order.staff_name && (
                    <span>Chuyên viên lập: <strong>{order.staff_name}</strong></span>
                  )}
                </div>
                {order.invoice?.note && (
                  <p className="pt-1 text-xs text-stone-600 italic">
                    Ghi chú chứng từ: &ldquo;{order.invoice.note}&rdquo;
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-champagne-200 bg-white px-5 py-3.5 sm:text-right shrink-0">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Giá trị thanh toán trên hóa đơn
                </span>
                <span className="mt-0.5 block text-2xl font-extrabold text-lumiere-700">
                  {formatCurrency(order.invoice?.total_amount ?? order.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Details: Recipient Info + Itemized Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Recipient & Payment Info */}
          <div className="lg:col-span-5 rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-stone-950 border-b border-stone-100 pb-3.5">
              Thông Tin Giao Nhận
            </h2>

            <ul className="space-y-3.5 text-sm">
              <li className="flex items-start gap-3">
                <User className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-stone-400">Người nhận hàng</span>
                  <span className="font-bold text-stone-900">{order.recipient_name}</span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-stone-400">Số điện thoại liên hệ</span>
                  <span className="font-bold text-stone-900">{order.recipient_phone}</span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-stone-400">Địa chỉ nhận mỹ phẩm</span>
                  <span className="font-medium text-stone-800 leading-relaxed">
                    {order.shipping_address}
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <CreditCard className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-stone-400">Hình thức thanh toán</span>
                  <span className="font-bold text-stone-900">
                    {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                  </span>
                </div>
              </li>

              {order.note && (
                <li className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs text-stone-400">Lời nhắn giao hàng</span>
                    <span className="text-stone-700 whitespace-pre-line">{order.note}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Itemized Product List */}
          <div className="lg:col-span-7 rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h2 className="font-serif text-lg font-bold text-stone-950 flex items-center gap-2">
                <Package className="h-4 w-4 text-lumiere-700" />
                <span>Danh Sách Sản Phẩm ({orderItems.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-stone-100">
              {orderItems.map((item, idx) => (
                <div
                  key={item.id || `${item.product_id}-${idx}`}
                  className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                >
                  <Link
                    to={`/products/${item.product_id}`}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-champagne-200/80 bg-champagne-50"
                  >
                    <ProductImage
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    {item.brand_name && (
                      <p className="text-[11px] font-bold uppercase tracking-widest text-lumiere-700">
                        {item.brand_name}
                      </p>
                    )}
                    <Link
                      to={`/products/${item.product_id}`}
                      className="line-clamp-2 text-sm font-bold text-stone-900 hover:text-lumiere-700 transition-colors"
                    >
                      {item.product_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {item.volume ? `${item.volume} • ` : ''}
                      Đơn giá: {formatCurrency(item.unit_price)} × <strong>{item.quantity}</strong>
                    </p>
                  </div>

                  <div className="text-right font-bold text-sm sm:text-base text-stone-950 shrink-0">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Totals */}
            <div className="border-t border-stone-100 pt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-stone-600">
                <span>Tạm tính tiền mỹ phẩm</span>
                <span className="font-bold text-stone-900">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Phí vận chuyển tiêu chuẩn</span>
                <span className="font-bold text-emerald-700">Miễn phí (0 ₫)</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-stone-100 pt-3.5">
                <span className="text-base font-bold text-stone-950">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-lumiere-700">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-950 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách đơn hàng</span>
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-stone-800 hover:border-stone-950 transition-colors"
          >
            <ShoppingBag className="h-4 w-4 text-lumiere-700" />
            <span>Tiếp tục mua sắm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailPage;
