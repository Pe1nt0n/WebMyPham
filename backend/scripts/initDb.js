/**
 * Script khởi tạo & khôi phục Cơ sở dữ liệu mẫu (npm run db:init)
 * - Tự động đọc kịch bản SQL chuẩn từ ../database/database.sql
 * - Kết nối vào MySQL Server (hỗ trợ cả Docker lẫn XAMPP dùng mật khẩu rỗng DB_PASSWORD=)
 * - Chạy toàn bộ câu lệnh CREATE DATABASE, DROP/CREATE 8 bảng và nạp lại Seed Data sạch 100%
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function initDatabase() {
  const sqlFilePath = path.resolve(__dirname, '../../database/database.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`[DB:INIT] Không tìm thấy file SQL tại: ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
  let connection;

  try {
    console.log('[DB:INIT] Đang kết nối tới MySQL Server...');
    // Kết nối ở cấp độ Server (hỗ trợ DB_PASSWORD="" rỗng cho XAMPP / MariaDB)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '123456',
      charset: 'utf8mb4',
      timezone: '+07:00',
      multipleStatements: true,
    });

    await connection.query("SET time_zone = '+07:00'");

    console.log('[DB:INIT] Đang thực thi kịch bản database/database.sql...');
    await connection.query(sqlScript);

    const dbName = process.env.DB_NAME || 'cosmetic_store';
    const [[userCount]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${dbName}\`.users`);
    const [[productCount]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${dbName}\`.products`);
    const [[orderCount]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${dbName}\`.orders`);
    const [[invoiceCount]] = await connection.query(`SELECT COUNT(*) AS total FROM \`${dbName}\`.invoices`);

    console.log('[DB:INIT] Khởi tạo CSDL thành công 100%!');
    console.log(
      `[DB:INIT] Thống kê dữ liệu mẫu: ${userCount.total} tài khoản | ${productCount.total} sản phẩm | ${orderCount.total} đơn hàng | ${invoiceCount.total} hóa đơn.`
    );
  } catch (error) {
    console.error('[DB:INIT] Lỗi khi khởi tạo cơ sở dữ liệu:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
