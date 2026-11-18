import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  ExternalLink,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { staffApi } from '../../api/clients';
import { useStaffAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useModalDialog } from '../../utils/useModalDialog';

export const STAFF_DATA_REFRESH_EVENT = 'lumiere:staff-refresh-counts';

const NAV_GROUPS = [
  {
    groupLabel: 'Phân tích & Hiệu suất',
    items: [
      {
        to: '/staff/dashboard',
        label: 'Tổng quan kinh doanh',
        shortDesc: 'Doanh thu thực nhận & sản lượng',
        icon: BarChart3,
      },
    ],
  },
  {
    groupLabel: 'Vận hành bán lẻ',
    items: [
      {
        to: '/staff/orders',
        label: 'Đơn đặt hàng',
        shortDesc: 'Xác nhận đơn & điều phối kho',
        icon: ClipboardCheck,
        badgeKey: 'pendingOrders',
      },
      {
        to: '/staff/products',
        label: 'Danh mục & Kho hàng',
        shortDesc: 'Sản phẩm, giá niêm yết & tồn kho',
        icon: PackageSearch,
      },
      {
        to: '/staff/invoices',
        label: 'Hóa đơn bán lẻ',
        shortDesc: 'Chứng từ bán hàng & bản in A4',
        icon: ReceiptText,
      },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function triggerStaffSidebarRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAFF_DATA_REFRESH_EVENT));
  }
}

export function StaffLayout() {
  const { user, logout } = useStaffAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  useModalDialog({ isOpen: mobileMenuOpen, onClose: closeMobileMenu });

  const fetchPendingBadge = useCallback(async () => {
    try {
      const res = await staffApi.get('/staff/orders', {
        params: { status: 'PENDING' },
        _silentAuthCheck: true,
      });
      if (Array.isArray(res.data?.data)) {
        setPendingCount(res.data.data.length);
      }
    } catch {
      // Bỏ qua lỗi mạng nền
    }
  }, []);

  useEffect(() => {
    fetchPendingBadge();
  }, [fetchPendingBadge, location.pathname]);

  useEffect(() => {
    const handler = () => fetchPendingBadge();
    window.addEventListener(STAFF_DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(STAFF_DATA_REFRESH_EVENT, handler);
  }, [fetchPendingBadge]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    const staffName = user?.full_name || user?.username || 'Nhân sự';
    logout();
    toast.info(`Đã kết thúc ca làm việc của ${staffName}.`);
    navigate('/staff/login', { replace: true });
  };

  const currentPageMeta =
    ALL_NAV_ITEMS.find((item) => location.pathname.startsWith(item.to)) ||
    ALL_NAV_ITEMS[0];

  const staffInitial = (user?.full_name || user?.username || 'N')
    .trim()
    .charAt(0)
    .toUpperCase();

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/80 select-none">
      {/* Brand Header chuẩn Workspace bán lẻ */}
      <div className="border-b border-slate-200/80 px-5 py-4 bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold tracking-tight text-white">
                Lumière
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                Retail
              </span>
            </div>
            <p className="truncate text-[11px] text-slate-400 mt-0.5">
              Vận hành Cửa hàng &amp; Kho
            </p>
          </div>
        </div>
      </div>

      {/* Menu Điều hướng phân nhóm tinh tế */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupLabel}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.groupLabel}
            </p>

            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const showBadge =
                  item.badgeKey === 'pendingOrders' &&
                  typeof pendingCount === 'number' &&
                  pendingCount > 0;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                        isActive
                          ? 'bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-inset ring-emerald-600/20 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? 'bg-emerald-700 text-white shadow-sm'
                                : 'bg-slate-100/90 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] leading-tight">
                              {item.label}
                            </p>
                            <p
                              className={`truncate text-[11px] mt-0.5 font-normal ${
                                isActive ? 'text-emerald-700/90' : 'text-slate-400'
                              }`}
                            >
                              {item.shortDesc}
                            </p>
                          </div>
                        </div>

                        {showBadge && (
                          <span
                            className={`ml-2 inline-flex min-w-[1.375rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                              isActive
                                ? 'bg-emerald-700 text-white'
                                : 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-500/25'
                            }`}
                            title={`${pendingCount} đơn hàng đang chờ xác nhận`}
                          >
                            {pendingCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}

        {/* Kênh bán hàng trực tuyến */}
        <div>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Kênh bán hàng
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-300/80 hover:bg-emerald-50/50 hover:text-emerald-800"
          >
            <span className="flex items-center gap-2.5">
              <Store className="h-4 w-4 text-emerald-700" />
              <span>Cửa hàng trực tuyến</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Hồ sơ Nhân sự trực ca & Kết thúc ca */}
      <div className="border-t border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white shadow-sm">
            {staffInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-900">
              {user?.full_name || 'Nhân viên bán hàng'}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="truncate">Đang trực ca • @{user?.username}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Kết thúc ca làm việc</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex print:block">
      {/* Sidebar cố định trên Desktop */}
      <aside className="hidden lg:block lg:w-[264px] lg:shrink-0 no-print print:hidden">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Drawer Sidebar trên Mobile/Tablet */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden no-print print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Điều hướng vận hành cửa hàng"
        >
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
          />
          <div className="relative z-10 h-full w-[264px] max-w-[85vw] shadow-2xl">
            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Đóng menu"
              className="absolute right-3 top-3.5 z-20 rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Vùng Nội dung Chính */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur no-print print:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1440px] w-full mx-auto">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở thanh điều hướng"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {currentPageMeta.label}
                </h1>
                <p className="hidden sm:block truncate text-xs text-slate-500">
                  {currentPageMeta.shortDesc} — Lumière Retail Operations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 transition-colors"
              >
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                <span>Xem cửa hàng</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </a>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="text-xs leading-tight">
                  <span className="font-semibold text-slate-900">
                    {user?.full_name || user?.username}
                  </span>
                  <span className="hidden sm:inline text-slate-500">
                    {' '}
                    • Nhân sự vận hành
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung từng trang con */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StaffLayout;
