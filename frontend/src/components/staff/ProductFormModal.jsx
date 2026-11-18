import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  PackagePlus,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { staffApi } from '../../api/clients';
import { ProductImage } from '../common/ProductImage';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  getApiErrorMessage,
  isSafeImageUrl,
  SKIN_TYPES,
} from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';
import { SAMPLE_PRODUCT_IMAGES } from './staffHelpers';

const INITIAL_FORM = {
  name: '',
  category_id: '',
  brand_id: '',
  price: '',
  stock_quantity: '20',
  volume: '',
  skin_type: 'Mọi loại da',
  image_url: '',
  description: '',
  status: 'ACTIVE',
};

export function ProductFormModal({
  isOpen,
  onClose,
  product = null,
  categories = [],
  brands = [],
  onSaved,
}) {
  const toast = useToast();
  const isEditing = Boolean(product?.id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormError('');

    if (product) {
      setForm({
        name: product.name || '',
        category_id: String(product.category_id || ''),
        brand_id: String(product.brand_id || ''),
        price:
          product.price !== undefined
            ? String(Math.round(Number(product.price)))
            : '',
        stock_quantity:
          product.stock_quantity !== undefined
            ? String(product.stock_quantity)
            : '0',
        volume: product.volume || '',
        skin_type: product.skin_type || 'Mọi loại da',
        image_url: product.image_url || '',
        description: product.description || '',
        status: product.status || 'ACTIVE',
      });
    } else {
      setForm({
        ...INITIAL_FORM,
        category_id: categories[0]?.id ? String(categories[0].id) : '',
        brand_id: brands[0]?.id ? String(brands[0].id) : '',
      });
    }
  }, [isOpen, product, categories, brands]);

  useModalDialog({
    isOpen,
    onClose,
    disabled: submitting,
  });

  if (!isOpen) return null;

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (formError) setFormError('');
  };

  const adjustStock = (delta) => {
    const current = Math.max(0, parseInt(form.stock_quantity || '0', 10) || 0);
    updateField('stock_quantity', String(Math.max(0, current + delta)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = form.name.trim();
    const categoryId = Number(form.category_id);
    const brandId = Number(form.brand_id);
    const priceNum = Number(form.price);
    const stockNum = Number(form.stock_quantity);

    if (!trimmedName) {
      setFormError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      setFormError('Vui lòng chọn danh mục sản phẩm.');
      return;
    }
    if (!Number.isInteger(brandId) || brandId <= 0) {
      setFormError('Vui lòng chọn thương hiệu.');
      return;
    }
    if (
      form.price === '' ||
      !Number.isFinite(priceNum) ||
      priceNum < 0 ||
      priceNum >= 10000000000
    ) {
      setFormError(
        'Giá niêm yết phải là số không âm hợp lệ (tối đa dưới 10 tỷ VNĐ).'
      );
      return;
    }
    if (
      form.stock_quantity === '' ||
      !Number.isInteger(stockNum) ||
      stockNum < 0 ||
      stockNum > 1000000
    ) {
      setFormError('Số lượng tồn kho phải là số nguyên từ 0 đến 1.000.000.');
      return;
    }
    const trimmedImageUrl = form.image_url.trim();
    if (
      trimmedImageUrl &&
      (!isSafeImageUrl(trimmedImageUrl) ||
        !/^https?:\/\/\S+$/i.test(trimmedImageUrl))
    ) {
      setFormError(
        'Đường dẫn hình ảnh sản phẩm phải bắt đầu bằng https:// hoặc http:// hợp lệ.'
      );
      return;
    }

    const payload = {
      name: trimmedName,
      category_id: categoryId,
      brand_id: brandId,
      price: Math.round(priceNum),
      stock_quantity: stockNum,
      volume: form.volume.trim() || null,
      skin_type: form.skin_type.trim() || 'Mọi loại da',
      image_url: trimmedImageUrl || null,
      description: form.description.trim() || null,
      status: form.status,
    };

    try {
      setSubmitting(true);
      const res = isEditing
        ? await staffApi.put(`/staff/products/${product.id}`, payload)
        : await staffApi.post('/staff/products', payload);

      toast.success(
        res.data?.message ||
          (isEditing
            ? 'Đã lưu cập nhật thông tin sản phẩm.'
            : 'Đã thêm sản phẩm mới vào danh mục.')
      );
      if (onSaved) onSaved(res.data?.data);
      onClose();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Không thể lưu thông tin sản phẩm.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const skinOptions =
    SKIN_TYPES.includes(form.skin_type) || !form.skin_type
      ? SKIN_TYPES
      : [form.skin_type, ...SKIN_TYPES];

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-center justify-center p-3 sm:p-5 no-print print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
              {isEditing ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <PackagePlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3
                id="product-form-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                {isEditing
                  ? `Cập nhật sản phẩm #${product.id}`
                  : 'Khai báo sản phẩm mới'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Điều chỉnh giá niêm yết, bổ sung tồn kho khả dụng hoặc cập nhật trạng thái kinh doanh'
                  : 'Thiết lập thông tin thương mại, quy cách và số lượng nhập kho ban đầu'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Cột trái: Thông tin thương mại & tồn kho */}
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label
                  htmlFor="prod-form-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Tên thương mại sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  id="prod-form-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="VD: Tinh Chất The Ordinary Niacinamide 10% + Zinc 1%"
                  className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="prod-form-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nhóm danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="prod-form-category"
                    required
                    value={form.category_id}
                    onChange={(e) => updateField('category_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="prod-form-brand"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Thương hiệu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="prod-form-brand"
                    required
                    value={form.brand_id}
                    onChange={(e) => updateField('brand_id', e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  >
                    <option value="">-- Chọn thương hiệu --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.origin ? `(${b.origin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <label htmlFor="prod-form-price">
                      Giá bán niêm yết (VNĐ){' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    {form.price !== '' &&
                      Number.isFinite(Number(form.price)) &&
                      Number(form.price) >= 0 && (
                        <span className="text-emerald-700 font-bold tabular-nums">
                          {formatCurrency(form.price)}
                        </span>
                      )}
                  </div>
                  <input
                    id="prod-form-price"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={form.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    placeholder="VD: 485000"
                    className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <label htmlFor="prod-form-stock">
                      Số lượng tồn kho <span className="text-rose-500">*</span>
                    </label>
                    <span className="flex items-center gap-1">
                      {[5, 10, 20].map((inc) => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => adjustStock(inc)}
                          className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition-colors tabular-nums"
                          title={`Nhập bổ sung nhanh +${inc} đơn vị`}
                        >
                          +{inc}
                        </button>
                      ))}
                    </span>
                  </div>
                  <input
                    id="prod-form-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.stock_quantity}
                    onChange={(e) =>
                      updateField('stock_quantity', e.target.value)
                    }
                    placeholder="VD: 35"
                    className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm font-semibold text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="prod-form-volume"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Dung tích / Quy cách đóng gói
                  </label>
                  <input
                    id="prod-form-volume"
                    type="text"
                    value={form.volume}
                    onChange={(e) => updateField('volume', e.target.value)}
                    placeholder="VD: 50ml, 30ml, 4.6g..."
                    className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="prod-form-skin"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Phân loại làn da phù hợp
                  </label>
                  <select
                    id="prod-form-skin"
                    value={form.skin_type}
                    onChange={(e) => updateField('skin_type', e.target.value)}
                    className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                  >
                    {skinOptions.map((skin) => (
                      <option key={skin} value={skin}>
                        {skin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="prod-form-desc"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Mô tả công dụng &amp; bảng thành phần chính
                </label>
                <textarea
                  id="prod-form-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Thông tin chi tiết về hoạt chất nổi bật, công dụng chăm sóc da và hướng dẫn sử dụng..."
                  className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                />
              </div>
            </div>

            {/* Cột phải: Ảnh đại diện & Trạng thái kinh doanh */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ảnh đại diện sản phẩm
                </span>
                <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50">
                  <ProductImage
                    src={form.image_url}
                    alt={form.name || 'Xem trước sản phẩm'}
                    className="h-full w-full"
                    showFallbackCaption
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prod-form-image-url"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1"
                >
                  <ImagePlus className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Đường dẫn hình ảnh (URL)</span>
                </label>
                <input
                  id="prod-form-image-url"
                  type="url"
                  value={form.image_url}
                  onChange={(e) => updateField('image_url', e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-slate-200/90 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
                />

                <div className="mt-2">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Ảnh studio tiêu chuẩn tham khảo:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {SAMPLE_PRODUCT_IMAGES.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() => updateField('image_url', sample.url)}
                        className="rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trạng thái kinh doanh */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Trạng thái trên cửa hàng trực tuyến
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('status', 'ACTIVE')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all ${
                      form.status === 'ACTIVE'
                        ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Đang kinh doanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateField('status', 'HIDDEN')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all ${
                      form.status === 'HIDDEN'
                        ? 'border-slate-700 bg-slate-800 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Ngừng hiển thị</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditing ? 'Lưu thay đổi' : 'Thêm vào danh mục'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
