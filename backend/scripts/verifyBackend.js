/**
 * Kịch bản Kiểm thử Tích hợp Tự động Toàn diện (End-to-End API, Security Hardening & MySQL Transaction Verification)
 * Chạy trực tiếp trên cơ sở dữ liệu MySQL 8.0 thật để kiểm chứng 100% yêu cầu nghiệp vụ & API_CONTRACT.md
 */
const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Mở rộng hạn mức Rate Limit trong môi trường chạy kiểm thử tự động liên hoàn
process.env.AUTH_RATE_LIMIT_MAX = '500';

const app = require('../src/app');
const { pool } = require('../src/config/db');

let baseUrl = '';
let passedTests = 0;

async function apiRequest(endpoint, { method = 'GET', token = null, body = undefined, extraHeaders = {} } = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, headers: res.headers, json };
}

function logPass(stepName) {
  passedTests += 1;
  console.log(`  [PASS #${String(passedTests).padStart(2, '0')}] ${stepName}`);
}

async function runVerification() {
  console.log('=========================================================================');
  console.log(' BẮT ĐẦU KIỂM THỬ TÍCH HỢP BACKEND LUMIÈRE COSMETICS TRÊN MYSQL 8.0 THẬT');
  console.log('=========================================================================\n');

  // Bước 0: Khôi phục CSDL sạch trước khi chạy kiểm thử
  execSync('node scripts/initDb.js', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  // Khởi chạy HTTP Server thật
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`\n[TEST SERVER] Đang chạy tại ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------------------
    // PHẦN 1: HEALTH CHECK, SECURITY HEADERS, XÁC THỰC ĐA CỔNG & HARDENING AUTH
    // -------------------------------------------------------------------------
    console.log('--- 1. Kiểm thử Health Check, Security Headers, Đăng nhập 3 phân hệ & Bảo mật Auth ---');

    const healthRes = await apiRequest('/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.json.data.database, 'CONNECTED');
    assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(healthRes.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(healthRes.headers.get('x-powered-by'), null);
    logPass('GET /api/health kết nối MySQL 8.0 ổn định & gắn đầy đủ Security Headers');

    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: '123456', portal: 'ADMIN' },
    });
    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual(adminLogin.json.data.user.role_name, 'ADMIN');
    assert.strictEqual(adminLogin.json.data.user.password_hash, undefined);
    assert.ok(adminLogin.headers.get('ratelimit-limit'), 'Phải có header RateLimit-Limit');
    const adminToken = adminLogin.json.data.token;
    logPass('Đăng nhập cổng ADMIN (admin / 123456) thành công & có Rate Limiter');

    const staffLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'nhanvien', password: '123456', portal: 'STAFF' },
    });
    assert.strictEqual(staffLogin.status, 200);
    assert.strictEqual(staffLogin.json.data.user.role_name, 'SALES_STAFF');
    const staffToken = staffLogin.json.data.token;
    logPass('Đăng nhập cổng STAFF (nhanvien / 123456) thành công');

    const customerLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'khachhang', password: '123456', portal: 'CUSTOMER' },
    });
    assert.strictEqual(customerLogin.status, 200);
    assert.strictEqual(customerLogin.json.data.user.role_name, 'CUSTOMER');
    const customerToken = customerLogin.json.data.token;
    logPass('Đăng nhập cổng CUSTOMER (khachhang / 123456) thành công');

    // Chặn sai mật khẩu & mật khẩu > 72 byte (chống DoS CPU bcrypt)
    const wrongPwd = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'khachhang', password: 'wrongpassword', portal: 'CUSTOMER' },
    });
    assert.strictEqual(wrongPwd.status, 401);
    assert.strictEqual(wrongPwd.json.code, 'INVALID_CREDENTIALS');

    const over72Login = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'khachhang', password: 'a'.repeat(80), portal: 'CUSTOMER' },
    });
    assert.strictEqual(over72Login.status, 401);
    assert.strictEqual(over72Login.json.code, 'INVALID_CREDENTIALS');
    logPass('Chặn sai mật khẩu & mật khẩu > 72 byte trả 401 INVALID_CREDENTIALS an toàn');

    // Chặn đăng ký với password phi chuỗi ({}), password > 72 byte, hoặc username chứa '@'
    const badObjPwdReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: 'bad_pwd_obj',
        password: { hack: true },
        full_name: 'Test User',
        email: 'badpwdobj@gmail.com',
      },
    });
    assert.strictEqual(badObjPwdReg.status, 400);
    assert.strictEqual(badObjPwdReg.json.code, 'VALIDATION_ERROR');

    const over72Reg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: 'over72_user',
        password: 'x'.repeat(73),
        full_name: 'Test User',
        email: 'over72@gmail.com',
      },
    });
    assert.strictEqual(over72Reg.status, 400);
    assert.strictEqual(over72Reg.json.code, 'VALIDATION_ERROR');

    const emailAsUsernameReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: 'thaovy.nguyen@gmail.com',
        password: '123456',
        full_name: 'Fake Username',
        email: 'other@gmail.com',
      },
    });
    assert.strictEqual(emailAsUsernameReg.status, 400);
    assert.strictEqual(emailAsUsernameReg.json.code, 'VALIDATION_ERROR');
    logPass("Chặn đăng ký password không phải string, password > 72 byte và username chứa '@'");

    // Chặn đăng nhập sai cổng (WRONG_PORTAL)
    const wrongPortal1 = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'khachhang', password: '123456', portal: 'STAFF' },
    });
    assert.strictEqual(wrongPortal1.status, 403);
    assert.strictEqual(wrongPortal1.json.code, 'WRONG_PORTAL');

    const wrongPortal2 = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'nhanvien', password: '123456', portal: 'ADMIN' },
    });
    assert.strictEqual(wrongPortal2.status, 403);
    assert.strictEqual(wrongPortal2.json.code, 'WRONG_PORTAL');
    logPass('Chặn đăng nhập sai cổng phân hệ trả 403 WRONG_PORTAL');

    // Chặn tài khoản bị khóa khachbikhoa
    const lockedLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'khachbikhoa', password: '123456', portal: 'CUSTOMER' },
    });
    assert.strictEqual(lockedLogin.status, 403);
    assert.strictEqual(lockedLogin.json.code, 'ACCOUNT_LOCKED');
    logPass('Chặn tài khoản bị khóa (khachbikhoa) trả 403 ACCOUNT_LOCKED');

    // Đăng ký tài khoản mới + Hồ sơ cá nhân + Đổi mật khẩu thu hồi JWT cũ
    const regRes = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: 'khachmoi_test',
        password: '123456',
        full_name: 'Lê Ngọc Bảo Trân',
        email: 'baotran.test@gmail.com',
        phone: '0908112233',
        address: '128 Hai Bà Trưng, Quận 1, TP.HCM',
      },
    });
    assert.strictEqual(regRes.status, 201);
    const oldCustomerToken = regRes.json.data.token;
    const newCustomerId = regRes.json.data.user.id;
    logPass('Đăng ký tài khoản khách hàng mới trả 201 Created');

    const dupReg = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username: 'khachmoi_test',
        password: '123456',
        full_name: 'Trùng Tên',
        email: 'khac@gmail.com',
      },
    });
    assert.strictEqual(dupReg.status, 409);
    assert.strictEqual(dupReg.json.code, 'DUPLICATE_ENTRY');
    logPass('Chặn trùng username/email trả 409 DUPLICATE_ENTRY');

    const meRes = await apiRequest('/auth/me', { token: oldCustomerToken });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.json.data.username, 'khachmoi_test');
    assert.strictEqual(meRes.json.data.password_hash, undefined);

    const updateProfRes = await apiRequest('/auth/profile', {
      method: 'PUT',
      token: oldCustomerToken,
      body: {
        full_name: 'Lê Ngọc Bảo Trân (Đã cập nhật)',
        email: 'baotran.test@gmail.com',
        phone: '0908999888',
        address: '88 Đồng Khởi, Quận 1, TP.HCM',
      },
    });
    assert.strictEqual(updateProfRes.status, 200);
    assert.strictEqual(updateProfRes.json.data.phone, '0908999888');

    const changePwdRes = await apiRequest('/auth/change-password', {
      method: 'PUT',
      token: oldCustomerToken,
      body: { current_password: '123456', new_password: '654321' },
    });
    assert.strictEqual(changePwdRes.status, 200);
    assert.ok(changePwdRes.json.data && changePwdRes.json.data.token, 'Phải trả về token mới');
    const newCustomerToken = changePwdRes.json.data.token;

    // Kiểm chứng JWT cũ lập tức bị vô hiệu hóa, JWT mới hoạt động bình thường
    const revokedOldTokenRes = await apiRequest('/auth/me', { token: oldCustomerToken });
    assert.strictEqual(revokedOldTokenRes.status, 401);
    assert.strictEqual(revokedOldTokenRes.json.code, 'UNAUTHORIZED');

    const activeNewTokenRes = await apiRequest('/auth/me', { token: newCustomerToken });
    assert.strictEqual(activeNewTokenRes.status, 200);
    logPass('PUT /change-password cấp token mới & thu hồi tức thời mọi JWT cũ (401 UNAUTHORIZED)');

    // Kiểm tra RBAC chéo giữa 3 phân hệ
    const rbac1 = await apiRequest('/staff/orders', { token: customerToken });
    assert.strictEqual(rbac1.status, 403);
    assert.strictEqual(rbac1.json.code, 'FORBIDDEN');

    const rbac2 = await apiRequest('/admin/users', { token: staffToken });
    assert.strictEqual(rbac2.status, 403);
    assert.strictEqual(rbac2.json.code, 'FORBIDDEN');
    logPass('Middleware RBAC chặn truy cập trái quyền giữa CUSTOMER / SALES_STAFF / ADMIN (403 FORBIDDEN)');

    // -------------------------------------------------------------------------
    // PHẦN 2: CATALOG CÔNG KHAI, ESCAPE LIKE WILDCARD & CHẶN INFINITY
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Kiểm thử Catalog Công khai, Lọc giá, Escape LIKE % & Chặn Infinity ---');

    const catRes = await apiRequest('/categories');
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catRes.json.data.length, 5);
    assert.strictEqual(typeof catRes.json.data[0].product_count, 'number');

    const brandRes = await apiRequest('/brands');
    assert.strictEqual(brandRes.status, 200);
    assert.strictEqual(brandRes.json.data.length, 10);
    logPass('GET /api/categories (5) & GET /api/brands (10) trả đúng số lượng sản phẩm');

    const filterRes = await apiRequest(
      '/products?category_id=3&min_price=300000&max_price=500000&sort=price_asc'
    );
    assert.strictEqual(filterRes.status, 200);
    assert.ok(filterRes.json.data.length >= 2);
    for (let i = 0; i < filterRes.json.data.length; i++) {
      const p = filterRes.json.data[i];
      assert.strictEqual(typeof p.price, 'number', 'Trường price phải là kiểu number chuẩn');
      assert.strictEqual(p.category_id, 3);
      assert.ok(p.price >= 300000 && p.price <= 500000);
      if (i > 0) {
        assert.ok(p.price >= filterRes.json.data[i - 1].price, 'Sắp xếp price_asc phải tăng dần');
      }
    }

    const infinityPriceRes = await apiRequest('/products?min_price=Infinity');
    assert.strictEqual(infinityPriceRes.status, 400);
    assert.strictEqual(infinityPriceRes.json.code, 'VALIDATION_ERROR');

    // Tìm kiếm '10%' phải escape ký tự '%' (chỉ khớp SP thực sự chứa chuỗi '10%', không trả cả 20 SP)
    const percentSearchRes = await apiRequest('/products?search=10%25');
    assert.strictEqual(percentSearchRes.status, 200);
    assert.ok(percentSearchRes.json.data.length >= 1 && percentSearchRes.json.data.length < 20);

    const searchRes = await apiRequest('/products?search=La%20Roche-Posay');
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.json.data.length, 2);
    logPass('Lọc sản phẩm chuẩn xác, chặn min_price=Infinity (400) & escape an toàn ký tự % trong LIKE');

    // -------------------------------------------------------------------------
    // PHẦN 3: KHÁCH ĐẶT HÀNG (PENDING - CHƯA TRỪ KHO) & CHẶN VƯỢT TỒN KHO
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Kiểm thử Khách hàng Tạo đơn (PENDING) & Chặn đặt vượt tồn kho ---');

    // Đặt vượt tồn kho SP #8 (tồn = 2, đặt = 5) -> 400 INSUFFICIENT_STOCK
    const overStockOrder = await apiRequest('/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        recipient_name: 'Nguyễn Thảo Vy',
        recipient_phone: '0912345678',
        shipping_address: '45 Lê Lợi, Quận 1, TP.HCM',
        payment_method: 'COD',
        items: [{ product_id: 8, quantity: 5 }],
      },
    });
    assert.strictEqual(overStockOrder.status, 400);
    assert.strictEqual(overStockOrder.json.code, 'INSUFFICIENT_STOCK');
    logPass('Chặn khách đặt vượt tồn kho (SP #8 tồn 2 đặt 5) trả 400 INSUFFICIENT_STOCK');

    // Kiểm tra tồn kho trước khi đặt của SP #1 (35) và SP #7 (45)
    const prod1Before = (await apiRequest('/products/1')).json.data;
    const prod7Before = (await apiRequest('/products/7')).json.data;
    assert.strictEqual(prod1Before.stock_quantity, 35);
    assert.strictEqual(prod7Before.stock_quantity, 45);

    // Khách tạo đơn hợp lệ (2 x SP #1 [485,000] + 1 x SP #7 [295,000] = 1,265,000)
    const createOrderRes = await apiRequest('/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        recipient_name: 'Nguyễn Thảo Vy',
        recipient_phone: '0912345678',
        shipping_address: '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
        payment_method: 'BANK_TRANSFER',
        note: 'Giao giờ hành chính',
        items: [
          { product_id: 1, quantity: 2 },
          { product_id: 7, quantity: 1 },
        ],
      },
    });
    assert.strictEqual(createOrderRes.status, 201);
    assert.strictEqual(createOrderRes.json.data.status, 'PENDING');
    assert.strictEqual(createOrderRes.json.data.total_amount, 1265000);
    const createdOrderId = createOrderRes.json.data.id;

    // Kiểm tra tồn kho KHÔNG bị trừ khi đơn đang ở PENDING
    const prod1AfterPending = (await apiRequest('/products/1')).json.data;
    const prod7AfterPending = (await apiRequest('/products/7')).json.data;
    assert.strictEqual(prod1AfterPending.stock_quantity, 35);
    assert.strictEqual(prod7AfterPending.stock_quantity, 45);
    logPass(`Tạo đơn mới #${createdOrderId} -> PENDING (total = 1.265.000đ) và chưa trừ tồn kho`);

    const myOrdersRes = await apiRequest('/orders/my-orders', { token: customerToken });
    assert.strictEqual(myOrdersRes.status, 200);
    assert.ok(myOrdersRes.json.data.some((o) => o.id === createdOrderId));

    const myOrderDetailRes = await apiRequest(`/orders/my-orders/${createdOrderId}`, {
      token: customerToken,
    });
    assert.strictEqual(myOrderDetailRes.status, 200);
    assert.strictEqual(myOrderDetailRes.json.data.items.length, 2);

    // Kiểm tra chống IDOR: khách #4 không xem được đơn #2 của khách #5
    const idorOrderRes = await apiRequest('/orders/my-orders/2', { token: customerToken });
    assert.strictEqual(idorOrderRes.status, 404);
    assert.strictEqual(idorOrderRes.json.code, 'NOT_FOUND');
    logPass('GET /api/orders/my-orders, /my-orders/:id & chống IDOR đơn hàng khách khác chuẩn xác');

    // -------------------------------------------------------------------------
    // PHẦN 4: TRANSACTION DUYỆT ĐƠN - XUẤT HÓA ĐƠN - HỦY HOÀN KHO - ROLLBACK THIẾU KHO
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Kiểm thử Transaction Duyệt đơn, Xuất hóa đơn, Hủy hoàn kho & Rollback ---');

    // 4.1. Kiểm tra báo cáo doanh thu gốc (hỗ trợ định dạng ngày Việt Nam DD/MM/YYYY)
    const initialReport = await apiRequest(
      '/staff/reports/summary?from_date=01/09/2026&to_date=30/12/2026&group_by=month',
      { token: staffToken }
    );
    assert.strictEqual(initialReport.status, 200);
    assert.strictEqual(initialReport.json.data.kpis.total_revenue, 7500000);
    assert.strictEqual(initialReport.json.data.kpis.approved_orders_count, 4);
    logPass('Báo cáo doanh thu gốc khớp 7.500.000đ (hỗ trợ lọc ngày DD/MM/YYYY)');

    // 4.2. Thử duyệt đơn #8 (đặt 3 SP #8 khi kho chỉ còn 2, kèm 1 SP #13 kho đang 60) -> Phải ROLLBACK toàn bộ!
    const approveInsufficient = await apiRequest('/staff/orders/8/approve', {
      method: 'PATCH',
      token: staffToken,
    });
    assert.strictEqual(approveInsufficient.status, 400);
    assert.strictEqual(approveInsufficient.json.code, 'INSUFFICIENT_STOCK');

    const prod8Check = (await apiRequest('/products/8')).json.data;
    const prod13Check = (await apiRequest('/products/13')).json.data;
    const order8Check = (await apiRequest('/staff/orders/8', { token: staffToken })).json.data;
    assert.strictEqual(prod8Check.stock_quantity, 2);
    assert.strictEqual(prod13Check.stock_quantity, 60, 'SP #13 phải giữ nguyên 60 nhờ ROLLBACK');
    assert.strictEqual(order8Check.status, 'PENDING');
    logPass('Duyệt đơn #8 thiếu tồn kho trả 400 INSUFFICIENT_STOCK và ROLLBACK an toàn 100%');

    // 4.3. Nhân viên duyệt đơn mới tạo (PENDING -> APPROVED)
    const approveSuccess = await apiRequest(`/staff/orders/${createdOrderId}/approve`, {
      method: 'PATCH',
      token: staffToken,
      body: { note: 'Đã gọi xác nhận SĐT khách hàng và xuất kho' },
    });
    assert.strictEqual(approveSuccess.status, 200);
    assert.strictEqual(approveSuccess.json.data.status, 'APPROVED');
    assert.ok(approveSuccess.json.data.invoice.invoice_code.startsWith('HD-'));
    const generatedInvoiceId = approveSuccess.json.data.invoice.id;

    // Tồn kho giảm đúng số lượng: SP #1 (35 -> 33), SP #7 (45 -> 44)
    const prod1AfterApprove = (await apiRequest('/products/1')).json.data;
    const prod7AfterApprove = (await apiRequest('/products/7')).json.data;
    assert.strictEqual(prod1AfterApprove.stock_quantity, 33);
    assert.strictEqual(prod7AfterApprove.stock_quantity, 44);
    logPass(
      `Duyệt đơn #${createdOrderId} thành công: trừ tồn kho chính xác (35->33, 45->44) & tự sinh hóa đơn ${approveSuccess.json.data.invoice.invoice_code}`
    );

    // Kiểm tra chi tiết phiếu in hóa đơn & doanh thu tăng lên
    const invoiceDetailRes = await apiRequest(`/staff/invoices/${generatedInvoiceId}`, {
      token: staffToken,
    });
    assert.strictEqual(invoiceDetailRes.status, 200);
    assert.strictEqual(invoiceDetailRes.json.data.invoice.total_amount, 1265000);
    assert.strictEqual(invoiceDetailRes.json.data.items.length, 2);

    const reportAfterApprove = await apiRequest('/staff/reports/summary?group_by=day', {
      token: staffToken,
    });
    assert.strictEqual(reportAfterApprove.json.data.kpis.total_revenue, 7500000 + 1265000);
    logPass('Phiếu in hóa đơn đầy đủ thông tin & Doanh thu cộng thêm đúng 1.265.000đ (8.765.000đ)');

    // 4.4. Nhân viên HỦY ĐƠN ĐÃ DUYỆT (APPROVED -> CANCELLED) -> Hoàn kho + Gắn nhãn hóa đơn + Trừ khỏi doanh thu
    const cancelApprovedRes = await apiRequest(`/staff/orders/${createdOrderId}/cancel`, {
      method: 'PATCH',
      token: staffToken,
      body: { reason: 'Khách liên hệ xin hủy trước khi shipper lấy hàng' },
    });
    assert.strictEqual(cancelApprovedRes.status, 200);
    assert.strictEqual(cancelApprovedRes.json.data.previous_status, 'APPROVED');
    assert.strictEqual(cancelApprovedRes.json.data.status, 'CANCELLED');
    assert.strictEqual(cancelApprovedRes.json.data.restocked, true);

    const prod1AfterRestock = (await apiRequest('/products/1')).json.data;
    const prod7AfterRestock = (await apiRequest('/products/7')).json.data;
    assert.strictEqual(prod1AfterRestock.stock_quantity, 35);
    assert.strictEqual(prod7AfterRestock.stock_quantity, 45);

    const invoiceAfterCancel = (
      await apiRequest(`/staff/invoices/${generatedInvoiceId}`, { token: staffToken })
    ).json.data;
    assert.ok(
      invoiceAfterCancel.invoice.note.includes('[ĐÃ HỦY ĐƠN - HOÀN KHO]'),
      'Ghi chú hóa đơn phải gắn nhãn [ĐÃ HỦY ĐƠN - HOÀN KHO]'
    );

    const reportAfterCancel = await apiRequest('/staff/reports/summary', { token: staffToken });
    assert.strictEqual(
      reportAfterCancel.json.data.kpis.total_revenue,
      7500000,
      'Doanh thu báo cáo tuyệt đối không tính đơn đã hủy'
    );
    logPass(
      'Hủy đơn APPROVED -> CANCELLED: hoàn trả tồn kho (33->35, 44->45), gắn [ĐÃ HỦY ĐƠN - HOÀN KHO] & loại trừ khỏi doanh thu'
    );

    // 4.5. Nhân viên HỦY ĐƠN CHỜ DUYỆT #6 (PENDING -> CANCELLED) -> Tồn kho giữ nguyên không đổi
    const prod15Before = (await apiRequest('/products/15')).json.data.stock_quantity;
    const cancelPendingRes = await apiRequest('/staff/orders/6/cancel', {
      method: 'PATCH',
      token: staffToken,
      body: { reason: 'Khách đặt nhầm địa chỉ' },
    });
    assert.strictEqual(cancelPendingRes.status, 200);
    assert.strictEqual(cancelPendingRes.json.data.previous_status, 'PENDING');
    assert.strictEqual(cancelPendingRes.json.data.restocked, false);

    const prod1AfterPendingCancel = (await apiRequest('/products/1')).json.data.stock_quantity;
    const prod15AfterPendingCancel = (await apiRequest('/products/15')).json.data.stock_quantity;
    assert.strictEqual(prod1AfterPendingCancel, 35);
    assert.strictEqual(prod15AfterPendingCancel, prod15Before);
    logPass('Hủy đơn PENDING -> CANCELLED (#6): tồn kho giữ nguyên không thay đổi');

    // -------------------------------------------------------------------------
    // PHẦN 5: QUẢN LÝ KHO SẢN PHẨM, CHẶN GIÁ RỖNG/NULL/JAVASCRIPT URL & XÓA AN TOÀN
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Kiểm thử CRUD Sản phẩm, Validate nghiêm ngặt & Bảo toàn Khóa ngoại ---');

    const badNullPriceProd = await apiRequest('/staff/products', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'SP Giá Null',
        category_id: 1,
        brand_id: 1,
        price: null,
        stock_quantity: 10,
      },
    });
    assert.strictEqual(badNullPriceProd.status, 400);

    const badJsUrlProd = await apiRequest('/staff/products', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'SP Ảnh XSS',
        category_id: 1,
        brand_id: 1,
        price: 150000,
        stock_quantity: 10,
        image_url: 'javascript:alert(1)',
      },
    });
    assert.strictEqual(badJsUrlProd.status, 400);
    logPass('Chặn price=null/"" và image_url giao thức javascript: tại /api/staff/products');

    const newProdRes = await apiRequest('/staff/products', {
      method: 'POST',
      token: staffToken,
      body: {
        name: 'Xịt Khoáng Làm Dịu Da La Roche-Posay Thermal Spring Water',
        category_id: 1,
        brand_id: 1,
        price: 285000,
        stock_quantity: 25,
        volume: '150ml',
        skin_type: 'Da nhạy cảm',
        description: 'Xịt khoáng làm dịu kích ứng tức thì.',
      },
    });
    assert.strictEqual(newProdRes.status, 201);
    const newProdId = newProdRes.json.data.id;

    // Gửi price: "" khi update phải báo lỗi 400 thay vì ghi đè giá thành 0
    const badEmptyPriceUpdate = await apiRequest(`/staff/products/${newProdId}`, {
      method: 'PUT',
      token: staffToken,
      body: { price: '' },
    });
    assert.strictEqual(badEmptyPriceUpdate.status, 400);

    const updProdRes = await apiRequest(`/staff/products/${newProdId}`, {
      method: 'PUT',
      token: staffToken,
      body: { stock_quantity: 50, price: 275000 },
    });
    assert.strictEqual(updProdRes.status, 200);
    assert.strictEqual(updProdRes.json.data.stock_quantity, 50);

    // Xóa SP mới chưa có đơn hàng -> DELETED
    const delCleanProd = await apiRequest(`/staff/products/${newProdId}`, {
      method: 'DELETE',
      token: staffToken,
    });
    assert.strictEqual(delCleanProd.status, 200);
    assert.strictEqual(delCleanProd.json.data.action, 'DELETED');

    // Xóa SP #1 đã có trong order_details -> SOFT_HIDDEN
    const delUsedProd = await apiRequest('/staff/products/1', {
      method: 'DELETE',
      token: staffToken,
    });
    assert.strictEqual(delUsedProd.status, 200);
    assert.strictEqual(delUsedProd.json.data.action, 'SOFT_HIDDEN');
    assert.strictEqual(delUsedProd.json.data.status, 'HIDDEN');

    // Khách hàng truy cập SP #1 đã ẩn -> 404 NOT_FOUND
    const hiddenCheckPublic = await apiRequest('/products/1');
    assert.strictEqual(hiddenCheckPublic.status, 404);
    logPass('CRUD Sản phẩm (Transaction FOR UPDATE) & Xóa an toàn (DELETED vs SOFT_HIDDEN)');

    // -------------------------------------------------------------------------
    // PHẦN 6: QUẢN TRỊ ADMIN, CHẶN SELF-ACTION & SOFT_LOCKED USER
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Kiểm thử Quản trị Admin, Chặn Self-Action & Khóa mềm User ---');

    const rolesRes = await apiRequest('/admin/roles', { token: adminToken });
    assert.strictEqual(rolesRes.status, 200);
    assert.strictEqual(rolesRes.json.data.length, 3);

    // Chặn Admin tự khóa, tự hạ quyền, tự xóa, tự đặt lại mật khẩu chính mình (user id = 1)
    const selfLock = await apiRequest('/admin/users/1/status', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'LOCKED' },
    });
    assert.strictEqual(selfLock.status, 400);
    assert.strictEqual(selfLock.json.code, 'SELF_ACTION_FORBIDDEN');

    const selfRole = await apiRequest('/admin/users/1/role', {
      method: 'PATCH',
      token: adminToken,
      body: { role_name: 'CUSTOMER' },
    });
    assert.strictEqual(selfRole.status, 400);
    assert.strictEqual(selfRole.json.code, 'SELF_ACTION_FORBIDDEN');

    const selfPwdPut = await apiRequest('/admin/users/1', {
      method: 'PUT',
      token: adminToken,
      body: { password: 'newadminpassword' },
    });
    assert.strictEqual(selfPwdPut.status, 400);
    assert.strictEqual(selfPwdPut.json.code, 'SELF_ACTION_FORBIDDEN');

    const conflictRolePut = await apiRequest(`/admin/users/${newCustomerId}`, {
      method: 'PUT',
      token: adminToken,
      body: { role_id: 1, role_name: 'CUSTOMER' },
    });
    assert.strictEqual(conflictRolePut.status, 400);
    assert.strictEqual(conflictRolePut.json.code, 'VALIDATION_ERROR');

    const selfDelete = await apiRequest('/admin/users/1', {
      method: 'DELETE',
      token: adminToken,
    });
    assert.strictEqual(selfDelete.status, 400);
    assert.strictEqual(selfDelete.json.code, 'SELF_ACTION_FORBIDDEN');
    logPass('Chặn Admin tự khóa / tự hạ quyền / tự đổi mật khẩu / tự xóa & chặn xung đột role_id-role_name');

    // Phân quyền & Khóa tức thời tài khoản đang có JWT hoạt động
    const changeRoleRes = await apiRequest(`/admin/users/${newCustomerId}/role`, {
      method: 'PATCH',
      token: adminToken,
      body: { role_name: 'SALES_STAFF' },
    });
    assert.strictEqual(changeRoleRes.status, 200);
    assert.strictEqual(changeRoleRes.json.data.role_name, 'SALES_STAFF');

    const lockUserRes = await apiRequest(`/admin/users/${newCustomerId}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'LOCKED' },
    });
    assert.strictEqual(lockUserRes.status, 200);
    assert.strictEqual(lockUserRes.json.data.status, 'LOCKED');

    // Kiểm tra token mới của user lập tức bị chặn bởi Auth Middleware (403 ACCOUNT_LOCKED)!
    const blockedRealtime = await apiRequest('/auth/me', { token: newCustomerToken });
    assert.strictEqual(blockedRealtime.status, 403);
    assert.strictEqual(blockedRealtime.json.code, 'ACCOUNT_LOCKED');
    logPass('Admin phân quyền & Khóa tài khoản có hiệu lực chặn JWT tức thời (Real-time Lockout)');

    // Xóa user chưa có đơn hàng -> DELETED
    const delCleanUser = await apiRequest(`/admin/users/${newCustomerId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert.strictEqual(delCleanUser.status, 200);
    assert.strictEqual(delCleanUser.json.data.action, 'DELETED');

    // Xóa user đã có đơn hàng (khachhang id = 4) -> SOFT_LOCKED
    const delOrderUser = await apiRequest('/admin/users/4', {
      method: 'DELETE',
      token: adminToken,
    });
    assert.strictEqual(delOrderUser.status, 200);
    assert.strictEqual(delOrderUser.json.data.action, 'SOFT_LOCKED');
    assert.strictEqual(delOrderUser.json.data.status, 'LOCKED');
    logPass('Xóa User an toàn khóa ngoại (chưa có đơn -> DELETED, đã có đơn -> SOFT_LOCKED)');

    console.log('\n=========================================================================');
    console.log(` TẤT CẢ ${passedTests}/${passedTests} KỊCH BẢN KIỂM THỬ BACKEND ĐỀU VƯỢT QUA 100%!`);
    console.log('=========================================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

runVerification().catch((err) => {
  console.error('\n[TEST FAILED] Kiểm thử thất bại:', err);
  process.exit(1);
});
