import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  PackagePlus,
  PackageSearch,
  PackageX,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { isCanceledRequest, publicApi, staffApi } from '../../api/clients';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ProductImage } from '../../components/common/ProductImage';
import { ProductFormModal } from '../../components/staff/ProductFormModal';
import { getStockStatusMeta } from '../../components/staff/staffHelpers';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  getApiErrorMessage,
  PRODUCT_STATUS_CONFIG,
} from '../../utils/format';

const STOCK_FILTER_TABS = [
  { value: '', label: 'Tất cả kho hàng' },
  { value: 'low_stock', label: 'Sắp hết hàng (1–5)' },
  { value: 'out_of_stock', label: 'Hết hàng (0)' },
  { value: 'in_stock', label: 'Tồn kho ổn định (>5)' },
];

const COMMERCIAL_PRODUCT_STATUS = {
  ACTIVE: {
    label: 'Đang kinh doanh',
    badgeClass:
      PRODUCT_STATUS_CONFIG.ACTIVE?.badgeClass ||
      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  HIDDEN: {
    label: 'Ngừng hiển thị',
    badgeClass:
      PRODUCT_STATUS_CONFIG.HIDDEN?.badgeClass ||
      'bg-slate-100 text-slate-600 border border-slate-200',
  },
};

export function StaffProductsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get('search') || ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => (searchParams.get('search') || '').trim()
  );
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(
    () => searchParams.get('stock_filter') || ''
  );
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || '');

  useEffect(() => {
    const qStock = searchParams.get('stock_filter') || '';
    const qSearch = searchParams.get('search');
    const qSort = searchParams.get('sort');

    setStockFilter(qStock);
    if (qSearch !== null) {
      setSearchInput(qSearch);
      setDebouncedSearch(qSearch.trim());
    }
    if (qSort !== null) {
      setSortBy(qSort);
    }
  }, [searchParams]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    Promise.all([publicApi.get('/categories'), publicApi.get('/brands')])
      .then(([catRes, brandRes]) => {
        if (!active) return;
        setCategories(catRes.data?.data || []);
        setBrands(brandRes.data?.data || []);
      })
      .catch(() => {
        // Bỏ qua lỗi phụ
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchProducts = useCallback(
    async (options = {}) => {
      const signal = options?.signal;
      try {
        setLoading(true);
        const params = {};
        if (debouncedSearch) params.search = debouncedSearch;
        if (categoryId) params.category_id = categoryId;
        if (brandId) params.brand_id = brandId;
        if (statusFilter) params.status = statusFilter;
        if (stockFilter) params.stock_filter = stockFilter;
        if (sortBy) params.sort = sortBy;

        const res = await staffApi.get('/staff/products', { params, signal });
        setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        if (isCanceledRequest(err)) return;
        toast.error(getApiErrorMessage(err, 'Không thể tải danh mục sản phẩm.'));
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      debouncedSearch,
      categoryId,
      brandId,
      statusFilter,
      stockFilter,
      sortBy,
      toast,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchProducts]);

  const handleSelectStockFilter = (val) => {
    setStockFilter(val);
    const next = new URLSearchParams(searchParams);
    if (val) next.set('stock_filter', val);
    else next.delete('stock_filter');
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCategoryId('');
    setBrandId('');
    setStatusFilter('');
    setStockFilter('');
    setSortBy('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormModalOpen(true);
  };

  const handleQuickToggleStatus = async (prod) => {
    const nextStatus = prod.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    try {
      setTogglingId(prod.id);
      const res = await staffApi.put(`/staff/products/${prod.id}`, {
        status: nextStatus,
      });
      toast.success(
        nextStatus === 'ACTIVE'
          ? `Đã mở bán sản phẩm "${prod.name}" trên cửa hàng trực tuyến.`
          : `Đã ngừng hiển thị sản phẩm "${prod.name}" trên cửa hàng trực tuyến.`
      );
      const updated = res.data?.data;
      setProducts((prev) =>
        prev.map((item) =>
          item.id === prod.id ? updated || { ...item, status: nextStatus } : item
        )
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, 'Không thể cập nhật trạng thái kinh doanh.')
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      setDeleteLoading(true);
      const res = await staffApi.delete(`/staff/products/${deletingProduct.id}`);
      const action = res.data?.data?.action;
      const serverMsg =
        res.data?.message || 'Đã cập nhật danh mục sản phẩm thành công.';

      if (action === 'SOFT_HIDDEN') {
        toast.warning(serverMsg, {
          title: 'Đã chuyển sang Ngừng hiển thị',
          duration: 5000,
        });
      } else {
        toast.success(serverMsg);
      }

      setDeletingProduct(null);
      await fetchProducts();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể xóa sản phẩm.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const lowStockCount = products.filter(
    (p) => Number(p.stock_quantity) > 0 && Number(p.stock_quantity) <= 5
  ).length;
  const outOfStockCount = products.filter(
    (p) => Number(p.stock_quantity) <= 0
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Thanh tổng quan & Bộ lọc kho hàng */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Danh mục Sản phẩm &amp; Định mức Tồn kho
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Hiển thị <strong className="text-slate-700">{products.length}</strong>{' '}
                mặt hàng • Cảnh báo bổ sung:{' '}
                <span className="font-semibold text-amber-600">
                  {lowStockCount} sắp hết
                </span>{' '}
                •{' '}
                <span className="font-semibold text-rose-600">
                  {outOfStockCount} hết hàng
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => fetchProducts()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>
        </div>

        {/* Bộ lọc nhanh theo tình trạng tồn kho */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {STOCK_FILTER_TABS.map((tab) => {
              const active = stockFilter === tab.value;
              return (
                <button
                  key={tab.value || 'all'}
                  type="button"
                  onClick={() => handleSelectStockFilter(tab.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? tab.value === 'out_of_stock'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : tab.value === 'low_stock'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-emerald-700 text-white shadow-sm'
                      : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.value === 'low_stock' && (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {tab.value === 'out_of_stock' && (
                    <PackageX className="h-3.5 w-3.5" />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {(searchInput ||
            categoryId ||
            brandId ||
            statusFilter ||
            stockFilter ||
            sortBy) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* Hàng Tìm kiếm & Dropdown Lọc chi tiết */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Tìm tên sản phẩm hoặc thương hiệu"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, thương hiệu..."
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Lọc theo danh mục sản phẩm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Lọc theo thương hiệu"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
            >
              <option value="">Tất cả thương hiệu</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 gap-2">
            <select
              aria-label="Lọc theo trạng thái kinh doanh"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">Mọi trạng thái</option>
              <option value="ACTIVE">Đang kinh doanh</option>
              <option value="HIDDEN">Ngừng hiển thị</option>
            </select>

            <select
              aria-label="Sắp xếp danh sách sản phẩm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">Mới cập nhật</option>
              <option value="stock_asc">Tồn kho thấp đến cao</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bảng Danh sách Sản phẩm */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            <span className="text-sm font-medium">
              Đang tải dữ liệu danh mục và tồn kho...
            </span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <PackageX className="h-11 w-11 text-slate-300 mb-3" />
            <p className="text-sm sm:text-base font-bold text-slate-800">
              Không tìm thấy sản phẩm phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-md">
              Vui lòng điều chỉnh bộ lọc tìm kiếm hoặc nhấn &ldquo;Thêm sản
              phẩm&rdquo; để khai báo mặt hàng mới vào kho.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 w-16">Mã SP</th>
                  <th className="px-4 py-3.5">Sản phẩm &amp; Quy cách</th>
                  <th className="px-4 py-3.5">Thương hiệu / Nhóm hàng</th>
                  <th className="px-4 py-3.5 text-right">Giá niêm yết</th>
                  <th className="px-4 py-3.5 text-center">Tồn kho</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái bán</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => {
                  const stockMeta = getStockStatusMeta(prod.stock_quantity);
                  const statusMeta =
                    COMMERCIAL_PRODUCT_STATUS[prod.status] ||
                    COMMERCIAL_PRODUCT_STATUS.ACTIVE;
                  const isHidden = prod.status === 'HIDDEN';

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors ${
                        isHidden
                          ? 'bg-slate-50/60 hover:bg-slate-100/60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-500 tabular-nums">
                        #{prod.id}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3.5 max-w-md">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                            <ProductImage
                              src={prod.image_url}
                              alt={prod.name}
                            />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-semibold leading-snug line-clamp-2 ${
                                isHidden ? 'text-slate-500' : 'text-slate-900'
                              }`}
                            >
                              {prod.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                              {prod.volume && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                  {prod.volume}
                                </span>
                              )}
                              {prod.skin_type && (
                                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-medium text-slate-600 border border-slate-200/80">
                                  {prod.skin_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">
                          {prod.brand_name}
                          {prod.brand_origin && (
                            <span className="ml-1 text-xs font-normal text-slate-400">
                              ({prod.brand_origin})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {prod.category_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(prod.price)}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockMeta.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${stockMeta.dotClass}`}
                          />
                          <span>
                            {prod.stock_quantity} • {stockMeta.label}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={togglingId === prod.id}
                          onClick={() => handleQuickToggleStatus(prod)}
                          title="Nhấn để chuyển đổi trạng thái hiển thị trên cửa hàng"
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-85 disabled:opacity-50 ${statusMeta.badgeClass}`}
                        >
                          {togglingId === prod.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isHidden ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          <span>{statusMeta.label}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(prod)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800 transition-colors"
                            title="Cập nhật thông tin hoặc bổ sung tồn kho"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Cập nhật</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingProduct(prod)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa hoặc ngừng hiển thị sản phẩm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Thêm / Sửa Sản phẩm */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        product={editingProduct}
        categories={categories}
        brands={brands}
        onSaved={() => fetchProducts()}
      />

      {/* Modal Xác nhận Xóa / Ngừng hiển thị */}
      <ConfirmModal
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        variant="danger"
        title={`Xác nhận xóa mặt hàng #${deletingProduct?.id || ''}`}
        message={
          deletingProduct
            ? `Bạn có chắc chắn muốn loại bỏ sản phẩm "${deletingProduct.name}" khỏi danh mục kinh doanh?`
            : ''
        }
        confirmText="Xác nhận thực hiện"
        cancelText="Hủy bỏ"
      >
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-950">
          <p className="font-semibold text-amber-900">
            Chính sách lưu trữ dữ liệu kinh doanh:
          </p>
          <p className="mt-1">
            • Nếu mặt hàng <strong>đã phát sinh đơn đặt hàng</strong>, hệ thống
            sẽ tự động chuyển sang trạng thái <strong>Ngừng hiển thị</strong>{' '}
            nhằm bảo toàn lịch sử chứng từ bán lẻ.
            <br />• Nếu mặt hàng <strong>chưa từng phát sinh giao dịch</strong>,
            dữ liệu sản phẩm sẽ được xóa hoàn toàn khỏi danh mục.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}

export default StaffProductsPage;
