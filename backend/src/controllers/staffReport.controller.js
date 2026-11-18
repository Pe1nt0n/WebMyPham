/**
 * Controller Thống kê & Báo cáo Doanh thu (/api/staff/reports/summary — Role: SALES_STAFF)
 * Tổng hợp các chỉ số KPI kinh doanh, biểu đồ doanh thu theo ngày/tháng và Top sản phẩm bán chạy.
 * Quy tắc kế toán cốt lõi:
 *   - Doanh thu thực nhận (total_revenue, revenue_chart, top_products, total_items_sold)
 *     CHỈ TÍNH TRÊN CÁC ĐƠN HÀNG ĐANG Ở TRẠNG THÁI 'APPROVED'.
 *   - Các đơn 'PENDING' hoặc 'CANCELLED' (kể cả đơn đã duyệt nhưng sau đó hủy hoàn kho)
 *     đều tự động bị loại khỏi doanh thu.
 *   - Hỗ trợ nhận from_date / to_date cả định dạng YYYY-MM-DD lẫn DD/MM/YYYY.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateRange } = require('../utils/dateParser');
const { sendSuccess } = require('../utils/response');

/**
 * Chuyển chuỗi period ('YYYY-MM' hoặc 'YYYY-MM-DD') sang nhãn hiển thị tiếng Việt ('MM/YYYY' hoặc 'DD/MM/YYYY')
 */
function formatPeriodLabel(period, groupBy) {
  if (!period) return '';
  const parts = String(period).split('-');
  if (groupBy === 'day' && parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  if (parts.length >= 2) {
    return `${parts[1]}/${parts[0]}`;
  }
  return period;
}

/**
 * GET /api/staff/reports/summary — Tổng hợp KPI, biểu đồ doanh thu và top mỹ phẩm bán chạy
 */
const getReportSummary = asyncHandler(async (req, res) => {
  const { from_date, to_date, group_by = 'month' } = req.query;
  const { fromDate, toDate } = parseDateRange(from_date, to_date);

  const normalizedGroupBy = String(group_by).trim().toLowerCase();
  if (!['day', 'month'].includes(normalizedGroupBy)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      "Tham số nhóm thời gian (group_by) chỉ chấp nhận 'day' hoặc 'month'."
    );
  }

  // Biểu thức ngày hiệu lực: ưu tiên ngày xuất hóa đơn (issued_date), nếu chưa có hóa đơn thì lấy ngày đặt (order_date)
  const effectiveDateExpr = 'DATE(COALESCE(i.issued_date, o.order_date))';
  const dateConditions = [];
  const dateParams = [];

  if (fromDate) {
    dateConditions.push(`${effectiveDateExpr} >= ?`);
    dateParams.push(fromDate);
  }
  if (toDate) {
    dateConditions.push(`${effectiveDateExpr} <= ?`);
    dateParams.push(toDate);
  }

  const dateWhereClause =
    dateConditions.length > 0 ? `WHERE ${dateConditions.join(' AND ')}` : '';
  const approvedWhereClause =
    dateConditions.length > 0
      ? `WHERE o.status = 'APPROVED' AND ${dateConditions.join(' AND ')}`
      : "WHERE o.status = 'APPROVED'";

  // 1. Truy vấn tổng hợp số lượng đơn hàng theo trạng thái & tổng doanh thu APPROVED
  const [[kpiOrderRow]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN o.status = 'APPROVED' THEN o.total_amount ELSE 0 END), 0) AS total_revenue,
       SUM(CASE WHEN o.status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_orders_count,
       SUM(CASE WHEN o.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders_count,
       SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders_count,
       COUNT(*) AS total_orders_count
     FROM orders o
     LEFT JOIN invoices i ON i.order_id = o.id
     ${dateWhereClause}`,
    dateParams
  );

  // 2. Truy vấn tổng số sản phẩm thực bán từ các đơn hàng APPROVED
  const [[itemsSoldRow]] = await pool.query(
    `SELECT COALESCE(SUM(od.quantity), 0) AS total_items_sold
     FROM order_details od
     INNER JOIN orders o ON o.id = od.order_id
     LEFT JOIN invoices i ON i.order_id = o.id
     ${approvedWhereClause}`,
    dateParams
  );

  // 3. Truy vấn dữ liệu biểu đồ doanh thu theo ngày (YYYY-MM-DD) hoặc theo tháng (YYYY-MM)
  const dateFormatPattern = normalizedGroupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';
  const [chartRows] = await pool.query(
    `SELECT
       DATE_FORMAT(COALESCE(i.issued_date, o.order_date), '${dateFormatPattern}') AS period,
       COALESCE(SUM(o.total_amount), 0) AS revenue,
       COUNT(o.id) AS order_count
     FROM orders o
     LEFT JOIN invoices i ON i.order_id = o.id
     ${approvedWhereClause}
     GROUP BY period
     ORDER BY period ASC`,
    dateParams
  );

  // 4. Truy vấn Top sản phẩm bán chạy nhất (chỉ tính từ các đơn APPROVED)
  const [topProductRows] = await pool.query(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       b.name AS brand_name,
       c.name AS category_name,
       p.image_url,
       SUM(od.quantity) AS total_quantity_sold,
       SUM(od.subtotal) AS total_revenue,
       p.stock_quantity AS current_stock
     FROM order_details od
     INNER JOIN orders o ON o.id = od.order_id
     LEFT JOIN invoices i ON i.order_id = o.id
     INNER JOIN products p ON p.id = od.product_id
     INNER JOIN brands b ON b.id = p.brand_id
     INNER JOIN categories c ON c.id = p.category_id
     ${approvedWhereClause}
     GROUP BY p.id, p.name, b.name, c.name, p.image_url, p.stock_quantity
     ORDER BY total_revenue DESC, total_quantity_sold DESC
     LIMIT 10`,
    dateParams
  );

  return sendSuccess(res, 200, 'Lấy báo cáo thống kê doanh thu thành công', {
    filters: {
      from_date: fromDate,
      to_date: toDate,
      group_by: normalizedGroupBy,
    },
    kpis: {
      total_revenue: Number(kpiOrderRow.total_revenue || 0),
      approved_orders_count: Number(kpiOrderRow.approved_orders_count || 0),
      pending_orders_count: Number(kpiOrderRow.pending_orders_count || 0),
      cancelled_orders_count: Number(kpiOrderRow.cancelled_orders_count || 0),
      total_orders_count: Number(kpiOrderRow.total_orders_count || 0),
      total_items_sold: Number(itemsSoldRow.total_items_sold || 0),
    },
    revenue_chart: chartRows.map((row) => ({
      period: row.period,
      label: formatPeriodLabel(row.period, normalizedGroupBy),
      revenue: Number(row.revenue),
      order_count: Number(row.order_count),
    })),
    top_products: topProductRows.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      brand_name: row.brand_name,
      category_name: row.category_name,
      image_url: row.image_url,
      total_quantity_sold: Number(row.total_quantity_sold),
      total_revenue: Number(row.total_revenue),
      current_stock: Number(row.current_stock),
    })),
  });
});

module.exports = {
  getReportSummary,
};
