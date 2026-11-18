import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  getApiErrorMessage,
  publicApi,
  readPortalSession,
} from '../../api/clients';
import { useAdminAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime, ROLE_CONFIG } from '../../utils/format';

export function AdminSystemHealthPage() {
  const { user, updateProfile, changePassword } = useAdminAuth();
  const toast = useToast();

  const [healthLoading, setHealthLoading] = useState(true);
  const [healthResult, setHealthResult] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [latencyMs, setLatencyMs] = useState(null);

  const [portalSessions, setPortalSessions] = useState(() => ({
    ADMIN: readPortalSession('ADMIN'),
    STAFF: readPortalSession('STAFF'),
    CUSTOMER: readPortalSession('CUSTOMER'),
  }));

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const refreshSessionsSnapshot = useCallback(() => {
    setPortalSessions({
      ADMIN: readPortalSession('ADMIN'),
      STAFF: readPortalSession('STAFF'),
      CUSTOMER: readPortalSession('CUSTOMER'),
    });
  }, []);

  const pingSystemHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    const start = performance.now();
    try {
      const res = await publicApi.get('/health');
      const elapsed = Math.max(1, Math.round(performance.now() - start));
      setLatencyMs(elapsed);
      setHealthResult(res.data);
      refreshSessionsSnapshot();
    } catch (err) {
      setLatencyMs(null);
      setHealthResult(null);
      setHealthError(
        getApiErrorMessage(err, 'Không thể kết nối đến dịch vụ nền tảng.')
      );
    } finally {
      setHealthLoading(false);
    }
  }, [refreshSessionsSnapshot]);

  useEffect(() => {
    pingSystemHealth();
    window.addEventListener('storage', refreshSessionsSnapshot);
    return () => window.removeEventListener('storage', refreshSessionsSnapshot);
  }, [pingSystemHealth, refreshSessionsSnapshot]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim() || !profileForm.email.trim()) {
      toast.error('Họ tên và Email Quản trị viên không được để trống.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile({
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim() || null,
        address: profileForm.address.trim() || null,
      });
      toast.success(
        res.message || 'Đã cập nhật thông tin hồ sơ Quản trị viên.'
      );
      refreshSessionsSnapshot();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Cập nhật hồ sơ thất bại.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success(res?.message || 'Đã cập nhật mật khẩu Quản trị viên.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể đổi mật khẩu.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const healthData = healthResult?.data || {};
  const isHealthy = Boolean(
    healthResult?.success && healthData.status === 'OK'
  );
  const isDbConnected = healthData.database === 'CONNECTED';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Khối Giám sát Trạng thái Dịch vụ Hệ thống */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Giám sát Trạng thái Dịch vụ &amp; Hạ tầng Dữ liệu
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi thời gian thực tình trạng sẵn sàng của dịch vụ ứng
                dụng, kết nối lưu trữ và độ trễ phản hồi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={pingSystemHealth}
            disabled={healthLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 sm:self-auto disabled:opacity-60 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`}
            />
            <span>Kiểm tra kết nối</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {healthError ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">
                  Phát hiện gián đoạn kết nối dịch vụ hệ thống
                </p>
                <p className="mt-0.5 text-xs">{healthError}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Dịch vụ Ứng dụng</span>
                  <Server className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {isHealthy ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400 shrink-0" />
                  )}
                  <span className="text-base font-bold text-slate-900">
                    {isHealthy ? 'Hoạt động ổn định' : 'Đang kiểm tra...'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Phiên bản dịch vụ: {healthData.version || '1.0.0'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Cơ sở Dữ liệu</span>
                  <Database className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-base font-bold text-emerald-700">
                  {isDbConnected || !healthResult
                    ? 'Đã kết nối sẵn sàng'
                    : 'Gián đoạn kết nối'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Lưu trữ giao dịch, kho hàng &amp; định danh
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 tabular-nums">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Độ trễ Phản hồi</span>
                  <Activity className="h-4 w-4 text-sky-600" />
                </div>
                <p className="mt-2 text-base font-bold text-slate-900">
                  {latencyMs !== null ? `${latencyMs} ms` : '—'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Thời gian xử lý phản hồi toàn trình
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 tabular-nums">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Cập nhật Gần nhất</span>
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {healthData.timestamp
                    ? formatDateTime(healthData.timestamp)
                    : '—'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Múi giờ chuẩn Việt Nam (GMT+7)
                </p>
              </div>
            </div>
          )}

          {healthResult && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600">
              <span>
                Định danh dịch vụ:{' '}
                <strong className="font-mono font-semibold text-slate-800">
                  {healthData.service || 'lumiere-enterprise-service'}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Tất cả phân hệ nghiệp vụ đang trực tuyến
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Giám sát Phiên Làm việc Trên Thiết bị Hiện tại */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Phiên Làm việc Đang Hoạt động Trên Thiết bị Này
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Các không gian làm việc của Lumière được phân tách phiên xác thực
              độc lập để đảm bảo an toàn truy cập trên cùng trình duyệt.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshSessionsSnapshot}
            className="self-start rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:self-auto transition-colors"
          >
            Làm mới trạng thái
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              portal: 'ADMIN',
              title: 'Trung tâm Quản trị Hệ thống',
              subtitle: 'Quản lý định danh & phân quyền',
              path: '/admin',
            },
            {
              portal: 'STAFF',
              title: 'Cổng Vận hành Bán lẻ',
              subtitle: 'Danh mục, kho hàng & đơn hàng',
              path: '/staff',
            },
            {
              portal: 'CUSTOMER',
              title: 'Cửa hàng Trực tuyến',
              subtitle: 'Kênh mua sắm khách hàng',
              path: '/',
            },
          ].map((item) => {
            const sess = portalSessions[item.portal];
            const active = Boolean(sess?.token && sess?.user);
            const roleLabel = sess?.user?.role_name
              ? ROLE_CONFIG[sess.user.role_name]?.label || sess.user.role_name
              : '';

            return (
              <div
                key={item.portal}
                className={`rounded-xl border p-4 transition-colors ${
                  active
                    ? 'border-emerald-200/90 bg-emerald-50/35'
                    : 'border-slate-200/80 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {item.title}
                  </span>
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Mở</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {item.subtitle}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                  {active ? (
                    <div className="flex items-center gap-2 font-semibold text-emerald-700">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        @{sess.user.username} • {roleLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">
                      Chưa có phiên đăng nhập trên trình duyệt này
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Hồ sơ cá nhân & Bảo mật mật khẩu Quản trị viên */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form Hồ sơ Admin */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hồ sơ Quản trị viên (@{user?.username})
              </h3>
              <p className="text-xs text-slate-500">
                Cập nhật thông tin định danh và liên hệ công vụ của bạn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="admin-sys-fullname"
                className="block text-xs font-semibold text-slate-700"
              >
                Họ và tên
              </label>
              <input
                id="admin-sys-fullname"
                type="text"
                value={profileForm.full_name}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <label
                htmlFor="admin-sys-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Địa chỉ Email
              </label>
              <input
                id="admin-sys-email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <label
                htmlFor="admin-sys-phone"
                className="block text-xs font-semibold text-slate-700"
              >
                Số điện thoại
              </label>
              <input
                id="admin-sys-phone"
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <label
                htmlFor="admin-sys-address"
                className="block text-xs font-semibold text-slate-700"
              >
                Địa chỉ liên hệ
              </label>
              <input
                id="admin-sys-address"
                type="text"
                value={profileForm.address}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {savingProfile && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Lưu thông tin hồ sơ</span>
            </button>
          </div>
        </form>

        {/* Form Đổi mật khẩu Admin */}
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <KeyRound className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Bảo mật &amp; Đổi mật khẩu Quản trị
              </h3>
              <p className="text-xs text-slate-500">
                Thay đổi mật khẩu định kỳ nhằm bảo vệ đặc quyền quản trị hệ
                thống
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="admin-sys-current-pw"
                className="block text-xs font-semibold text-slate-700"
              >
                Mật khẩu hiện tại
              </label>
              <input
                id="admin-sys-current-pw"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    current_password: e.target.value,
                  }))
                }
                autoComplete="current-password"
                placeholder="Nhập mật khẩu đang sử dụng"
                className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="admin-sys-new-pw"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  id="admin-sys-new-pw"
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="Nhập mật khẩu mới"
                  className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-sys-confirm-pw"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Xác nhận mật khẩu mới
                </label>
                <input
                  id="admin-sys-confirm-pw"
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirm_password: e.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu mới"
                  className="mt-1 w-full rounded-xl border border-slate-200/90 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {savingPassword && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Cập nhật mật khẩu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminSystemHealthPage;
