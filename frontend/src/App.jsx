import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { PortalAuthProvider } from './contexts/PortalAuthContext';
import { ToastProvider } from './contexts/ToastContext';
import * as AdminRoutesModule from './pages/admin/AdminRoutes';
import * as CustomerRoutesModule from './pages/customer/CustomerRoutes';
import * as StaffRoutesModule from './pages/staff/StaffRoutes';

// Tương thích cả export default lẫn named export từ 3 module con Giai đoạn 3
const AdminRoutes = AdminRoutesModule.default || AdminRoutesModule.AdminRoutes;
const StaffRoutes = StaffRoutesModule.default || StaffRoutesModule.StaffRoutes;
const CustomerRoutes = CustomerRoutesModule.default || CustomerRoutesModule.CustomerRoutes;

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ToastProvider>
      <PortalAuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/staff/*" element={<StaffRoutes />} />
              <Route path="/*" element={<CustomerRoutes />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </PortalAuthProvider>
    </ToastProvider>
  );
}
