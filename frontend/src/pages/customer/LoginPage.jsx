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
  MapPin,
  PackageCheck,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/clients';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';

const CLUB_BENEFITS = [
  {
    icon: PackageCheck,
    title: 'Theo dõi đơn hàng trực tuyến',
    desc: 'Cập nhật tức thì tiến trình xác nhận đơn và tra cứu hóa đơn bán lẻ điện tử.',
  },
  {
    icon: MapPin,
    title: 'Lưu sổ địa chỉ giao nhanh',
    desc: 'Tự động điền thông tin người nhận giúp hoàn tất thanh toán chỉ trong vài giây.',
  },
  {
    icon: Gift,
    title: 'Ưu đãi thành viên VIP',
    desc: 'Tặng kèm sample mỹ phẩm Pháp - Hàn theo mọi đơn hàng và miễn phí giao nhận.',
  },
];

export function LoginPage() {
  const { isAuthenticated, login } = useCustomerAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Đích chuyển hướng sau khi đăng nhập thành công
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên đăng nhập (hoặc Email) và Mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({
        username: username.trim(),
        password,
      });
      toast.success(
        `Chào mừng ${result.user?.full_name || username} quay trở lại Lumière Beauté!`
      );
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-2xl shadow-stone-950/[0.06] grid grid-cols-1 lg:grid-cols-12">
        {/* Left Lifestyle Editorial Panel */}
        <div className="lg:col-span-5 relative overflow-hidden bg-stone-950 p-8 sm:p-10 text-white flex flex-col justify-between min-h-[380px]">
          <img
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=85"
            alt="Lumière Beauty Club"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-lumiere-950/70" />

          <div className="relative space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-champagne-300/30 bg-champagne-300/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-champagne-200 backdrop-blur-sm">
              <Crown className="h-3.5 w-3.5 text-champagne-300" />
              <span>Lumière Beauty Club</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-snug text-white">
              Chào Mừng Trở Lại Không Gian Sắc Đẹp Lumière
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-stone-300">
              Đăng nhập tài khoản thành viên để tiếp tục hành trình chăm sóc làn da khoa học cùng
              những đặc quyền mua sắm cá nhân hóa.
            </p>
          </div>

          <div className="relative mt-8 space-y-4 border-t border-white/15 pt-6">
            {CLUB_BENEFITS.map((benefit) => {
              const IconComp = benefit.icon;
              return (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-champagne-200 ring-1 ring-white/15 backdrop-blur-sm">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">{benefit.title}</p>
                    <p className="text-xs text-stone-300/90 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Minimalist Sign-In Form */}
        <div className="lg:col-span-7 p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-lumiere-700">
                Member Sign In
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">
                Đăng Nhập Tài Khoản
              </h2>
              <p className="text-sm text-stone-500">
                Chưa là thành viên Lumière Beauty Club?{' '}
                <Link
                  to="/register"
                  state={location.state}
                  className="font-bold text-lumiere-700 hover:text-lumiere-900 underline underline-offset-4"
                >
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-700"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="customer-login-username"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2"
                >
                  Tên đăng nhập hoặc Email
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="customer-login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Nhập tên đăng nhập hoặc địa chỉ email..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-11 pr-4 py-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="customer-login-password"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    id="customer-login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Nhập mật khẩu của bạn..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-11 pr-11 py-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-stone-950 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-stone-950/20 hover:bg-lumiere-800 disabled:cursor-not-allowed disabled:opacity-65 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Nhập Thành Viên</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-stone-100 pt-5 text-xs text-stone-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Thông tin thành viên được bảo mật tuyệt đối tại Lumière Beauté</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
