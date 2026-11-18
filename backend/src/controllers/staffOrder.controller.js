/**
 * Controller Xử lý Đơn hàng & Transaction Kho - Hóa đơn (/api/staff/orders — Role: SALES_STAFF)
 * Trái tim nghiệp vụ của hệ thống Quản lý bán hàng:
 *   1. Tra cứu & kiểm tra tồn kho từng mặt hàng trước khi duyệt.
 *   2. Transaction Duyệt đơn (PENDING -> APPROVED): Khóa bản ghi FOR UPDATE theo thứ tự ID tăng dần,
 *      kiểm tra đủ tồn kho lũy kế, trừ kho nguyên tử (atomic) và tự động phát hành Hóa đơn bán lẻ (invoices).
 *   3. Transaction Hủy đơn (PENDING/APPROVED -> CANCELLED):
 *      - Nếu hủy từ PENDING: Chỉ đổi trạng thái, KHÔNG cộng kho.
 *      - Nếu hủy từ APPROVED: Khóa sản phẩm FOR UPDATE, cộng hoàn trả lại đúng số lượng tồn kho
 *        và đóng dấu kiểm toán [ĐÃ HỦY ĐƠN - HOÀN KHO] vào ghi chú hóa đơn.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateRange } = require('../utils/dateParser');
const { sendSuccess } = require('../utils/response');
const {
  readOptionalString,
  escapeLikeKeyword,
  safeRollback,
} = require('../utils/validators');

const ALLOWED_ORDER_STATUSES = ['PENDING', 'APPROVED', 'CANCELLED'];

/**
 * Sinh mã hóa đơn bán lẻ chuẩn HD-YYYYMMDD-XXXX theo đúng múi giờ Việt Nam (UTC+7)
 */
function buildInvoiceCode(orderId, dateObj = new Date()) {
  // Quy đổi thời điểm sang UTC+7 để đồng nhất ngày phát hành trên mọi hệ điều hành / server
  const vnTime = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = vnTime.getUTCFullYear();
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getUTCDate()).padStart(2, '0');
  const paddedOrderId = String(orderId).padStart(4, '0');
  return `HD-${yyyy}${mm}${dd}-${paddedOrderId}`;
}

/**
 * GET /api/staff/orders — Danh sách đơn hàng toàn cửa hàng kèm bộ lọc trạng thái, từ khóa, ngày đặt
 */
const getStaffOrders = asyncHandler(async (req, res) => {
  const { status, search, from_date, to_date } = req.query;
  const { fromDate, toDate } = parseDateRange(from_date, to_date);

  const conditions = [];
  const params = [];

  if (status !== undefined && String(status).trim() !== '') {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_ORDER_STATUSES.includes(normalizedStatus)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Trạng thái đơn hàng lọc không hợp lệ.');
    }
    conditions.push('o.status = ?');
    params.push(normalizedStatus);
  }

  if (search !== undefined && String(search).trim() !== '') {
    if (typeof search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm không hợp lệ.');
    }
    const rawSearch = search.trim();
    const numericId = rawSearch.replace(/^#/, '');
    const keyword = `%${escapeLikeKeyword(rawSearch, 200)}%`;

    if (/^\d+$/.test(numericId) && Number.isSafeInteger(Number(numericId))) {
      conditions.push(
        "(o.id = ? OR o.recipient_name LIKE ? ESCAPE '\\\\' OR o.recipient_phone LIKE ? ESCAPE '\\\\' OR c.full_name LIKE ? ESCAPE '\\\\' OR c.username LIKE ? ESCAPE '\\\\' OR i.invoice_code LIKE ? ESCAPE '\\\\')"
      );
      params.push(Number(numericId), keyword, keyword, keyword, keyword, keyword);
    } else {
      conditions.push(
        "(o.recipient_name LIKE ? ESCAPE '\\\\' OR o.recipient_phone LIKE ? ESCAPE '\\\\' OR c.full_name LIKE ? ESCAPE '\\\\' OR c.username LIKE ? ESCAPE '\\\\' OR i.invoice_code LIKE ? ESCAPE '\\\\')"
      );
      params.push(keyword, keyword, keyword, keyword, keyword);
    }
  }

  // Lọc khoảng thời gian SARGable để tận dụng trực tiếp B-Tree Index idx_orders_order_date
  if (fromDate) {
    conditions.push('o.order_date >= ?');
    params.push(`${fromDate} 00:00:00`);
  }

  if (toDate) {
    conditions.push('o.order_date <= ?');
    params.push(`${toDate} 23:59:59`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT o.id,
            o.customer_id, c.username AS customer_username, c.full_name AS customer_name,
            o.staff_id, s.full_name AS staff_name,
            o.recipient_name, o.recipient_phone, o.order_date,
            o.total_amount, o.shipping_address, o.payment_method, o.note, o.status,
            (SELECT COUNT(*) FROM order_details od WHERE od.order_id = o.id) AS item_count,
            i.id AS invoice_id, i.invoice_code
     FROM orders o
     INNER JOIN users c ON c.id = o.customer_id
     LEFT JOIN users s ON s.id = o.staff_id
     LEFT JOIN invoices i ON i.order_id = o.id
     ${whereSql}
     ORDER BY o.order_date DESC, o.id DESC`,
    params
  );

  const data = rows.map((row) => ({
    ...row,
    total_amount: Number(row.total_amount),
    item_count: Number(row.item_count),
  }));

  return sendSuccess(res, 200, 'Lấy danh sách đơn hàng thành công', data);
});

/**
 * GET /api/staff/orders/:id — Chi tiết đơn hàng kèm tồn kho thực tế (current_stock) của từng mặt hàng
 */
const getStaffOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0 || orderId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã đơn hàng không hợp lệ.');
  }

  const [orderRows] = await pool.query(
    `SELECT o.*,
            c.username AS customer_username, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
            s.username AS staff_username, s.full_name AS staff_name
     FROM orders o
     INNER JOIN users c ON c.id = o.customer_id
     LEFT JOIN users s ON s.id = o.staff_id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId]
  );

  if (orderRows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng theo mã yêu cầu.');
  }

  const order = orderRows[0];

  const [itemRows] = await pool.query(
    `SELECT od.id, od.product_id,
            p.name AS product_name, b.name AS brand_name, p.volume, p.image_url,
            p.stock_quantity AS current_stock,
            od.quantity, od.unit_price, od.subtotal
     FROM order_details od
     INNER JOIN products p ON p.id = od.product_id
     INNER JOIN brands b ON b.id = p.brand_id
     WHERE od.order_id = ?
     ORDER BY od.id ASC`,
    [orderId]
  );

  const [invoiceRows] = await pool.query(
    `SELECT id, invoice_code, order_id, issued_by, issued_date, total_amount, note
     FROM invoices
     WHERE order_id = ?
     LIMIT 1`,
    [orderId]
  );

  const invoice = invoiceRows[0]
    ? {
        ...invoiceRows[0],
        total_amount: Number(invoiceRows[0].total_amount),
      }
    : null;

  return sendSuccess(res, 200, 'Lấy chi tiết đơn hàng thành công', {
    ...order,
    total_amount: Number(order.total_amount),
    invoice,
    items: itemRows.map((row) => {
      const qty = Number(row.quantity);
      const currentStock = Number(row.current_stock);
      return {
        ...row,
        quantity: qty,
        current_stock: currentStock,
        is_stock_sufficient: currentStock >= qty,
        unit_price: Number(row.unit_price),
        subtotal: Number(row.subtotal),
      };
    }),
  });
});

/**
 * PATCH /api/staff/orders/:id/approve — Duyệt đơn hàng (PENDING -> APPROVED)
 */
const approveOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0 || orderId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã đơn hàng không hợp lệ.');
  }

  const customNote = readOptionalString(req.body?.note, 'Ghi chú duyệt đơn', 255);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Bước 1: Khóa bản ghi đơn hàng trong suốt quá trình giao dịch
    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng cần duyệt.');
    }

    const order = orderRows[0];

    // Bước 2: Kiểm tra quy trình chuyển trạng thái hợp lệ (chỉ duyệt đơn đang PENDING)
    if (order.status !== 'PENDING') {
      const statusLabel = order.status === 'APPROVED' ? 'đã được duyệt trước đó' : 'đã bị hủy';
      throw new AppError(
        400,
        'INVALID_ORDER_STATUS',
        `Không thể duyệt vì đơn hàng #${orderId} ${statusLabel}.`
      );
    }

    // Bước 3: Lấy danh sách chi tiết mặt hàng của đơn và khóa các sản phẩm theo thứ tự ID tăng dần (chống Deadlock)
    const [detailRows] = await connection.query(
      'SELECT product_id, quantity FROM order_details WHERE order_id = ? ORDER BY product_id ASC',
      [orderId]
    );

    if (detailRows.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Đơn hàng không có mặt hàng chi tiết để duyệt.');
    }

    const productIds = Array.from(new Set(detailRows.map((d) => d.product_id)));
    const [lockedProducts] = await connection.query(
      'SELECT id, name, stock_quantity FROM products WHERE id IN (?) ORDER BY id ASC FOR UPDATE',
      [productIds]
    );

    const stockMap = new Map(
      lockedProducts.map((p) => [
        p.id,
        { id: p.id, name: p.name, remainingStock: Number(p.stock_quantity) },
      ])
    );

    // Bước 4: Kiểm tra tồn kho lũy kế của TOÀN BỘ mặt hàng trước khi thực hiện trừ kho
    for (const detail of detailRows) {
      const prod = stockMap.get(detail.product_id);
      if (!prod) {
        throw new AppError(
          404,
          'NOT_FOUND',
          `Sản phẩm ID #${detail.product_id} trong đơn hàng không còn tồn tại.`
        );
      }

      const requiredQty = Number(detail.quantity);
      if (prod.remainingStock < requiredQty) {
        throw new AppError(
          400,
          'INSUFFICIENT_STOCK',
          `Không đủ tồn kho để duyệt đơn: Sản phẩm '${prod.name}' cần ${requiredQty} nhưng trong kho chỉ còn ${prod.remainingStock}.`
        );
      }

      prod.remainingStock -= requiredQty;
    }

    // Bước 5: Trừ số lượng tồn kho tương ứng cho từng sản phẩm theo đúng thứ tự product_id tăng dần
    for (const detail of detailRows) {
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [Number(detail.quantity), detail.product_id]
      );
    }

    // Bước 6: Cập nhật trạng thái đơn sang APPROVED và lưu nhân viên xử lý
    await connection.query(
      "UPDATE orders SET status = 'APPROVED', staff_id = ? WHERE id = ?",
      [req.user.id, orderId]
    );

    // Bước 7: Tự động phát hành Hóa đơn bán lẻ (invoices) tương ứng 1-1 với đơn hàng
    const issuedDate = new Date();
    const invoiceCode = buildInvoiceCode(orderId, issuedDate);
    const invoiceNote = customNote || `Xuất hóa đơn bán lẻ đơn hàng #${orderId}`;

    const [invoiceResult] = await connection.query(
      `INSERT INTO invoices (invoice_code, order_id, issued_by, issued_date, total_amount, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceCode, orderId, req.user.id, issuedDate, Number(order.total_amount), invoiceNote]
    );

    const [[createdInvoice]] = await connection.query(
      'SELECT id, invoice_code, order_id, issued_by, issued_date, total_amount, note FROM invoices WHERE id = ?',
      [invoiceResult.insertId]
    );

    // Bước 8: Chốt toàn bộ thay đổi vào CSDL
    await connection.commit();

    return sendSuccess(
      res,
      200,
      `Duyệt đơn hàng thành công! Đã trừ tồn kho và phát hành hóa đơn ${invoiceCode}.`,
      {
        order_id: orderId,
        status: 'APPROVED',
        staff_id: req.user.id,
        invoice: {
          ...createdInvoice,
          total_amount: Number(createdInvoice.total_amount),
        },
      }
    );
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/staff/orders/:id/cancel — Hủy đơn hàng & Xử lý hoàn kho thông minh theo trạng thái gốc
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0 || orderId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã đơn hàng không hợp lệ.');
  }

  const rawReason = req.body?.reason ?? req.body?.note;
  const cancelReason = readOptionalString(rawReason, 'Lý do hủy đơn', 200) || '';

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Bước 1: Khóa bản ghi đơn hàng
    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ? FOR UPDATE',
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng cần hủy.');
    }

    const order = orderRows[0];

    if (order.status === 'CANCELLED') {
      throw new AppError(400, 'INVALID_ORDER_STATUS', 'Đơn hàng này đã ở trạng thái hủy.');
    }

    const previousStatus = order.status;
    let restocked = false;

    // Xây dựng ghi chú đơn hàng mới (giới hạn 255 ký tự theo cột VARCHAR(255))
    let updatedOrderNote = order.note || null;
    if (cancelReason) {
      updatedOrderNote = order.note
        ? `${order.note} | Lý do hủy: ${cancelReason}`.slice(0, 255)
        : `Lý do hủy: ${cancelReason}`.slice(0, 255);
    }

    if (previousStatus === 'PENDING') {
      // Kịch bản A: Hủy đơn chờ duyệt -> KHÔNG cộng kho
      await connection.query(
        "UPDATE orders SET status = 'CANCELLED', staff_id = ?, note = ? WHERE id = ?",
        [req.user.id, updatedOrderNote, orderId]
      );
    } else if (previousStatus === 'APPROVED') {
      // Kịch bản B: Hủy đơn đã duyệt -> Khóa sản phẩm theo ID tăng dần & Cộng hoàn lại tồn kho + Đóng dấu hủy hóa đơn
      const [detailRows] = await connection.query(
        'SELECT product_id, quantity FROM order_details WHERE order_id = ? ORDER BY product_id ASC',
        [orderId]
      );

      if (detailRows.length > 0) {
        const productIds = Array.from(new Set(detailRows.map((d) => d.product_id)));
        await connection.query(
          'SELECT id FROM products WHERE id IN (?) ORDER BY id ASC FOR UPDATE',
          [productIds]
        );

        for (const detail of detailRows) {
          await connection.query(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [Number(detail.quantity), detail.product_id]
          );
        }
      }

      await connection.query(
        "UPDATE orders SET status = 'CANCELLED', note = ? WHERE id = ?",
        [updatedOrderNote, orderId]
      );

      // Cập nhật ghi chú kiểm toán trên hóa đơn liên kết (invoices.note)
      const [invoiceRows] = await connection.query(
        'SELECT id, note FROM invoices WHERE order_id = ? FOR UPDATE',
        [orderId]
      );

      if (invoiceRows.length > 0) {
        const invoice = invoiceRows[0];
        const auditBadge = cancelReason
          ? `[ĐÃ HỦY ĐƠN - HOÀN KHO] Lý do: ${cancelReason}`
          : '[ĐÃ HỦY ĐƠN - HOÀN KHO]';
        const nextInvoiceNote = invoice.note
          ? `${auditBadge} | ${invoice.note}`.slice(0, 255)
          : auditBadge.slice(0, 255);

        await connection.query('UPDATE invoices SET note = ? WHERE id = ?', [
          nextInvoiceNote,
          invoice.id,
        ]);
      }

      restocked = true;
    }

    await connection.commit();

    const message = restocked
      ? 'Đã hủy đơn hàng và hoàn lại số lượng tồn kho thành công.'
      : 'Đã hủy đơn hàng chờ duyệt thành công.';

    return sendSuccess(res, 200, message, {
      order_id: orderId,
      previous_status: previousStatus,
      status: 'CANCELLED',
      restocked,
    });
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getStaffOrders,
  getStaffOrderById,
  approveOrder,
  cancelOrder,
};
