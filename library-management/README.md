# Hệ Thống Quản Lý Thư Viện (Library Management System v3.0)

Hệ thống Quản lý Thư viện Fullstack hoàn chỉnh với **Node.js, Express.js, SQLite Database, Xác thực JWT, Giao diện Đăng nhập Nghệ thuật (Full-screen Book Background & Quote)**, cùng **Quy tắc Kiểm Soát Độ Tuổi (Age Verification 18+)** và **Giới hạn tối đa 3 quyển sách**.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)
- **Backend**: Node.js, Express.js (RESTful API).
- **Cơ sở dữ liệu**: SQLite (`sqlite3`) với tự động cập nhật schema (ALTER TABLE) và nạp dữ liệu mẫu (Seed Data).
- **Xác thực & Bảo mật**: JWT (JSON Web Token), mã hóa mật khẩu `bcryptjs` 10 salt rounds.
- **Frontend**: HTML5, CSS3, Tailwind CSS (CDN), Vanilla JavaScript (Fetch API).
- **Giao diện & UI**:
  - Trang Đăng nhập/Đăng ký phong cách Glassmorphism với hình nền quyển sách mở toàn màn hình (Unsplash 1920p) và câu nói ý nghĩa của nhà văn Neil Gaiman.
  - SweetAlert2 cho tất cả hộp thoại xác nhận và thông báo popup.

---

## 🗄️ Cấu Trúc Cơ Sở Dữ Liệu (Database Schema)

1. **Bảng `users`**:
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `fullName`: TEXT NOT NULL
   - `email`: TEXT UNIQUE NOT NULL
   - `passwordHash`: TEXT NOT NULL
   - `dateOfBirth`: TEXT NOT NULL (Định dạng YYYY-MM-DD để tính tuổi độc giả)
   - `role`: TEXT CHECK(role IN ('admin', 'member'))
   - `createdAt`: TEXT

2. **Bảng `books`**:
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `title`: TEXT NOT NULL
   - `author`: TEXT NOT NULL
   - `category`: TEXT NOT NULL
   - `quantity`: INTEGER NOT NULL (Tổng số lượng)
   - `availableQuantity`: INTEGER NOT NULL (Số lượng khả dụng còn trong kho)
   - `coverImage`: TEXT (URL ảnh bìa sách)
   - `description`: TEXT (Mô tả tóm tắt)
   - `ageRestriction`: TEXT CHECK(ageRestriction IN ('all', 'kids', '18+')) NOT NULL DEFAULT 'all'

3. **Bảng `loans`**:
   - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
   - `userId`: INTEGER (Khóa ngoại tham chiếu `users.id`)
   - `bookId`: INTEGER (Khóa ngoại tham chiếu `books.id`)
   - `borrowDate`: TEXT NOT NULL
   - `dueDate`: TEXT NOT NULL
   - `returnDate`: TEXT (NULL nếu chưa trả)
   - `status`: TEXT CHECK(status IN ('borrowed', 'returned', 'overdue'))
   - `fineAmount`: INTEGER NOT NULL DEFAULT 0 (5.000 VNĐ / ngày trễ hạn)

---

## 🎯 Các Quy Tắc Nghiệp Vụ Chính

### 1. Quy tắc Kiểm Soát Độ Tuổi (Age Verification Rule):
- **Phân loại sách**:
  - `kids`: Sách thiếu nhi (gắn huy hiệu `[Sách Trẻ Em 🧒]`)
  - `all`: Phổ thông dành cho mọi lứa tuổi (gắn huy hiệu `[Mọi Lứa Tuổi 📖]`)
  - `18+`: Giới hạn người lớn (gắn huy hiệu cảnh báo `[18+ ⚠️]`)
- **Kiểm tra khi mượn**:
  - Khi độc giả mượn sách có gắn nhãn `18+`, hệ thống tự động tính tuổi dựa vào `dateOfBirth`:  
    $$\text{Tuổi} = \text{Năm hiện tại} - \text{Năm sinh}$$
  - Nếu độc giả **dưới 18 tuổi**, hệ thống **TỪ CHỐI** và gửi thông báo:  
    > *"Sách này dành cho người trên 18 tuổi. Bạn chưa đủ tuổi để mượn cuốn sách này!"*

### 2. Quy tắc Giới Hạn Tối Đa 3 Quyển Sách (`MAX 3 BOOKS`):
- Mỗi độc giả chỉ được mượn đồng thời **tối đa 3 quyển sách** chưa hoàn trả (`borrowed` hoặc `overdue`).
- Nếu vượt quá, hệ thống từ chối:  
  > *"Bạn đã đạt giới hạn mượn tối đa 3 quyển sách. Vui lòng trả sách cũ trước khi mượn mới."*

### 3. Tự động tính phí phạt trễ hạn:
- Thời hạn mượn: 14 ngày.
- Quá hạn sẽ tính phạt: **5.000 VNĐ / ngày trễ hạn**.

---

## 🔑 Tài Khoản Mẫu Để Kiểm Thử (Seed Data)

Tại trang `login.html`, bạn có thể bấm **1-click điền nhanh** vào các tài khoản sau:

| Vai trò | Email đăng nhập | Mật khẩu | Ngày sinh & Độ tuổi | Chức năng kiểm thử |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@library.com` | `123456` | 1990 (36 tuổi) | Quản trị viên thư viện, toàn quyền Dashboard, CRUD sách có phân loại độ tuổi |
| **Độc giả mặc định** | `taquangnam177@gmail.com` | `123456` | 2006 (20 tuổi &bull; **Đủ 18t**) | Độc giả Tạ Quang Nam: Mượn được cả sách phổ thông và sách **18+** |
| **Trẻ em** | `kid@library.com` | `123456` | 2012 (14 tuổi &bull; **Dưới 18t**) | Độc giả dưới 18 tuổi: Mượn được sách thiếu nhi, **bị chặn khi mượn sách 18+** |

---

## 📁 Cấu Trúc Thư Mục
```text
library-management/
├── package.json
├── server.js             # Express app (Port 3000)
├── database.sqlite       # Cơ sở dữ liệu SQLite
├── config/
│   └── db.js             # Kết nối SQLite, Schema migrations & Seed Data
├── middleware/
│   └── auth.js           # JWT verification & phân quyền Admin
├── routes/
│   ├── auth.js           # Đăng ký (bắt buộc ngày sinh), Đăng nhập, Profile
│   ├── books.js          # API Danh mục sách, bộ lọc độ tuổi (all, kids, 18+)
│   └── loans.js          # Mượn/Trả: Ràng buộc 18+, Giới hạn 3 quyển & Phạt trễ hạn
└── public/
    ├── index.html        # Trang chủ / Danh mục sách (Bộ lọc độ tuổi)
    ├── book-detail.html  # Trang chi tiết sách (Cảnh báo 18+ & Nút mượn)
    ├── login.html        # Giao diện Đăng nhập nghệ thuật (Book background & Quote)
    ├── profile.html      # Trang cá nhân Độc giả (Xem sách đang mượn & Độ tuổi)
    ├── admin.html        # Trang Quản trị Admin (CRUD sách kèm độ tuổi)
    ├── css/
    │   └── style.css
    └── js/
        ├── main.js       # Xử lý Auth, JWT, hiển thị tuổi trên Navbar
        ├── admin.js      # Logic Admin Dashboard, CRUD Sách, Loans
        └── profile.js    # Logic Độc giả
```

---

## 🌐 Các Đường Dẫn Truy Cập Hệ Thống

Server đang chạy trực tiếp tại cổng **3000**:
- 🏠 **Trang chủ tìm kiếm sách & lọc độ tuổi**: [http://localhost:3000](http://localhost:3000)
- 🔐 **Trang Đăng nhập nghệ thuật**: [http://localhost:3000/login.html](http://localhost:3000/login.html)
- 📖 **Trang Chi tiết sách**: [http://localhost:3000/book-detail.html?id=1](http://localhost:3000/book-detail.html?id=1)
- 👤 **Trang Cá nhân Độc giả**: [http://localhost:3000/profile.html](http://localhost:3000/profile.html)
- 🛠️ **Bảng Điều Khiển Quản Trị Viên (Admin)**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
