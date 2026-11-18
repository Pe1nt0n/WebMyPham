import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Crown,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  Lock,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/clients';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VIP_PERKS = [
  {
    icon: PackageCheck,
    title: 'Theo dõi đơn hàng trực tuyến',
    desc: 'Kiểm tra trạng thái đơn đặt mua và xem chứng từ hóa đơn điện tử mọi lúc.',
  },
  {
    icon: MapPin,
    title: 'Lưu sổ địa chỉ giao nhanh',
    desc: 'Lưu thông tin người nhận mặc định cho trải nghiệm đặt mua liền mạch.',
  },
  {
    icon: Gift,
    title: 'Ưu đãi thành viên VIP',
    desc: 'Nhận sample chăm sóc da chính hãng và miễn phí vận chuyển toàn quốc.',
  },
];

export function RegisterPage() {
  const { isAuthenticated, register } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const requestedFrom = location.state?.from?.pathname;
  const redirectTarget =
    requestedFrom && requestedFrom !== '/login' && requestedFrom !== '/register'
      ? `${requestedFrom}${location.state.from.search || ''}`
      : '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const fullName = form.full_name.trim();
    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!fullName) {
      setErrorMsg('Vui lòng nhập họ và tên đầy đủ của bạn.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
      setErrorMsg(
        'Tên đăng nhập từ 3–50 ký tự (gồm chữ không dấu, chữ số, dấu ., _, -) và không chứa khoảng trắng.'
      );
      return;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      setErrorMsg('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }
    if (phone && !/^[0-9+\s.-]{8,15}$/.test(phone)) {
      setErrorMsg('Số điện thoại không đúng định dạng (8–15 chữ số).');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setErrorMsg('Mật khẩu cần có tối thiểu 6 ký tự.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({
        full_name: fullName,
        username,
        email,
        phone: phone || undefined,
        address: address || undefined,
        password: form.password,
      });

      toast.success(
        result.message || `Chào mừng ${fullName} gia nhập Lumière Beauty Club!`,
        { title: 'Chào mừng thành viên mới' }
      );
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Không thể khởi tạo tài khoản. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-2xl shadow-stone-950/[0.06] grid grid-cols-1 lg:grid-cols-12">
        {/* Left Lifestyle Editorial Panel */}
        <div className="lg:col-span-5 relative overflow-hidden bg-stone-950 p-8 sm:p-10 text-white flex flex-col justify-between min-h-[400px]">
          <img
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85"
            alt="Lumière Beauty Club Sign Up"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-lumiere-950/85 to-stone-950/75" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-champagne-300/30 bg-champagne-300/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-champagne-200 backdrop-blur-sm">
              <Crown className="h-3.5 w-3.5 text-champagne-300" />
              <span>Lumière Beauty Club</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-white">
              Gia Nhập Cộng Đồng Yêu Cái Đẹp Tinh Tế
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
              Trở thành thành viên chính thức tại Lumière Beauté chỉ trong 30 giây để mở khóa trọn
              vẹn quyền lợi chăm sóc sắc đẹp cao cấp.
            </p>

            <div className="space-y-4 pt-2">
              {VIP_PERKS.map((perk) => {
                const IconComp = perk.icon;
                return (
                  <div key={perk.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-champagne-200 ring-1 ring-white/15 backdrop-blur-sm">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">{perk.title}</p>
                      <p className="text-xs text-stone-300/90 leading-relaxed">{perk.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mt-8 border-t border-white/15 pt-5 text-xs text-champagne-200/85">
            Flagship Boutique: 273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh
          </div>
        </div>

        {/* Right Registration Form */}
        <div className="lg:col-span-7 p-7 sm:p-10">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-lumiere-700">
              Member Sign Up
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">
              Đăng Ký Thành Viên Mới
            </h2>
            <p className="text-sm text-stone-500">
              Đã có tài khoản thành viên?{' '}
              <Link
                to="/login"
                state={location.state}
                className="font-bold text-lumiere-700 hover:text-lumiere-900 underline underline-offset-4"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-700"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-full-name"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="reg-full-name"
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="VD: Lê Ngọc Bảo Trân"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-username"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Tên đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="3–50 ký tự, viết liền không dấu"
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="baotran@email.com"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Số điện thoại nhận hàng
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="reg-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="VD: 0908112233"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-address"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Địa chỉ giao nhận mặc định
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  id="reg-address"
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-10 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Hiện hoặc ẩn mật khẩu"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="reg-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.confirm_password}
                    onChange={(e) => handleChange('confirm_password', e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-950 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-stone-950/20 hover:bg-lumiere-800 disabled:cursor-not-allowed disabled:opacity-65 transition-all mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang khởi tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Hoàn Tất Gia Nhập Beauty Club</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-stone-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Cam kết bảo mật quyền riêng tư theo tiêu chuẩn Lumière Beauté</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
