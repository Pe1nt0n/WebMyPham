const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const staffProductController = require('../controllers/staffProduct.controller');
const staffOrderController = require('../controllers/staffOrder.controller');
const staffInvoiceController = require('../controllers/staffInvoice.controller');
const staffReportController = require('../controllers/staffReport.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Toàn bộ phân hệ Nhân viên bán hàng yêu cầu đăng nhập tài khoản SALES_STAFF đang ACTIVE
router.use(authenticate, authorizeRoles('SALES_STAFF'));

// Hỗ trợ tra cứu nhanh danh mục & thương hiệu cho form sản phẩm
router.get('/categories', catalogController.getCategories);
router.get('/brands', catalogController.getBrands);

// 5.1. Quản lý Sản phẩm & Tồn kho
router.get('/products', staffProductController.getStaffProducts);
router.post('/products', staffProductController.createProduct);
router.put('/products/:id', staffProductController.updateProduct);
router.delete('/products/:id', staffProductController.deleteProduct);

// 5.2. Xử lý Đơn hàng & Transaction Kho - Hóa đơn
router.get('/orders', staffOrderController.getStaffOrders);
router.get('/orders/:id', staffOrderController.getStaffOrderById);
router.patch('/orders/:id/approve', staffOrderController.approveOrder);
router.patch('/orders/:id/cancel', staffOrderController.cancelOrder);

// 5.3. Quản lý & In Hóa đơn Bán lẻ
router.get('/invoices', staffInvoiceController.getInvoices);
router.get('/invoices/:id', staffInvoiceController.getInvoiceById);

// 5.4. Thống kê & Báo cáo Doanh thu
router.get('/reports/summary', staffReportController.getReportSummary);

module.exports = router;
