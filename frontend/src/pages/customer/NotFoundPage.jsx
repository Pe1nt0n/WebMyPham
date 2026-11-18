import { ArrowLeft, Compass, ShoppingBag, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
      <div className="rounded-3xl border border-stone-200/80 bg-white px-6 py-14 sm:px-12 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne-50 text-lumiere-700 ring-1 ring-champagne-200 mb-5">
          <Compass className="h-8 w-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-champagne-100/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-champagne-900">
          <Sparkles className="h-3 w-3" />
          <span>404 • Trang Không Tồn Tại</span>
        </span>

        <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold text-stone-950">
          Không Tìm Thấy Trang Yêu Cầu
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
          Đường dẫn bạn vừa truy cập có thể đã được thay đổi hoặc không còn hiệu lực. Mời bạn quay
          về Trang chủ hoặc khám phá bộ sưu tập mỹ phẩm chính ngạch tại Lumière Beauté.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-7 py-3.5 text-sm font-bold text-white shadow-md hover:bg-lumiere-800 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Về Trang Chủ</span>
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-7 py-3.5 text-sm font-bold text-stone-800 hover:border-stone-950 transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-lumiere-700" />
            <span>Khám Phá Mỹ Phẩm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
