const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Toàn bộ phân hệ đặt hàng yêu cầu đăng nhập tài khoản CUSTOMER đang ACTIVE
router.use(authenticate, authorizeRoles('CUSTOMER'));

router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/my-orders/:id', orderController.getMyOrderById);

module.exports = router;
