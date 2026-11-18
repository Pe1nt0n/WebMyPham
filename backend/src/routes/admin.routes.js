const express = require('express');
const adminUserController = require('../controllers/adminUser.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Toàn bộ phân hệ Quản trị hệ thống yêu cầu đăng nhập tài khoản ADMIN đang ACTIVE
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/roles', adminUserController.getRoles);
router.get('/users', adminUserController.getUsers);
router.post('/users', adminUserController.createUser);
router.put('/users/:id', adminUserController.updateUser);
router.patch('/users/:id/role', adminUserController.changeUserRole);
router.patch('/users/:id/status', adminUserController.changeUserStatus);
router.delete('/users/:id', adminUserController.deleteUser);

module.exports = router;
