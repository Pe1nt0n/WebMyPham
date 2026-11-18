import { Check, Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductImage } from '../common/ProductImage';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';
import { openCartDrawer } from './CartDrawer';
import { openProductQuickView } from './ProductQuickViewModal';

function getCardRating(productId) {
  const scores = ['4.9', '4.8', '5.0', '4.9', '4.8'];
  return scores[Math.abs(Number(productId || 0)) % scores.length];
}

/**
 * Thẻ sản phẩm mỹ phẩm phong cách Editorial Minimalist Luxury (Sephora / Olive Young / Lancôme).
 * Giữ nguyên chữ ký props `{ product }` để tương thích 100% toàn bộ các trang mua sắm.
 */
export function ProductCard({ product }) {
  const { addToCart, getItemQuantity } = useCart();
  const toast = useToast();

  if (!product) return null;

  const stock = Math.max(0, Number(product.stock_quantity ?? 0));
  const inCartQty = getItemQuantity(product.id);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isMaxInCart = !isOutOfStock && inCartQty >= stock;
  const ratingScore = getCardRating(product.id);
  const subtitleMeta = [product.skin_type, product.volume].filter(Boolean).join(' • ');

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOutOfStock || isMaxInCart) return;

    const result = addToCart(product, 1);
    if (result.ok) {
      toast.success(result.message, { title: 'Lumière Beauté' });
      openCartDrawer({ product });
    }
  };

  const handleOpenQuickView = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProductQuickView(product);
  };

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-950/[0.06]">
      {/* Vùng ảnh sản phẩm tỷ lệ 4:4.5 nền kem #FAF8F5 */}
      <div className="relative aspect-[4/4.5] w-full overflow-hidden bg-[#FAF8F5]">
        <Link
          to={`/products/${product.id}`}
          aria-label={product.name}
          className="block h-full w-full focus:outline-none"
        >
          <ProductImage
            src={product.image_url}
            alt={product.name}
            showFallbackCaption
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />

          {isOutOfStock && (
            <div className="pointer-events-none absolute inset-0 bg-stone-950/20 backdrop-blur-[1px]" />
          )}
        </Link>

        {/* Góc trái trên: Duy nhất 1 nhãn tinh tế (Hết hàng -> Sắp hết -> Dung tích) */}
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded-full bg-stone-800/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-white shadow-sm">
              Hết hàng
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50/95 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 shadow-sm">
              Sắp hết
            </span>
          ) : product.volume ? (
            <span className="inline-flex items-center rounded-full border border-stone-200/80 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 backdrop-blur-sm">
              {product.volume}
            </span>
          ) : null}
        </div>

        {/* Góc phải trên: Nút tròn "Xem nhanh" (Eye) */}
        <button
          type="button"
          onClick={handleOpenQuickView}
          aria-label={`Xem nhanh ${product.name}`}
          title="Xem nhanh sản phẩm"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-stone-200/80 bg-white/90 text-stone-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-stone-950 hover:bg-stone-950 hover:text-white sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <Eye className="h-4 w-4 stroke-[1.75]" />
        </button>

        {/* Thanh nút "Thêm vào giỏ" trượt nhẹ trên Desktop khi hover */}
        <div className="hidden sm:block absolute inset-x-3 bottom-3 z-10 translate-y-2 opacity-0 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isMaxInCart}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-lumiere-400 ${
              isOutOfStock
                ? 'cursor-not-allowed bg-stone-200/95 text-stone-500'
                : isMaxInCart
                  ? 'cursor-not-allowed bg-champagne-100/95 text-champagne-900 border border-champagne-300'
                  : 'bg-stone-900 text-white hover:bg-lumiere-800 active:scale-[0.99]'
            }`}
          >
            {isOutOfStock ? (
              <span>Tạm hết hàng</span>
            ) : isMaxInCart ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Đã đạt tối đa ({inCartQty})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                <span>Thêm vào giỏ{inCartQty > 0 ? ` (${inCartQty})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thân thẻ phân cấp 4 tầng tối giản, thoáng mắt */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* 1) Hàng trên: Thương hiệu in hoa + Đánh giá sao */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-lumiere-700">
            {product.brand_name || 'Lumière'}
          </span>
          <span
            className="shrink-0 text-[11px] font-medium text-stone-500"
            aria-label={`Đánh giá ${ratingScore} trên 5 sao`}
          >
            <span className="text-amber-500">★</span> {ratingScore}
          </span>
        </div>

        {/* 2) Tên sản phẩm line-clamp-2 sắc nét */}
        <Link
          to={`/products/${product.id}`}
          title={product.name}
          className="mt-1.5 line-clamp-2 min-h-[2.45rem] text-[14px] font-medium leading-snug text-stone-800 transition-colors group-hover:text-lumiere-700"
        >
          {product.name}
        </Link>

        {/* 3) Dòng phụ nhỏ gọn 1 dòng: Loại da • Dung tích */}
        {subtitleMeta && (
          <p className="mt-1 truncate text-[11.5px] text-stone-500">{subtitleMeta}</p>
        )}

        {/* 4) Hàng đáy: Giá bán nổi bật bên trái + Trạng thái kho chấm ngọc tinh tế bên phải */}
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
            <span className="text-[16px] font-bold tracking-tight text-stone-950">
              {formatCurrency(product.price)}
            </span>

            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-400">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                <span>Hết hàng</span>
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>Còn {stock}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Còn {stock}</span>
              </span>
            )}
          </div>

          {/* Nút giỏ hàng gọn đẹp trên Mobile (dễ chạm bằng ngón tay) */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isMaxInCart}
            className={`mt-2.5 flex sm:hidden w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              isOutOfStock
                ? 'cursor-not-allowed bg-stone-100 text-stone-400 border border-stone-200'
                : isMaxInCart
                  ? 'cursor-not-allowed bg-champagne-100 text-champagne-900 border border-champagne-300'
                  : 'bg-stone-900 text-white active:bg-lumiere-800'
            }`}
          >
            {isOutOfStock ? (
              <span>Hết hàng</span>
            ) : isMaxInCart ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Đã đạt tối đa ({inCartQty})</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                <span>Thêm vào giỏ{inCartQty > 0 ? ` (${inCartQty})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
