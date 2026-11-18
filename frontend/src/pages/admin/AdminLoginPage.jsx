import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { getApiErrorMessage } from '../../api/clients';
import { useAdminAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';

const CONSOLE_PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Quản trị Định danh Tập trung (IAM)',
    description:
      'Quản lý vòng đời tài khoản nhân sự và khách hàng, kiểm soát trạng thái hoạt động và chính sách xác thực bảo mật.',
  },
  {
    icon: Layers,
    title: 'Kiểm soát Phân quyền theo Vai trò',
    description:
      'Phân tách rạch ròi phạm vi truy cập giữa Cửa hàng trực tuyến, Không gian vận hành bán lẻ và Trung tâm quản trị.',
  },
  {
    icon: Activity,
    title: 'Giám sát Độ tin cậy Dịch vụ',
    description:
      'Theo dõi tình trạng kết nối dịch vụ ứng dụng, độ trễ phản hồi và tính toàn vẹn của dữ liệu giao dịch.',
  },
];

export function AdminLoginPage() {
  const { isAuthenticated, loading, login } = useAdminAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const requestedFrom = location.state?.from?.pathname;
  const redirectTarget =
    requestedFrom &&
    requestedFrom.startsWith('/admin') &&
    requestedFrom !== '/admin/login'
      ? `${requestedFrom}${location.state?.from?.search || ''}`
      : '/admin/users';

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMessage(
        'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu quản trị viên.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await login({ username: trimmedUser, password });
      toast.success(
        `Đã xác thực quyền quản trị cho ${result.user?.full_name || trimmedUser}.`,
        { title: 'Đăng nhập thành công' }
      );
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Không thể xác thực thông tin quản trị. Vui lòng kiểm tra lại tài khoản.'
      );
      setErrorMessage(msg);
      toast.error(msg, { title: 'Từ chối truy cập' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Hiệu ứng nền kiến trúc Dark Slate / Indigo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/50 via-slate-950 to-slate-950"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"
      />

      {/* Thanh định danh tối giản chuẩn Cloud Console */}
      <header className="relative z-10 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white">
                Lumière Admin Console
              </span>
              <span className="ml-2.5 hidden sm:inline-block rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Identity &amp; Governance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Hệ thống xác thực tập trung</span>
          </div>
        </div>
      </header>

      {/* Khu vực đăng nhập 2 cột cân đối */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 sm:px-6">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-12 items-center">
          {/* Cột trái: Thông tin Trung tâm Quản trị Định danh */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <KeyRound className="h-3.5 w-3.5 text-indigo-400" />
              <span>Enterprise Identity &amp; Access Management</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-white leading-tight">
                Trung tâm Quản trị Định danh &amp; Hệ thống
              </h1>
              <p className="text-sm leading-relaxed text-slate-400 max-w-lg">
                Bảng điều khiển bảo mật dành riêng cho Quản trị viên cấp cao nhằm
                điều phối tài khoản tổ chức, thiết lập chính sách truy cập và
                giám sát vận hành dịch vụ nền tảng Lumière Cosmetics.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {CONSOLE_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 ring-1 ring-inset ring-indigo-500/25">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {pillar.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột phải: Thẻ Đăng nhập Quản trị viên */}
          <div className="lg:col-span-6">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-800/90 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-5">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Đăng nhập Quản trị viên
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Xác thực tài khoản quản trị được ủy quyền để mở bảng điều
                    khiển hệ thống.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/90 text-indigo-400 ring-1 ring-slate-700/80">
                  <Lock className="h-4 w-4" />
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/35 bg-rose-950/50 p-3.5 text-xs leading-relaxed text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="admin-username"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Tài khoản định danh
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="admin-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={submitting}
                      autoComplete="username"
                      placeholder="Tên đăng nhập hoặc email quản trị"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm font-medium text-white placeholder:font-normal placeholder:text-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Mật khẩu xác thực
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={submitting}
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu quản trị"
                      className="w-full rounded-xl border border-slate-700/90 bg-slate-950/90 py-2.5 pl-10 pr-10 text-sm font-medium text-white placeholder:font-normal placeholder:text-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
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
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang xác thực định danh...</span>
                    </>
                  ) : (
                    <>
                      <span>Truy cập Admin Console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-800/80 pt-4 text-[11px] leading-relaxed text-slate-400">
                Truy cập hạn chế dành riêng cho Quản trị viên được ủy quyền. Mọi
                thao tác thay đổi định danh và phân quyền đều có hiệu lực tức
                thời trên toàn hệ thống.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        © 2026 Lumière Cosmetics Vietnam • Enterprise Administration Console
      </footer>
    </div>
  );
}

export default AdminLoginPage;
