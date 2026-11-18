import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Droplets,
  Globe,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { isCanceledRequest, publicApi } from '../../api/clients';
import { ProductImage } from '../common/ProductImage';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';

export const OPEN_QUICK_VIEW_EVENT = 'lumiere:open-quick-view';

/**
 * Tiện ích mở hộp thoại Xem nhanh sản phẩm (Quick-View) từ bất kỳ thẻ ProductCard nào.
 */
export function openProductQuickView(product) {
  if (typeof window === 'undefined' || !product) return;
  window.dispatchEvent(new CustomEvent(OPEN_QUICK_VIEW_EVENT, { detail: { product } }));
}

function getEditorialRating(productId) {
  const ratings = ['4.9', '4.8', '5.0', '4.9', '4.8'];
  const reviews = [128, 94, 162, 86, 115];
  const idx = Math.abs(Number(productId || 0)) % ratings.length;
  return { score: ratings[idx], count: reviews[idx] };
}

export function ProductQuickViewModal({ product: initialProduct, onClose, onAddedToCart }) {
  const isOpen = Boolean(initialProduct);
  const { addToCart, getItemQuantity } = useCart();
  const toast = useToast();

  const [detailProduct, setDetailProduct] = useState(initialProduct);
  const [quantity, setQuantity] = useState(1);

  useModalDialog({ isOpen, onClose });

  // Làm mới thông tin đầy đủ (mô tả, xuất xứ, tồn kho trực tiếp) khi mở Quick-View
  useEffect(() => {
    if (!initialProduct?.id) {
      setDetailProduct(null);
      return undefined;
    }

    setDetailProduct(initialProduct);
    setQuantity(1);

    const controller = new AbortController();
    publicApi
      .get(`/products/${initialProduct.id}`, { signal: controller.signal })
      .then((res) => {
        const fresh = res.data?.data;
        if (fresh) {
          setDetailProduct((prev) => ({ ...prev, ...fresh }));
        }
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
      });

    return () => controller.abort();
  }, [initialProduct]);

  const resolved = detailProduct || initialProduct;
  const stock = Math.max(0, Number(resolved?.stock_quantity ?? 0));
  const inCartQty = resolved ? getItemQuantity(resolved.id) : 0;
  const maxAddable = Math.max(0, stock - inCartQty);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isMaxInCart = !isOutOfStock && maxAddable <= 0;

  useEffect(() => {
    if (maxAddable > 0 && quantity > maxAddable) {
      setQuantity(maxAddable);
    } else if (maxAddable > 0 && quantity < 1) {
      setQuantity(1);
    }
  }, [maxAddable, quantity]);

  if (!isOpen || !resolved) return null;

  const rating = getEditorialRating(resolved.id);

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    if (quantity >= maxAddable) {
      toast.warning(`Kho hiện còn thêm được tối đa ${maxAddable} sản phẩm.`);
      return;
    }
    setQuantity((prev) => Math.min(maxAddable, prev + 1));
  };

  const handleAdd = () => {
    if (isOutOfStock || isMaxInCart) return;
    const result = addToCart(resolved, quantity);
    if (result.ok) {
      toast.success(`Đã thêm ${quantity} "${resolved.name}" vào giỏ hàng.`, {
        title: 'Lumière Beauté',
      });
      onClose();
      if (typeof onAddedToCart === 'function') {
        onAddedToCart(resolved);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lumiere-quick-view-title"
    >
      {/* Lớp phủ nền */}
      <div
        className="fixed inset-0 bg-stone-950/55 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Thân Modal */}
      <div className="relative z-10 grid w-full max-w-4xl max-h-[90vh] grid-cols-1 md:grid-cols-12 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-950/25 border border-stone-200/80 animate-modal-in">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem nhanh sản phẩm"
          className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-stone-200/80 backdrop-blur-sm transition-colors hover:bg-stone-950 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Cột trái: Ảnh sản phẩm nền kem #FAF8F5 */}
        <div className="relative md:col-span-5 bg-[#FAF8F5] flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200/70">
          <div className="relative aspect-[4/4.2] md:aspect-auto md:h-full w-full overflow-hidden">
            <ProductImage
              src={resolved.image_url}
              alt={resolved.name}
              showFallbackCaption
              className="h-full w-full"
            />

            {/* Nhãn góc trái duy nhất */}
            <div className="absolute left-3.5 top-3.5">
              {isOutOfStock ? (
                <span className="inline-flex items-center rounded-full bg-stone-800/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-white">
                  Hết hàng
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  Sắp hết • Còn {stock}
                </span>
              ) : resolved.volume ? (
                <span className="inline-flex items-center rounded-full border border-stone-200/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-stone-700 backdrop-blur-sm">
                  {resolved.volume}
                </span>
              ) : null}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center gap-2 border-t border-stone-200/70 bg-white/75 px-4 py-2.5 text-[11px] font-medium text-stone-600">
            <ShieldCheck className="h-3.5 w-3.5 text-lumiere-700 shrink-0" />
            <span>Phân phối chính ngạch • Đầy đủ tem phụ Tiếng Việt</span>
          </div>
        </div>

        {/* Cột phải: Thông tin & Mua nhanh */}
        <div className="md:col-span-7 flex flex-col overflow-y-auto p-5 sm:p-7">
          {/* Thương hiệu & Xuất xứ */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-[0.16em] text-lumiere-700">
              {resolved.brand_name || 'Lumière Beauté'}
            </span>
            {resolved.brand_origin && (
              <span className="inline-flex items-center gap-1 text-stone-500">
                <span>•</span>
                <Globe className="h-3 w-3 text-stone-400" />
                <span>{resolved.brand_origin}</span>
              </span>
            )}
            {resolved.category_name && (
              <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                {resolved.category_name}
              </span>
            )}
          </div>

          {/* Tên sản phẩm */}
          <h2
            id="lumiere-quick-view-title"
            className="mt-2 font-serif text-xl sm:text-2xl font-bold leading-snug text-stone-950 pr-6"
          >
            {resolved.name}
          </h2>

          {/* Đánh giá & Mã tồn kho */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1 font-semibold text-stone-900">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{rating.score}</span>
              <span className="font-normal text-stone-400">({rating.count} đánh giá)</span>
            </span>
            <span className="text-stone-300">|</span>
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-500">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span>Tạm hết hàng</span>
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Sắp hết — Chỉ còn {stock} sản phẩm</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Còn {stock} sản phẩm sẵn sàng giao ngay</span>
              </span>
            )}
          </div>

          {/* Giá niêm yết */}
          <div className="mt-4 flex items-baseline gap-3 border-y border-stone-200/80 py-3.5">
            <span className="text-2xl font-bold tracking-tight text-stone-950">
              {formatCurrency(resolved.price)}
            </span>
            <span className="text-xs text-stone-500">Đã bao gồm thuế GTGT</span>
          </div>

          {/* Thông số Dung tích & Loại da */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-stone-200/80 bg-[#FAF8F5] px-3.5 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <Droplets className="h-3 w-3 text-lumiere-700" />
                <span>Dung tích / Quy cách</span>
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-stone-900">
                {resolved.volume || 'Tiêu chuẩn'}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200/80 bg-[#FAF8F5] px-3.5 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <Sparkles className="h-3 w-3 text-lumiere-700" />
                <span>Loại da phù hợp</span>
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-stone-900">
                {resolved.skin_type || 'Mọi loại da'}
              </p>
            </div>
          </div>

          {/* Mô tả tóm tắt */}
          {resolved.description && (
            <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-stone-600">
              {resolved.description}
            </p>
          )}

          {/* Bộ chọn số lượng & Nút Thêm vào giỏ */}
          <div className="mt-auto pt-5 space-y-3">
            {inCartQty > 0 && (
              <p className="text-xs font-medium text-lumiere-700">
                Giỏ hàng của bạn đang có <strong>{inCartQty}</strong> sản phẩm này.
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Stepper số lượng */}
              <div className="inline-flex h-11 items-center justify-between rounded-xl border border-stone-300 bg-white px-1 sm:w-32 shrink-0">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={isOutOfStock || isMaxInCart || quantity <= 1}
                  aria-label="Giảm số lượng"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[2rem] text-center text-sm font-bold text-stone-950">
                  {isOutOfStock || isMaxInCart ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={isOutOfStock || isMaxInCart || quantity >= maxAddable}
                  aria-label="Tăng số lượng"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Nút Thêm vào giỏ */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock || isMaxInCart}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all ${
                  isOutOfStock
                    ? 'cursor-not-allowed bg-stone-100 text-stone-400 border border-stone-200'
                    : isMaxInCart
                      ? 'cursor-not-allowed bg-champagne-100 text-champagne-800 border border-champagne-300'
                      : 'bg-stone-950 text-white shadow-sm hover:bg-lumiere-800 active:scale-[0.99]'
                }`}
              >
                {isOutOfStock ? (
                  <span>Tạm hết hàng</span>
                ) : isMaxInCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Đã đạt tối đa kho ({inCartQty})</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    <span>Thêm vào giỏ • {formatCurrency(resolved.price * quantity)}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-stone-500">
                <Truck className="h-3.5 w-3.5 text-stone-400" />
                <span>Miễn phí giao nhanh đơn từ 499.000 ₫</span>
              </span>

              <Link
                to={`/products/${resolved.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 font-semibold text-stone-900 underline-offset-4 hover:text-lumiere-700 hover:underline transition-colors"
              >
                <span>Xem chi tiết đầy đủ</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductQuickViewModal;
