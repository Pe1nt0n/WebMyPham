import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAdmin } from '../../components/common';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminRolesPage } from './AdminRolesPage';
import { AdminSystemHealthPage } from './AdminSystemHealthPage';
import { AdminUsersPage } from './AdminUsersPage';

/**
 * Định tuyến Phân hệ Quản trị Hệ thống (/admin/*)
 * Được mount tại <Route path="/admin/*" element={<AdminRoutes />} /> trong App.jsx.
 * Sử dụng đường dẫn tương đối cho <Route path="..."> theo chuẩn React Router v6 nested routes.
 */
export function AdminRoutes() {
  return (
    <Routes>
      {/* Trang đăng nhập độc lập cho Quản trị viên (/admin/login) */}
      <Route path="login" element={<AdminLoginPage />} />

      {/* Không gian Quản trị Server được bảo vệ bởi <RequireAdmin> */}
      <Route
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="system" element={<AdminSystemHealthPage />} />
      </Route>

      {/* Điều hướng mặc định mọi route con không khớp về /admin/users */}
      <Route path="*" element={<Navigate to="/admin/users" replace />} />
    </Routes>
  );
}

export default AdminRoutes;
