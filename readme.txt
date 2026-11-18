========================================================================================
                     TRƯỜNG ĐẠI HỌC SÀI GÒN (SAIGON UNIVERSITY)
                           KHOA CÔNG NGHỆ THÔNG TIN
========================================================================================
              ĐỒ ÁN MÔN HỌC: PHÂN TÍCH THIẾT KẾ HỆ THỐNG THÔNG TIN
    ĐỀ TÀI: WEBSITE BÁN MỸ PHẨM & QUẢN LÝ BÁN HÀNG - LUMIÈRE COSMETICS (PHƯƠNG ÁN A)
========================================================================================

1. THÔNG TIN ĐỒ ÁN & DANH SÁCH NHÓM SINH VIÊN THỰC HIỆN
----------------------------------------------------------------------------------------
- Trường            : Trường Đại học Sài Gòn (SGU) - Khoa Công nghệ Thông tin
- Học phần          : Phân tích thiết kế hệ thống thông tin (Mã HP: 841109)
- Đề tài            : Website Bán Mỹ Phẩm & Quản Lý Bán Hàng (Phương án A - Mua hàng)
- Nhóm môn học      : Nhóm ......  | Tổ thực hành: ......
- Giảng viên HD     : ThS./TS. .........................................................
- Học kỳ / Năm học  : Học kỳ I - Năm học 2026 - 2027

BẢNG PHÂN CÔNG VÀ ĐÁNH GIÁ KHỐI LƯỢNG CÔNG VIỆC NHÓM (SINH VIÊN ĐIỀN TRƯỚC KHI NỘP):
+-----+--------------+------------------------------+------------------+---------------+
| STT |     MSSV     |        Họ và tên SV          | Khối lượng CV(%) |    Ghi chú    |
+-----+--------------+------------------------------+------------------+---------------+
|  1  |              |                              |        %         | Nhóm trưởng   |
+-----+--------------+------------------------------+------------------+---------------+
|  2  |              |                              |        %         | Thành viên    |
+-----+--------------+------------------------------+------------------+---------------+
|  3  |              |                              |        %         | Thành viên    |
+-----+--------------+------------------------------+------------------+---------------+
|  4  |              |                              |        %         | Thành viên    |
+-----+--------------+------------------------------+------------------+---------------+
|  5  |              |                              |        %         | Thành viên    |
+-----+--------------+------------------------------+------------------+---------------+
| TỔNG CỘNG                                         |      100%        |               |
+---------------------------------------------------+------------------+---------------+


2. CẤU TRÚC THƯ MỤC BÀN GIAO ĐỒ ÁN
----------------------------------------------------------------------------------------
WebMyPham/
|-- database/
|   `-- database.sql            : Kịch bản SQL chuẩn MySQL 8.0 (InnoDB, utf8mb4_unicode_ci)
|                                 khởi tạo database `cosmetic_store`, 8 bảng chuẩn 3NF và
|                                 toàn bộ dữ liệu mẫu (7 users, 20 mỹ phẩm, 8 đơn, 4 HĐ).
|-- backend/                    : Máy chủ RESTful API (Node.js + Express + MySQL2 + JWT)
|   |-- src/config/db.js        : Kết nối Pool MySQL 8.0 (`decimalNumbers: true`, utf8mb4).
|   |-- src/middlewares/        : Xác thực JWT, kiểm tra RBAC 3 vai trò & khóa tức thời.
|   |-- src/controllers/        : Xử lý nghiệp vụ Catalog, Đặt hàng, Kho ACID, Hóa đơn, Admin.
|   |-- src/routes/             : Định tuyến API (`/api/auth`, `/api/orders`, `/api/staff`, `/api/admin`).
|   |-- scripts/initDb.js       : Script tự động tạo & khôi phục sạch CSDL từ `database.sql`.
|   |-- scripts/verifyBackend.js: Bộ kiểm thử tự động 26 kịch bản nghiệp vụ trên MySQL thật.
|   `-- .env / .env.example     : Cấu hình biến môi trường kết nối MySQL và khóa ký JWT.
|-- frontend/                   : Giao diện Web 3 Phân hệ độc lập (React 18 + Vite + TailwindCSS)
|   |-- src/pages/customer/     : Phân hệ Khách hàng mua sắm trực tuyến (`/`).
|   |-- src/pages/staff/        : Phân hệ Nhân viên bán hàng, kho, hóa đơn & doanh thu (`/staff`).
|   |-- src/pages/admin/        : Phân hệ Quản trị hệ thống & Phân quyền RBAC (`/admin`).
|   |-- src/contexts/           : Quản lý 3 phiên đăng nhập độc lập (`PortalAuthContext`), Giỏ hàng, Toast.
|   `-- src/api/clients.js      : Axios Clients tách biệt khóa token cho từng cổng phân hệ.
|-- docker-compose.yml          : Khởi tạo nhanh MySQL 8.0 + Adminer bằng 1 lệnh Docker.
`-- readme.txt                  : Tài liệu hướng dẫn cài đặt, chạy dự án và kịch bản Demo chấm bài.


3. HƯỚNG DẪN CÀI ĐẶT MÔI TRƯỜNG & KHỞI TẠO CSDL MYSQL CHI TIẾT
----------------------------------------------------------------------------------------
3.1. Yêu cầu phần mềm tối thiểu:
  - Node.js phiên bản >= 18.x (khuyến nghị Node.js 18 LTS / 20 LTS / 22+).
  - Hệ quản trị CSDL MySQL 8.0+ (chọn 1 trong 2 cách bên dưới: Docker Desktop HOẶC
    MySQL Server / MySQL Workbench / XAMPP cài trực tiếp trên máy).

3.2. Khởi tạo Cơ sở dữ liệu MySQL (`cosmetic_store`):

  [CÁCH A - KHUYÊN DÙNG NHANH BẰNG DOCKER (CHỈ 1 LỆNH)]:
  * Lưu ý trước khi chạy: Nếu máy tính đang bật sẵn dịch vụ MySQL cài trực tiếp (như
    Windows Service `MySQL80` hoặc MySQL trong XAMPP Control Panel) đang chiếm cổng `3306`,
    hãy tạm dừng (Stop) dịch vụ đó trước khi chạy Docker (hoặc chuyển sang dùng luôn Cách B).
  1. Mở Terminal / PowerShell tại thư mục gốc `WebMyPham`.
  2. Chạy lệnh:
       docker compose up -d
  3. Hệ thống tự động thực hiện:
     - Dựng container MySQL 8.0 (`cosmetic_store_mysql`) lắng nghe tại cổng `3306`
       (Tài khoản: `root` | Mật khẩu: `123456` | Database: `cosmetic_store` | Múi giờ: `+07:00`).
     - Tự động nạp toàn bộ bảng và dữ liệu mẫu từ `database/database.sql`.
     - Dựng công cụ quản trị CSDL trực quan Adminer tại: http://localhost:8080
       (Thông tin đăng nhập Adminer: Hệ quản trị = `MySQL`, Máy chủ = `mysql`,
        Tài khoản = `root`, Mật khẩu = `123456`, Cơ sở dữ liệu = `cosmetic_store`).
  * Mẹo: Nếu muốn xóa sạch volume Docker và nạp lại từ đầu: `docker compose down -v`
    sau đó chạy lại `docker compose up -d`.

  [CÁCH B - DÙNG MYSQL WORKBENCH / PHPMYADMIN / XAMPP (KHÔNG CẦN DOCKER)]:
  1. Khởi động dịch vụ MySQL / MariaDB trên máy tính của bạn (mặc định cổng `3306`; nếu dùng
     Docker ở Cách A trước đó thì chạy `docker compose stop` để nhường cổng `3306`).
  2. Kiểm tra và chỉnh sửa file `backend/.env` (nếu chưa có thì copy từ `backend/.env.example`)
     sao cho khớp thông tin MySQL trên máy của bạn:
       PORT=5000
       DB_HOST=127.0.0.1
       DB_PORT=3306
       DB_USER=root
       DB_PASSWORD=123456        <-- Đổi theo mật khẩu root trên máy bạn; nếu dùng XAMPP mặc định không mật khẩu thì để trống hoàn toàn sau dấu `=` (viết: `DB_PASSWORD=`)
       DB_NAME=cosmetic_store
       JWT_SECRET=lumiere_cosmetics_sgu_secret_2026
       JWT_EXPIRES_IN=7d
  3. Nạp file `database/database.sql` (đã tương thích 100% cả MySQL 8.0 lẫn MariaDB 10.4+ trên XAMPP)
     theo 1 trong 3 cách tiện lợi sau:
     - Cách B1 (Tự động bằng lệnh Node.js - nhanh nhất cho cả MySQL Server & XAMPP):
         cd backend
         npm install
         npm run db:init
       -> Script tự động kết nối MySQL/MariaDB, tạo database `cosmetic_store` (nếu chưa có) và
          nạp đầy đủ 8 bảng + dữ liệu mẫu sạch 100%.
     - Cách B2 (Thủ công qua MySQL Workbench):
       -> Mở MySQL Workbench -> chọn `Server > Data Import > Import from Self-Contained File`
          (hoặc `File > Open SQL Script...`) -> trỏ tới `database/database.sql` -> bấm chạy
          (trong file SQL đã có sẵn lệnh `CREATE DATABASE IF NOT EXISTS cosmetic_store` và `USE cosmetic_store`).
     - Cách B3 (Thủ công qua phpMyAdmin trên XAMPP):
       -> Mở trình duyệt vào `http://localhost/phpmyadmin` -> chọn tab `Import` (Nhập) ở thanh
          trên cùng -> bấm `Choose File` chọn `database/database.sql` -> giữ Character set là
          `utf-8` -> kéo xuống bấm `Import` (`Go`) là hoàn tất 8 bảng + dữ liệu mẫu tiếng Việt chuẩn.


4. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN (BACKEND & FRONTEND)
----------------------------------------------------------------------------------------
Mở 2 cửa sổ Terminal / PowerShell song song:

[BƯỚC 1 - KHỞI CHẠY BACKEND SERVER (CỔNG 5000)]:
  cd backend
  npm install
  npm run dev
  (Hoặc chạy chế độ thường: `npm start`)
  -> Máy chủ API hoạt động tại : http://localhost:5000
  -> Kiểm tra kết nối DB nhanh : http://localhost:5000/api/health

[BƯỚC 2 - KHỞI CHẠY FRONTEND REACT + VITE (CỔNG 5173)]:
  cd frontend
  npm install
  npm run dev
  -> Giao diện Web hoạt động tại: http://localhost:5173

[CÁC LỆNH TIỆN ÍCH PHỤC VỤ KIỂM THỬ & CHẤM BÀI]:
  - Chạy kiểm thử tự động toàn bộ 26 kịch bản API & Transaction trên MySQL thật:
      cd backend && npm run test:api
  - Khôi phục (Reset) lại toàn bộ dữ liệu mẫu ban đầu sạch 100% bất kỳ lúc nào:
      cd backend && npm run db:init


5. BA ĐƯỜNG DẪN PHÂN HỆ ĐỘC LẬP & DANH SÁCH 7 TÀI KHOẢN MẪU (SEED ACCOUNTS)
----------------------------------------------------------------------------------------
5.1. Đường dẫn truy cập 3 Phân hệ hoàn toàn tách biệt:
  1) Cổng Khách hàng (Storefront)       : http://localhost:5173/
     (Gồm: `/`, `/products`, `/products/:id`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/profile`)
  2) Cổng Nhân viên bán hàng (Staff)    : http://localhost:5173/staff
     (Gồm: `/staff/dashboard`, `/staff/products`, `/staff/orders`, `/staff/invoices`, `/staff/invoices/:id/print`)
  3) Cổng Quản trị hệ thống (Admin)     : http://localhost:5173/admin
     (Gồm: `/admin/users`, `/admin/roles` - Ma trận RBAC, `/admin/system` - Giám sát Health & Phiên)

  * TÍNH NĂNG ĐẶC BIỆT PHỤC VỤ DEMO THUYẾT TRÌNH:
    Hệ thống lưu trữ phiên đăng nhập vào 3 khóa LocalStorage hoàn toàn cô lập:
      - Khách hàng : `lumiere_customer_auth`
      - Nhân viên  : `lumiere_staff_auth`
      - Quản trị   : `lumiere_admin_auth`
    Nhờ đó, Giảng viên và Sinh viên có thể mở ĐỒNG THỜI 3 TAB TRÌNH DUYỆT (/, /staff, /admin)
    và đăng nhập cùng lúc 3 vai trò trên cùng một trình duyệt mà KHÔNG BỊ GHI ĐÈ PHIÊN!

5.2. Danh sách 7 Tài khoản Mẫu nạp sẵn trong `database/database.sql`:
     (Tất cả tài khoản đều sử dụng mật khẩu chung: 123456)

+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
| STT |   username   | Mật khẩu |   Vai trò   | Trạng thái|  Cổng  | Họ tên & Vai trò kịch bản     |
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  1  | admin        |  123456  | ADMIN       | ACTIVE    | /admin | Phạm Hoàng Nam (Quản trị viên)|
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  2  | nhanvien     |  123456  | SALES_STAFF | ACTIVE    | /staff | Trần Thị Minh Thư (NV chính)  |
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  3  | nhanvien2    |  123456  | SALES_STAFF | ACTIVE    | /staff | Lê Hoàng Gia Huy (NV ca chiều)|
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  4  | khachhang    |  123456  | CUSTOMER    | ACTIVE    | /      | Nguyễn Thảo Vy (Khách mẫu)    |
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  5  | minhanh      |  123456  | CUSTOMER    | ACTIVE    | /      | Võ Ngọc Minh Anh (Khách mẫu)  |
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  6  | quocbao      |  123456  | CUSTOMER    | ACTIVE    | /      | Đặng Trần Quốc Bảo (Khách mẫu)|
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+
|  7  | khachbikhoa  |  123456  | CUSTOMER    | LOCKED    | /      | Huỳnh Thanh Tùng (Đang khóa)  |
+-----+--------------+----------+-------------+-----------+--------+-------------------------------+


6. GỢI Ý KỊCH BẢN DEMO THUYẾT TRÌNH VỚI GIẢNG VIÊN (5 BƯỚC KIỂM CHỨNG 70Đ PHẦN MỀM)
----------------------------------------------------------------------------------------
Mở sẵn 3 tab trình duyệt tương ứng 3 cổng `/`, `/staff`, `/admin` để đối chiếu trực quan:

* BƯỚC 1 — TRA CỨU ĐA TIÊU CHÍ, LỌC KHOẢNG GIÁ & ĐẶT ĐƠN HÀNG MỚI (CỔNG `/` - KHÁCH HÀNG):
  - Truy cập `http://localhost:5173/`, thử tìm kiếm theo tên/thương hiệu, lọc theo Danh mục,
    Loại da và Khoảng giá (`min_price` - `max_price`), sắp xếp giá tăng/giảm dần.
  - Quan sát sản phẩm `#12` (Paula's Choice Niacinamide 20% - tồn kho = 0) hiển thị nhãn
    "Hết hàng" và tự động khóa nút đặt mua.
  - Đăng nhập tài khoản `khachhang` / `123456`, thêm mỹ phẩm còn hàng vào giỏ, điền thông tin
    người nhận và bấm Đặt hàng -> Đơn mới sinh ra ở trạng thái `Chờ xác nhận (PENDING)`
    (chứng minh bước đặt đơn chưa trừ tồn kho).

* BƯỚC 2 — DUYỆT ĐƠN TRỪ KHO TỰ ĐỘNG & XUẤT / IN HÓA ĐƠN PDF (CỔNG `/staff` - NHÂN VIÊN):
  - Sang tab `http://localhost:5173/staff/login`, bấm nút điền nhanh `nhanvien` / `123456`.
  - Vào mục "Đơn hàng" (`/staff/orders`), mở đơn hàng `PENDING` vừa đặt (hoặc đơn mẫu `#6`),
    bấm **Duyệt đơn hàng**:
      + MySQL Transaction tự động kiểm tra kho (`SELECT ... FOR UPDATE`), trừ chính xác
        `stock_quantity` của từng sản phẩm, chuyển đơn sang `APPROVED` và tự động phát hành
        Hóa đơn bán lẻ mã `HD-YYYYMMDD-XXXX`.
  - Chuyển sang mục "Hóa đơn" (`/staff/invoices`), thử lọc hóa đơn theo khoảng ngày chuẩn
    Việt Nam `dd/mm/yyyy` và bấm **In Hóa đơn / Xuất PDF** để mở trang phiếu in A4 chuyên nghiệp.

* BƯỚC 3 — KIỂM CHỨNG CHẶN DUYỆT ĐƠN KHI THIẾU TỒN KHO (TRANSACTION ROLLBACK):
  - Vẫn tại `/staff/orders`, mở chi tiết **Đơn hàng mẫu `#8`** của khách Võ Ngọc Minh Anh:
    Khách đặt `3` thỏi *Son Kem Bóng Mờ 3CE Blur Water Tint* (SP `#8`), nhưng tồn kho hiện tại
    trong CSDL chỉ còn `2` sản phẩm.
  - Bấm thử **Duyệt đơn `#8`** -> Hệ thống lập tức cảnh báo lỗi `400 INSUFFICIENT_STOCK` chỉ rõ
    tên mặt hàng thiếu kho và thực hiện `ROLLBACK` 100% giao dịch, bảo vệ tồn kho không bao giờ âm.

* BƯỚC 4 — HỦY ĐƠN ĐÃ DUYỆT HOÀN TRẢ TỒN KHO & ĐỐI CHIẾU BÁO CÁO DOANH THU:
  - Chọn một đơn hàng ở trạng thái `Đã duyệt (APPROVED)` (ví dụ đơn vừa duyệt ở Bước 2 hoặc
    đơn mẫu `#5`), thực hiện **Hủy đơn hàng** kèm lý do hủy:
      + Hệ thống tự động **cộng hoàn trả đúng số lượng mỹ phẩm về kho**, cập nhật trạng thái
        đơn sang `CANCELLED` và đóng dấu kiểm toán `[ĐÃ HỦY ĐƠN - HOÀN KHO]` vào ghi chú hóa đơn.
  - Mở Dashboard Thống kê Doanh thu (`/staff` hoặc `/staff/dashboard`) -> Chứng minh tổng doanh
    thu thực nhận chỉ tính trên các đơn `APPROVED`, loại trừ hoàn toàn đơn `PENDING` và `CANCELLED`.

* BƯỚC 5 — QUẢN TRỊ NGƯỜI DÙNG, PHÂN QUYỀN RBAC & AN TOÀN KHÓA NGOẠI (CỔNG `/admin`):
  - Sang tab `http://localhost:5173/admin/login`:
      + Thử nhập `nhanvien` / `123456` để chứng minh cổng Admin chặn tuyệt đối nhân viên/khách
        hàng với lỗi `403 WRONG_PORTAL`.
      + Bấm nút **"Điền nhanh tài khoản Admin mẫu (`admin` / `123456`)"** và đăng nhập.
  - Tại trang Quản lý Người dùng (`/admin/users`):
      + Mở khóa tài khoản `khachbikhoa` (`LOCKED` -> `ACTIVE`) hoặc khóa thử 1 tài khoản.
      + Thực hiện **Phân quyền RBAC** cấp/đổi vai trò (`CUSTOMER` <-> `SALES_STAFF` <-> `ADMIN`).
      + Thử **Xóa** tài khoản `khachhang` (đã có đơn hàng) -> Hệ thống không xóa vật lý mà tự
        động chuyển sang `LOCKED` (`SOFT_LOCKED`) để bảo toàn toàn vẹn tham chiếu khóa ngoại;
        ngược lại tạo 1 user mới chưa có đơn rồi bấm Xóa -> Xóa vĩnh viễn (`DELETED`).
      + Quan sát dòng của chính `admin` đang đăng nhập gắn nhãn `"Bạn (Đang đăng nhập)"` và
        vô hiệu hóa hoàn toàn các nút tự hạ quyền, tự khóa, tự xóa chính mình.

========================================================================================
       CHÚC HỘI ĐỒNG CHẤM THI VÀ GIẢNG VIÊN CÓ TRẢI NGHIỆM TỐT NHẤT VỚI HỆ THỐNG!
========================================================================================
