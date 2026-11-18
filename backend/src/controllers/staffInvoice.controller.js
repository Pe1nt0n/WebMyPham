/**
 * Controller Quản lý & Xuất Phiếu In Hóa đơn Bán lẻ (/api/staff/invoices — Role: SALES_STAFF)
 * Hỗ trợ lọc khoảng ngày linh hoạt cả chuẩn YYYY-MM-DD lẫn DD/MM/YYYY,
 * tìm kiếm theo mã hóa đơn / mã đơn / khách hàng / nhân viên lập phiếu và trả dữ liệu chuẩn in ấn.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateRange } = require('../utils/dateParser');
const { sendSuccess } = require('../utils/response');
const { escapeLikeKeyword } = require('../utils/validators');

const STORE_INFO = {
  name: 'LUMIÈRE COSMETICS VIETNAM',
  address: '273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh',
  hotline: '1900 6886',
  email: 'contact@lumiere-cosmetics.vn',
  website: 'www.lumiere-cosmetics.vn',
};

/**
 * GET /api/staff/invoices — Danh sách hóa đơn bán lẻ
 */
const getInvoices = asyncHandler(async (req, res) => {
  const { from_date, to_date, search } = req.query;
  const { fromDate, toDate } = parseDateRange(from_date, to_date);

  const conditions = [];
  const params = [];

  // Lọc ngày SARGable giúp tận dụng trực tiếp B-Tree Index idx_invoices_issued_date
  if (fromDate) {
    conditions.push('i.issued_date >= ?');
    params.push(`${fromDate} 00:00:00`);
  }

  if (toDate) {
    conditions.push('i.issued_date <= ?');
    params.push(`${toDate} 23:59:59`);
  }

  if (search !== undefined && String(search).trim() !== '') {
    if (typeof search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm hóa đơn không hợp lệ.');
    }
    const rawSearch = search.trim();
    const numericOrderId = rawSearch.replace(/^#/, '');
    const keyword = `%${escapeLikeKeyword(rawSearch, 200)}%`;

    if (/^\d+$/.test(numericOrderId) && Number.isSafeInteger(Number(numericOrderId))) {
      conditions.push(
        "(i.invoice_code LIKE ? ESCAPE '\\\\' OR i.order_id = ? OR o.recipient_name LIKE ? ESCAPE '\\\\' OR o.recipient_phone LIKE ? ESCAPE '\\\\' OR s.full_name LIKE ? ESCAPE '\\\\')"
      );
      params.push(keyword, Number(numericOrderId), keyword, keyword, keyword);
    } else {
      conditions.push(
        "(i.invoice_code LIKE ? ESCAPE '\\\\' OR o.recipient_name LIKE ? ESCAPE '\\\\' OR o.recipient_phone LIKE ? ESCAPE '\\\\' OR s.full_name LIKE ? ESCAPE '\\\\')"
      );
      params.push(keyword, keyword, keyword, keyword);
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT i.id, i.invoice_code, i.order_id,
            o.status AS order_status, o.recipient_name, o.recipient_phone, o.payment_method,
            i.issued_by, s.full_name AS issued_by_name,
            i.issued_date, i.total_amount, i.note
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN users s ON s.id = i.issued_by
     ${whereSql}
     ORDER BY i.issued_date DESC, i.id DESC`,
    params
  );

  const data = rows.map((row) => ({
    ...row,
    total_amount: Number(row.total_amount),
  }));

  return sendSuccess(res, 200, 'Lấy danh sách hóa đơn thành công', data);
});

/**
 * GET /api/staff/invoices/:id — Chi tiết đầy đủ 1 Hóa đơn bán lẻ (Phục vụ xem phiếu in / xuất PDF)
 */
const getInvoiceById = asyncHandler(async (req, res) => {
  const rawParam = String(req.params.id).trim();
  const isNumericId =
    /^\d+$/.test(rawParam) &&
    Number.isSafeInteger(Number(rawParam)) &&
    Number(rawParam) > 0 &&
    Number(rawParam) <= 2147483647;

  const [rows] = await pool.query(
    `SELECT i.id AS invoice_id, i.invoice_code, i.order_id, i.issued_date,
            i.total_amount AS invoice_total_amount, i.note AS invoice_note,
            s.id AS staff_id, s.username AS staff_username, s.full_name AS staff_full_name,
            s.email AS staff_email, s.phone AS staff_phone,
            c.id AS customer_id, c.full_name AS customer_name, c.email AS customer_email,
            o.recipient_name, o.recipient_phone, o.shipping_address, o.payment_method,
            o.order_date, o.status AS order_status, o.note AS order_note
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN users s ON s.id = i.issued_by
     INNER JOIN users c ON c.id = o.customer_id
     WHERE ${isNumericId ? 'i.id = ?' : 'i.invoice_code = ?'}
     LIMIT 1`,
    [isNumericId ? Number(rawParam) : rawParam.slice(0, 30)]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy hóa đơn bán lẻ theo yêu cầu.');
  }

  const header = rows[0];

  const [itemRows] = await pool.query(
    `SELECT od.id, od.product_id,
            p.name AS product_name, b.name AS brand_name, p.volume,
            od.quantity, od.unit_price, od.subtotal
     FROM order_details od
     INNER JOIN products p ON p.id = od.product_id
     INNER JOIN brands b ON b.id = p.brand_id
     WHERE od.order_id = ?
     ORDER BY od.id ASC`,
    [header.order_id]
  );

  return sendSuccess(res, 200, 'Lấy chi tiết phiếu hóa đơn thành công', {
    store_info: STORE_INFO,
    invoice: {
      id: header.invoice_id,
      invoice_code: header.invoice_code,
      order_id: header.order_id,
      issued_date: header.issued_date,
      total_amount: Number(header.invoice_total_amount),
      note: header.invoice_note,
    },
    staff: {
      id: header.staff_id,
      username: header.staff_username,
      full_name: header.staff_full_name,
      email: header.staff_email,
      phone: header.staff_phone,
    },
    customer: {
      customer_id: header.customer_id,
      customer_name: header.customer_name,
      customer_email: header.customer_email,
      recipient_name: header.recipient_name,
      recipient_phone: header.recipient_phone,
      shipping_address: header.shipping_address,
      payment_method: header.payment_method,
      order_date: header.order_date,
      order_status: header.order_status,
      order_note: header.order_note,
    },
    items: itemRows.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      brand_name: item.brand_name,
      volume: item.volume,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    })),
  });
});

module.exports = {
  getInvoices,
  getInvoiceById,
};
