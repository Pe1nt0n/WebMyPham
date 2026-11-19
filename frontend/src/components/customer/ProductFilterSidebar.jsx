import { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { SKIN_TYPES } from '../../utils/format';

/**
 * Các mốc khoảng giá chọn nhanh chuẩn thương mại điện tử mỹ phẩm
 */
export const PRICE_PRESETS = [
  { id: 'all', label: 'Tất cả mức giá', min: '', max: '' },
  { id: 'under_300k', label: 'Dưới 300.000 ₫', min: '', max: '300000' },
  { id: '300k_600k', label: '300.000 – 600.000 ₫', min: '300000', max: '600000' },
  { id: '600k_1m', label: '600.000 – 1.000.000 ₫', min: '600000', max: '1000000' },
  { id: 'over_1m', label: 'Trên 1.000.000 ₫', min: '1000000', max: '' },
];

export function ProductFilterSidebar({
  categories = [],
  brands = [],
  filters,
  onUpdateFilters,
  onResetAll,
  activeFilterCount = 0,
  idPrefix = 'catalog-filter',
}) {
  const toast = useToast();

  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [minPriceInput, setMinPriceInput] = useState(filters.min_price || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.max_price || '');
  const [brandQuery, setBrandQuery] = useState('');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    setMinPriceInput(filters.min_price || '');
    setMaxPriceInput(filters.max_price || '');
  }, [filters.min_price, filters.max_price]);

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        String(b.name || '')
          .toLowerCase()
          .includes(q) ||
        String(b.origin || '')
          .toLowerCase()
          .includes(q)
    );
  }, [brands, brandQuery]);

  const selectedBrand = useMemo(
    () => brands.find((b) => String(b.id) === String(filters.brand_id)),
    [brands, filters.brand_id]
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    onUpdateFilters({ search: searchInput.trim() });
  };

  const handleApplyPriceRange = (event) => {
    if (event) event.preventDefault();

    const rawMin = String(minPriceInput ?? '').trim();
    const rawMax = String(maxPriceInput ?? '').trim();

    let cleanMin = '';
    let cleanMax = '';

    if (rawMin !== '') {
      const parsedMin = Number(rawMin);
      if (!Number.isFinite(parsedMin) || parsedMin < 0) {
        toast.warning('Mức giá tối thiểu ("Từ ₫") phải là số không âm hợp lệ.');
        return;
      }
      cleanMin = String(Math.round(parsedMin));
    }

    if (rawMax !== '') {
      const parsedMax = Number(rawMax);
      if (!Number.isFinite(parsedMax) || parsedMax < 0) {
        toast.warning('Mức giá tối đa ("Đến ₫") phải là số không âm hợp lệ.');
        return;
      }
      cleanMax = String(Math.round(parsedMax));
    }

    if (cleanMin !== '' && cleanMax !== '' && Number(cleanMin) > Number(cleanMax)) {
      toast.warning('Mức giá "Từ ₫" không được lớn hơn "Đến ₫". Vui lòng kiểm tra lại.');
      return;
    }

    setMinPriceInput(cleanMin);
    setMaxPriceInput(cleanMax);
    onUpdateFilters({
      min_price: cleanMin,
      max_price: cleanMax,
    });
  };

  const handleSelectPricePreset = (preset) => {
    setMinPriceInput(preset.min);
    setMaxPriceInput(preset.max);
    onUpdateFilters({
      min_price: preset.min,
      max_price: preset.max,
    });
  };

  const currentMin = String(filters.min_price || '');
  const currentMax = String(filters.max_price || '');

  return (
    <div className="divide-y divide-stone-200/80 text-stone-800">
      {/* Header bộ lọc */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-stone-900" />
          <h2 className="font-serif text-base font-bold tracking-tight text-stone-950">
            Bộ Lọc Sản Phẩm
          </h2>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 transition-colors hover:border-stone-900 hover:bg-stone-950 hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Đặt lại ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* 1. Tìm kiếm từ khóa trong danh mục */}
      <div className="py-5 space-y-2.5">
        <label
          htmlFor={`${idPrefix}-keyword`}
          className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900"
        >
          Tìm theo tên & hoạt chất
        </label>
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-stone-400" />
          <input
            id={`${idPrefix}-keyword`}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="BHA, Retinol, son nhung..."
            className="w-full rounded-xl border border-stone-200/90 bg-[#FAF8F5] pl-9 pr-16 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onUpdateFilters({ search: '' });
              }}
              aria-label="Xóa từ khóa"
              className="absolute right-12 p-1 text-stone-400 hover:text-stone-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-lumiere-800"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* 2. Danh mục mỹ phẩm (Radio list chuẩn Sephora) */}
      <div className="py-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
          Danh mục mỹ phẩm
        </span>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onUpdateFilters({ category_id: '' })}
            className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
              !filters.category_id
                ? 'bg-stone-100/90 font-semibold text-stone-950'
                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  !filters.category_id
                    ? 'border-stone-950 bg-stone-950'
                    : 'border-stone-300 bg-white group-hover:border-stone-500'
                }`}
              >
                {!filters.category_id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span>
                {selectedBrand ? `Tất cả SP ${selectedBrand.name}` : 'Tất cả sản phẩm'}
              </span>
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = String(filters.category_id) === String(cat.id);
            const brandHasCat = selectedBrand
              ? selectedBrand.category_ids?.includes(Number(cat.id))
              : true;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    category_id: isSelected ? '' : String(cat.id),
                  })
                }
                className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  isSelected
                    ? 'bg-stone-100/90 font-semibold text-stone-950'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5 pr-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? 'border-lumiere-700 bg-lumiere-700'
                        : 'border-stone-300 bg-white group-hover:border-stone-500'
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={`truncate ${selectedBrand && !brandHasCat ? 'text-stone-400' : ''}`}>
                    {cat.name}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[11px] ${
                    isSelected
                      ? 'font-bold text-lumiere-700'
                      : selectedBrand && !brandHasCat
                      ? 'text-stone-300'
                      : 'text-stone-400'
                  }`}
                >
                  {selectedBrand
                    ? brandHasCat
                      ? '✓ có hàng'
                      : '0 sp'
                    : `(${cat.product_count ?? 0})`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Khoảng giá bán (Từ ₫ – Đến ₫ & Nút chọn nhanh) */}
      <div className="py-5 space-y-3.5">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
          Khoảng giá
        </span>

        {/* Các nút khoảng giá nhanh */}
        <div className="flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isSelected = currentMin === preset.min && currentMax === preset.max;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPricePreset(preset)}
                className={`rounded-full border px-3 py-1 text-[11.5px] transition-all ${
                  isSelected
                    ? 'border-stone-950 bg-stone-950 font-semibold text-white'
                    : 'border-stone-200/90 bg-white font-medium text-stone-600 hover:border-stone-500 hover:text-stone-950'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Ô nhập Từ ₫ – Đến ₫ */}
        <form onSubmit={handleApplyPriceRange} noValidate className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <label htmlFor={`${idPrefix}-min-price`} className="sr-only">
                Từ ₫
              </label>
              <input
                id={`${idPrefix}-min-price`}
                type="number"
                min="0"
                step="any"
                inputMode="numeric"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                placeholder="Từ"
                className="w-full rounded-lg border border-stone-200/90 bg-[#FAF8F5] pl-2.5 pr-6 py-2 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-stone-400">
                ₫
              </span>
            </div>

            <span className="text-xs text-stone-400 select-none">–</span>

            <div className="relative flex-1">
              <label htmlFor={`${idPrefix}-max-price`} className="sr-only">
                Đến ₫
              </label>
              <input
                id={`${idPrefix}-max-price`}
                type="number"
                min="0"
                step="any"
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                placeholder="Đến"
                className="w-full rounded-lg border border-stone-200/90 bg-[#FAF8F5] pl-2.5 pr-6 py-2 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-stone-400">
                ₫
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-lumiere-800"
            >
              Áp dụng khoảng giá
            </button>
            {(currentMin !== '' ||
              currentMax !== '' ||
              minPriceInput !== '' ||
              maxPriceInput !== '') && (
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  onUpdateFilters({ min_price: '', max_price: '' });
                }}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900"
                title="Xóa khoảng giá"
              >
                Xóa
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 4. Thương hiệu chính hãng */}
      <div className="py-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
          Thương hiệu
        </span>

        {brands.length > 5 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder="Tìm thương hiệu..."
              aria-label="Tìm nhanh thương hiệu"
              className="w-full rounded-lg border border-stone-200/80 bg-[#FAF8F5] pl-8 pr-7 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            {brandQuery && (
              <button
                type="button"
                onClick={() => setBrandQuery('')}
                aria-label="Xóa tìm thương hiệu"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
          {!brandQuery && (
            <button
              type="button"
              onClick={() => onUpdateFilters({ brand_id: '' })}
              className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                !filters.brand_id
                  ? 'bg-stone-100/90 font-semibold text-stone-950'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    !filters.brand_id
                      ? 'border-stone-950 bg-stone-950 text-white'
                      : 'border-stone-300 bg-white group-hover:border-stone-500'
                  }`}
                >
                  {!filters.brand_id && <Check className="h-3 w-3 stroke-[2.5]" />}
                </span>
                <span>Tất cả thương hiệu</span>
              </span>
            </button>
          )}

          {filteredBrands.map((brand) => {
            const isSelected = String(filters.brand_id) === String(brand.id);
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    brand_id: isSelected ? '' : String(brand.id),
                  })
                }
                className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  isSelected
                    ? 'bg-stone-100/90 font-semibold text-stone-950'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-950'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5 pr-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? 'border-lumiere-700 bg-lumiere-700 text-white'
                        : 'border-stone-300 bg-white group-hover:border-stone-500'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{brand.name}</span>
                    {brand.origin && (
                      <span className="block text-[10.5px] font-normal text-stone-400">
                        {brand.origin}
                      </span>
                    )}
                  </span>
                </span>

                <span
                  className={`shrink-0 text-[11px] ${
                    isSelected ? 'font-bold text-lumiere-700' : 'text-stone-400'
                  }`}
                >
                  ({brand.product_count ?? 0})
                </span>
              </button>
            );
          })}

          {filteredBrands.length === 0 && (
            <p className="py-3 text-center text-xs text-stone-400">
              Không tìm thấy thương hiệu phù hợp.
            </p>
          )}
        </div>
      </div>

      {/* 5. Loại da khuyên dùng (SKIN_TYPES pills) */}
      <div className="py-5 space-y-3">
        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
          Tình trạng & Loại da
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateFilters({ skin_type: '' })}
            className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
              !filters.skin_type
                ? 'border-stone-950 bg-stone-950 font-semibold text-white'
                : 'border-stone-200/90 bg-white font-medium text-stone-600 hover:border-stone-500 hover:text-stone-950'
            }`}
          >
            Tất cả
          </button>

          {SKIN_TYPES.map((skin) => {
            const isSelected = filters.skin_type === skin;
            return (
              <button
                key={skin}
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    skin_type: isSelected ? '' : skin,
                  })
                }
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-all ${
                  isSelected
                    ? 'border-lumiere-700 bg-lumiere-700 font-semibold text-white shadow-sm'
                    : 'border-stone-200/90 bg-white font-medium text-stone-600 hover:border-stone-500 hover:text-stone-950'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                <span>{skin}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nút xóa toàn bộ bộ lọc ở cuối */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onResetAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-900 hover:bg-stone-950 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Xóa toàn bộ bộ lọc</span>
        </button>
      </div>
    </div>
  );
}

export default ProductFilterSidebar;
