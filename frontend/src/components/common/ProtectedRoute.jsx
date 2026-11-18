import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  useAdminAuth,
  useCustomerAuth,
  useStaffAuth,
} from '../../contexts/PortalAuthContext';

function FullPageAuthSpinner({ label = 'Đang kiểm tra phiên đăng nhập...' }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-100">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

/**
 * Bảo vệ các route yêu cầu đăng nhập Khách hàng (role_name === 'CUSTOMER')
 * Hỗ trợ cả 2 kiểu dùng: <RequireCustomer><Page /></RequireCustomer> hoặc <Route element={<RequireCustomer />}>
 */
export function RequireCustomer({ children }) {
  const { user, isAuthenticated, loading } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageAuthSpinner label="Đang tải thông tin tài khoản khách hàng..." />;
  }

  if (!isAuthenticated || user?.role_name !== 'CUSTOMER' || user?.status === 'LOCKED') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
}

/**
 * Bảo vệ các route Cổng Nhân viên bán hàng (role_name === 'SALES_STAFF')
 * Hỗ trợ cả 2 kiểu dùng: <RequireStaff><Page /></RequireStaff> hoặc <Route element={<RequireStaff />}>
 */
export function RequireStaff({ children }) {
  const { user, isAuthenticated, loading } = useStaffAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageAuthSpinner label="Đang xác thực quyền Nhân viên bán hàng..." />;
  }

  if (!isAuthenticated || user?.role_name !== 'SALES_STAFF' || user?.status === 'LOCKED') {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
}

/**
 * Bảo vệ các route Cổng Quản trị hệ thống (role_name === 'ADMIN')
 * Hỗ trợ cả 2 kiểu dùng: <RequireAdmin><Page /></RequireAdmin> hoặc <Route element={<RequireAdmin />}>
 */
export function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageAuthSpinner label="Đang xác thực quyền Quản trị hệ thống..." />;
  }

  if (!isAuthenticated || user?.role_name !== 'ADMIN' || user?.status === 'LOCKED') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
}

export default {
  RequireCustomer,
  RequireStaff,
  RequireAdmin,
};
