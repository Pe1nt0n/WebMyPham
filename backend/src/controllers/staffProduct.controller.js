/**
 * Controller Quản lý Sản phẩm & Tồn kho dành cho Nhân viên Bán hàng (/api/staff/products)
 * Bao gồm: Tra cứu kho (cả ACTIVE & HIDDEN, lọc sắp hết hàng / hết hàng), thêm mới,
 * cập nhật thông tin / nhập kho (Transaction FOR UPDATE chống Lost Update),
 * và xóa an toàn bảo toàn khóa ngoại (Soft-Hide vs Hard-Delete).
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  SAFE_HTTP_URL_REGEX,
  readRequiredString,
  readOptionalString,
  parseFiniteNumber,
  parseBoundedInt,
  escapeLikeKeyword,
  safeRollback,
} = require('../utils/validators');

const ALLOWED_PRODUCT_STATUSES = ['ACTIVE', 'HIDDEN'];
const ALLOWED_STOCK_FILTERS = ['out_of_stock', 'low_stock', 'in_stock'];

/**
 * Truy vấn đầy đủ 1 sản phẩm kèm tên danh mục & thương hiệu
 */
async function fetchProductDetailById(productId, queryExecutor = pool) {
  const [rows] = await queryExecutor.query(
    `SELECT p.id, p.name,
            p.category_id, c.name AS category_name,
            p.brand_id, b.name AS brand_name, b.origin AS brand_origin,
            p.price, p.stock_quantity, p.volume, p.skin_type,
            p.description, p.image_url, p.status, p.created_at
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     INNER JOIN brands b ON b.id = p.brand_id
     WHERE p.id = ?
     LIMIT 1`,
    [productId]
  );
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    price: Number(rows[0].price),
    stock_quantity: Number(rows[0].stock_quantity),
  };
}

/**
 * Kiểm tra sự tồn tại của danh mục và thương hiệu trước khi lưu sản phẩm
 */
async function verifyCategoryAndBrand(categoryId, brandId, queryExecutor = pool) {
  const [[category]] = await queryExecutor.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [
    categoryId,
  ]);
  if (!category) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Danh mục mỹ phẩm được chọn không tồn tại.');
  }

  const [[brand]] = await queryExecutor.query('SELECT id FROM brands WHERE id = ? LIMIT 1', [
    brandId,
  ]);
  if (!brand) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Thương hiệu mỹ phẩm được chọn không tồn tại.');
  }
}

/**
 * GET /api/staff/products — Danh sách toàn bộ mỹ phẩm trong kho (cả ACTIVE và HIDDEN)
 */
const getStaffProducts = asyncHandler(async (req, res) => {
  const { search, category_id, brand_id, status, stock_filter, sort } = req.query;
  const conditions = [];
  const params = [];

  if (search !== undefined && String(search).trim() !== '') {
    if (typeof search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm không hợp lệ.');
    }
    const keyword = `%${escapeLikeKeyword(search, 200)}%`;
    conditions.push(
      "(p.name LIKE ? ESCAPE '\\\\' OR b.name LIKE ? ESCAPE '\\\\' OR c.name LIKE ? ESCAPE '\\\\')"
    );
    params.push(keyword, keyword, keyword);
  }

  if (category_id !== undefined && String(category_id).trim() !== '') {
    const catId = parseBoundedInt(category_id, 'Mã danh mục (category_id)', { min: 1 });
    conditions.push('p.category_id = ?');
    params.push(catId);
  }

  if (brand_id !== undefined && String(brand_id).trim() !== '') {
    const brId = parseBoundedInt(brand_id, 'Mã thương hiệu (brand_id)', { min: 1 });
    conditions.push('p.brand_id = ?');
    params.push(brId);
  }

  if (status !== undefined && String(status).trim() !== '') {
    const normalizedStatus = String(status).trim().toUpperCase();
    if (!ALLOWED_PRODUCT_STATUSES.includes(normalizedStatus)) {
      throw new AppError(400, 'VALIDATION_ERROR', "Trạng thái sản phẩm chỉ nhận 'ACTIVE' hoặc 'HIDDEN'.");
    }
    conditions.push('p.status = ?');
    params.push(normalizedStatus);
  }

  if (stock_filter !== undefined && String(stock_filter).trim() !== '') {
    const sf = String(stock_filter).trim().toLowerCase();
    if (!ALLOWED_STOCK_FILTERS.includes(sf)) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        "Bộ lọc tồn kho (stock_filter) chỉ chấp nhận 'out_of_stock', 'low_stock' hoặc 'in_stock'."
      );
    }
    if (sf === 'out_of_stock') {
      conditions.push('p.stock_quantity = 0');
    } else if (sf === 'low_stock') {
      conditions.push('(p.stock_quantity > 0 AND p.stock_quantity <= 5)');
    } else if (sf === 'in_stock') {
      conditions.push('p.stock_quantity > 5');
    }
  }

  let orderByClause = 'p.created_at DESC, p.id DESC';
  if (sort === 'price_asc') orderByClause = 'p.price ASC, p.id DESC';
  else if (sort === 'price_desc') orderByClause = 'p.price DESC, p.id DESC';
  else if (sort === 'stock_asc') orderByClause = 'p.stock_quantity ASC, p.id ASC';

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT p.id, p.name,
            p.category_id, c.name AS category_name,
            p.brand_id, b.name AS brand_name, b.origin AS brand_origin,
            p.price, p.stock_quantity, p.volume, p.skin_type,
            p.description, p.image_url, p.status, p.created_at
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     INNER JOIN brands b ON b.id = p.brand_id
     ${whereSql}
     ORDER BY ${orderByClause}`,
    params
  );

  const data = rows.map((row) => ({
    ...row,
    price: Number(row.price),
    stock_quantity: Number(row.stock_quantity),
  }));

  return sendSuccess(res, 200, 'Lấy danh sách tồn kho sản phẩm thành công', data);
});

/**
 * POST /api/staff/products — Thêm sản phẩm mỹ phẩm mới
 */
const createProduct = asyncHandler(async (req, res) => {
  const errors = [];

  const name = readRequiredString(req.body?.name, 'Tên sản phẩm mỹ phẩm', 200, errors);
  const categoryId = parseBoundedInt(req.body?.category_id, 'Danh mục mỹ phẩm', {
    min: 1,
    errors,
  });
  const brandId = parseBoundedInt(req.body?.brand_id, 'Thương hiệu mỹ phẩm', {
    min: 1,
    errors,
  });
  const price = parseFiniteNumber(req.body?.price, 'Giá bán sản phẩm', {
    min: 0,
    max: 9999999999.99,
    errors,
  });
  const stockQuantity =
    req.body?.stock_quantity !== undefined
      ? parseBoundedInt(req.body.stock_quantity, 'Số lượng tồn kho', {
          min: 0,
          max: 1000000,
          errors,
        })
      : 0;

  const volume = readOptionalString(req.body?.volume, 'Dung tích / Trọng lượng', 50, errors);
  const parsedSkinType = readOptionalString(req.body?.skin_type, 'Loại da phù hợp', 100, errors);
  const skinType = parsedSkinType || 'Mọi loại da';
  const description = readOptionalString(req.body?.description, 'Mô tả sản phẩm', 5000, errors);
  const imageUrl = readOptionalString(req.body?.image_url, 'Đường dẫn hình ảnh', 500, errors);

  if (imageUrl && !SAFE_HTTP_URL_REGEX.test(imageUrl)) {
    errors.push("Đường dẫn hình ảnh (image_url) phải bắt đầu bằng 'http://' hoặc 'https://'.");
  }

  let status = 'ACTIVE';
  if (req.body?.status !== undefined && req.body?.status !== null) {
    if (typeof req.body.status !== 'string') {
      errors.push("Trạng thái sản phẩm chỉ chấp nhận 'ACTIVE' hoặc 'HIDDEN'.");
    } else if (req.body.status.trim() !== '') {
      status = req.body.status.trim().toUpperCase();
    }
  }
  if (!ALLOWED_PRODUCT_STATUSES.includes(status)) {
    errors.push("Trạng thái sản phẩm chỉ chấp nhận 'ACTIVE' hoặc 'HIDDEN'.");
  }

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
  }

  await verifyCategoryAndBrand(categoryId, brandId);

  const [result] = await pool.query(
    `INSERT INTO products
       (name, category_id, brand_id, price, stock_quantity, volume, skin_type, description, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      categoryId,
      brandId,
      price,
      stockQuantity,
      volume,
      skinType,
      description,
      imageUrl,
      status,
    ]
  );

  const createdProduct = await fetchProductDetailById(result.insertId);
  return sendSuccess(res, 201, 'Thêm sản phẩm mới thành công', createdProduct);
});

/**
 * PUT /api/staff/products/:id — Cập nhật thông tin sản phẩm / nhập kho / đổi trạng thái hiển thị
 * Sử dụng Transaction + SELECT ... FOR UPDATE để chống Race Condition "Lost Update" ghi đè tồn kho
 * khi có nhân viên khác đang duyệt hoặc hủy đơn hàng chứa cùng sản phẩm.
 */
const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0 || productId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã sản phẩm không hợp lệ.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Khóa bản ghi sản phẩm hiện tại để đọc giá trị mới nhất (chống Lost Update trên stock_quantity)
    const [lockedRows] = await connection.query(
      'SELECT * FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (lockedRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm cần cập nhật.');
    }

    const existing = lockedRows[0];
    const errors = [];

    const name =
      req.body?.name !== undefined
        ? readRequiredString(req.body.name, 'Tên sản phẩm', 200, errors)
        : existing.name;

    const categoryId =
      req.body?.category_id !== undefined
        ? parseBoundedInt(req.body.category_id, 'Mã danh mục (category_id)', { min: 1, errors })
        : existing.category_id;

    const brandId =
      req.body?.brand_id !== undefined
        ? parseBoundedInt(req.body.brand_id, 'Mã thương hiệu (brand_id)', { min: 1, errors })
        : existing.brand_id;

    const price =
      req.body?.price !== undefined
        ? parseFiniteNumber(req.body.price, 'Giá bán sản phẩm', {
            min: 0,
            max: 9999999999.99,
            errors,
          })
        : Number(existing.price);

    const stockQuantity =
      req.body?.stock_quantity !== undefined
        ? parseBoundedInt(req.body.stock_quantity, 'Số lượng tồn kho', {
            min: 0,
            max: 1000000,
            errors,
          })
        : Number(existing.stock_quantity);

    const volume =
      req.body?.volume !== undefined
        ? readOptionalString(req.body.volume, 'Dung tích / Trọng lượng', 50, errors)
        : existing.volume;

    const skinType =
      req.body?.skin_type !== undefined
        ? readOptionalString(req.body.skin_type, 'Loại da phù hợp', 100, errors)
        : existing.skin_type;

    const description =
      req.body?.description !== undefined
        ? readOptionalString(req.body.description, 'Mô tả sản phẩm', 5000, errors)
        : existing.description;

    const imageUrl =
      req.body?.image_url !== undefined
        ? readOptionalString(req.body.image_url, 'Đường dẫn hình ảnh', 500, errors)
        : existing.image_url;

    if (req.body?.image_url !== undefined && imageUrl && !SAFE_HTTP_URL_REGEX.test(imageUrl)) {
      errors.push("Đường dẫn hình ảnh (image_url) phải bắt đầu bằng 'http://' hoặc 'https://'.");
    }

    let status = existing.status;
    if (req.body?.status !== undefined) {
      if (typeof req.body.status !== 'string' || !req.body.status.trim()) {
        errors.push("Trạng thái hiển thị chỉ chấp nhận 'ACTIVE' hoặc 'HIDDEN'.");
      } else {
        status = req.body.status.trim().toUpperCase();
        if (!ALLOWED_PRODUCT_STATUSES.includes(status)) {
          errors.push("Trạng thái hiển thị chỉ chấp nhận 'ACTIVE' hoặc 'HIDDEN'.");
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(400, 'VALIDATION_ERROR', errors[0], errors);
    }

    await verifyCategoryAndBrand(categoryId, brandId, connection);

    await connection.query(
      `UPDATE products
       SET name = ?, category_id = ?, brand_id = ?, price = ?, stock_quantity = ?,
           volume = ?, skin_type = ?, description = ?, image_url = ?, status = ?
       WHERE id = ?`,
      [
        name,
        categoryId,
        brandId,
        price,
        stockQuantity,
        volume,
        skinType,
        description,
        imageUrl,
        status,
        productId,
      ]
    );

    const updatedProduct = await fetchProductDetailById(productId, connection);
    await connection.commit();

    return sendSuccess(res, 200, 'Cập nhật sản phẩm thành công', updatedProduct);
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

/**
 * DELETE /api/staff/products/:id — Xóa sản phẩm an toàn bảo toàn toàn vẹn Khóa ngoại (Foreign Key Safety)
 * Giải thích nghiệp vụ thuyết trình:
 *   - Khóa bản ghi sản phẩm (FOR UPDATE) để chống xung đột TOCTOU với đơn đặt hàng mới.
 *   - Nếu đã xuất hiện trong order_details (hoặc gặp ràng buộc khóa ngoại 1451) -> chuyển 'HIDDEN' (SOFT_HIDDEN).
 *   - Nếu chưa từng có giao dịch -> xóa vật lý (DELETED).
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0 || productId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Mã sản phẩm không hợp lệ.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [lockedRows] = await connection.query(
      'SELECT id FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (lockedRows.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm cần xóa.');
    }

    const [[usageRow]] = await connection.query(
      'SELECT COUNT(*) AS count FROM order_details WHERE product_id = ?',
      [productId]
    );

    if (Number(usageRow.count) > 0) {
      await connection.query("UPDATE products SET status = 'HIDDEN' WHERE id = ?", [productId]);
      await connection.commit();

      return sendSuccess(
        res,
        200,
        'Sản phẩm đã phát sinh trong đơn hàng nên được chuyển sang trạng thái Ẩn (HIDDEN) để bảo toàn lịch sử giao dịch.',
        {
          id: productId,
          action: 'SOFT_HIDDEN',
          status: 'HIDDEN',
        }
      );
    }

    try {
      await connection.query('DELETE FROM products WHERE id = ?', [productId]);
      await connection.commit();

      return sendSuccess(res, 200, 'Đã xóa sản phẩm khỏi hệ thống.', {
        id: productId,
        action: 'DELETED',
      });
    } catch (delErr) {
      // Dự phòng nếu giao dịch đặt hàng đồng thời vừa chèn khóa ngoại (errno 1451)
      if (delErr && (delErr.code === 'ER_ROW_IS_REFERENCED_2' || delErr.errno === 1451)) {
        await connection.query("UPDATE products SET status = 'HIDDEN' WHERE id = ?", [productId]);
        await connection.commit();

        return sendSuccess(
          res,
          200,
          'Sản phẩm đã phát sinh trong đơn hàng nên được chuyển sang trạng thái Ẩn (HIDDEN) để bảo toàn lịch sử giao dịch.',
          {
            id: productId,
            action: 'SOFT_HIDDEN',
            status: 'HIDDEN',
          }
        );
      }
      throw delErr;
    }
  } catch (error) {
    await safeRollback(connection);
    throw error;
  } finally {
    connection.release();
  }
});

module.exports = {
  getStaffProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
