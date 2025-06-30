# Quiz Learning App - MongoDB Integration

Ứng dụng ôn luyện đề thi trắc nghiệm với tích hợp MongoDB và chức năng import PDF nâng cao.

## Tính năng chính

### 🗄️ Tích hợp MongoDB
- Lưu trữ câu hỏi và kết quả luyện thi trên MongoDB
- Phát hiện và ngăn chặn câu hỏi trùng lặp
- Backup tự động với localStorage khi MongoDB không khả dụng
- API RESTful hoàn chỉnh

### 📄 Import PDF nâng cao
- Trích xuất câu hỏi từ nhiều định dạng PDF khác nhau
- Phát hiện tự động đáp án đúng
- Phân loại câu hỏi theo danh mục và độ khó
- Kiểm tra trùng lặp trước khi import
- Báo cáo chi tiết kết quả import

### 📚 Quản lý học tập
- Học bài theo đề (lưu trên localStorage)
- Luyện thi có thời gian (lưu trên MongoDB)
- Thống kê chi tiết và báo cáo tiến độ
- Dialog xác nhận thay thế alert

## Cài đặt và chạy

### 1. Cài đặt Frontend (Angular)
```bash
npm install
npm run dev
```

### 2. Cài đặt Backend (Node.js + MongoDB)
```bash
cd server
npm install
npm run dev
```

### 3. Cấu hình MongoDB

#### Option 1: MongoDB Local
```bash
# Cài đặt MongoDB Community Edition
# Khởi động MongoDB service
mongod --dbpath /path/to/your/data/directory
```

#### Option 2: MongoDB Atlas (Cloud)
1. Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster mới
3. Lấy connection string
4. Cập nhật trong `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  mongodb: {
    connectionString: 'mongodb+srv://username:password@cluster.mongodb.net/quiz-app',
    databaseName: 'quiz-app'
  }
};
```

### 4. Biến môi trường (Server)
Tạo file `.env` trong thư mục `server/`:
```env
MONGODB_URI=mongodb://localhost:27017
# Hoặc MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-app
PORT=3000
```

## Cấu trúc dự án

```
quiz-app/
├── src/
│   ├── components/           # Angular components
│   ├── services/            # Services (MongoDB, PDF Parser, Dialog)
│   ├── models/              # TypeScript interfaces
│   └── environments/        # Environment configurations
├── server/
│   ├── server.js           # Express server với MongoDB
│   └── package.json        # Server dependencies
└── README.md
```

## API Endpoints

### Questions
- `GET /api/questions` - Lấy danh sách câu hỏi
- `POST /api/questions` - Thêm câu hỏi mới
- `POST /api/questions/bulk` - Import nhiều câu hỏi
- `PUT /api/questions/:id` - Cập nhật câu hỏi
- `DELETE /api/questions/:id` - Xóa câu hỏi
- `POST /api/questions/check-duplicates` - Kiểm tra trùng lặp

### Practice Results
- `GET /api/practice-results` - Lấy kết quả luyện thi
- `POST /api/practice-results` - Lưu kết quả luyện thi
- `DELETE /api/practice-results/:id` - Xóa kết quả

### Statistics
- `GET /api/statistics` - Thống kê tổng quan
- `GET /api/test-connection` - Kiểm tra kết nối MongoDB

## Chức năng Import PDF

### Định dạng PDF được hỗ trợ:

1. **Định dạng số thứ tự:**
```
1. Câu hỏi đầu tiên?
A. Đáp án A
B. Đáp án B
C. Đáp án C
D. Đáp án D
Đáp án: B

2. Câu hỏi thứ hai?
...
```

2. **Định dạng Question:**
```
Question: What is the capital of Vietnam?
A) Ho Chi Minh City
B) Hanoi
C) Da Nang
D) Hue
Answer: B
```

3. **Định dạng tiếng Việt:**
```
Câu 1: Thủ đô của Việt Nam là gì?
A. Hồ Chí Minh
B. Hà Nội
C. Đà Nẵng
D. Huế
Đáp án đúng: B
```

### Tính năng phát hiện:
- Tự động phát hiện đáp án đúng từ các từ khóa
- Phân loại danh mục dựa trên nội dung câu hỏi
- Đánh giá độ khó dựa trên độ dài và độ phức tạp
- Loại bỏ câu hỏi không hợp lệ

## Lưu trữ dữ liệu

### MongoDB (Câu hỏi + Kết quả luyện thi):
- `questions` collection: Lưu trữ tất cả câu hỏi
- `practice-results` collection: Kết quả luyện thi
- Indexes được tối ưu cho tìm kiếm và sắp xếp

### localStorage (Kết quả học bài):
- `study-results`: Kết quả học bài theo đề
- `quiz-progress-*`: Tiến độ làm bài tạm thời

## Xử lý lỗi và Fallback

Ứng dụng được thiết kế để hoạt động ngay cả khi MongoDB không khả dụng:
- Tự động chuyển sang localStorage khi MongoDB lỗi
- Hiển thị trạng thái kết nối MongoDB
- Đồng bộ dữ liệu khi kết nối được khôi phục

## Bảo mật

- Validation dữ liệu đầu vào
- Sanitization cho MongoDB queries
- Rate limiting (có thể thêm)
- CORS configuration

## Performance

- Database indexing cho tìm kiếm nhanh
- Pagination cho danh sách lớn
- Lazy loading cho components
- Caching với localStorage

## Troubleshooting

### MongoDB connection issues:
1. Kiểm tra MongoDB service đang chạy
2. Verify connection string trong environment
3. Check firewall và network settings
4. Xem logs trong browser console và server terminal

### PDF import issues:
1. Đảm bảo file PDF có text (không phải scan)
2. Kiểm tra định dạng câu hỏi phù hợp
3. File size không quá lớn (< 10MB)
4. Xem chi tiết lỗi trong import results

## Phát triển tiếp

- [ ] Thêm authentication/authorization
- [ ] Export câu hỏi ra Excel/PDF
- [ ] Tích hợp AI để tạo câu hỏi tự động
- [ ] Mobile app với Ionic
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard