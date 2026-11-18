import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Layers,
  LogOut,
  Menu,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { publicApi } from '../../api/clients';
import { useAdminAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useModalDialog } from '../../utils/useModalDialog';

const ADMIN_NAV_ITEMS = [
  {
    to: '/admin/users',
    label: 'Định danh & Tài khoản',
    subtitle: 'Người dùng, quyền hạn & trạng thái',
    icon: Users,
  },
  {
    to: '/admin/roles',
    label: 'Chính sách Phân quyền',
    subtitle: 'Vai trò & phạm vi truy cập',
    icon: Layers,
  },
  {
    to: '/admin/system',
    label: 'Giám sát Dịch vụ & Hồ sơ',
    subtitle: 'Độ tin cậy hạ tầng & bảo mật',
    icon: Activity,
  },
];

const PAGE_TITLES = {
  '/admin/users': {
    title: 'Quản trị Định danh & Phân quyền Truy cập',
    subtitle:
      'Quản lý tập trung hồ sơ tài khoản, cấp phát vai trò và kiểm soát trạng thái truy cập toàn hệ thống',
  },
  '/admin/roles': {
    title: 'Chính sách Phân quyền & Ma trận Truy cập',
    subtitle:
      'Quy chuẩn phạm vi nghiệp vụ giữa Cửa hàng trực tuyến, Vận hành bán lẻ và Quản trị hệ thống',
  },
  '/admin/system': {
    title: 'Giám sát Dịch vụ Hệ thống & Bảo mật Quản trị',
    subtitle:
      'Theo dõi tình trạng hoạt động của dịch vụ ứng dụng, kết nối dữ liệu và thiết lập bảo mật cá nhân',
  },
};

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useModalDialog({ isOpen: mobileMenuOpen, onClose: closeMobileMenu });
  const [healthState, setHealthState] = useState({
    checking: true,
    ok: true,
    database: 'CONNECTED',
    latencyMs: null,
  });

  const checkHealth = useCallback(async () => {
    setHealthState((prev) => ({ ...prev, checking: true }));
    const started = performance.now();
    try {
      const res = await publicApi.get('/health');
      const elapsed = Math.max(1, Math.round(performance.now() - started));
      const payload = res.data?.data || {};
      setHealthState({
        checking: false,
        ok: payload.status === 'OK',
        database: payload.database || 'CONNECTED',
        latencyMs: elapsed,
      });
    } catch {
      setHealthState({
        checking: false,
        ok: false,
        database: 'DISCONNECTED',
        latencyMs: null,
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    toast.info('Đã kết thúc phiên làm việc trên Admin Console.', {
      title: 'Đăng xuất thành công',
    });
    navigate('/admin/login', { replace: true });
  };

  const currentPageMeta =
    PAGE_TITLES[location.pathname] || PAGE_TITLES['/admin/users'];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200 select-none">
      {/* Thương hiệu Lumière Admin Console */}
      <div className="border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  Lumière Console
                </span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-inset ring-indigo-400/30">
                  IAM
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Quản trị Hệ thống &amp; Bảo mật
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng thanh điều hướng"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Menu điều hướng chính */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Định danh &amp; Hạ tầng
          </p>
          <nav
            className="mt-2 space-y-1"
            aria-label="Điều hướng Quản trị Hệ thống"
          >
            {ADMIN_NAV_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-white/15 text-white'
                            : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-indigo-300'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-tight">
                          {item.label}
                        </p>
                        <p
                          className={`truncate text-[11px] mt-0.5 ${
                            isActive
                              ? 'text-indigo-100/90'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Widget Trạng thái Dịch vụ thời gian thực */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Trạng thái dịch vụ
            </span>
            <button
              type="button"
              onClick={checkHealth}
              disabled={healthState.checking}
              title="Làm mới trạng thái dịch vụ"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-indigo-300 hover:bg-slate-800 hover:text-indigo-200 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3 w-3 ${healthState.checking ? 'animate-spin' : ''}`}
              />
              <span>Kiểm tra</span>
            </button>
          </div>

          <div className="mt-2.5 space-y-2 text-xs tabular-nums">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Server className="h-3.5 w-3.5 text-slate-500" />
                Dịch vụ API
              </span>
              {healthState.ok ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Hoạt động{' '}
                  {healthState.latencyMs ? `(${healthState.latencyMs}ms)` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Gián đoạn
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Database className="h-3.5 w-3.5 text-slate-500" />
                Cơ sở dữ liệu
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  healthState.ok && healthState.database === 'CONNECTED'
                    ? 'text-indigo-300'
                    : 'text-rose-400'
                }`}
              >
                {healthState.ok && healthState.database === 'CONNECTED'
                  ? 'Đã kết nối'
                  : 'Mất kết nối'}
              </span>
            </div>
          </div>
        </div>

        {/* Liên kết chuyển nhanh sang các không gian thuộc hệ sinh thái */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Hệ sinh thái Lumière
          </p>
          <div className="mt-2 space-y-1.5">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white"
            >
              <span>Cửa hàng trực tuyến</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </a>
            <a
              href="/staff"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-white"
            >
              <span>Cổng Vận hành bán lẻ</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Hồ sơ Quản trị viên đang đăng nhập & Đăng xuất */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-xs font-bold text-indigo-300 ring-1 ring-inset ring-indigo-400/30">
            {getInitials(user?.full_name || user?.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">
              {user?.full_name || 'Quản trị viên'}
            </p>
            <p className="truncate font-mono text-[11px] text-slate-400 mt-0.5">
              @{user?.username}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-rose-500/50 hover:bg-rose-950/50 hover:text-rose-200"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Đăng xuất hệ thống</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex print:block">
      {/* Sidebar cố định trên Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[264px] lg:flex-col border-r border-slate-800 no-print print:hidden">
        {renderSidebarContent()}
      </aside>

      {/* Drawer di động trên màn hình nhỏ */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden no-print print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Điều hướng quản trị hệ thống"
        >
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeMobileMenu}
          />
          <div className="relative z-10 flex w-[264px] max-w-[85vw] flex-col">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Không gian làm việc chính */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        {/* Thanh Header Quản trị */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở menu quản trị"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  {currentPageMeta.title}
                </h1>
                <p className="hidden sm:block truncate text-xs text-slate-500 mt-0.5">
                  {currentPageMeta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {/* Pill trạng thái dịch vụ */}
              <button
                type="button"
                onClick={() => navigate('/admin/system')}
                className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  healthState.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/70'
                }`}
                title="Xem chi tiết trạng thái dịch vụ"
              >
                {healthState.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                )}
                <span>
                  {healthState.ok ? 'Dịch vụ ổn định' : 'Cảnh báo kết nối'}
                </span>
              </button>

              {/* Nhãn Quản trị viên hiện tại */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                <span className="text-xs font-semibold text-slate-900">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-slate-500">
                  • Quản trị viên
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung trang con */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        {/* Chân trang doanh nghiệp gọn nhẹ */}
        <footer className="border-t border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
            <span>
              Lumière Cosmetics — Trung tâm Quản trị Định danh &amp; Hệ thống
            </span>
            <span className="text-[11px] text-slate-400">
              Identity &amp; Access Management • Enterprise Governance
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
