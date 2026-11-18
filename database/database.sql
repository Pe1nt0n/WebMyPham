-- =====================================================================================
-- ĐỒ ÁN MÔN HỌC: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG THÔNG TIN
-- ĐỀ TÀI: WEBSITE BÁN MỸ PHẨM TRỰC TUYẾN & HỆ THỐNG QUẢN LÝ BÁN HÀNG (LUMIÈRE COSMETICS)
-- HỆ QUẢN TRỊ CSDL: MySQL 8.0+ (Engine: InnoDB | Charset: utf8mb4_unicode_ci)
-- MÔ TẢ: Kịch bản khởi tạo cấu trúc 8 bảng chuẩn hóa 3NF, ràng buộc toàn vẹn, chỉ mục
--        và dữ liệu mẫu thực tế phục vụ chạy thử nghiệm & báo cáo đồ án.
-- LƯU Ý TÀI KHOẢN MẪU: Tất cả 7 tài khoản đều có mật khẩu là '123456' (Bcrypt 10 rounds)
-- =====================================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS cosmetic_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cosmetic_store;

-- =====================================================================================
-- 1. XÓA BẢNG CŨ THEO THỨ TỰ KHÓA NGOẠI (ĐẢM BẢO IMPORT LẠI NHIỀU LẦN KHÔNG LỖI)
-- =====================================================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================================
-- 2. KHỞI TẠO CẤU TRÚC 8 BẢNG CƠ SỞ DỮ LIỆU CHUẨN HÓA
-- =====================================================================================

-- 2.1. Bảng vai trò phân quyền (roles)
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name ENUM('ADMIN', 'SALES_STAFF', 'CUSTOMER') NOT NULL UNIQUE,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2. Bảng người dùng hệ thống (users)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    address VARCHAR(255) NULL,
    role_id INT NOT NULL,
    status ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_users_role_id (role_id),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3. Bảng danh mục mỹ phẩm (categories)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4. Bảng thương hiệu mỹ phẩm (brands)
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    origin VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5. Bảng sản phẩm mỹ phẩm (products)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    brand_id INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    volume VARCHAR(50) NULL,
    skin_type VARCHAR(100) NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    status ENUM('ACTIVE', 'HIDDEN') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_products_price
        CHECK (price >= 0),
    CONSTRAINT chk_products_stock_quantity
        CHECK (stock_quantity >= 0),
    INDEX idx_products_category_id (category_id),
    INDEX idx_products_brand_id (brand_id),
    INDEX idx_products_name (name),
    INDEX idx_products_skin_type (skin_type),
    INDEX idx_products_status_price (status, price),
    INDEX idx_products_status_created_at (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.6. Bảng đơn đặt hàng (orders)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    staff_id INT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
    shipping_address VARCHAR(255) NOT NULL,
    payment_method ENUM('COD', 'BANK_TRANSFER', 'E_WALLET') NOT NULL DEFAULT 'COD',
    note VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPROVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_orders_staff
        FOREIGN KEY (staff_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_orders_total_amount
        CHECK (total_amount >= 0),
    INDEX idx_orders_customer_id (customer_id),
    INDEX idx_orders_staff_id (staff_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.7. Bảng chi tiết đơn hàng (order_details)
CREATE TABLE order_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(14,2) NOT NULL,
    CONSTRAINT uq_order_details_order_product
        UNIQUE (order_id, product_id),
    CONSTRAINT fk_order_details_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_order_details_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_order_details_quantity
        CHECK (quantity > 0),
    CONSTRAINT chk_order_details_unit_price
        CHECK (unit_price >= 0),
    CONSTRAINT chk_order_details_subtotal
        CHECK (subtotal >= 0 AND subtotal = quantity * unit_price),
    INDEX idx_order_details_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.8. Bảng hóa đơn bán lẻ (invoices)
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_code VARCHAR(30) NOT NULL UNIQUE,
    order_id INT NOT NULL UNIQUE,
    issued_by INT NOT NULL,
    issued_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(14,2) NOT NULL,
    note VARCHAR(255) NULL,
    CONSTRAINT fk_invoices_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_issued_by
        FOREIGN KEY (issued_by) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_invoices_total_amount
        CHECK (total_amount >= 0),
    INDEX idx_invoices_issued_by (issued_by),
    INDEX idx_invoices_issued_date (issued_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================================
-- 3. NẠP DỮ LIỆU MẪU CHUẨN HÓA (SEED DATA)
-- =====================================================================================

-- 3.1. Dữ liệu bảng roles (3 vai trò)
INSERT INTO roles (id, role_name, description) VALUES
(1, 'ADMIN', 'Quản trị viên hệ thống: Quản lý tài khoản người dùng và phân quyền truy cập'),
(2, 'SALES_STAFF', 'Nhân viên bán hàng: Quản lý mỹ phẩm, tồn kho, xử lý đơn hàng, xuất hóa đơn và thống kê doanh thu'),
(3, 'CUSTOMER', 'Khách hàng thành viên: Mua sắm mỹ phẩm trực tuyến và theo dõi lịch sử đơn hàng');

-- 3.2. Dữ liệu bảng users (7 tài khoản - Mật khẩu chung: '123456')
-- Hash bcrypt thật (10 rounds, đã kiểm chứng bcrypt.compareSync('123456', hash) === true):
-- $2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW
INSERT INTO users (id, username, password_hash, full_name, email, phone, address, role_id, status, created_at) VALUES
(1, 'admin', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Phạm Hoàng Nam', 'admin@lumiere-cosmetics.vn', '0901234567', '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', 1, 'ACTIVE', '2026-08-01 08:00:00'),
(2, 'nhanvien', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Trần Thị Minh Thư', 'nhanvien@lumiere-cosmetics.vn', '0902345678', '120 Nguyễn Thị Minh Khai, Phường Võ Thị Sáu, Quận 3, TP.HCM', 2, 'ACTIVE', '2026-08-05 08:30:00'),
(3, 'nhanvien2', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Lê Hoàng Gia Huy', 'nhanvien2@lumiere-cosmetics.vn', '0903456789', '86 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', 2, 'ACTIVE', '2026-08-10 09:00:00'),
(4, 'khachhang', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Nguyễn Thảo Vy', 'thaovy.nguyen@gmail.com', '0912345678', '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 3, 'ACTIVE', '2026-08-20 09:15:00'),
(5, 'minhanh', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Võ Ngọc Minh Anh', 'minhanh.vo@gmail.com', '0918765432', '215 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM', 3, 'ACTIVE', '2026-09-02 14:20:00'),
(6, 'quocbao', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Đặng Trần Quốc Bảo', 'quocbao.dang@gmail.com', '0938112233', '102 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 3, 'ACTIVE', '2026-09-10 16:45:00'),
(7, 'khachbikhoa', '$2a$10$qkFVDstA/xn1ye8YUCNWvewBQhzGt.OHpFl.Eq3k3E699ohhXNLiW', 'Huỳnh Thanh Tùng', 'thanhtung.huynh@gmail.com', '0977554433', '58 Cách Mạng Tháng Tám, Phường 6, Quận 3, TP.HCM', 3, 'LOCKED', '2026-09-12 11:00:00');

-- 3.3. Dữ liệu bảng categories (5 danh mục)
INSERT INTO categories (id, name, description) VALUES
(1, 'Chăm sóc da', 'Sữa rửa mặt, nước tẩy trang, toner, tinh chất serum và kem dưỡng ẩm chuyên sâu'),
(2, 'Trang điểm', 'Kem nền, phấn nước cushion, son môi, phấn phủ và trang điểm mắt chuyên nghiệp'),
(3, 'Chống nắng', 'Kem chống nắng, sữa chống nắng và gel chống nắng bảo vệ da phổ rộng SPF50+ PA++++'),
(4, 'Nước hoa', 'Nước hoa cao cấp Eau De Parfum & Eau De Toilette lưu hương tinh tế, sang trọng'),
(5, 'Chăm sóc cơ thể & tóc', 'Tẩy tế bào chết cơ thể, sữa dưỡng thể, tinh chất và xịt dưỡng tóc phục hồi');

-- 3.4. Dữ liệu bảng brands (10 thương hiệu thực tế)
INSERT INTO brands (id, name, origin) VALUES
(1, 'La Roche-Posay', 'Pháp'),
(2, 'L''Oréal Paris', 'Pháp'),
(3, 'Innisfree', 'Hàn Quốc'),
(4, '3CE', 'Hàn Quốc'),
(5, 'Anessa', 'Nhật Bản'),
(6, 'Paula''s Choice', 'Mỹ'),
(7, 'Cocoon', 'Việt Nam'),
(8, 'Laneige', 'Hàn Quốc'),
(9, 'The Ordinary', 'Canada'),
(10, 'Dior', 'Pháp');

-- 3.5. Dữ liệu bảng products (20 sản phẩm thực tế, SP #8 tồn kho = 2, SP #12 tồn kho = 0)
INSERT INTO products (id, name, category_id, brand_id, price, stock_quantity, volume, skin_type, description, image_url, status, created_at) VALUES
(1, 'Kem Chống Nắng La Roche-Posay Anthelios UVMune 400 Oil Control Fluid SPF50+', 3, 1, 485000.00, 35, '50ml', 'Da dầu mụn', 'Sữa chống nắng kiểm soát dầu nhờn suốt 12 giờ với màng lọc độc quyền Mexoryl 400 giúp bảo vệ làn da tối ưu trước tia UVA bước sóng dài và ngăn ngừa thâm sạm.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-25 08:00:00'),
(2, 'Nước Tẩy Trang La Roche-Posay Micellar Water Ultra Sensitive Skin', 1, 1, 435000.00, 42, '400ml', 'Da nhạy cảm', 'Nước làm sạch sâu lớp trang điểm, bụi mịn PM2.5 và bã nhờn ứng dụng công nghệ Glyco Micellar kết hợp nước khoáng La Roche-Posay làm dịu da nhạy cảm.', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-25 08:10:00'),
(3, 'Tinh Chất Cấp Ẩm L''Oréal Paris Revitalift Hyaluronic Acid 1.5% Serum', 1, 2, 379000.00, 28, '30ml', 'Da khô', 'Sự kết hợp giữa Macro và Micro Hyaluronic Acid 1.5% giúp cấp nước tức thì, làm đầy rãnh nhăn li ti và mang lại làn da căng bóng, đàn hồi rạng rỡ.', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-26 09:00:00'),
(4, 'Kem Nền Lâu Trôi L''Oréal Paris Infallible 32H Fresh Wear SPF25', 2, 2, 329000.00, 24, '30ml', 'Da hỗn hợp', 'Kem nền che phủ cao nhưng mỏng nhẹ thoáng da với công nghệ Oxygen, bền màu suốt 32 giờ, kháng nước mồ hôi và tích hợp Vitamin C giúp lớp nền tươi sáng.', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-26 09:30:00'),
(5, 'Tinh Chất Trà Xanh Innisfree Green Tea Seed Hyaluronic Serum', 1, 3, 560000.00, 30, '80ml', 'Da hỗn hợp', 'Tinh chất dưỡng ẩm thế hệ mới chiết xuất từ trà xanh Beauty Green Tea đảo Jeju và Hyaluronic Acid bọc nang giúp cân bằng độ ẩm sâu ngay sau bước làm sạch.', 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-27 10:00:00'),
(6, 'Kem Chống Nắng Nâng Tông Innisfree Tone Up No Sebum Sunscreen EX SPF50+', 3, 3, 320000.00, 25, '50ml', 'Da dầu mụn', 'Kem chống nắng vật lý kiềm dầu hiệu quả suốt ngày dài, nâng tông hồng tự nhiên có thể dùng thay kem lót trang điểm hằng ngày cho làn da dầu lỗ chân lông to.', 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-27 10:15:00'),
(7, 'Son Kem Lì Mịn Môi 3CE Velvet Lip Tint Màu Daffodil Đỏ Đất', 2, 4, 295000.00, 45, '4g', 'Mọi loại da', 'Chất son kem nhung mịn lướt nhẹ trên môi, che phủ vân môi hoàn hảo với sắc đỏ đất Daffodil tôn da, phù hợp cả phong cách trang điểm tự nhiên lẫn dự tiệc.', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-28 11:00:00'),
(8, 'Son Kem Bóng Mờ 3CE Blur Water Tint Màu Laydown Hồng Đào Trầm', 2, 4, 315000.00, 2, '4.6g', 'Mọi loại da', 'Son tint nước thế hệ mới tiệp vào môi nhẹ tênh như sương mờ, không lem trôi ra khẩu trang và giữ đôi môi mềm mại nhiều giờ liền. (Mặt hàng sắp hết kho).', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-28 11:30:00'),
(9, 'Sữa Chống Nắng Anessa Perfect UV Sunscreen Skincare Milk SPF50+ PA++++', 3, 5, 595000.00, 26, '60ml', 'Da dầu mụn', 'Sữa chống nắng cao cấp Nhật Bản ứng dụng công nghệ Auto Booster tự động gia tăng màng chắn UV khi gặp nhiệt, độ ẩm và mồ hôi cùng 50% thành phần dưỡng da.', 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-29 08:45:00'),
(10, 'Gel Chống Nắng Dịu Nhẹ Anessa Moisture UV Sunscreen Mild Gel SPF35 PA+++', 3, 5, 495000.00, 20, '90g', 'Da nhạy cảm', 'Gel chống nắng vật lý không cồn, không hương liệu, không paraben, cấp ẩm dịu nhẹ và an toàn tuyệt đối cho làn da nhạy cảm hoặc da đang treatment.', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-29 09:15:00'),
(11, 'Dung Dịch Loại Bỏ Tế Bào Chết Paula''s Choice Skin Perfecting 2% BHA Liquid Exfoliant', 1, 6, 810000.00, 15, '118ml', 'Da dầu mụn', 'Sản phẩm tẩy tế bào chết hóa học biểu tượng chứa 2% Salicylic Acid và chiết xuất trà xanh giúp làm sạch sâu lỗ chân lông, đẩy mụn ẩn và cải thiện bề mặt da.', 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-30 14:00:00'),
(12, 'Tinh Chất Thu Nhỏ Lỗ Chân Lông Paula''s Choice Clinical Niacinamide 20% Treatment', 1, 6, 1350000.00, 0, '20ml', 'Da hỗn hợp', 'Tinh chất đặc trị nồng độ cao 20% Niacinamide kết hợp Vitamin C và chiết xuất rau sam giúp cải thiện lỗ chân lông giãn nở, da sần vỏ cam và không đều màu. (Tạm hết hàng).', 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-08-30 14:30:00'),
(13, 'Tẩy Da Chết Cơ Thể Cà Phê Đắk Lắk Cocoon Cho Làn Da Mềm Mịn Rạng Rỡ', 5, 7, 165000.00, 60, '200ml', 'Mọi loại da', 'Sự hòa quyện giữa hạt cà phê Đắk Lắk nguyên chất xay nhuyễn và bơ ca cao Tiền Giang giúp lấy đi lớp tế bào chết sần sùi, mang lại làn da cơ thể mướt mịn.', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-01 09:00:00'),
(14, 'Nước Dưỡng Tóc Tinh Dầu Bưởi Cocoon Giảm Gãy Rụng & Mềm Mượt Tóc', 5, 7, 165000.00, 50, '140ml', 'Mọi loại da', 'Xịt dưỡng tóc thuần chay kết hợp tinh dầu vỏ bưởi truyền thống Việt Nam, Xylishine và Vitamin B5 giúp giảm gãy rụng rõ rệt và nuôi dưỡng chân tóc chắc khỏe.', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-01 09:20:00'),
(15, 'Mặt Nạ Ngủ Môi Laneige Lip Sleeping Mask EX Hương Quả Mọng Berry', 1, 8, 450000.00, 32, '20g', 'Da khô', 'Mặt nạ ngủ dưỡng môi giàu Vitamin C và chiết xuất các loại quả mọng Berry Mix Complex giúp làm mềm lớp da khô bong tróc suốt đêm, trả lại đôi môi căng mọng.', 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-02 10:00:00'),
(16, 'Phấn Nước Kiềm Dầu Laneige Neo Cushion Matte SPF42 PA++ Tông 21N', 2, 8, 890000.00, 16, '15g', 'Da dầu mụn', 'Cushion thế hệ mới với hạt phấn siêu mịn che phủ khuyết điểm và lỗ chân lông suốt 24 giờ, kiềm dầu vượt trội trong thời tiết nóng ẩm mà không bị xuống tông.', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-02 10:30:00'),
(17, 'Tinh Chất Giảm Thâm Mụn The Ordinary Niacinamide 10% + Zinc 1%', 1, 9, 265000.00, 38, '30ml', 'Da dầu mụn', 'Công thức tối giản chứa 10% Niacinamide (Vitamin B3) và 1% PCA Zinc giúp điều tiết dầu thừa, làm dịu nốt mụn sưng đỏ và làm mờ vết thâm sau mụn hiệu quả.', 'https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-03 15:00:00'),
(18, 'Tinh Chất Dưỡng Dày Tóc The Ordinary Multi-Peptide Serum For Hair Density', 5, 9, 540000.00, 19, '60ml', 'Mọi loại da', 'Serum chăm sóc da đầu cô đặc kết hợp phức hợp Peptide REDENSYL, Procapil và Caffeine thẩm thấu nhanh không gây bết tóc, hỗ trợ mái tóc dày và bồng bềnh hơn.', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-03 15:30:00'),
(19, 'Nước Hoa Nữ Dior J''adore Eau De Parfum Sang Trọng Quyến Rũ', 4, 10, 2650000.00, 12, '50ml', 'Mọi loại da', 'Biểu tượng hương hoa cỏ sang trọng của nhà mốt Dior với sự hòa quyện tinh tế giữa hoa ngọc lan tây Comoros, hoa hồng Damask và hoa nhài Grasse quý phái.', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-04 11:00:00'),
(20, 'Nước Hoa Nữ Miss Dior Blooming Bouquet Eau De Toilette Tinh Khôi', 4, 10, 2850000.00, 10, '50ml', 'Mọi loại da', 'Tựa như một bó hoa xuân mới nở với nốt hương cam Bergamot tươi mát mở đầu, tầng hương giữa ngọt ngào của hoa mẫu đơn và hoa hồng trên nền xạ hương trắng thanh lịch.', 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80', 'ACTIVE', '2026-09-04 11:30:00');

-- 3.6. Dữ liệu bảng orders (8 đơn hàng rải qua 09/2026, 10/2026, 11/2026)
-- Gồm: 4 đơn APPROVED (#1, #2, #3, #5), 1 đơn CANCELLED (#4), 3 đơn PENDING (#6, #7, #8)
INSERT INTO orders (id, customer_id, staff_id, recipient_name, recipient_phone, order_date, total_amount, shipping_address, payment_method, note, status) VALUES
(1, 4, 2, 'Nguyễn Thảo Vy', '0912345678', '2026-09-15 09:15:00', 1235000.00, '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 'COD', 'Giao trong giờ hành chính', 'APPROVED'),
(2, 5, 2, 'Võ Ngọc Minh Anh', '0918765432', '2026-10-06 14:10:00', 1340000.00, '215 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM', 'BANK_TRANSFER', 'Đã chuyển khoản qua Vietcombank', 'APPROVED'),
(3, 6, 3, 'Đặng Trần Quốc Bảo', '0938112233', '2026-10-22 19:05:00', 3145000.00, '102 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 'E_WALLET', 'Nhờ shop gói hộp quà sinh nhật kèm thiệp', 'APPROVED'),
(4, 5, 3, 'Võ Ngọc Minh Anh', '0918765432', '2026-10-28 11:20:00', 760000.00, '215 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM', 'COD', 'Khách hàng liên hệ hủy đơn để đổi sang dòng sản phẩm khác', 'CANCELLED'),
(5, 4, 2, 'Nguyễn Thảo Vy', '0912345678', '2026-11-08 10:00:00', 1780000.00, '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 'BANK_TRANSFER', 'Giao buổi sáng trước 11h30', 'APPROVED'),
(6, 4, NULL, 'Nguyễn Thảo Vy', '0912345678', '2026-11-16 14:20:00', 935000.00, '45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM', 'COD', 'Gửi tại quầy lễ tân tòa nhà nếu mình đang họp', 'PENDING'),
(7, 6, NULL, 'Đặng Trần Quốc Bảo', '0938112233', '2026-11-17 16:45:00', 3029000.00, '102 Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP.HCM', 'BANK_TRANSFER', 'Nhờ shop bọc chống sốc kỹ chai nước hoa thủy tinh', 'PENDING'),
(8, 5, NULL, 'Võ Ngọc Minh Anh', '0918765432', '2026-11-18 08:30:00', 1110000.00, '215 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM', 'COD', 'Mua chung với bạn cùng phòng, giao trước 17h', 'PENDING');

-- 3.7. Dữ liệu bảng order_details (Chi tiết mặt hàng khớp chính xác 100% với orders.total_amount)
INSERT INTO order_details (id, order_id, product_id, quantity, unit_price, subtotal) VALUES
-- Đơn #1 (APPROVED): 485,000 + 435,000 + 315,000 = 1,235,000
(1, 1, 1, 1, 485000.00, 485000.00),
(2, 1, 2, 1, 435000.00, 435000.00),
(3, 1, 8, 1, 315000.00, 315000.00),
-- Đơn #2 (APPROVED): 810,000 + 530,000 = 1,340,000
(4, 2, 11, 1, 810000.00, 810000.00),
(5, 2, 17, 2, 265000.00, 530000.00),
-- Đơn #3 (APPROVED): 2,850,000 + 295,000 = 3,145,000
(6, 3, 20, 1, 2850000.00, 2850000.00),
(7, 3, 7, 1, 295000.00, 295000.00),
-- Đơn #4 (CANCELLED): 595,000 + 165,000 = 760,000
(8, 4, 9, 1, 595000.00, 595000.00),
(9, 4, 13, 1, 165000.00, 165000.00),
-- Đơn #5 (APPROVED): 560,000 + 890,000 + 330,000 = 1,780,000
(10, 5, 5, 1, 560000.00, 560000.00),
(11, 5, 16, 1, 890000.00, 890000.00),
(12, 5, 14, 2, 165000.00, 330000.00),
-- Đơn #6 (PENDING - Đủ tồn kho): 485,000 + 450,000 = 935,000
(13, 6, 1, 1, 485000.00, 485000.00),
(14, 6, 15, 1, 450000.00, 450000.00),
-- Đơn #7 (PENDING - Đủ tồn kho): 2,650,000 + 379,000 = 3,029,000
(15, 7, 19, 1, 2650000.00, 2650000.00),
(16, 7, 3, 1, 379000.00, 379000.00),
-- Đơn #8 (PENDING - Đặt 3 SP #8 khi kho chỉ còn 2 để demo chặn duyệt thiếu kho): 945,000 + 165,000 = 1,110,000
(17, 8, 8, 3, 315000.00, 945000.00),
(18, 8, 13, 1, 165000.00, 165000.00);

-- 3.8. Dữ liệu bảng invoices (Đúng 4 hóa đơn tương ứng 1-1 với 4 đơn APPROVED #1, #2, #3, #5)
-- Tổng doanh thu APPROVED = 1,235,000 + 1,340,000 + 3,145,000 + 1,780,000 = 7,500,000 VNĐ
INSERT INTO invoices (id, invoice_code, order_id, issued_by, issued_date, total_amount, note) VALUES
(1, 'HD-20260915-0001', 1, 2, '2026-09-15 10:30:00', 1235000.00, 'Xuất hóa đơn bán lẻ đơn hàng #1'),
(2, 'HD-20261006-0002', 2, 2, '2026-10-06 15:00:00', 1340000.00, 'Đã đối soát chuyển khoản Vietcombank - Xuất hóa đơn đơn #2'),
(3, 'HD-20261022-0003', 3, 3, '2026-10-22 19:45:00', 3145000.00, 'Thanh toán ví điện tử - Đóng gói hộp quà cao cấp đơn #3'),
(4, 'HD-20261108-0005', 5, 2, '2026-11-08 11:15:00', 1780000.00, 'Xuất hóa đơn bán lẻ đơn hàng #5');
