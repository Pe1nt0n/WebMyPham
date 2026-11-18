import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireStaff } from '../../components/common/ProtectedRoute';
import { StaffLayout } from '../../components/staff/StaffLayout';
import { StaffDashboardPage } from './StaffDashboardPage';
import { StaffInvoicePrintPage } from './StaffInvoicePrintPage';
import { StaffInvoicesPage } from './StaffInvoicesPage';
import { StaffLoginPage } from './StaffLoginPage';
import { StaffOrdersPage } from './StaffOrdersPage';
import { StaffProductsPage } from './StaffProductsPage';

/**
 * Định tuyến Phân hệ Nhân viên Bán hàng (/staff/*)
 * Được mount tại App.jsx: <Route path="/staff/*" element={<StaffRoutes />} />
 * Các <Route path="..."> bên trong dùng đường dẫn tương đối chuẩn React Router v6.
 */
export function StaffRoutes() {
  return (
    <Routes>
      {/* Trang đăng nhập riêng cho Nhân viên bán hàng */}
      <Route path="login" element={<StaffLoginPage />} />

      {/* Toàn bộ các route nghiệp vụ bên dưới bắt buộc xác thực role SALES_STAFF */}
      <Route element={<RequireStaff />}>
        {/* Trang In Hóa đơn chuẩn A4 tách riêng khỏi Sidebar để bản in sạch tuyệt đối */}
        <Route path="invoices/:id/print" element={<StaffInvoicePrintPage />} />

        {/* Khung làm việc chính có Sidebar & Topbar */}
        <Route element={<StaffLayout />}>
          <Route index element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="products" element={<StaffProductsPage />} />
          <Route path="orders" element={<StaffOrdersPage />} />
          <Route path="invoices" element={<StaffInvoicesPage />} />
        </Route>
      </Route>

      {/* Điều hướng mặc định mọi đường dẫn không khớp dưới /staff/* */}
      <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
    </Routes>
  );
}

export default StaffRoutes;
