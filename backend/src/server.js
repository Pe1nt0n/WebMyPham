/**
 * Điểm khởi chạy máy chủ HTTP Backend (src/server.js)
 * Kiểm tra kết nối MySQL 8.0 trước khi lắng nghe trên cổng PORT (mặc định 5000).
 */
const { PORT, DB_CONFIG } = require('./config/env');
const app = require('./app');
const { checkDatabaseConnection, pool } = require('./config/db');

async function startServer() {
  try {
    await checkDatabaseConnection();
    console.log(
      `[MYSQL] Đã kết nối thành công tới CSDL '${DB_CONFIG.database}' tại ${DB_CONFIG.host}:${DB_CONFIG.port}`
    );

    const server = app.listen(PORT, () => {
      console.log(`[SERVER] Lumière Cosmetics Backend đang chạy tại http://localhost:${PORT}/api`);
      console.log(`[HEALTH] Kiểm tra kết nối nhanh: http://localhost:${PORT}/api/health`);
    });

    // Đóng kết nối MySQL Pool gọn gàng khi tắt tiến trình server
    const gracefulShutdown = async (signal) => {
      console.log(`\n[SERVER] Nhận tín hiệu ${signal}, đang đóng máy chủ và kết nối MySQL...`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('[STARTUP ERROR] Không thể kết nối tới cơ sở dữ liệu MySQL:', error.message);
    process.exit(1);
  }
}

startServer();
