import { useEffect, useState } from 'react';
import { sanitizeImageUrl } from '../../utils/format';

/**
 * Component hiển thị ảnh sản phẩm mỹ phẩm kèm SVG fallback sang trọng
 * tự động kích hoạt khi thiếu URL, URL không an toàn (chống javascript:...) hoặc ảnh gặp lỗi tải (onError).
 */
export function ProductImage({
  src,
  imageUrl,
  alt = 'Mỹ phẩm Lumière Cosmetics',
  className = 'w-full h-full',
  imgClassName = '',
  showFallbackCaption = false,
  loading = 'lazy',
  ...rest
}) {
  const resolvedSrc = sanitizeImageUrl(src ?? imageUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 via-stone-50 to-amber-50/70 text-rose-300 select-none ${className}`}
      >
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-1/2 max-h-24 w-1/2 max-w-24 opacity-90"
        >
          {/* Hào quang trang trí nền */}
          <circle cx="60" cy="62" r="42" fill="#FFE4E6" fillOpacity="0.55" />
          <circle cx="86" cy="30" r="3" fill="#FDA4AF" />
          <path
            d="M32 34C33.2 38.2 36.8 41.8 41 43C36.8 44.2 33.2 47.8 32 52C30.8 47.8 27.2 44.2 23 43C27.2 41.8 30.8 38.2 32 34Z"
            fill="#FECDD3"
          />
          {/* Nắp & cổ lọ serum mỹ phẩm sang trọng */}
          <rect x="52" y="22" width="16" height="9" rx="3" fill="#E11D48" fillOpacity="0.7" />
          <rect x="49" y="31" width="22" height="6" rx="2" fill="#BE185D" fillOpacity="0.85" />
          <rect x="55" y="37" width="10" height="7" fill="#F43F5E" fillOpacity="0.45" />
          {/* Thân lọ thủy tinh */}
          <rect
            x="40"
            y="44"
            width="40"
            height="50"
            rx="10"
            fill="white"
            stroke="#FB7185"
            strokeWidth="2"
          />
          {/* Nhãn Lumière trên thân lọ */}
          <rect
            x="46"
            y="55"
            width="28"
            height="26"
            rx="4"
            fill="#FFF1F2"
            stroke="#FECDD3"
            strokeWidth="1.2"
          />
          <line x1="52" y1="64" x2="68" y2="64" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="50" y1="70" x2="70" y2="70" stroke="#FDA4AF" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="54" y1="75" x2="66" y2="75" stroke="#FDA4AF" strokeWidth="1.2" strokeLinecap="round" />
        </svg>

        {showFallbackCaption && (
          <span className="mt-1.5 px-2 text-center font-serif text-[11px] font-medium tracking-wider text-rose-400/90 uppercase">
            Lumière
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={loading}
      onError={() => setHasError(true)}
      className={`object-cover ${className} ${imgClassName}`.trim()}
      {...rest}
    />
  );
}

export default ProductImage;
