/**
 * Controller Phân hệ Đặt hàng dành cho Khách hàng (/api/orders — Role: CUSTOMER)
 * Xử lý: Tạo đơn đặt hàng mới ở trạng thái PENDING (chưa trừ tồn kho, tự lấy giá chuẩn từ DB),
 * xem danh sách lịch sử đơn hàng của bản thân và xem chi tiết từng đơn hàng.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  readRequiredString,
  readOptionalString,
  isNumericPrimitiveInput,
  safeRollback,
} = require('../utils/validators');

const ALLOWED_PAYMENT_METHODS = ['COD', 'BANK_TRANSFER', 'E_WALLET'];
const ALLOWED_ORDER_STATUSES = ['PENDING', 'APPROVED', 'CANCELLED'];
const MAX_ORDER_ITEMS = 50;
const MAX_TOTAL_AMOUNT = 999999999999.99; // Giới hạn cột DECIMAL(14,2)

/**
 * POST /api/orders — Khách hàng tạo đơn đặt hàng mới (status = 'PENDING')
 * Quy tắc nghiệp vụ quan trọng:
 *   1. Gộp số lượng nếu giỏ hàng gửi trùng product_id (giới hạn tối đa 50 dòng giỏ hàng).
 *   2. Chỉ cho phép đặt các sản phẩm đang ACTIVE và số lượng đặt <= stock_quantity hiện tại.
 *   3. Server tự lấy unit_price từ bảng products (tuyệt đối không tin giá từ client gửi lên).
 *   4. Sử dụng MySQL Transaction + Bulk Insert để ghi đồng thời bảng orders và order_details.
 *   5. KHÔNG trừ stock_quantity tại bước đặt hàng — tồn kho chỉ trừ khi Nhân viên duyệt sang APPROVED.
 */
const createOrder = asyncHandler(async (req, res) => {
  const errors = [];

  const recipientName = readRequiredString(
    req.body?.recipient_name,
    'Họ tên người nhận hàng',
    100,
    errors
  );
  const recipientPhone = readRequiredString(
    req.body?.recipient_phone,
    'Số điện thoại người nhận hàng',
    20,
    errors
  );
  const shippingAddress = readRequiredString(
    req.body?.shipping_address,
    'Địa chỉ giao hàng',
    255,
    errors
  );

  let paymentMethod = 'COD';
  if (req.body?.payment_method !== undefined && req.body?.payment_method !== null) {
    if (typeof req.body.payment_method !== 'string') {
      errors.push("Phương thức thanh toán chỉ chấp nhận 'COD', 'BANK_TRANSFER' hoặc 'E_WALLET'.");
    } else if (req.body.payment_method.trim() !== '') {
      paymentMethod = req.body.payment_method.trim().toUpperCase();
    }
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push("Phương thức thanh toán chỉ chấp nhận 'COD', 'BANK_TRANSFER' hoặc 'E_WALLET'.");
  }

  const note = readOptionalString(req.body?.note, 'Ghi chú đơn hàng', 255, errors);
  const rawItems = req.body?.items;

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.push('Giỏ hàng đặt mua phải có ít nhất 1 sản phẩm.');
  } else if (rawItems.length > MAX_ORDER_ITEMS) {
    errors.push(`Mỗi đơn hàng chỉ cho phép đặt tối đa ${MAX_ORDER_ITEMS} dòng sản phẩm.`);
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  // Cộng gộp số lượng nếu client gửi trùng product_id trong cùng 1 đơn (kiểm tra kiểu nguyên dương nghiêm ngặt)
  const mergedItemsMap = new Map();
  for (const item of rawItems) {
    if (!item || typeof item !== 'object') {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Dữ liệu mặt hàng trong giỏ hàng không hợp lệ.'
      );
    }

    if (!isNumericPrimitiveInput(item.product_id) || !isNumericPrimitiveInput(item.quantity)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Mỗi mặt hàng trong đơn phải có mã sản phẩm (product_id) và số lượng (quantity > 0) nguyên dương.'
      );
    }

    const prodId = Number(typeof item.product_id === 'string' ? item.product_id.trim() : item.product_id);
    const qty = Number(typeof item.quantity === 'string' ? item.quantity.trim() : item.quantity);

    if (
      !Number.isInteger(prodId) ||
      prodId <= 0 ||
      prodId > 2147483647 ||
      !Number.isInteger(qty) ||
      qty <= 0 ||
      qty > 100000
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Mỗi mặt hàng trong đơn phải có mã sản phẩm (product_id) và số lượng (quantity > 0) nguyên dương hợp lệ.'
      );
    }

    mergedItemsMap.set(prodId, (mergedItemsMap.get(prodId) || 0) + qty);
  }

  const productIds = Array.from(mergedItemsMap.keys());
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 2. Truy vấn thông tin giá bán và tồn kho thực tế của các sản phẩm từ CSDL
    const [productRows] = await connection.query(
      `SELECT id, name, price, stock_quantity, image_url, status
       FROM products
       WHERE id IN (?)`,
      [productIds]
    );

    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const preparedDetails = [];
    let totalAmount = 0;

    for (const [prodId, requestedQty] of mergedItemsMap.entries()) {
      const dbProduct = productMap.get(prodId);

      if (!dbProduct || dbProduct.status !== 'ACTIVE') {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          `Sản phẩm (ID #${prodId}) không tồn tại hoặc đã tạm ngừng kinh doanh.`
        );
      }

      const availableStock = Number(dbProduct.stock_quantity);
      if (requestedQty > availableStock) {
        const stockMsg =
          availableStock === 0
            ? `Sản phẩm '${dbProduct.name}' hiện đã hết hàng trong kho.`
            : `Sản phẩm '${dbProduct.name}' chỉ còn ${availableStock} sản phẩm trong kho (bạn đang đặt ${requestedQty}).`;
        throw new AppError(400, 'INSUFFICIENT_STOCK', stockMsg);
      }

      const unitPrice = Number(dbProduct.price);
      const subtotal = Math.round(unitPrice * requestedQty * 100) / 100;
      totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;

      if (totalAmount > MAX_TOTAL_AMOUNT) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Tổng giá trị đơn hàng vượt quá hạn mức thanh toán trực tuyến cho phép.'
        );
      }

      preparedDetails.push({
        product_id: prodId,
        product_name: dbProduct.name,
        image_url: dbProduct.image_url,
        quantity: requestedQty,
        unit_price: unitPrice,
        subtotal,
      });
    }

    // 3. Ghi đơn hàng mới vào bảng orders (status = 'PENDING', staff_id = NULL, chưa trừ tồn kho)
    const [orderResult] = await connection.query(
      `INSERT INTO orders
         (customer_id, staff_id, recipient_name, recipient_phone, total_amount, shipping_address, payment_method, note, status)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        req.user.id,
        recipientName,
        recipientPhone,
        totalAmount,
        shippingAddress,
        paymentMethod,
        note,
      ]
    );

    const newOrderId = orderResult.insertId;

    // 4. Ghi hàng loạt chi tiết mặt hàng vào bảng order_details bằng 1 câu Bulk INSERT
    const detailValues = preparedDetails.map((detail) => [
      newOrderId,
      detail.product_id,
      detail.quantity,
      detail.unit_price,
      detail.subtotal,
    ]);

    await connection.query(
      `INSERT INTO order_details (order_id, product_id, quantity, unit_price, subtotal)
       VALUES ?`,
      [detailValues]
    );

    // Đọc lại bản ghi đơn hàng vừa tạo để có order_date chính xác từ MySQL
    const [[createdOrder]] = await connection.query('SELECT * FROM orders WHERE id = ?', [
      newOrderId,
    ]);

    await connection.commit();

    return sendSuccess(res, 201, 'Đặt hàng thành công! Đơn hàng đang chờ nhân viên xác nhận.', {
      id: createdOrder.id,
      customer_id: createdOrder.customer_id,
      staff_id: createdOrder.staff_id,
      recipient_name: createdOrder.recipient_name,
      recipient_phone: createdOrder.recipient_phone,
      order_date: createdOrder.order_date,
      total_amount: Number(createdOrder.total_amount),
      shipping_address: createdOrder.shipping_address,
      payment_method: createdOrder.payment_method,
      note: createdOrder.note,
      status: createdOrder.status,
      items: preparedDetails,
    });
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * GET /api/orders/my-orders — Lịch sử đơn hàng của khách hàng đang đăng nhập
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const conditions = ['o.customer_id = ?'];
  const params = [req.user.id];

  if (status !== undefined && String(status).trim() !== '') {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_ORDER_STATUSES.includes(normalizedStatus)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Trạng thái đơn hàng lọc không hợp lệ.');
    }
    conditions.push('o.status = ?');
    params.push(normalizedStatus);
  }

  const [orders] = await pool.query(
    `SELECT o.id, o.customer_id, o.staff_id,
            o.recipient_name, o.recipient_phone, o.order_date,
            o.total_amount, o.shipping_address, o.payment_method, o.note, o.status,
            i.id AS invoice_id, i.invoice_code
     FROM orders o
     LEFT JOIN invoices i ON i.order_id = o.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.order_date DESC, o.id DESC`,
    params
  );

  if (orders.length === 0) {
    return sendSuccess(res, 200, 'Lấy lịch sử đơn hàng thành công', []);
  }

  // Lấy toàn bộ chi tiết sản phẩm của các đơn hàng chỉ bằng 1 câu truy vấn (tránh N+1 query)
  const orderIds = orders.map((o) => o.id);
  const [detailRows] = await pool.query(
    `SELECT od.id, od.order_id, od.product_id,
            p.name AS product_name, b.name AS brand_name, p.volume, p.image_url,
            od.quantity, od.unit_price, od.subtotal
     FROM order_details od
     INNER JOIN products p ON p.id = od.product_id
     INNER JOIN brands b ON b.id = p.brand_id
     WHERE od.order_id IN (?)
     ORDER BY od.id ASC`,
    [orderIds]
  );

  const detailsByOrder = new Map();
  for (const row of detailRows) {
    if (!detailsByOrder.has(row.order_id)) {
      detailsByOrder.set(row.order_id, []);
    }
    detailsByOrder.get(row.order_id).push({
      id: row.id,
      product_id: row.product_id,
      product_name: row.product_name,
      brand_name: row.brand_name,
      volume: row.volume,
      image_url: row.image_url,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      subtotal: Number(row.subtotal),
    });
  }

  const data = orders.map((order) => {
    const items = detailsByOrder.get(order.id) || [];
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      ...order,
      total_amount: Number(order.total_amount),
      item_count: items.length,
      total_quantity: totalQuantity,
      items,
    };
  });

  return sendSuccess(res, 200, 'Lấy lịch sử đơn hàng thành công', data);
});

/**
 * GET /api/orders/my-orders/:id — Chi tiết 1 đơn hàng thuộc sở hữu của khách hàng đang đăng nhập
 */
const getMyOrderById = asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0 || orderId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong tài khoản của bạn.');
  }

  // Ràng buộc trực tiếp o.customer_id = req.user.id chống IDOR và chống dò tồn tại mã đơn của khách khác
  const [orderRows] = await pool.query(
    `SELECT o.*, s.full_name AS staff_name
     FROM orders o
     LEFT JOIN users s ON s.id = o.staff_id
     WHERE o.id = ? AND o.customer_id = ?
     LIMIT 1`,
    [orderId, req.user.id]
  );

  if (orderRows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng trong tài khoản của bạn.');
  }

  const order = orderRows[0];

  const [itemRows] = await pool.query(
    `SELECT od.id, od.product_id,
            p.name AS product_name, b.name AS brand_name, p.volume, p.image_url,
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
    invoice_code: invoice ? invoice.invoice_code : null,
    invoice,
    items: itemRows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      subtotal: Number(row.subtotal),
    })),
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById,
};
