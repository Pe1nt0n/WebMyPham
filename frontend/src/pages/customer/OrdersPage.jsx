import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck2,
  Package,
  RefreshCw,
  ShoppingBag,
  User,
  XCircle,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { customerApi, getApiErrorMessage, isCanceledRequest } from '../../api/clients';
import { ProductImage } from '../../components/common/ProductImage';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
} from '../../utils/format';

const STATUS_TABS = [
  { value: '', label: 'Tất cả đơn hàng' },
  { value: 'PENDING', label: 'Đang chờ xác nhận' },
  { value: 'APPROVED', label: 'Đã duyệt & Xuất hóa đơn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

function OrderMiniStepper({ status, invoiceCode }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/60 px-4 py-2.5 text-xs font-semibold text-rose-700">
        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
        <span>Đơn đặt hàng đã hủy</span>
      </div>
    );
  }

  const isApproved = status === 'APPROVED';

  return (
    <div
      aria-label="Tiến trình đơn hàng"
      className="rounded-2xl border border-stone-200/70 bg-stone-50/60 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Step 1 */}
        <div className="flex items-center gap-2 font-bold text-emerald-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-3 w-3" />
          </span>
          <span className="truncate">Đặt hàng thành công</span>
        </div>

        <div
          className={`hidden sm:block h-0.5 flex-1 max-w-[80px] rounded-full ${
            isApproved ? 'bg-emerald-500' : 'bg-amber-300'
          }`}
        />

        {/* Step 2 */}
        <div
          className={`flex items-center gap-2 font-bold ${
            isApproved ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {isApproved ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3 w-3" />
            </span>
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300">
              <Clock className="h-3 w-3" />
            </span>
          )}
          <span className="truncate">
            {isApproved ? 'Đã xác nhận đơn' : 'Đang chờ xác nhận'}
          </span>
        </div>

        <div
          className={`hidden sm:block h-0.5 flex-1 max-w-[80px] rounded-full ${
            isApproved ? 'bg-lumiere-600' : 'bg-stone-200'
          }`}
        />

        {/* Step 3 */}
        <div
          className={`hidden md:flex items-center gap-2 font-bold ${
            isApproved ? 'text-lumiere-800' : 'text-stone-400'
          }`}
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              isApproved
                ? 'bg-lumiere-700 text-white'
                : 'border border-stone-300 bg-white text-stone-400'
            }`}
          >
            {isApproved ? <Check className="h-3 w-3" /> : <span className="text-[10px]">3</span>}
          </span>
          <span className="truncate">
            {isApproved
              ? `Đã duyệt & Xuất hóa đơn${invoiceCode ? ` (${invoiceCode})` : ''}`
              : 'Đã duyệt & Xuất hóa đơn'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = searchParams.get('status') || '';

  const [orders, setOrders] = useState([]);
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

    const params = {};
    if (activeStatus) params.status = activeStatus;

    customerApi
      .get('/orders/my-orders', { params, signal: controller.signal })
      .then((res) => {
        setOrders(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
        setError(getApiErrorMessage(err, 'Không thể tải lịch sử đơn hàng của bạn.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [activeStatus, reloadTick]);

  const handleSelectStatus = (statusVal) => {
    const next = new URLSearchParams(searchParams);
    if (!statusVal) {
      next.delete('status');
    } else {
      next.set('status', statusVal);
    }
    setSearchParams(next);
  };

  return (
    <div className="pb-20">
      {/* Header Banner */}
      <div className="border-b border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-white to-lumiere-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-3"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900">Đơn hàng của tôi</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
                Đơn Mua Của Tôi
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                Theo dõi trực tiếp tiến trình xác nhận đơn hàng và tra cứu chứng từ hóa đơn điện tử.
              </p>
            </div>

            <button
              type="button"
              onClick={triggerReload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm hover:border-stone-900 hover:text-stone-950 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Cập nhật trạng thái</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Status Filter Tabs */}
        <div
          role="tablist"
          aria-label="Lọc theo trạng thái đơn hàng"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-sm"
        >
          {STATUS_TABS.map((tab) => {
            const isSelected = activeStatus === tab.value;
            return (
              <button
                key={tab.value || 'ALL'}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectStatus(tab.value)}
                className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-stone-950 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-champagne-50 hover:text-stone-950'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders List / States */}
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-8 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={triggerReload}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-3xl border border-stone-200/80 bg-white p-6 animate-pulse"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-stone-200/80 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne-50 text-lumiere-700 ring-1 ring-champagne-200 mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-950">
              {activeStatus
                ? 'Chưa có đơn hàng nào thuộc nhóm này'
                : 'Bạn chưa có đơn đặt hàng nào'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              {activeStatus
                ? 'Chuyển về mục "Tất cả đơn hàng" để xem toàn bộ lịch sử mua sắm của bạn tại Lumière.'
                : 'Khám phá ngay bộ sưu tập dược mỹ phẩm, trang điểm và nước hoa chính ngạch tại Lumière Beauté.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {activeStatus ? (
                <button
                  type="button"
                  onClick={() => handleSelectStatus('')}
                  className="rounded-full border border-stone-300 bg-white px-6 py-2.5 text-sm font-bold text-stone-800 hover:border-stone-950 transition-colors"
                >
                  Xem tất cả đơn hàng
                </button>
              ) : null}
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-lumiere-800 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Bắt đầu mua sắm</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => {
              const statusInfo =
                ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.PENDING;
              const orderItems = Array.isArray(order.items) ? order.items : [];
              const previewItems = orderItems.slice(0, 2);
              const extraCount = Math.max(0, orderItems.length - previewItems.length);

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm transition-all hover:border-stone-400 hover:shadow-md"
                >
                  {/* Order Top Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-champagne-50/40 px-5 sm:px-6 py-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <span className="font-serif text-base font-bold text-stone-950">
                        Đơn hàng #{String(order.id).padStart(4, '0')}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span>{formatDateTime(order.order_date)}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.invoice_code && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-lumiere-50 px-3 py-1 text-xs font-bold text-lumiere-800 border border-lumiere-200">
                          <FileCheck2 className="h-3.5 w-3.5 text-lumiere-700" />
                          <span>Hóa đơn: {order.invoice_code}</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusInfo.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                        <span>
                          {order.status === 'APPROVED'
                            ? 'Đã duyệt & Xuất hóa đơn'
                            : statusInfo.label}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Stepper */}
                  <div className="px-5 sm:px-6 pt-4">
                    <OrderMiniStepper status={order.status} invoiceCode={order.invoice_code} />
                  </div>

                  {/* Items Preview */}
                  <div className="px-5 sm:px-6 py-4 divide-y divide-stone-100">
                    {previewItems.map((item, idx) => (
                      <div
                        key={item.id || `${order.id}-${item.product_id}-${idx}`}
                        className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
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
                          <Link
                            to={`/products/${item.product_id}`}
                            className="line-clamp-1 text-sm font-bold text-stone-900 hover:text-lumiere-700 transition-colors"
                          >
                            {item.product_name}
                          </Link>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {item.brand_name ? `${item.brand_name} • ` : ''}
                            {item.volume ? `${item.volume} • ` : ''}
                            SL: <strong>x{item.quantity}</strong> × {formatCurrency(item.unit_price)}
                          </p>
                        </div>

                        <div className="text-right text-sm font-bold text-stone-900 shrink-0">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    ))}

                    {extraCount > 0 && (
                      <div className="pt-2.5 text-xs font-semibold text-stone-500">
                        + {extraCount} sản phẩm mỹ phẩm khác trong đơn hàng này
                      </div>
                    )}
                  </div>

                  {/* Order Card Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 bg-stone-50/40 px-5 sm:px-6 py-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-stone-400" />
                        <span>
                          Người nhận: <strong className="text-stone-800">{order.recipient_name}</strong>
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-stone-400" />
                        <span>
                          {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="text-right">
                        <span className="block text-[11px] text-stone-400">Tổng thanh toán</span>
                        <span className="text-lg font-extrabold text-lumiere-700">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>

                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-lumiere-800 transition-colors"
                      >
                        <span>Chi tiết đơn</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
