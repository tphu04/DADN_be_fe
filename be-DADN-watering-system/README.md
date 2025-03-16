# Smart Watering System Backend

Backend API cho hệ thống tưới nước thông minh.

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd be-DADN-watering-system
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình biến môi trường:
   - Tạo file `.env` từ `.env.example` và cập nhật thông tin cần thiết:
   ```
   PORT=3000
   HOST_NAME=localhost
   JWT_SECRET=your-secret-key
   DATABASE_URL="mysql://username:password@localhost:3306/watering_system"
   ```

4. Cài đặt và chạy cơ sở dữ liệu:
```bash
npx prisma db push
```

5. Chạy ứng dụng:
```bash
npm start
```

## API Endpoints

### Authentication

#### Đăng ký

```
POST /api/auth/register
```

Body:
```json
{
  "username": "user123",
  "password": "password123",
  "email": "user@example.com",
  "phone": "0123456789",
  "fullname": "User Example",
  "address": "123 Example St"
}
```

Phản hồi:
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "fullname": "User Example"
    },
    "token": "jwt-token"
  }
}
```

#### Đăng nhập

```
POST /api/auth/login
```

Body:
```json
{
  "username": "user123",
  "password": "password123"
}
```

Phản hồi:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "username": "user123",
      "email": "user@example.com",
      "fullname": "User Example"
    },
    "token": "jwt-token"
  }
}
```

#### Đăng xuất

```
POST /api/auth/logout
```

Phản hồi:
```json
{
  "success": true,
  "message": "Logout successful."
}
```

### User

#### Lấy thông tin người dùng

```
GET /api/users/profile
```

Headers:
```
Authorization: Bearer jwt-token
```

Phản hồi:
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com",
    "role": "USER"
  }
}
```