# 💳 Luồng Thanh Toán VNPay - Course Platform

## 📋 Tổng quan
Hệ thống thanh toán tích hợp VNPay cho phép người dùng **thanh toán trực tiếp** khi xem chi tiết khóa học. Sau khi thanh toán thành công, khóa học tự động được thêm vào My Courses.

**Luồng đơn giản:** 
```
Xem khóa học → Thanh toán ngay → Học luôn
```

**❌ Không có giỏ hàng** - User thanh toán từng khóa học một cách nhanh chóng.

---

## 🔄 Luồng hoạt động

### 1️⃣ **Người dùng xem khóa học**
- Vào trang `/course/:courseId`
- Xem thông tin chi tiết khóa học (title, price, duration, chapters, lessons)
- Kiểm tra trạng thái: Đã mua chưa?

### 2️⃣ **Click "Thanh toán ngay"**
**File:** `CourseDetail.jsx`

```javascript
const handlePayment = async () => {
  // 1. Tạo orderInfo
  const orderInfo = `Thanh toan khoa hoc ${course?.title}`;
  
  // 2. Gọi API tạo thanh toán VNPay
  const response = await PaymentAPI.createVNPayPayment(orderInfo);
  
  // 3. Thêm courseId vào URL callback
  const paymentUrl = `${response.data.data.paymentUrl}&courseId=${courseId}`;
  
  // 4. Redirect sang VNPay
  window.location.href = paymentUrl;
}
```

### 3️⃣ **Backend tạo Payment URL**
**API:** `POST /api/payment/vnpay/create`

**Request Body:**
```json
{
  "orderInfo": "Thanh toan khoa hoc Java Spring Boot"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=...",
    "paymentId": "PAYMENT_123456",
    "amount": 1800000
  }
}
```

### 4️⃣ **User thanh toán tại VNPay**
- User nhập thông tin thẻ/tài khoản
- Xác thực OTP
- VNPay xử lý thanh toán

### 5️⃣ **VNPay callback về Frontend**
**URL:** `/payment/callback?vnp_ResponseCode=00&vnp_TxnRef=...&courseId=abc123`

**File:** `PaymentCallback.jsx`

#### Xử lý callback:

```javascript
// 1. Lấy params từ URL
const vnp_ResponseCode = searchParams.get("vnp_ResponseCode");
const courseId = searchParams.get("courseId");

// 2. Kiểm tra mã phản hồi
if (vnp_ResponseCode === "00") {
  // ✅ THANH TOÁN THÀNH CÔNG
  
  // 3. Enroll khóa học
  // 3a. Lưu vào localStorage
  const enrolledCourses = JSON.parse(localStorage.getItem('enrolledCourses') || '[]');
  enrolledCourses.push(courseId);
  localStorage.setItem('enrolledCourses', JSON.stringify(enrolledCourses));
  
  // 3b. Gọi backend API
  await ProgressAPI.enrollCourse(courseId);
  
  // 4. Hiển thị thông báo thành công
  toast.success("Thanh toán thành công! Bạn đã được thêm vào khóa học.");
  
  // 5. Chuyển đến My Courses
  setTimeout(() => navigate("/my-courses"), 2000);
  
} else {
  // ❌ THANH TOÁN THẤT BẠI
  toast.error("Thanh toán thất bại!");
  setTimeout(() => navigate("/home"), 3000);
}
```

### 6️⃣ **Backend xử lý Enrollment**
**API:** `POST /api/progress/enroll/:courseId`

- Tạo record trong bảng `enrollments`
- Khởi tạo progress = 0%
- Unlock chapter đầu tiên (nếu có)

### 7️⃣ **User học khóa học**
- Vào `/my-courses` → thấy khóa học vừa mua
- Click "Tiếp tục học" → chuyển sang `/course/:courseId/learn`
- Xem video, làm quiz, track progress

---

## 📁 Cấu trúc File

```
src/
├── api/
│   ├── paymentAPI.jsx          ✅ NEW - API thanh toán
│   └── progressAPI.jsx         ✅ Đã có - API enrollment & progress
│
├── pages/
│   ├── CourseDetail.jsx        ✅ UPDATED - Thêm handlePayment()
│   ├── PaymentCallback.jsx     ✅ NEW - Xử lý callback từ VNPay
│   └── MyCourses.jsx           ✅ Đã có - Hiển thị khóa học đã mua
│
└── App.jsx                     ✅ UPDATED - Thêm route /payment/callback
```

---

## 🔐 Mã phản hồi VNPay

| Code | Ý nghĩa |
|------|---------|
| `00` | ✅ Giao dịch thành công |
| `07` | ❌ Bị từ chối bởi ngân hàng |
| `09` | ❌ Thẻ chưa đăng ký Internet Banking |
| `10` | ❌ Xác thực sai quá 3 lần |
| `11` | ❌ Hết thời gian thanh toán |
| `24` | ❌ Giao dịch bị hủy |
| `51` | ❌ Tài khoản không đủ số dư |

---

## 🧪 Test Flow

### Test thanh toán thành công:
```
1. Login vào tài khoản user
2. Vào /course/:courseId
3. Click "Thanh toán ngay"
4. Tại VNPay sandbox, chọn "Ngân hàng NCB"
5. Nhập thông tin test:
   - Số thẻ: 9704198526191432198
   - Tên: NGUYEN VAN A
   - Ngày phát hành: 07/15
   - OTP: 123456
6. Xác nhận thanh toán
7. Được redirect về /payment/callback
8. Hiện "Thanh toán thành công"
9. Tự động chuyển sang /my-courses
10. Thấy khóa học vừa mua trong danh sách
```

### Test thanh toán thất bại:
```
1-3. Giống trên
4. Tại VNPay, click "Hủy giao dịch"
5. Được redirect về /payment/callback
6. Hiện "Thanh toán thất bại"
7. Tự động chuyển về /home
```

---

## ⚙️ Cấu hình Backend (Lưu ý cho Dev Backend)

Backend cần cấu hình:

1. **VNPay Credentials:**
```properties
vnpay.tmn_code=YOUR_TMN_CODE
vnpay.hash_secret=YOUR_HASH_SECRET
vnpay.url=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
vnpay.return_url=http://localhost:5173/payment/callback
```

2. **API Endpoints:**
- `POST /api/payment/vnpay/create` - Tạo payment URL
- `GET /api/payment/:paymentId/status` - Check trạng thái (optional)
- `POST /api/progress/enroll/:courseId` - Enroll khóa học

---

## 📊 Database Schema (Tham khảo)

```sql
-- Bảng payments
CREATE TABLE payments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  course_id VARCHAR(50),
  amount DECIMAL(10,2),
  status VARCHAR(20), -- PENDING, SUCCESS, FAILED
  vnpay_txn_ref VARCHAR(50),
  vnpay_response_code VARCHAR(10),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Bảng enrollments (đã có)
CREATE TABLE enrollments (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  course_id VARCHAR(50),
  progress DECIMAL(5,2) DEFAULT 0,
  enrolled_at TIMESTAMP,
  last_accessed TIMESTAMP
);
```

---

## 🎯 Checklist hoàn thành

- [x] Tạo `paymentAPI.jsx`
- [x] Tạo `PaymentCallback.jsx`
- [x] Update `CourseDetail.jsx` - thêm `handlePayment()`
- [x] Update `App.jsx` - thêm route `/payment/callback`
- [x] Update button text: "Đăng ký ngay" → "Thanh toán ngay"
- [x] Xử lý VNPay response codes
- [x] Auto enroll sau thanh toán thành công
- [x] Redirect đến My Courses
- [x] Toast notifications

---

## 🚀 Luồng hoàn chỉnh (Summary)

```
[User] → View Course Detail
   ↓
[Click] "Thanh toán ngay"
   ↓
[Frontend] Call PaymentAPI.createVNPayPayment()
   ↓
[Backend] Generate VNPay payment URL
   ↓
[Redirect] User → VNPay Website
   ↓
[User] Nhập thông tin thẻ & OTP
   ↓
[VNPay] Process payment
   ↓
[Callback] VNPay → /payment/callback?vnp_ResponseCode=00&courseId=xxx
   ↓
[Frontend] PaymentCallback.jsx xử lý:
   - Check vnp_ResponseCode
   - If success (00):
     * Save to localStorage
     * Call ProgressAPI.enrollCourse()
     * Toast success
     * Navigate to /my-courses
   - If failed:
     * Toast error
     * Navigate to /home
```

---

## 📝 Notes

1. **localStorage backup:** Dùng localStorage để đảm bảo enrollment được lưu ngay cả khi backend API fail
2. **CourseId in URL:** Thêm courseId vào payment URL để biết enroll khóa học nào sau khi thanh toán
3. **Error handling:** Xử lý đầy đủ các mã lỗi từ VNPay
4. **Auto redirect:** Tự động chuyển trang sau 2-3 giây
5. **Toast notifications:** Thông báo rõ ràng cho user

---

✅ **Hệ thống thanh toán đã hoàn chỉnh và sẵn sàng sử dụng!**
