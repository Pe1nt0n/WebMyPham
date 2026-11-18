/**
 * Cấu hình kết nối Cơ sở dữ liệu MySQL 8.0 sử dụng Connection Pool (mysql2/promise)
 * - decimalNumbers: true -> Tự động chuyển các cột DECIMAL/BIGINT về kiểu number chuẩn trong JSON
 * - charset: 'utf8mb4' -> Đảm bảo lưu trữ và hiển thị tiếng Việt có dấu chính xác 100%
 * - timezone: '+07:00' -> Đồng bộ tuyệt đối múi giờ Việt Nam giữa Node.js và MySQL Server
 * - Hỗ trợ mật khẩu rỗng (DB_PASSWORD=) cho môi trường XAMPP / MariaDB
 */
const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('./env');

const pool = mysql.createPool({
  host: DB_CONFIG.host,
  port: DB_CONFIG.port,
  user: DB_CONFIG.user,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  charset: 'utf8mb4',
  timezone: '+07:00',
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Đảm bảo mọi kết nối vật lý trong Pool đều thiết lập session time_zone Việt Nam (+07:00)
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

/**
 * Kiểm tra nhanh kết nối đến MySQL khi khởi động server hoặc tại GET /api/health
 */
async function checkDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SELECT 1');
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
};
