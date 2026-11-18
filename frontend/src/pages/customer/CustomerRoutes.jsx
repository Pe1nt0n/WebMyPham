import { Route, Routes } from 'react-router-dom';
import { RequireCustomer } from '../../components/common/ProtectedRoute';
import { StorefrontLayout } from '../../components/customer/StorefrontLayout';
import { CartPage } from './CartPage';
import { CatalogPage } from './CatalogPage';
import { CheckoutPage } from './CheckoutPage';
import { HomePage } from './HomePage';
import { LoginPage } from './LoginPage';
import { NotFoundPage } from './NotFoundPage';
import { OrderDetailPage } from './OrderDetailPage';
import { OrdersPage } from './OrdersPage';
import { ProductDetailPage } from './ProductDetailPage';
import { ProfilePage } from './ProfilePage';
import { RegisterPage } from './RegisterPage';

/**
 * Định tuyến Phân hệ Khách hàng mua sắm (Customer Storefront — mount tại `/*` trong App.jsx)
 */
export function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        {/* Các trang công khai */}
        <Route index element={<HomePage />} />
        <Route path="products" element={<CatalogPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Các trang yêu cầu đăng nhập tài khoản Khách hàng (CUSTOMER) */}
        <Route element={<RequireCustomer />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>

        {/* Trang 404 thân thiện cho các đường dẫn không tồn tại dưới CustomerRoutes */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default CustomerRoutes;
