import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Gift,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ProductImage } from '../../components/common/ProductImage';
import { useCart } from '../../contexts/CartContext';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';

const GIFT_THRESHOLD = 499000;

export function CartPage() {
  const {
    items,
    totalItems,
    totalAmount,
    syncing,
    syncNotices,
    dismissSyncNotices,
    syncCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Tự động đồng bộ giá niêm yết & số lượng khả dụng khi mở trang Giỏ hàng
  useEffect(() => {
    const controller = new AbortController();
    syncCart({ signal: controller.signal });
    return () => controller.abort();
  }, [syncCart]);

  const handleDecrease = (item) => {
    if (item.quantity <= 1) return;
    updateQuantity(item.id, item.quantity - 1);
  };

  const handleIncrease = (item) => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDirectInput = (item, rawValue) => {
    if (rawValue === '') return;
    const num = Math.floor(Number(rawValue));
    if (!Number.isFinite(num) || num < 1) return;
    updateQuantity(item.id, num);
  };

  const handleRemoveItem = (item) => {
    removeFromCart(item.id);
    toast.info(`Đã xóa "${item.name}" khỏi giỏ hàng.`);
  };

  const handleConfirmClear = () => {
    clearCart();
    setConfirmClearOpen(false);
    toast.info('Đã làm trống giỏ hàng của bạn.');
  };

  const handleProceedCheckout = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập tài khoản thành viên để tiếp tục đặt hàng.');
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }
    navigate('/checkout');
  };

  const remainingForGift = Math.max(0, GIFT_THRESHOLD - totalAmount);
  const giftProgress = Math.min(100, Math.round((totalAmount / GIFT_THRESHOLD) * 100));

  return (
    <div className="pb-20">
      {/* Header & Checkout Progress Stepper */}
      <div className="border-b border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-white to-lumiere-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-4"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900">Giỏ hàng</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
                Giỏ Hàng Của Bạn
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                {items.length > 0
                  ? `Hiện có ${items.length} dòng mỹ phẩm (${totalItems} sản phẩm) sẵn sàng thanh toán.`
                  : 'Túi mua sắm của bạn hiện chưa có sản phẩm nào.'}
              </p>
            </div>

            {/* 3-Step E-Commerce Progress Bar */}
            <ol
              aria-label="Tiến trình đặt hàng"
              className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm"
            >
              <li className="flex items-center gap-2 font-bold text-stone-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-xs font-bold text-white shadow-sm">
                  1
                </span>
                <span>Giỏ hàng</span>
              </li>
              <span className="h-px w-5 sm:w-8 bg-stone-300" />
              <li className="flex items-center gap-2 font-medium text-stone-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-xs font-bold text-stone-400">
                  2
                </span>
                <span className="hidden sm:inline">Thông tin giao nhận</span>
                <span className="sm:hidden">Giao nhận</span>
              </li>
              <span className="h-px w-5 sm:w-8 bg-stone-200" />
              <li className="flex items-center gap-2 font-medium text-stone-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-300 bg-white text-xs font-bold text-stone-400">
                  3
                </span>
                <span className="hidden sm:inline">Hoàn tất đặt hàng</span>
                <span className="sm:hidden">Hoàn tất</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Main Cart Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {syncNotices.length > 0 && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900">
                  Giỏ hàng vừa được cập nhật theo số lượng khả dụng và giá niêm yết mới nhất:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  {syncNotices.map((notice, idx) => (
                    <li key={idx}>{notice}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissSyncNotices}
              aria-label="Đóng thông báo"
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-stone-200/80 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne-50 text-lumiere-700 ring-1 ring-champagne-200 mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-950">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              Khám phá các dòng dược mỹ phẩm Pháp, son kem Hàn Quốc và nước hoa cao cấp để nâng niu
              làn da mỗi ngày tại Lumière Beauté.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-lumiere-800 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Khám Phá Cửa Hàng Mỹ Phẩm</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Gift Progress + Cart Items */}
            <div className="lg:col-span-8 space-y-4">
              {/* Beauty Club Exclusive Gift & Express Shipping Progress Bar */}
              <div className="rounded-2xl border border-champagne-200 bg-gradient-to-r from-champagne-50/90 via-white to-lumiere-50/60 p-4 sm:px-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-stone-800">
                    <Gift className="h-4 w-4 text-lumiere-700 shrink-0" />
                    {remainingForGift === 0 ? (
                      <span>
                        Chúc mừng! Đơn hàng được <strong>Giao nhanh ưu tiên</strong> &amp; tặng kèm{' '}
                        <strong>Bộ Sample Dược Mỹ Phẩm Pháp</strong>.
                      </span>
                    ) : (
                      <span>
                        Mua thêm{' '}
                        <strong className="text-lumiere-700">
                          {formatCurrency(remainingForGift)}
                        </strong>{' '}
                        để nhận thêm <strong>Bộ Sample Dưỡng Da Cao Cấp</strong> miễn phí!
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-bold text-lumiere-800 shrink-0">
                    {giftProgress}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-champagne-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lumiere-600 to-champagne-600 transition-all duration-500"
                    style={{ width: `${giftProgress}%` }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              {items.map((item) => {
                const maxStock = Math.max(0, Number(item.stock_quantity ?? 0));
                const isAtCeiling = maxStock > 0 && item.quantity >= maxStock;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row gap-4 sm:gap-5 rounded-3xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-stone-300"
                  >
                    {/* Thumbnail */}
                    <Link
                      to={`/products/${item.id}`}
                      className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-champagne-200/80 bg-champagne-50/60"
                    >
                      <ProductImage
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full"
                      />
                    </Link>

                    {/* Info & Stepper Controls */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.brand_name && (
                            <p className="text-[11px] font-bold uppercase tracking-widest text-lumiere-700">
                              {item.brand_name}
                            </p>
                          )}
                          <Link
                            to={`/products/${item.id}`}
                            className="mt-0.5 line-clamp-2 text-sm sm:text-base font-bold text-stone-900 hover:text-lumiere-700 transition-colors"
                          >
                            {item.name}
                          </Link>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                            {item.volume && (
                              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                                {item.volume}
                              </span>
                            )}
                            {item.skin_type && (
                              <span className="rounded-full bg-champagne-100/70 px-2.5 py-0.5 font-medium text-champagne-900">
                                {item.skin_type}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-semibold ${
                                maxStock <= 5
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              Còn {maxStock} sản phẩm
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          aria-label={`Xóa ${item.name}`}
                          title="Xóa sản phẩm này"
                          className="rounded-xl p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Bottom Row: Unit Price + Quantity Stepper + Subtotal */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3.5">
                        <div className="text-xs text-stone-500">
                          Đơn giá:{' '}
                          <span className="font-bold text-stone-800">
                            {formatCurrency(item.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 ml-auto">
                          {/* Quantity Stepper */}
                          <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50/70 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleDecrease(item)}
                              disabled={item.quantity <= 1}
                              aria-label="Giảm số lượng"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              value={item.quantity}
                              onChange={(e) => handleDirectInput(item, e.target.value)}
                              aria-label="Số lượng"
                              className="w-10 bg-transparent text-center text-sm font-bold text-stone-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrease(item)}
                              disabled={isAtCeiling || maxStock <= 0}
                              aria-label="Tăng số lượng"
                              title={
                                isAtCeiling
                                  ? `Số lượng tối đa hiện có là ${maxStock}`
                                  : 'Tăng số lượng'
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="min-w-[105px] text-right">
                            <span className="block text-[11px] text-stone-400">Thành tiền</span>
                            <span className="text-base font-extrabold text-lumiere-700">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isAtCeiling && (
                        <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Bạn đã chọn tối đa {maxStock} sản phẩm hiện có sẵn.</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer Actions under List */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-lumiere-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Tiếp tục mua sắm thêm</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Làm trống giỏ hàng</span>
                </button>
              </div>
            </div>

            {/* Right Column: Sticky Order Summary */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-lg shadow-stone-950/[0.04] space-y-5">
                <h2 className="font-serif text-xl font-bold text-stone-950 border-b border-stone-100 pb-3.5">
                  Tóm Tắt Đơn Hàng
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Tổng số lượng</span>
                    <span className="font-bold text-stone-900">{totalItems} sản phẩm</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Tạm tính tiền hàng</span>
                    <span className="font-bold text-stone-900">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Phí vận chuyển tiêu chuẩn</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      Miễn phí
                    </span>
                  </div>

                  <div className="border-t border-stone-100 pt-4 flex items-baseline justify-between">
                    <span className="text-base font-bold text-stone-950">Tổng thanh toán</span>
                    <div className="text-right">
                      <span className="block text-2xl font-extrabold text-lumiere-700">
                        {formatCurrency(totalAmount)}
                      </span>
                      <span className="text-[11px] text-stone-400">Đã bao gồm thuế VAT</span>
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="rounded-2xl border border-champagne-200 bg-champagne-50/80 p-3.5 text-xs text-stone-700 flex items-start gap-2.5">
                    <Lock className="h-4 w-4 text-champagne-700 shrink-0 mt-0.5" />
                    <span>
                      Vui lòng <strong>Đăng nhập thành viên</strong> ở bước tiếp theo để điền địa
                      chỉ nhận hàng và theo dõi đơn trực tuyến.
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleProceedCheckout}
                  className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-950 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-stone-950/20 hover:bg-lumiere-800 disabled:opacity-65 transition-all active:scale-[0.99]"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang cập nhật giỏ hàng...</span>
                    </>
                  ) : (
                    <>
                      <span>Tiến Hành Thanh Toán</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="space-y-2.5 border-t border-stone-100 pt-4 text-xs text-stone-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>100% mỹ phẩm chính ngạch nguyên tem niêm phong</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-lumiere-700 shrink-0" />
                    <span>Thanh toán linh hoạt: COD, VietQR 24/7 &amp; Ví điện tử</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-champagne-700 shrink-0" />
                    <span>Đổi trả miễn phí trong 14 ngày nếu lỗi vận chuyển</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal xác nhận xóa toàn bộ giỏ hàng */}
      <ConfirmModal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        variant="danger"
        title="Làm trống toàn bộ giỏ hàng?"
        message="Tất cả mỹ phẩm đã chọn trong giỏ hàng hiện tại sẽ được gỡ bỏ. Bạn có chắc chắn muốn tiếp tục không?"
        confirmText="Làm trống giỏ"
        cancelText="Giữ lại"
      />
    </div>
  );
}

export default CartPage;
