import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../utils/format';

const WORKSPACE_HIGHLIGHTS = [
  {
    icon: PackageCheck,
    title: 'Quản trị danh mục & định mức tồn kho',
    description:
      'Theo dõi số lượng khả dụng theo thời gian thực, cập nhật giá niêm yết và trạng thái kinh doanh từng dòng sản phẩm.',
  },
  {
    icon: ClipboardCheck,
    title: 'Xử lý đơn đặt hàng & xuất chứng từ',
    description:
      'Đối soát tồn kho khi xác nhận đơn, tự động phát hành hóa đơn bán lẻ kiêm phiếu xuất kho chuẩn A4.',
  },
  {
    icon: BarChart3,
    title: 'Báo cáo doanh thu & hiệu suất kỳ',
    description:
      'Tổng hợp doanh thu thực nhận, sản lượng tiêu thụ và danh sách sản phẩm chủ lực theo ngày hoặc tháng.',
  },
];

export function StaffLoginPage() {
  const { isAuthenticated, loading, login } = useStaffAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const requestedFrom = location.state?.from?.pathname;
  const redirectTarget =
    requestedFrom && requestedFrom.startsWith('/staff') && requestedFrom !== '/staff/login'
      ? `${requestedFrom}${location.state?.from?.search || ''}`
      : '/staff/dashboard';

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu nhân sự.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await login(username.trim(), password);
      toast.success(
        `Chào mừng ${result.user?.full_name || username.trim()} bắt đầu ca làm việc.`
      );
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin tài khoản.'
      );
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden">
      {/* Nền chuyển sắc Deep Emerald & Slate tinh tế */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-emerald-950/85 via-slate-950 to-slate-950"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-[1040px] overflow-hidden rounded-2xl border border-slate-800/80 bg-white shadow-2xl grid grid-cols-1 lg:grid-cols-12">
          {/* Cột trái: Nhận diện thương hiệu Lumière Retail Operations */}
          <div className="relative hidden lg:flex lg:col-span-6 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-10 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl"
            />

            <div className="relative space-y-8">
              {/* Brand Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="font-serif text-lg font-bold tracking-tight text-white leading-none">
                    Lumière Retail Operations
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-emerald-300/85">
                    Omnichannel Store Workspace
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-snug">
                  Không gian Vận hành Bán lẻ &amp; Quản trị Kho hàng
                </h1>
                <p className="text-sm leading-relaxed text-emerald-100/85">
                  Hệ thống quản lý vận hành cửa hàng, danh mục sản phẩm, đơn đặt
                  hàng và chứng từ hóa đơn nội bộ.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {WORKSPACE_HIGHLIGHTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/25">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-emerald-100/75">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative pt-6 border-t border-white/10 flex items-center justify-between text-xs text-emerald-200/80">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Cổng nghiệp vụ nội bộ Lumière Cosmetics</span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-300/90">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Bảo mật tiêu chuẩn</span>
              </span>
            </div>
          </div>

          {/* Cột phải: Form Đăng nhập nhân sự */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-sm w-full mx-auto space-y-6">
              {/* Mobile Logo Header */}
              <div className="flex items-center gap-2.5 lg:hidden pb-2 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-emerald-300">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-serif text-base font-bold text-slate-900 leading-none">
                    Lumière Retail Operations
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Hệ thống quản lý vận hành cửa hàng nội bộ
                  </p>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                  Cổng Nhân sự Vận hành
                </span>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                  Đăng nhập ca làm việc
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Sử dụng tài khoản nhân viên được cấp phát để truy cập hệ thống
                  quản lý danh mục, đơn đặt hàng và hóa đơn bán lẻ.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs sm:text-sm text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="staff-username"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Tên đăng nhập hoặc Email công vụ
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="staff-username"
                      type="text"
                      autoComplete="username"
                      required
                      disabled={submitting}
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Nhập mã nhân viên hoặc email"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="staff-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="staff-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      disabled={submitting}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="Nhập mật khẩu truy cập"
                      className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 shadow-sm transition-all focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang xác thực thông tin...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs leading-relaxed text-slate-500">
                Tài khoản nhân sự được cấp phát và quản lý tập trung bởi bộ phận
                Quản trị Hệ thống. Vui lòng liên hệ quản lý cửa hàng nếu cần hỗ
                trợ đặt lại mật khẩu.
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-emerald-700 transition-colors"
                >
                  <Store className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Xem Cửa hàng trực tuyến</span>
                </Link>
                <span className="text-slate-400">Lumière Retail</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 py-4 text-center text-xs text-slate-500">
        © 2026 Lumière Cosmetics Vietnam • Hệ thống Vận hành Bán lẻ Nội bộ
      </footer>
    </div>
  );
}

export default StaffLoginPage;
