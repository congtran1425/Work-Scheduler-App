# Work Scheduler - Ứng dụng quản lý công việc

Ứng dụng quản lý công việc với lịch, chia sẻ và phân quyền người dùng, được thiết kế theo phong cách mùa thu.

## Tính năng chính

- 📅 **Lịch tương tác**: Xem và quản lý công việc theo lịch
- ✅ **Quản lý công việc**: Thêm, sửa, xóa công việc
- 👥 **Phân quyền**: Hệ thống đăng nhập với quyền người dùng và quản trị viên
- 📤 **Chia sẻ**: Chia sẻ lịch trình qua email
- 🎨 **Giao diện mùa thu**: Thiết kế đẹp mắt với màu sắc mùa thu
- 💾 **Database**: Lưu trữ dữ liệu với SQLite

## Cài đặt

### Yêu cầu hệ thống
- Node.js >= 14.0.0
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Khởi tạo database
```bash
npm run init-db
```

### Chạy ứng dụng
```bash
# Development mode
npm run dev

# Production mode
npm start
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## Tài khoản mặc định

### Quản trị viên
- Username: `admin`
- Password: `admin123`

### Người dùng mẫu
- Username: `user1`, Password: `password123`
- Username: `user2`, Password: `password123`

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

## Cấu trúc dự án

```
Work-scheduler-app/
├── index.html          # Giao diện chính
├── style.css           # CSS với theme mùa thu
├── script.js           # JavaScript frontend
├── server.js           # Backend API server
├── package.json        # Dependencies
├── database.sqlite     # SQLite database
└── scripts/
    └── init-db.js      # Script khởi tạo database
```

## Tính năng chi tiết

### Lịch
- Hiển thị lịch theo tháng
- Click vào ngày để xem công việc
- Đánh dấu ngày có công việc
- Điều hướng tháng trước/sau

### Quản lý công việc
- Thêm công việc với tiêu đề, mô tả, ngày, giờ
- Phân loại độ ưu tiên (thấp, trung bình, cao)
- Trạng thái công việc (chờ, đang làm, hoàn thành)
- Chỉnh sửa và xóa công việc

### Phân quyền
- **Người dùng**: Chỉ xem/sửa công việc của mình
- **Quản trị viên**: Xem/sửa tất cả công việc và quản lý người dùng

### Chia sẻ
- Chia sẻ lịch trình qua email
- Gửi lời nhắn tùy chỉnh
- Xem lịch sử chia sẻ

## Công nghệ sử dụng

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Font Awesome icons
- Google Fonts (Inter)

### Backend
- Node.js
- Express.js
- SQLite3
- JWT Authentication
- bcryptjs (password hashing)
- Nodemailer (email sharing)

### Security
- Helmet.js (security headers)
- CORS
- Rate limiting
- Input validation
- Password hashing

## Phát triển

### Thêm tính năng mới
1. Tạo API endpoint trong `server.js`
2. Cập nhật frontend trong `script.js`
3. Thêm validation và error handling
4. Test với các tài khoản khác nhau

### Customization
- Thay đổi màu sắc trong `style.css` (CSS variables)
- Thêm validation rules trong server
- Cấu hình email trong `.env`

## License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

## Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.
