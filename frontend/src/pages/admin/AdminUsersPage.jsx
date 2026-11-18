import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react';
import { adminApi, getApiErrorMessage } from '../../api/clients';
import { ConfirmModal } from '../../components/common';
import { RoleChangeModal } from '../../components/admin/RoleChangeModal';
import { UserFormModal } from '../../components/admin/UserFormModal';
import { UserStatsCards } from '../../components/admin/UserStatsCards';
import { useAdminAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  formatDateTime,
  ROLE_CONFIG,
  USER_STATUS_CONFIG,
} from '../../utils/format';

const WORKSPACE_SCOPE_LABELS = {
  ADMIN: 'Trung tâm Quản trị Hệ thống',
  SALES_STAFF: 'Không gian Vận hành Bán lẻ',
  CUSTOMER: 'Cửa hàng Trực tuyến',
};

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function AdminUsersPage() {
  const { user: currentAdmin, refreshUser } = useAdminAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(() => {
    const paramRole = searchParams.get('role');
    return ['ADMIN', 'SALES_STAFF', 'CUSTOMER'].includes(paramRole)
      ? paramRole
      : '';
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const paramStatus = searchParams.get('status');
    return ['ACTIVE', 'LOCKED'].includes(paramStatus) ? paramStatus : '';
  });

  const [formModal, setFormModal] = useState({
    open: false,
    mode: 'create',
    user: null,
  });
  const [roleModal, setRoleModal] = useState({
    open: false,
    user: null,
  });
  const [statusConfirm, setStatusConfirm] = useState({
    open: false,
    user: null,
    nextStatus: 'LOCKED',
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    user: null,
  });
  const [actionBusy, setActionBusy] = useState(false);

  const [serverOutcomeBanner, setServerOutcomeBanner] = useState(null);

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole && ['ADMIN', 'SALES_STAFF', 'CUSTOMER'].includes(paramRole)) {
      setRoleFilter(paramRole);
    }
  }, [searchParams]);

  const fetchAdminData = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [rolesRes, usersRes] = await Promise.all([
          adminApi.get('/admin/roles'),
          adminApi.get('/admin/users'),
        ]);
        setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : []);
        setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
      } catch (err) {
        toast.error(
          getApiErrorMessage(
            err,
            'Không thể tải danh mục tài khoản và vai trò truy cập.'
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    const rawQuery = searchTerm.trim().toLowerCase();

    return users.filter((item) => {
      if (roleFilter && item.role_name !== roleFilter) {
        return false;
      }
      if (statusFilter && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const haystackNormalized = normalizeText(
        `${item.username || ''} ${item.full_name || ''} ${item.email || ''} ${item.phone || ''}`
      );
      const haystackRaw = `${item.username || ''} ${item.full_name || ''} ${item.email || ''} ${
        item.phone || ''
      }`.toLowerCase();

      return (
        haystackNormalized.includes(normalizedQuery) ||
        haystackRaw.includes(rawQuery)
      );
    });
  }, [users, roleFilter, statusFilter, searchTerm]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || roleFilter || statusFilter
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    if (searchParams.has('role') || searchParams.has('status')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleQuickCardFilter = ({ role, status }) => {
    setRoleFilter(role);
    setStatusFilter(status);
    if (searchParams.has('role') || searchParams.has('status')) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleFormSubmit = async (payload, setModalError) => {
    setActionBusy(true);
    try {
      if (formModal.mode === 'create') {
        const res = await adminApi.post('/admin/users', payload);
        const created = res.data?.data;
        const roleLabel =
          ROLE_CONFIG[payload.role_name]?.label || 'Người dùng';
        const scopeLabel =
          WORKSPACE_SCOPE_LABELS[payload.role_name] || 'hệ thống';
        toast.success(
          res.data?.message || 'Đã khởi tạo tài khoản định danh mới.'
        );
        setServerOutcomeBanner({
          type: 'success',
          title: 'Đã cấp phát tài khoản định danh mới',
          message: `Tài khoản @${created?.username || payload.username} (${roleLabel}) đã được kích hoạt quyền truy cập vào ${scopeLabel}.`,
        });
      } else if (formModal.user) {
        const targetId = formModal.user.id;
        const res = await adminApi.put(`/admin/users/${targetId}`, payload);
        toast.success(
          res.data?.message || 'Đã lưu cập nhật hồ sơ tài khoản.'
        );

        if (Number(targetId) === Number(currentAdmin?.id)) {
          await refreshUser();
        }

        setServerOutcomeBanner({
          type: 'info',
          title: 'Đã cập nhật thông tin định danh',
          message:
            res.data?.message ||
            `Hồ sơ của tài khoản @${formModal.user.username} đã được đồng bộ thành công.`,
        });
      }

      setFormModal({ open: false, mode: 'create', user: null });
      await fetchAdminData({ silent: true });
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Không thể lưu thông tin tài khoản.'
      );
      setModalError?.(msg);
      toast.error(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmRoleChange = async ({ role_id, role_name }) => {
    if (!roleModal.user) return;
    setActionBusy(true);
    try {
      const target = roleModal.user;
      const res = await adminApi.patch(`/admin/users/${target.id}/role`, {
        role_id,
        role_name,
      });
      const roleCfg = ROLE_CONFIG[role_name] || ROLE_CONFIG.CUSTOMER;
      const scopeLabel =
        WORKSPACE_SCOPE_LABELS[role_name] || WORKSPACE_SCOPE_LABELS.CUSTOMER;
      toast.success(
        res.data?.message ||
          `Đã cập nhật vai trò của @${target.username} sang ${roleCfg.label}.`
      );
      setServerOutcomeBanner({
        type: 'success',
        title: 'Đã điều chỉnh phân quyền truy cập',
        message: `Tài khoản @${target.username} (${target.full_name}) đã được chuyển sang vai trò ${roleCfg.label} — phạm vi hoạt động: ${scopeLabel}.`,
      });
      setRoleModal({ open: false, user: null });
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, 'Không thể thay đổi vai trò truy cập.')
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusConfirm.user) return;
    setActionBusy(true);
    try {
      const target = statusConfirm.user;
      const nextStatus = statusConfirm.nextStatus;
      const res = await adminApi.patch(`/admin/users/${target.id}/status`, {
        status: nextStatus,
      });

      const isLocking = nextStatus === 'LOCKED';
      const msg =
        res.data?.message ||
        (isLocking
          ? `Đã tạm khóa quyền truy cập của @${target.username}.`
          : `Đã khôi phục quyền truy cập của @${target.username}.`);

      if (isLocking) {
        toast.warning(msg, { title: 'Đã tạm khóa tài khoản' });
      } else {
        toast.success(msg, { title: 'Đã mở khóa tài khoản' });
      }

      setServerOutcomeBanner({
        type: isLocking ? 'warning' : 'success',
        title: isLocking
          ? `Đã đình chỉ quyền truy cập tài khoản @${target.username}`
          : `Đã khôi phục trạng thái hoạt động cho @${target.username}`,
        message: isLocking
          ? `Mọi phiên làm việc hiện hành của @${target.username} đã bị thu hồi và tài khoản không thể đăng nhập cho đến khi được mở khóa lại.`
          : `Người dùng @${target.username} hiện có thể đăng nhập trở lại vào ${
              WORKSPACE_SCOPE_LABELS[target.role_name] || 'hệ thống'
            }.`,
      });

      setStatusConfirm({ open: false, user: null, nextStatus: 'LOCKED' });
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, 'Không thể cập nhật trạng thái tài khoản.')
      );
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    setActionBusy(true);
    try {
      const target = deleteConfirm.user;
      const res = await adminApi.delete(`/admin/users/${target.id}`);
      const actionType = res.data?.data?.action;
      const serverMsg =
        res.data?.message || 'Đã xử lý yêu cầu thu hồi tài khoản người dùng.';

      if (actionType === 'SOFT_LOCKED') {
        toast.warning(serverMsg, {
          title: 'Đã chuyển sang Tạm khóa để lưu trữ chứng từ',
          duration: 5500,
        });
        setServerOutcomeBanner({
          type: 'warning',
          title: `Bảo toàn lịch sử giao dịch — Đã tạm khóa @${target.username}`,
          message: serverMsg,
        });
      } else {
        toast.success(serverMsg, { title: 'Đã xóa tài khoản định danh' });
        setServerOutcomeBanner({
          type: 'success',
          title: `Đã xóa hoàn toàn tài khoản @${target.username}`,
          message: serverMsg,
        });
      }

      setDeleteConfirm({ open: false, user: null });
      await fetchAdminData({ silent: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể xóa tài khoản này.'));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Các thẻ thống kê định danh */}
      <UserStatsCards
        users={users}
        roles={roles}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onQuickFilter={handleQuickCardFilter}
      />

      {/* Thông báo kết quả nghiệp vụ */}
      {serverOutcomeBanner && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 shadow-sm animate-fade-in ${
            serverOutcomeBanner.type === 'warning'
              ? 'border-amber-200 bg-amber-50/90 text-amber-950'
              : serverOutcomeBanner.type === 'info'
                ? 'border-indigo-200 bg-indigo-50/90 text-indigo-950'
                : 'border-emerald-200 bg-emerald-50/90 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {serverOutcomeBanner.type === 'warning' ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            ) : serverOutcomeBanner.type === 'info' ? (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            )}
            <div className="text-sm">
              <p className="font-bold">{serverOutcomeBanner.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                {serverOutcomeBanner.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setServerOutcomeBanner(null)}
            aria-label="Đóng thông báo"
            className="rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Thanh công cụ Tìm kiếm, Bộ lọc & Cấp tài khoản mới */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Tìm kiếm tài khoản người dùng"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên đăng nhập, họ tên, địa chỉ email hoặc số điện thoại..."
              className="w-full rounded-xl border border-slate-200/90 bg-slate-50/60 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchAdminData({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span>Đồng bộ</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormModal({ open: true, mode: 'create', user: null })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              <span>Cấp tài khoản mới</span>
            </button>
          </div>
        </div>

        {/* Bộ lọc theo Vai trò & Trạng thái */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 mr-1">
              <Filter className="h-3.5 w-3.5" />
              Vai trò:
            </span>
            {[
              { value: '', label: 'Tất cả' },
              { value: 'ADMIN', label: 'Quản trị viên' },
              { value: 'SALES_STAFF', label: 'Nhân sự vận hành' },
              { value: 'CUSTOMER', label: 'Khách hàng' },
            ].map((opt) => {
              const active = roleFilter === opt.value;
              return (
                <button
                  key={opt.value || 'ALL_ROLES'}
                  type="button"
                  onClick={() => setRoleFilter(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">
              Trạng thái:
            </span>
            {[
              { value: '', label: 'Tất cả' },
              { value: 'ACTIVE', label: 'Đang hoạt động' },
              { value: 'LOCKED', label: 'Tạm khóa' },
            ].map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value || 'ALL_STATUS'}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? opt.value === 'LOCKED'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : opt.value === 'ACTIVE'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-1 inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bảng Danh mục Tài khoản Định danh */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Danh mục Định danh &amp; Quyền truy cập
            </h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 tabular-nums">
              {filteredUsers.length} / {users.length}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Mật khẩu xác thực được mã hóa một chiều theo tiêu chuẩn bảo mật
            doanh nghiệp
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-medium">
              Đang đồng bộ danh mục định danh và phân quyền...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Không tìm thấy tài khoản định danh phù hợp
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Không có bản ghi người dùng nào khớp với điều kiện tìm kiếm hoặc
              bộ lọc hiện tại.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm">
              <thead className="bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-16">
                    Mã
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Người dùng &amp; Tài khoản
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Thông tin Liên hệ
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Vai trò &amp; Phạm vi
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Ngày khởi tạo
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Quản trị tài khoản
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((u) => {
                  const isSelf = Number(u.id) === Number(currentAdmin?.id);
                  const roleCfg =
                    ROLE_CONFIG[u.role_name] || ROLE_CONFIG.CUSTOMER;
                  const scopeLabel =
                    WORKSPACE_SCOPE_LABELS[u.role_name] ||
                    WORKSPACE_SCOPE_LABELS.CUSTOMER;
                  const statusCfg =
                    USER_STATUS_CONFIG[u.status] || USER_STATUS_CONFIG.ACTIVE;
                  const isLocked = u.status === 'LOCKED';

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isSelf
                          ? 'bg-indigo-50/35 hover:bg-indigo-50/60'
                          : isLocked
                            ? 'bg-rose-50/15 hover:bg-slate-50/80'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 align-top font-mono text-xs font-semibold text-slate-500 tabular-nums">
                        #{u.id}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {u.full_name}
                          </span>
                          {isSelf && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                              <ShieldCheck className="h-3 w-3" />
                              Phiên hiện tại
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200/80">
                            @{u.username}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top text-xs text-slate-600 space-y-1 max-w-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate font-medium text-slate-700">
                            {u.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{u.phone || 'Chưa cập nhật'}</span>
                        </div>
                        {u.address && (
                          <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="line-clamp-1" title={u.address}>
                              {u.address}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleCfg.badgeClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${roleCfg.dotClass}`}
                            />
                            {roleCfg.label}
                          </span>
                          <span className="text-[11px] text-slate-400 pl-1">
                            {scopeLabel}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-slate-500 tabular-nums">
                        {formatDateTime(u.created_at) || '—'}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 align-top text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setFormModal({
                                  open: true,
                                  mode: 'edit',
                                  user: u,
                                })
                              }
                              title="Cập nhật hồ sơ hoặc đặt lại mật khẩu"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span>Hồ sơ</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                if (!isSelf) {
                                  setRoleModal({ open: true, user: u });
                                }
                              }}
                              title={
                                isSelf
                                  ? 'Tài khoản quản trị đang đăng nhập được bảo vệ chống tự thay đổi vai trò'
                                  : 'Điều chỉnh vai trò phân quyền truy cập'
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                isSelf
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                                  : 'border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100'
                              }`}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              <span>Vai trò</span>
                            </button>

                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                if (!isSelf) {
                                  setStatusConfirm({
                                    open: true,
                                    user: u,
                                    nextStatus: isLocked ? 'ACTIVE' : 'LOCKED',
                                  });
                                }
                              }}
                              title={
                                isSelf
                                  ? 'Tài khoản quản trị đang đăng nhập được bảo vệ chống tự khóa'
                                  : isLocked
                                    ? 'Khôi phục quyền truy cập cho tài khoản'
                                    : 'Đình chỉ quyền truy cập tức thời'
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                isSelf
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                                  : isLocked
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="h-3.5 w-3.5" />
                                  <span>Mở khóa</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Khóa</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                if (!isSelf) {
                                  setDeleteConfirm({ open: true, user: u });
                                }
                              }}
                              title={
                                isSelf
                                  ? 'Tài khoản quản trị đang đăng nhập được bảo vệ chống tự xóa'
                                  : 'Thu hồi hoặc xóa tài khoản'
                              }
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                isSelf
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>

                          {isSelf && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700">
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              Chế độ tự bảo vệ phiên quản trị hiện hành
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chính sách bảo toàn lịch sử chứng từ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-indigo-300">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="space-y-1 leading-relaxed">
            <p className="font-bold text-slate-900">
              Chính sách Bảo toàn Lịch sử Giao dịch &amp; Chứng từ Kế toán
            </p>
            <p>
              Khi Quản trị viên thực hiện <strong>Xóa tài khoản</strong>: nếu
              tài khoản chưa phát sinh dữ liệu giao dịch, hệ thống sẽ xóa hoàn
              toàn bản ghi định danh. Trường hợp tài khoản đã từng đặt đơn hàng
              hoặc lập hóa đơn bán lẻ, hệ thống tự động chuyển sang trạng thái{' '}
              <strong>Đã khóa</strong> để thu hồi quyền truy cập đồng thời giữ
              nguyên tính toàn vẹn của hồ sơ đối soát.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Tạo mới / Cập nhật Tài khoản */}
      <UserFormModal
        isOpen={formModal.open}
        mode={formModal.mode}
        initialUser={formModal.user}
        roles={roles}
        currentAdminId={currentAdmin?.id}
        submitting={actionBusy}
        onClose={() =>
          setFormModal({ open: false, mode: 'create', user: null })
        }
        onSubmit={handleFormSubmit}
      />

      {/* Modal Điều chỉnh Vai trò */}
      <RoleChangeModal
        isOpen={roleModal.open}
        targetUser={roleModal.user}
        roles={roles}
        submitting={actionBusy}
        onClose={() => setRoleModal({ open: false, user: null })}
        onConfirm={handleConfirmRoleChange}
      />

      {/* ConfirmModal Khóa / Mở khóa */}
      <ConfirmModal
        isOpen={statusConfirm.open}
        onClose={() =>
          setStatusConfirm({ open: false, user: null, nextStatus: 'LOCKED' })
        }
        onConfirm={handleConfirmStatusToggle}
        loading={actionBusy}
        variant={statusConfirm.nextStatus === 'LOCKED' ? 'warning' : 'primary'}
        title={
          statusConfirm.nextStatus === 'LOCKED'
            ? `Đình chỉ truy cập @${statusConfirm.user?.username}?`
            : `Khôi phục truy cập @${statusConfirm.user?.username}?`
        }
        message={
          statusConfirm.nextStatus === 'LOCKED'
            ? `Tài khoản "${statusConfirm.user?.full_name}" (@${statusConfirm.user?.username}) sẽ chuyển sang trạng thái Đã khóa. Người dùng không thể đăng nhập và các phiên làm việc hiện hành sẽ bị thu hồi ngay lập tức.`
            : `Tài khoản "${statusConfirm.user?.full_name}" (@${statusConfirm.user?.username}) sẽ được kích hoạt lại trạng thái Đang hoạt động và có thể truy cập bình thường.`
        }
        confirmText={
          statusConfirm.nextStatus === 'LOCKED'
            ? 'Xác nhận khóa tài khoản'
            : 'Xác nhận mở khóa'
        }
        cancelText="Hủy bỏ"
      />

      {/* ConfirmModal Xóa Tài khoản */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, user: null })}
        onConfirm={handleConfirmDeleteUser}
        loading={actionBusy}
        variant="danger"
        title={`Xác nhận xóa tài khoản @${deleteConfirm.user?.username}?`}
        message={`Bạn đang thực hiện yêu cầu xóa tài khoản định danh của "${deleteConfirm.user?.full_name}" (@${deleteConfirm.user?.username}).`}
        confirmText="Xác nhận thực hiện"
        cancelText="Hủy bỏ"
      >
        <div className="rounded-xl border border-slate-200/90 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            Quy tắc bảo toàn dữ liệu tổ chức:
          </p>
          <p>
            • <strong>Chưa phát sinh giao dịch:</strong> Xóa hoàn toàn khỏi danh
            mục định danh hệ thống.
          </p>
          <p>
            • <strong>Đã phát sinh đơn hàng / hóa đơn:</strong> Tự động chuyển
            sang trạng thái <strong>Đã khóa</strong> nhằm lưu trữ toàn vẹn chứng
            từ kế toán.
          </p>
        </div>
      </ConfirmModal>
    </div>
  );
}

export default AdminUsersPage;
