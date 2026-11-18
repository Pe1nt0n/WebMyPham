import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gift,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { customerApi, getApiErrorMessage } from '../../api/clients';
import { ProductImage } from '../../components/common/ProductImage';
import { useCart } from '../../contexts/CartContext';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, PAYMENT_METHOD_CONFIG } from '../../utils/format';

const PAYMENT_VISUALS = {
  COD: {
    icon: Banknote,
    tag: 'Phổ biến nhất',
    tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  BANK_TRANSFER: {
    icon: QrCode,
    tag: 'VietQR 24/7',
    tagClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  E_WALLET: {
    icon: Wallet,
    tag: 'MoMo / ZaloPay',
    tagClass: 'bg-pink-50 text-pink-700 border-pink-200',
  },
};

export function CheckoutPage() {
  const { user } = useCustomerAuth();
  const {
    items,
    totalItems,
    totalAmount,
    syncing,
    syncNotices,
    dismissSyncNotices,
    syncCart,
    clearCart,
  } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  // Đánh dấu đã đặt đơn thành công để tránh redirect ngược về /cart sau khi clearCart()
  const orderPlacedRef = useRef(false);

  const [form, setForm] = useState({
    recipient_name: user?.full_name || '',
    recipient_phone: user?.phone || '',
    shipping_address: user?.address || '',
    payment_method: 'COD',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Đối chiếu giá bán & số lượng khả dụng mới nhất khi vào trang Thanh toán
  useEffect(() => {
    const controller = new AbortController();
    syncCart({ signal: controller.signal });
    return () => controller.abort();
  }, [syncCart]);

  // Điền sẵn thông tin người nhận từ hồ sơ cá nhân
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      recipient_name: prev.recipient_name || user.full_name || '',
      recipient_phone: prev.recipient_phone || user.phone || '',
      shipping_address: prev.shipping_address || user.address || '',
    }));
  }, [user]);

  if (items.length === 0 && !orderPlacedRef.current) {
    return <Navigate to="/cart" replace />;
  }

  const handleRefillFromProfile = () => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      recipient_name: user.full_name || '',
      recipient_phone: user.phone || '',
      shipping_address: user.address || '',
    }));
    toast.info('Đã điền thông tin người nhận từ sổ địa chỉ thành viên.');
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (submitError) setSubmitError('');
  };

  const handleSubmitOrder = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const recipientName = form.recipient_name.trim();
    const recipientPhone = form.recipient_phone.trim();
    const shippingAddress = form.shipping_address.trim();

    if (!recipientName) {
      setSubmitError('Vui lòng nhập họ và tên người nhận hàng.');
      return;
    }
    if (!recipientPhone || !/^[0-9+\s.-]{8,15}$/.test(recipientPhone)) {
      setSubmitError('Vui lòng nhập số điện thoại liên hệ hợp lệ (8–15 chữ số).');
      return;
    }
    if (!shippingAddress || shippingAddress.length < 5) {
      setSubmitError(
        'Vui lòng nhập địa chỉ giao hàng chi tiết (số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành).'
      );
      return;
    }

    setSubmitting(true);
    try {
      // Kiểm tra đồng bộ lần cuối trước khi xác nhận đặt mua
      const preflight = await syncCart({ silent: true });
      if (preflight.ok && preflight.hasChanges) {
        const changeSummary = preflight.notices.join(' ');
        setSubmitError(
          `${changeSummary} Vui lòng kiểm tra lại tổng giá trị đơn hàng trước khi xác nhận.`
        );
        toast.warning(preflight.notices[0], {
          title: 'Giỏ hàng vừa cập nhật',
          duration: 5000,
        });
        return;
      }

      const activeItems = preflight.ok ? preflight.items : items;
      if (!activeItems || activeItems.length === 0) {
        toast.warning('Giỏ hàng hiện không còn sản phẩm khả dụng để đặt mua.');
        return;
      }

      const payload = {
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        shipping_address: shippingAddress,
        payment_method: form.payment_method,
        note: form.note.trim() || undefined,
        items: activeItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      const res = await customerApi.post('/orders', payload);
      const createdOrder = res.data?.data;

      orderPlacedRef.current = true;
      clearCart();

      toast.success(
        res.data?.message || 'Đặt hàng thành công! Cảm ơn bạn đã mua sắm tại Lumière Beauté.',
        { title: 'Đặt hàng thành công' }
      );

      if (createdOrder?.id) {
        navigate(`/orders/${createdOrder.id}`, {
          replace: true,
          state: { justOrdered: true },
        });
      } else {
        navigate('/orders', { replace: true });
      }
    } catch (err) {
      if (err?.response?.status === 400) {
        await syncCart({ silent: true });
      }
      const msg = getApiErrorMessage(
        err,
        'Không thể hoàn tất đơn đặt hàng lúc này. Vui lòng kiểm tra lại thông tin nhận hàng.'
      );
      setSubmitError(msg);
      toast.error(msg, { title: 'Chưa thể hoàn tất đặt hàng' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Header & 3-Step Checkout Stepper */}
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
            <Link to="/cart" className="hover:text-lumiere-700 transition-colors">
              Giỏ hàng
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900">Thanh toán đơn hàng</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
                Thông Tin Giao Nhận &amp; Thanh Toán
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                Hoàn tất địa chỉ người nhận và lựa chọn phương thức thanh toán thuận tiện nhất với bạn.
              </p>
            </div>

            {/* 3-Step Progress Bar (Step 1 Done, Step 2 Active) */}
            <ol
              aria-label="Tiến trình đặt hàng"
              className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm"
            >
              <li className="flex items-center gap-2 font-semibold text-emerald-700">
                <Link
                  to="/cart"
                  className="flex items-center gap-2 hover:text-emerald-800 transition-colors"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Giỏ hàng</span>
                </Link>
              </li>
              <span className="h-px w-5 sm:w-8 bg-stone-900" />
              <li className="flex items-center gap-2 font-bold text-stone-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-xs font-bold text-white shadow-sm">
                  2
                </span>
                <span className="hidden sm:inline">Thông tin giao nhận</span>
                <span className="sm:hidden">Giao nhận</span>
              </li>
              <span className="h-px w-5 sm:w-8 bg-stone-300" />
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

      {/* Main Checkout Form & Sticky Order Summary */}
      <form
        onSubmit={handleSubmitOrder}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8"
      >
        {syncNotices.length > 0 && !submitError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs sm:text-sm text-amber-950"
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
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Chưa thể hoàn tất đặt hàng</p>
              <p className="mt-0.5 text-rose-700">{submitError}</p>
            </div>
            <Link
              to="/cart"
              className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100"
            >
              Xem lại giỏ hàng
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Shipping Address & Payment Method Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Địa chỉ giao nhận */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-champagne-100/70 text-champagne-900">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-stone-950">
                      1. Địa Chỉ Nhận Mỹ Phẩm
                    </h2>
                    <p className="text-xs text-stone-500">
                      Điền sẵn từ sổ địa chỉ thành viên — bạn có thể thay đổi người nhận linh hoạt
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRefillFromProfile}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:border-lumiere-400 hover:text-lumiere-800 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Điền từ hồ sơ</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="checkout-recipient-name"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Họ và tên người nhận <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="checkout-recipient-name"
                      type="text"
                      required
                      value={form.recipient_name}
                      onChange={(e) => handleChange('recipient_name', e.target.value)}
                      placeholder="VD: Nguyễn Thảo Vy"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-recipient-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="checkout-recipient-phone"
                      type="tel"
                      required
                      value={form.recipient_phone}
                      onChange={(e) => handleChange('recipient_phone', e.target.value)}
                      placeholder="VD: 0912345678"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="checkout-shipping-address"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Địa chỉ giao hàng chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="checkout-shipping-address"
                  rows={2}
                  required
                  value={form.shipping_address}
                  onChange={(e) => handleChange('shipping_address', e.target.value)}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="checkout-order-note"
                    className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-lumiere-700" />
                    <span>Lời nhắn cho đơn hàng / Gói quà tặng (Tùy chọn)</span>
                  </label>
                  <span className="text-[11px] text-stone-400">{form.note.length}/255</span>
                </div>
                <textarea
                  id="checkout-order-note"
                  rows={2}
                  maxLength={255}
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="VD: Giao giờ hành chính, viết thiệp chúc mừng sinh nhật..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>
            </div>

            {/* Card 2: Phương thức thanh toán có Icon trực quan */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
              <div className="border-b border-stone-100 pb-4">
                <h2 className="font-serif text-xl font-bold text-stone-950">
                  2. Phương Thức Thanh Toán
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Mọi giao dịch đều được bảo vệ an toàn và phát hành hóa đơn bán lẻ điện tử chính thức
                </p>
              </div>

              <div className="space-y-3">
                {Object.values(PAYMENT_METHOD_CONFIG).map((method) => {
                  const visual = PAYMENT_VISUALS[method.value] || PAYMENT_VISUALS.COD;
                  const IconComp = visual.icon;
                  const isSelected = form.payment_method === method.value;

                  return (
                    <label
                      key={method.value}
                      className={`relative flex cursor-pointer items-start gap-4 rounded-2xl border p-4 sm:p-5 transition-all ${
                        isSelected
                          ? 'border-stone-950 bg-champagne-50/40 ring-1 ring-stone-950 shadow-sm'
                          : 'border-stone-200 bg-white hover:border-stone-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method.value}
                        checked={isSelected}
                        onChange={() => handleChange('payment_method', method.value)}
                        className="sr-only"
                      />

                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                          isSelected
                            ? 'bg-stone-950 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-stone-950">{method.label}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${visual.tagClass}`}
                          >
                            {visual.tag}
                          </span>
                        </div>
                        <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                          {method.description}
                        </span>
                      </div>

                      <span
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-stone-950 bg-stone-950 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    </label>
                  );
                })}
              </div>

              {form.payment_method === 'BANK_TRANSFER' && (
                <div className="rounded-2xl border border-sky-200/90 bg-sky-50/60 p-4 text-xs sm:text-sm text-sky-950 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-sky-700" />
                    <span>Thông tin chuyển khoản VietQR chính thức:</span>
                  </p>
                  <p>• Ngân hàng: <strong>Vietcombank — Chi nhánh TP. Hồ Chí Minh</strong></p>
                  <p>• Số tài khoản: <strong>0071 0012 88999</strong> — CÔNG TY TNHH LUMIÈRE BEAUTÉ VN</p>
                  <p className="text-xs text-sky-800">
                    • Nội dung chuyển khoản: <strong>SĐT người nhận + Họ tên</strong> (Bộ phận Chăm sóc Khách hàng sẽ xác nhận ngay khi nhận được thanh toán).
                  </p>
                </div>
              )}

              {form.payment_method === 'E_WALLET' && (
                <div className="rounded-2xl border border-pink-200/90 bg-pink-50/60 p-4 text-xs sm:text-sm text-pink-950 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-pink-700" />
                    <span>Thanh toán qua Ví điện tử MoMo / ZaloPay:</span>
                  </p>
                  <p className="text-xs text-pink-900">
                    Chuyên viên tư vấn Lumière sẽ gửi mã QR thanh toán định danh qua số điện thoại
                    người nhận ngay sau khi tiếp nhận đơn hàng của bạn.
                  </p>
                </div>
              )}
            </div>

            <div>
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-950 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại chỉnh sửa giỏ hàng</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Sticky Order Summary */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-7 shadow-xl shadow-stone-950/[0.04] space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <h2 className="font-serif text-xl font-bold text-stone-950">Đơn Hàng Của Bạn</h2>
                <span className="rounded-full bg-champagne-100/80 px-3 py-1 text-xs font-bold text-champagne-900">
                  {totalItems} sản phẩm
                </span>
              </div>

              {/* Itemized List */}
              <div className="max-h-80 overflow-y-auto pr-1 divide-y divide-stone-100">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-champagne-200/80 bg-champagne-50">
                      <ProductImage src={item.image_url} alt={item.name} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs sm:text-sm font-bold text-stone-900">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        SL: <strong>{item.quantity}</strong> × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="text-right text-xs sm:text-sm font-bold text-stone-900 shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Complimentary Sample Perk */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-champagne-200/80 bg-champagne-50/60 px-3.5 py-2.5 text-xs text-stone-700">
                <Gift className="h-4 w-4 text-lumiere-700 shrink-0" />
                <span>
                  Tặng kèm <strong>Sample dưỡng da chính hãng</strong> trong hộp quà Lumière
                </span>
              </div>

              {/* Totals */}
              <div className="space-y-2.5 border-t border-stone-100 pt-4 text-sm">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Tạm tính tiền hàng</span>
                  <span className="font-bold text-stone-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Phí giao hàng toàn quốc</span>
                  <span className="font-bold text-emerald-700">Miễn phí (0 ₫)</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-stone-100 pt-3.5">
                  <span className="text-base font-bold text-stone-950">Tổng thanh toán</span>
                  <div className="text-right">
                    <span className="block text-2xl font-extrabold text-lumiere-700">
                      {formatCurrency(totalAmount)}
                    </span>
                    <span className="text-[11px] text-stone-400">Đã bao gồm VAT</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || syncing}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-lumiere-700 px-6 py-4 text-sm sm:text-base font-bold text-white shadow-lg shadow-lumiere-800/25 hover:bg-lumiere-800 disabled:cursor-not-allowed disabled:opacity-65 transition-all active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Đang xử lý đơn đặt hàng...</span>
                  </>
                ) : syncing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Đang kiểm tra giỏ hàng...</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" />
                    <span>Hoàn Tất Đặt Hàng ({formatCurrency(totalAmount)})</span>
                  </>
                )}
              </button>

              <div className="space-y-1.5 pt-1 text-[11px] text-stone-500">
                <p className="flex items-center justify-center gap-1.5 text-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Được đồng kiểm ngoại quan sản phẩm nguyên tem trước khi nhận</span>
                </p>
                <p className="flex items-center justify-center gap-1.5 text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-lumiere-700 shrink-0" />
                  <span>Phát hành hóa đơn điện tử ngay sau khi xác nhận đơn hàng</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CheckoutPage;
