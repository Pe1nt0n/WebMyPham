import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { adminApi, getApiErrorMessage } from '../../api/clients';
import { useToast } from '../../contexts/ToastContext';
import { ROLE_CONFIG } from '../../utils/format';

const ACCESS_POLICY_MATRIX = [
  {
    domain: 'Danh mục & Tra cứu Sản phẩm',
    capability:
      'Duyệt danh mục mỹ phẩm, tra cứu thông tin thương hiệu, thành phần và mức giá niêm yết',
    customer: true,
    staff: true,
    admin: true,
    policy: 'Công khai cho khách truy cập các mặt hàng đang kinh doanh',
  },
  {
    domain: 'Mua sắm & Đơn hàng Cá nhân',
    capability:
      'Quản lý giỏ hàng, đặt mua trực tuyến, cập nhật địa chỉ nhận và theo dõi tiến độ đơn hàng',
    customer: true,
    staff: false,
    admin: false,
    policy: 'Giới hạn riêng cho tài khoản Khách hàng đang hoạt động',
  },
  {
    domain: 'Quản trị Danh mục & Kho hàng',
    capability:
      'Khai báo sản phẩm mới, điều chỉnh giá bán, nhập bổ sung tồn kho và bật/tắt hiển thị',
    customer: false,
    staff: true,
    admin: false,
    policy: 'Tự động ngừng hiển thị thay vì xóa nếu mặt hàng đã có chứng từ',
  },
  {
    domain: 'Xác nhận Đơn hàng & Xuất kho',
    capability:
      'Đối soát tồn kho thực tế, xác nhận xuất kho và tự động phát hành hóa đơn bán lẻ',
    customer: false,
    staff: true,
    admin: false,
    policy: 'Kiểm tra nghiêm ngặt định mức khả dụng, không cho phép xuất âm kho',
  },
  {
    domain: 'Hủy đơn & Hoàn nhập Tồn kho',
    capability:
      'Xử lý yêu cầu hủy đơn đặt hàng và tự động cộng hoàn trả hàng hóa về kho khả dụng',
    customer: false,
    staff: true,
    admin: false,
    policy: 'Lưu vết trạng thái hủy trên chứng từ hóa đơn để phục vụ đối soát',
  },
  {
    domain: 'Chứng từ & Báo cáo Kinh doanh',
    capability:
      'Tra cứu sổ hóa đơn theo kỳ, xuất bản in chuẩn A4 / PDF và phân tích doanh thu thực nhận',
    customer: false,
    staff: true,
    admin: false,
    policy: 'Doanh thu chỉ tổng hợp từ các đơn hàng đã xác nhận và xuất kho',
  },
  {
    domain: 'Quản trị Định danh & Phân quyền',
    capability:
      'Cấp phát tài khoản, điều chuyển vai trò truy cập, đình chỉ hoặc khôi phục tài khoản tổ chức',
    customer: false,
    staff: false,
    admin: true,
    policy: 'Bảo vệ phiên quản trị hiện hành chống tự hạ quyền hoặc tự khóa',
  },
];

const ROLE_PORTAL_META = {
  ADMIN: {
    icon: ShieldCheck,
    iconBg: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    portalLabel: 'Trung tâm Quản trị Hệ thống',
    sessionPolicy: 'Phiên xác thực quản trị độc lập',
  },
  SALES_STAFF: {
    icon: SlidersHorizontal,
    iconBg: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20',
    portalLabel: 'Không gian Vận hành Bán lẻ',
    sessionPolicy: 'Phiên làm việc ca trực độc lập',
  },
  CUSTOMER: {
    icon: UserCheck,
    iconBg: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
    portalLabel: 'Cửa hàng Trực tuyến Lumière',
    sessionPolicy: 'Phiên mua sắm khách hàng độc lập',
  },
};

export function AdminRolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRoleSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        adminApi.get('/admin/roles'),
        adminApi.get('/admin/users'),
      ]);
      setRoles(Array.isArray(rolesRes.data?.data) ? rolesRes.data.data : []);
      setUsers(Array.isArray(usersRes.data?.data) ? usersRes.data.data : []);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, 'Không thể tải cấu hình chính sách phân quyền.')
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRoleSummary();
  }, [loadRoleSummary]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề giới thiệu */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Mô hình Phân quyền theo Vai trò (Role-Based Access Control)
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Hệ thống phân tách chặt chẽ quyền hạn theo 3 nhóm định danh độc
              lập, đảm bảo mỗi cá nhân chỉ truy cập đúng phạm vi nghiệp vụ được
              ủy quyền.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadRoleSummary}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:self-auto disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* 3 Thẻ Vai trò Tổ chức */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          <p className="mt-2.5 text-sm text-slate-500">
            Đang tải dữ liệu phân bổ vai trò...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {roles.map((roleItem) => {
            const cfg =
              ROLE_CONFIG[roleItem.role_name] || ROLE_CONFIG.CUSTOMER;
            const meta =
              ROLE_PORTAL_META[roleItem.role_name] || ROLE_PORTAL_META.CUSTOMER;
            const IconComponent = meta.icon;

            const roleUsers = users.filter(
              (u) => u.role_name === roleItem.role_name
            );
            const activeInRole = roleUsers.filter(
              (u) => u.status === 'ACTIVE'
            ).length;
            const lockedInRole = roleUsers.filter(
              (u) => u.status === 'LOCKED'
            ).length;

            return (
              <div
                key={roleItem.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`}
                        />
                        {cfg.label}
                      </span>
                      <h3 className="mt-2.5 text-base font-bold text-slate-900">
                        {meta.portalLabel}
                      </h3>
                    </div>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600">
                    {roleItem.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-3 text-center border border-slate-200/70 tabular-nums">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {roleItem.user_count}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        Tổng tài khoản
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        {activeInRole}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        Hoạt động
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-600">
                        {lockedInRole}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        Tạm khóa
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Cơ chế phiên:</span>
                      <span className="font-medium text-slate-700">
                        {meta.sessionPolicy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Kiểm soát truy cập:</span>
                      <span className="font-medium text-emerald-700">
                        Xác thực theo vai trò
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                  <Link
                    to={`/admin/users?role=${roleItem.role_name}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <span>Xem danh sách tài khoản</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <a
                    href={cfg.portalPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <span>Mở không gian</span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bảng Ma trận Quyền hạn Chi tiết */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ma trận Phân quyền Nghiệp vụ Toàn Hệ thống
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Mọi yêu cầu truy cập vượt ngoài phạm vi vai trò được cấp đều bị hệ
            thống từ chối tự động tại tầng bảo mật dịch vụ.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80 text-left text-sm">
            <thead className="bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Nhóm Nghiệp vụ &amp; Quyền hạn</th>
                <th className="px-4 py-3.5 text-center">Khách hàng</th>
                <th className="px-4 py-3.5 text-center">Nhân sự vận hành</th>
                <th className="px-4 py-3.5 text-center">Quản trị viên</th>
                <th className="px-4 py-3.5">Chính sách áp dụng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {ACCESS_POLICY_MATRIX.map((row) => (
                <tr
                  key={row.domain}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3.5 max-w-md">
                    <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {row.domain}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      {row.capability}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.customer ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.staff ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.admin ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-slate-300" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 leading-relaxed">
                    {row.policy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminRolesPage;
