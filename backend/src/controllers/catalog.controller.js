/**
 * Controller Phân hệ Catalog Công khai (/api/categories, /api/brands, /api/products)
 * Phục vụ khách hàng tra cứu danh mục, thương hiệu, tìm kiếm, lọc khoảng giá, loại da và sắp xếp mỹ phẩm.
 */
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  parseFiniteNumber,
  parseBoundedInt,
  escapeLikeKeyword,
} = require('../utils/validators');

/**
 * GET /api/categories — Danh sách danh mục mỹ phẩm kèm số lượng sản phẩm ACTIVE & danh sách brand_ids
 */
const getCategories = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.description,
            COUNT(p.id) AS product_count,
            GROUP_CONCAT(DISTINCT p.brand_id) AS brand_ids
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.status = 'ACTIVE'
     GROUP BY c.id, c.name, c.description
     ORDER BY c.id ASC`
  );

  const data = rows.map((row) => ({
    ...row,
    product_count: Number(row.product_count),
    brand_ids: row.brand_ids ? String(row.brand_ids).split(',').map(Number) : [],
  }));

  return sendSuccess(res, 200, 'Lấy danh sách danh mục mỹ phẩm thành công', data);
});

/**
 * GET /api/brands — Danh sách thương hiệu mỹ phẩm kèm xuất xứ, số lượng sản phẩm ACTIVE & category_ids
 */
const getBrands = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT b.id, b.name, b.origin,
            COUNT(p.id) AS product_count,
            GROUP_CONCAT(DISTINCT p.category_id) AS category_ids
     FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id AND p.status = 'ACTIVE'
     GROUP BY b.id, b.name, b.origin
     ORDER BY b.id ASC`
  );

  const data = rows.map((row) => ({
    ...row,
    product_count: Number(row.product_count),
    category_ids: row.category_ids ? String(row.category_ids).split(',').map(Number) : [],
  }));

  return sendSuccess(res, 200, 'Lấy danh sách thương hiệu thành công', data);
});

/**
 * GET /api/products — Tìm kiếm, lọc đa tiêu chí và sắp xếp danh sách mỹ phẩm
 * - Khách vãng lai & CUSTOMER luôn chỉ thấy sản phẩm status = 'ACTIVE'.
 * - Chỉ khi SALES_STAFF / ADMIN gửi token hợp lệ kèm include_hidden=true mới trả thêm SP 'HIDDEN'.
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category_id,
    brand_id,
    skin_type,
    min_price,
    max_price,
    sort = 'newest',
    include_hidden,
  } = req.query;

  const conditions = [];
  const params = [];

  // Kiểm tra quyền xem sản phẩm ẩn (HIDDEN)
  const canViewHidden =
    (include_hidden === 'true' || include_hidden === '1') &&
    req.user &&
    ['SALES_STAFF', 'ADMIN'].includes(req.user.role_name);

  if (!canViewHidden) {
    conditions.push("p.status = 'ACTIVE'");
  }

  // Lọc theo từ khóa (escape an toàn ký tự %, _ của toán tử LIKE)
  if (search !== undefined && String(search).trim() !== '') {
    if (typeof search !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Từ khóa tìm kiếm (search) không hợp lệ.');
    }
    const keyword = `%${escapeLikeKeyword(search, 200)}%`;
    conditions.push(
      "(p.name LIKE ? ESCAPE '\\\\' OR b.name LIKE ? ESCAPE '\\\\' OR p.description LIKE ? ESCAPE '\\\\')"
    );
    params.push(keyword, keyword, keyword);
  }

  // Lọc theo danh mục
  if (category_id !== undefined && String(category_id).trim() !== '') {
    const catId = parseBoundedInt(category_id, 'Mã danh mục (category_id)', { min: 1 });
    conditions.push('p.category_id = ?');
    params.push(catId);
  }

  // Lọc theo thương hiệu
  if (brand_id !== undefined && String(brand_id).trim() !== '') {
    const brId = parseBoundedInt(brand_id, 'Mã thương hiệu (brand_id)', { min: 1 });
    conditions.push('p.brand_id = ?');
    params.push(brId);
  }

  // Lọc theo loại da
  if (skin_type !== undefined && String(skin_type).trim() !== '') {
    if (typeof skin_type !== 'string' || skin_type.trim().length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Tham số loại da (skin_type) không hợp lệ.');
    }
    conditions.push('p.skin_type = ?');
    params.push(skin_type.trim());
  }

  // Lọc theo khoảng giá tối thiểu - tối đa (chặn Infinity, NaN, số âm hoặc vượt ngưỡng DECIMAL)
  let minVal = null;
  let maxVal = null;

  if (min_price !== undefined && String(min_price).trim() !== '') {
    minVal = parseFiniteNumber(min_price, 'Giá tối thiểu (min_price)', {
      min: 0,
      max: 9999999999.99,
    });
    conditions.push('p.price >= ?');
    params.push(minVal);
  }

  if (max_price !== undefined && String(max_price).trim() !== '') {
    maxVal = parseFiniteNumber(max_price, 'Giá tối đa (max_price)', {
      min: 0,
      max: 9999999999.99,
    });
    conditions.push('p.price <= ?');
    params.push(maxVal);
  }

  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Giá tối thiểu (min_price) không được lớn hơn giá tối đa (max_price).'
    );
  }

  // Xử lý thứ tự sắp xếp an toàn (chống SQL Injection bằng whitelist)
  let orderByClause = 'p.created_at DESC, p.id DESC';
  if (sort === 'price_asc') {
    orderByClause = 'p.price ASC, p.id DESC';
  } else if (sort === 'price_desc') {
    orderByClause = 'p.price DESC, p.id DESC';
  }

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

  return sendSuccess(res, 200, 'Lấy danh sách sản phẩm thành công', data);
});

/**
 * GET /api/products/:id — Chi tiết 1 sản phẩm mỹ phẩm
 */
const getProductById = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId) || productId <= 0 || productId > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm theo mã yêu cầu.');
  }

  const [rows] = await pool.query(
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

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm mỹ phẩm này.');
  }

  const product = rows[0];
  const isStaffOrAdmin = req.user && ['SALES_STAFF', 'ADMIN'].includes(req.user.role_name);

  // Khách hàng thường không được xem sản phẩm đã ẩn (HIDDEN)
  if (product.status === 'HIDDEN' && !isStaffOrAdmin) {
    throw new AppError(
      404,
      'NOT_FOUND',
      'Sản phẩm này không tồn tại hoặc hiện đang tạm ngừng kinh doanh.'
    );
  }

  return sendSuccess(res, 200, 'Lấy thông tin chi tiết sản phẩm thành công', {
    ...product,
    price: Number(product.price),
    stock_quantity: Number(product.stock_quantity),
  });
});

module.exports = {
  getCategories,
  getBrands,
  getProducts,
  getProductById,
};
