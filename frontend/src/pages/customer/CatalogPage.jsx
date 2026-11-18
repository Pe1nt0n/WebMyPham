import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BadgeCheck,
  ChevronRight,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage, isCanceledRequest, publicApi } from '../../api/clients';
import { ProductCard } from '../../components/customer/ProductCard';
import { ProductFilterSidebar } from '../../components/customer/ProductFilterSidebar';
import { formatCurrency } from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới lên kệ' },
  { value: 'price_asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price_desc', label: 'Giá: Cao đến Thấp' },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const closeMobileFilter = useCallback(() => setMobileFilterOpen(false), []);
  useModalDialog({ isOpen: mobileFilterOpen, onClose: closeMobileFilter });

  // Đồng bộ trực tiếp bộ lọc từ URL query params
  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      category_id: searchParams.get('category_id') || '',
      brand_id: searchParams.get('brand_id') || '',
      skin_type: searchParams.get('skin_type') || '',
      min_price: searchParams.get('min_price') || '',
      max_price: searchParams.get('max_price') || '',
      sort: searchParams.get('sort') || 'newest',
    }),
    [searchParams]
  );

  // Tải danh mục & thương hiệu
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      publicApi.get('/categories', { signal: controller.signal }),
      publicApi.get('/brands', { signal: controller.signal }),
    ])
      .then(([catRes, brandRes]) => {
        setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        setBrands(Array.isArray(brandRes.data?.data) ? brandRes.data.data : []);
      })
      .catch(() => {
        // Không chặn hiển thị sản phẩm nếu lỗi phụ
      });
    return () => controller.abort();
  }, []);

  const triggerRetryFetch = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  // Tải sản phẩm theo bộ lọc kèm AbortController chống Race Condition
  useEffect(() => {
    const hasMin = filters.min_price !== '';
    const hasMax = filters.max_price !== '';
    const minVal = hasMin ? Number(filters.min_price) : null;
    const maxVal = hasMax ? Number(filters.max_price) : null;

    if (hasMin && (!Number.isFinite(minVal) || minVal < 0)) {
      setError('Khoảng giá tối thiểu trên bộ lọc không hợp lệ (vui lòng nhập số không âm).');
      setProducts([]);
      setLoadingProducts(false);
      return undefined;
    }

    if (hasMax && (!Number.isFinite(maxVal) || maxVal < 0)) {
      setError('Khoảng giá tối đa trên bộ lọc không hợp lệ (vui lòng nhập số không âm).');
      setProducts([]);
      setLoadingProducts(false);
      return undefined;
    }

    if (hasMin && hasMax && minVal > maxVal) {
      setError('Mức giá tối thiểu không được lớn hơn mức giá tối đa. Vui lòng điều chỉnh lại khoảng giá.');
      setProducts([]);
      setLoadingProducts(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingProducts(true);
    setError('');

    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.brand_id) params.brand_id = filters.brand_id;
    if (filters.skin_type) params.skin_type = filters.skin_type;
    if (hasMin) params.min_price = String(Math.round(minVal));
    if (hasMax) params.max_price = String(Math.round(maxVal));
    if (filters.sort) params.sort = filters.sort;

    publicApi
      .get('/products', { params, signal: controller.signal })
      .then((res) => {
        setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
        setError(getApiErrorMessage(err, 'Không thể tải danh sách mỹ phẩm theo bộ lọc hiện tại.'));
        setProducts([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingProducts(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filters, reloadTick]);

  // Cập nhật 1 hoặc nhiều trường lọc lên URL
  const handleUpdateFilters = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, val]) => {
        const strVal = val === undefined || val === null ? '' : String(val).trim();
        if (!strVal || (key === 'sort' && strVal === 'newest')) {
          next.delete(key);
        } else {
          next.set(key, strVal);
        }
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Xóa toàn bộ điều kiện lọc
  const handleResetAll = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setMobileFilterOpen(false);
  }, [setSearchParams]);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(filters.category_id)),
    [categories, filters.category_id]
  );

  const selectedBrand = useMemo(
    () => brands.find((b) => String(b.id) === String(filters.brand_id)),
    [brands, filters.brand_id]
  );

  // Danh sách các chip điều kiện đang lọc
  const activeChips = useMemo(() => {
    const chips = [];

    if (filters.search) {
      chips.push({
        key: 'search',
        label: `Từ khóa: "${filters.search}"`,
        onRemove: () => handleUpdateFilters({ search: '' }),
      });
    }

    if (filters.category_id) {
      chips.push({
        key: 'category_id',
        label: `Danh mục: ${selectedCategory ? selectedCategory.name : `#${filters.category_id}`}`,
        onRemove: () => handleUpdateFilters({ category_id: '' }),
      });
    }

    if (filters.brand_id) {
      chips.push({
        key: 'brand_id',
        label: `Thương hiệu: ${selectedBrand ? selectedBrand.name : `#${filters.brand_id}`}`,
        onRemove: () => handleUpdateFilters({ brand_id: '' }),
      });
    }

    if (filters.skin_type) {
      chips.push({
        key: 'skin_type',
        label: `Loại da: ${filters.skin_type}`,
        onRemove: () => handleUpdateFilters({ skin_type: '' }),
      });
    }

    if (filters.min_price !== '' || filters.max_price !== '') {
      let priceLabel = '';
      if (filters.min_price !== '' && filters.max_price !== '') {
        priceLabel = `Khoảng giá: ${formatCurrency(filters.min_price)} – ${formatCurrency(
          filters.max_price
        )}`;
      } else if (filters.min_price !== '') {
        priceLabel = `Giá từ: ${formatCurrency(filters.min_price)}`;
      } else {
        priceLabel = `Giá dưới: ${formatCurrency(filters.max_price)}`;
      }
      chips.push({
        key: 'price_range',
        label: priceLabel,
        onRemove: () => handleUpdateFilters({ min_price: '', max_price: '' }),
      });
    }

    return chips;
  }, [filters, selectedCategory, selectedBrand, handleUpdateFilters]);

  // Tiêu đề & mô tả động theo bộ sưu tập đang xem
  const collectionHeading = useMemo(() => {
    if (selectedCategory && selectedBrand) {
      return `${selectedCategory.name} • ${selectedBrand.name}`;
    }
    if (selectedCategory) return selectedCategory.name;
    if (selectedBrand) {
      return `Gian Hàng Chính Hãng ${selectedBrand.name}${
        selectedBrand.origin ? ` (${selectedBrand.origin})` : ''
      }`;
    }
    if (filters.skin_type) return `Giải Pháp Chuyên Biệt Cho ${filters.skin_type}`;
    if (filters.search) return `Kết Quả Cho "${filters.search}"`;
    return 'Bộ Sưu Tập Mỹ Phẩm Chính Hãng';
  }, [selectedCategory, selectedBrand, filters.skin_type, filters.search]);

  const collectionSubtitle = useMemo(() => {
    if (selectedCategory?.description) return selectedCategory.description;
    if (selectedBrand) {
      return `Khám phá trọn bộ sản phẩm chăm sóc sắc đẹp phân phối chính ngạch từ thương hiệu ${selectedBrand.name}.`;
    }
    return 'Tuyển chọn dược mỹ phẩm, trang điểm và nước hoa cao cấp từ các nhà mốt danh tiếng toàn cầu — phù hợp chuyên biệt cho từng làn da.';
  }, [selectedCategory, selectedBrand]);

  return (
    <div className="pb-20">
      {/* Collection Editorial Banner & Breadcrumb */}
      <section className="border-b border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-white to-lumiere-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-stone-500 mb-3.5"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            {selectedCategory || selectedBrand ? (
              <>
                <Link to="/products" className="hover:text-lumiere-700 transition-colors">
                  Cửa hàng mỹ phẩm
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                <span className="font-semibold text-stone-900">
                  {selectedCategory ? selectedCategory.name : selectedBrand.name}
                </span>
              </>
            ) : (
              <span className="font-semibold text-stone-900">Cửa hàng mỹ phẩm</span>
            )}
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-lumiere-700 mb-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                <span>Lumière Official Boutique</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-950">
                {collectionHeading}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-stone-600">
                {collectionSubtitle}
              </p>
            </div>

            {/* Quick Category Pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateFilters({ category_id: '' })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    !filters.category_id
                      ? 'bg-stone-950 text-white shadow-sm'
                      : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => {
                  const isCurrent = String(filters.category_id) === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        handleUpdateFilters({
                          category_id: isCurrent ? '' : String(cat.id),
                        })
                      }
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        isCurrent
                          ? 'bg-lumiere-700 text-white shadow-sm'
                          : 'border border-stone-200 bg-white text-stone-700 hover:border-lumiere-300 hover:text-lumiere-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Catalog Grid: Left Filter Sidebar + Right Results */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* Desktop Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <ProductFilterSidebar
              categories={categories}
              brands={brands}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              onResetAll={handleResetAll}
              activeFilterCount={activeChips.length}
            />
          </aside>

          {/* Mobile Filter Slide-Over Drawer */}
          {mobileFilterOpen && (
            <div
              className="fixed inset-0 z-50 lg:hidden flex"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-catalog-filter-title"
            >
              <div
                className="fixed inset-0 bg-stone-950/55 backdrop-blur-sm"
                onClick={closeMobileFilter}
              />
              <div className="relative z-10 ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-lumiere-600" />
                    <span
                      id="mobile-catalog-filter-title"
                      className="font-serif text-lg font-bold text-stone-950"
                    >
                      Bộ Lọc Mỹ Phẩm
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={closeMobileFilter}
                    aria-label="Đóng bộ lọc"
                    className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <ProductFilterSidebar
                  categories={categories}
                  brands={brands}
                  filters={filters}
                  onUpdateFilters={handleUpdateFilters}
                  onResetAll={handleResetAll}
                  activeFilterCount={activeChips.length}
                  idPrefix="mobile-catalog-filter"
                />

                <div className="sticky bottom-0 mt-6 bg-white pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={closeMobileFilter}
                    className="w-full rounded-full bg-stone-950 py-3 text-sm font-bold text-white shadow-md hover:bg-lumiere-800 transition-colors"
                  >
                    Xem {products.length} sản phẩm phù hợp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Results Area */}
          <div className="lg:col-span-9 space-y-5">
            {/* Refined Toolbar: Result Count + Active Chips + Sort Dropdown */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:px-5 sm:py-3.5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(true)}
                    className="inline-flex lg:hidden items-center gap-2 rounded-xl border border-stone-200 bg-champagne-50/70 px-3.5 py-2 text-xs font-bold text-stone-900 hover:border-lumiere-300"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-lumiere-700" />
                    <span>Bộ lọc</span>
                    {activeChips.length > 0 && (
                      <span className="rounded-full bg-lumiere-700 px-1.5 py-0.5 text-[10px] text-white">
                        {activeChips.length}
                      </span>
                    )}
                  </button>

                  <p className="text-xs sm:text-sm text-stone-600">
                    {loadingProducts ? (
                      <span className="text-stone-500">Đang cập nhật danh sách sản phẩm...</span>
                    ) : (
                      <>
                        Hiển thị{' '}
                        <strong className="font-bold text-stone-950">{products.length}</strong> sản
                        phẩm chính hãng
                      </>
                    )}
                  </p>
                </div>

                {/* Refined Sort Selector */}
                <div className="flex items-center gap-2 ml-auto">
                  <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 hidden sm:block" />
                  <label
                    htmlFor="catalog-sort"
                    className="text-xs font-semibold text-stone-500 hidden sm:block"
                  >
                    Sắp xếp theo:
                  </label>
                  <select
                    id="catalog-sort"
                    value={filters.sort}
                    onChange={(e) => handleUpdateFilters({ sort: e.target.value })}
                    className="rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-stone-900 focus:border-lumiere-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-lumiere-200/60 transition-colors cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filter Chips with `×` Remove Buttons */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                  <span className="text-xs font-semibold text-stone-400 mr-0.5">Đang lọc:</span>
                  {activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-lumiere-200 bg-lumiere-50/70 pl-3 pr-1.5 py-1 text-xs font-semibold text-lumiere-900"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        aria-label={`Gỡ điều kiện ${chip.label}`}
                        title="Gỡ điều kiện này"
                        className="flex h-4 w-4 items-center justify-center rounded-full text-lumiere-700 hover:bg-lumiere-200 hover:text-lumiere-950 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors ml-auto sm:ml-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Xóa tất cả</span>
                  </button>
                </div>
              )}
            </div>

            {/* Product Grid & Empty / Error / Skeleton States */}
            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-10 text-center">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={triggerRetryFetch}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Thử lại</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <span>Đặt lại bộ lọc</span>
                  </button>
                </div>
              </div>
            ) : loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="overflow-hidden rounded-2xl border border-lumiere-100 bg-white p-4 space-y-3 animate-pulse"
                  >
                    <div className="aspect-square rounded-xl bg-lumiere-50" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                    <div className="h-4 w-full rounded bg-slate-100" />
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-10 w-full rounded-xl bg-lumiere-50" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-stone-200/80 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-champagne-50 text-lumiere-700 ring-1 ring-champagne-200 mb-4">
                  <PackageSearch className="h-8 w-8" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-stone-950">
                  Chưa tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
                  Hiện chưa có dòng mỹ phẩm nào khớp với tất cả tiêu chí lọc đang chọn. Bạn có thể
                  mở rộng khoảng giá hoặc gỡ bớt điều kiện lọc để xem thêm gợi ý.
                </p>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-lumiere-800 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Xem tất cả mỹ phẩm</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CatalogPage;
