# Hướng dẫn cài đặt và chạy Work Scheduler

## Yêu cầu hệ thống
- Node.js >= 14.0.0
- npm hoặc yarn
- Git (tùy chọn)

## Cài đặt

### 1. Cài đặt dependencies
Mở terminal/command prompt trong thư mục dự án và chạy:
```bash
npm install
```

### 2. Khởi tạo database
Chạy script để tạo database và dữ liệu mẫu:
```bash
npm run init-db
```

### 3. Chạy ứng dụng

#### Development mode (với auto-reload):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

Ứng dụng sẽ chạy tại: **http://localhost:3000**

## Tài khoản mặc định

### Quản trị viên
- **Username:** `admin`
- **Password:** `admin123`

### Người dùng mẫu
- **Username:** `user1`, **Password:** `password123`
- **Username:** `user2`, **Password:** `password123`

## Cấu trúc dự án

```
Work-scheduler-app/
├── index.html              # Giao diện chính
├── style.css               # CSS với theme mùa thu
├── script.js               # JavaScript frontend
├── server.js               # Backend API server
├── package.json            # Dependencies và scripts
├── database.sqlite         # SQLite database (tự động tạo)
├── README.md               # Tài liệu chính
├── SETUP.md                # Hướng dẫn cài đặt
└── scripts/
    └── init-db.js          # Script khởi tạo database
```

## Tính năng chính

### ✅ Đã hoàn thành:
- 📅 **Lịch tương tác**: Xem và quản lý công việc theo lịch
- ✅ **Quản lý công việc**: Thêm, sửa, xóa công việc
- 👥 **Phân quyền**: Hệ thống đăng nhập với quyền người dùng và quản trị viên
- 📤 **Chia sẻ**: Chia sẻ lịch trình qua email
- 🎨 **Giao diện mùa thu**: Thiết kế đẹp mắt với màu sắc mùa thu
- 💾 **Database**: Lưu trữ dữ liệu với SQLite
- 🔐 **Bảo mật**: JWT authentication, password hashing, input validation
- 📱 **Responsive**: Giao diện tương thích mobile

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập

### Tasks
- `GET /api/tasks` - Lấy danh sách công việc
- `POST /api/tasks` - Tạo công việc mới
- `PUT /api/tasks/:id` - Cập nhật công việc
- `DELETE /api/tasks/:id` - Xóa công việc

### Sharing
- `POST /api/share` - Chia sẻ lịch trình
- `GET /api/shared` - Lấy danh sách đã chia sẻ

### Admin
- `GET /api/admin/users` - Quản lý người dùng (chỉ admin)
- `GET /api/admin/stats` - Thống kê hệ thống (chỉ admin)

## Troubleshooting

### Lỗi thường gặp:

1. **Port đã được sử dụng:**
   ```bash
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   **Giải pháp:** Thay đổi port trong file `server.js` hoặc kill process đang sử dụng port 3000

2. **Database không tạo được:**
   ```bash
   Error opening database
   ```
   **Giải pháp:** Đảm bảo có quyền ghi trong thư mục dự án và chạy `npm run init-db`

3. **Dependencies không cài được:**
   ```bash
   npm ERR! peer dep missing
   ```
   **Giải pháp:** Xóa `node_modules` và `package-lock.json`, sau đó chạy `npm install` lại

### Kiểm tra cài đặt:
```bash
# Kiểm tra Node.js version
node --version

# Kiểm tra npm version
npm --version

# Kiểm tra dependencies
npm list
```

## Phát triển thêm

### Thêm tính năng mới:
1. Tạo API endpoint trong `server.js`
2. Cập nhật frontend trong `script.js`
3. Thêm validation và error handling
4. Test với các tài khoản khác nhau

### Customization:
- Thay đổi màu sắc trong `style.css` (CSS variables)
- Thêm validation rules trong server
- Cấu hình email trong environment variables

## Bảo mật

### Production deployment:
1. Thay đổi `JWT_SECRET` trong environment variables
2. Sử dụng HTTPS
3. Cấu hình firewall
4. Backup database thường xuyên
5. Cập nhật dependencies định kỳ

### Environment variables:
Tạo file `.env` với nội dung:
```
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console logs
2. Xem README.md để biết thêm chi tiết
3. Tạo issue trên GitHub
4. Liên hệ qua email

---

**Chúc bạn sử dụng ứng dụng hiệu quả! 🎉**
