import { useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductImage } from '../common/ProductImage';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';

export const OPEN_CART_DRAWER_EVENT = 'lumiere:open-cart-drawer';
export const FREESHIP_THRESHOLD = 499000;

/**
 * Tiện ích phát sự kiện mở Mini-Cart trượt ngang từ bất kỳ thẻ sản phẩm hay modal nào.
 */
export function openCartDrawer(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_CART_DRAWER_EVENT, { detail }));
}

const EMPTY_SUGGESTIONS = [
  { label: 'Chăm sóc da khoa học', to: '/products?category_id=1' },
  { label: 'Trang điểm & Son môi', to: '/products?category_id=2' },
  { label: 'Chống nắng phổ rộng', to: '/products?category_id=3' },
  { label: 'Ưu đãi dưới 300K', to: '/products?max_price=300000' },
];

export function CartDrawer({ isOpen, onClose }) {
  const {
    items,
    totalItems,
    totalAmount,
    syncing,
    syncCart,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const navigate = useNavigate();

  useModalDialog({ isOpen, onClose });

  // Đồng bộ ngầm tồn kho & giá bán thực tế mỗi khi mở Mini-Cart
  useEffect(() => {
    if (!isOpen || items.length === 0) return undefined;
    const controller = new AbortController();
    syncCart({ silent: true, signal: controller.signal });
    return () => controller.abort();
  }, [isOpen, items.length, syncCart]);

  if (!isOpen) return null;

  const remainingForFreeship = Math.max(0, FREESHIP_THRESHOLD - totalAmount);
  const progressPercent =
    totalAmount <= 0
      ? 0
      : Math.min(100, Math.round((totalAmount / FREESHIP_THRESHOLD) * 100));
  const unlockedFreeship = totalAmount >= FREESHIP_THRESHOLD;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lumiere-cart-drawer-title"
    >
      {/* Lớp nền mờ */}
      <div
        className="fixed inset-0 bg-stone-950/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Khung trượt bên phải */}
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl shadow-stone-950/25 border-l border-stone-200/80 animate-toast-in">
        {/* Header Drawer */}
        <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950 text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="lumiere-cart-drawer-title"
                  className="font-serif text-lg font-bold tracking-tight text-stone-950"
                >
                  Giỏ Hàng Của Bạn
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  {totalItems} món
                </span>
              </div>
              {syncing && (
                <p className="flex items-center gap-1 text-[11px] text-stone-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Đang cập nhật tồn kho mới nhất...</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng nhanh"
            className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thanh tiến trình Freeship & Quà tặng độc quyền */}
        <div className="border-b border-stone-200/70 bg-[#FAF8F5] px-5 py-3.5">
          {unlockedFreeship ? (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Đơn hàng đủ điều kiện{' '}
                <strong className="font-semibold">Freeship nhanh 2H & Quà tặng độc quyền</strong>!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-stone-700">
              <Truck className="h-4 w-4 shrink-0 text-lumiere-700" />
              <span>
                Mua thêm{' '}
                <strong className="font-bold text-lumiere-700">
                  {formatCurrency(remainingForFreeship)}
                </strong>{' '}
                để nhận <strong className="font-semibold text-stone-900">Freeship nhanh 2H & Quà tặng độc quyền</strong>
              </span>
            </div>
          )}

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/90">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                unlockedFreeship
                  ? 'bg-emerald-600'
                  : 'bg-gradient-to-r from-stone-900 via-lumiere-700 to-champagne-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Danh sách sản phẩm trong giỏ */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF8F5] border border-stone-200/80 text-stone-400 mb-4">
              <ShoppingBag className="h-7 w-7 stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Túi mua sắm đang trống
            </h3>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-stone-500">
              Khám phá các dòng dược mỹ phẩm, trang điểm và nước hoa chính ngạch được tuyển chọn bởi Lumière Beauté.
            </p>

            <div className="mt-6 w-full space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">
                Gợi ý mua sắm nhanh
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {EMPTY_SUGGESTIONS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-stone-900 hover:text-stone-950"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/products"
              onClick={onClose}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-lumiere-800"
            >
              <span>Khám phá cửa hàng</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 px-5">
            {items.map((item) => {
              const maxStock = Math.max(0, Number(item.stock_quantity ?? 0));
              const reachedMax = item.quantity >= maxStock;
              const variantText = [item.skin_type, item.volume].filter(Boolean).join(' • ');

              return (
                <div key={item.id} className="flex gap-3.5 py-4">
                  <Link
                    to={`/products/${item.id}`}
                    onClick={onClose}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-stone-200/70 bg-[#FAF8F5]"
                  >
                    <ProductImage
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full transition-transform duration-300 hover:scale-105"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-lumiere-700 truncate">
                          {item.brand_name || 'Lumière Beauté'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          title="Xóa sản phẩm"
                          className="rounded-md p-1 text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Link
                        to={`/products/${item.id}`}
                        onClick={onClose}
                        className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-stone-900 transition-colors hover:text-lumiere-700"
                      >
                        {item.name}
                      </Link>

                      {variantText && (
                        <p className="mt-0.5 text-[11px] text-stone-500 truncate">{variantText}</p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      {/* Bộ tăng giảm số lượng */}
                      <div className="inline-flex items-center rounded-lg border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Giảm số lượng"
                          className="flex h-7 w-7 items-center justify-center text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-xs font-semibold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={reachedMax}
                          aria-label="Tăng số lượng"
                          title={
                            reachedMax
                              ? `Kho hiện còn tối đa ${maxStock} sản phẩm`
                              : 'Tăng số lượng'
                          }
                          className="flex h-7 w-7 items-center justify-center text-stone-600 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-stone-950">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        {reachedMax && (
                          <p className="text-[10px] font-medium text-amber-700">
                            Tối đa kho ({maxStock})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quà tặng Sample chính hãng kèm mọi đơn */}
            <div className="py-4">
              <div className="flex items-center gap-3 rounded-xl border border-champagne-200/80 bg-[#FAF8F5] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lumiere-700 border border-stone-200/70">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-900 truncate">
                      Sample Dược Mỹ Phẩm Chính Hãng
                    </p>
                    <span className="shrink-0 rounded-full bg-lumiere-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lumiere-700">
                      Quà tặng
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    Tặng kèm tự động 02 gói dùng thử cho mọi đơn đặt hàng tại Lumière.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Thanh toán */}
        {items.length > 0 && (
          <div className="border-t border-stone-200/90 bg-white p-5 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Vận chuyển tiêu chuẩn</span>
                <span className={unlockedFreeship ? 'font-semibold text-emerald-700' : 'text-stone-700'}>
                  {unlockedFreeship ? 'Miễn phí (0 ₫)' : 'Miễn phí cho đơn từ 499.000 ₫'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-semibold text-stone-800">
                  Tạm tính ({totalItems} món)
                </span>
                <span className="text-xl font-bold tracking-tight text-stone-950">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={handleCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-lumiere-800"
              >
                <span>Thanh toán ngay</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                to="/cart"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 transition-colors hover:border-stone-900 hover:bg-stone-50"
              >
                <span>Xem chi tiết giỏ hàng</span>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Cam kết 100% chính ngạch • Kiểm tra hàng trước khi thanh toán</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default CartDrawer;
