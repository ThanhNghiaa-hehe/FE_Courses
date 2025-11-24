# Quiz System - Complete Guide

## 📝 Quiz JSON Structure

```json
{
  "id": "quiz_uuid",
  "lessonId": "lesson_uuid",
  "title": "Kiểm tra useState Hook",
  "timeLimit": 30,
  "passingScore": 70,
  "questions": [
    {
      "questionText": "useState hook dùng để làm gì?",
      "options": [
        "Quản lý state trong functional component",
        "Gọi API",
        "Render component",
        "Tạo side effect"
      ],
      "correctAnswer": "Quản lý state trong functional component"
    },
    {
      "questionText": "Cú pháp khai báo useState đúng là?",
      "options": [
        "const [state, setState] = useState(initialValue)",
        "const state = useState(initialValue)",
        "useState(state, setState)",
        "state = useState()"
      ],
      "correctAnswer": "const [state, setState] = useState(initialValue)"
    }
  ]
}
```

## 🔄 User Flow

### **1. Học Bài (Learning Flow)**
1. User vào `/course/:courseId/learn`
2. Xem video và học các lessons trong chapter
3. Hoàn thành tất cả lessons → Button Quiz xuất hiện

### **2. Làm Quiz (Quiz Taking Flow)**
1. Click button "Làm Quiz" → Navigate to `/course/:courseId/quiz/:quizId`
2. Màn hình intro hiển thị:
   - Số câu hỏi
   - Thời gian làm bài
   - Điểm đạt yêu cầu
3. Click "Bắt đầu làm bài"
4. Timer bắt đầu đếm ngược
5. Chọn đáp án cho từng câu hỏi
6. Click "Nộp bài" hoặc hết thời gian → Auto submit

### **3. Xem Kết Quả (Result Flow)**
1. Redirect to `/course/:courseId/quiz/:quizId/result`
2. Hiển thị:
   - Điểm số (X/Y)
   - Phần trăm (%)
   - Passed/Failed status
   - Số câu đúng/sai
3. **Nếu Pass:**
   - Button "Tiếp tục học" → Next chapter
   - Button "Làm lại" → Retry quiz
4. **Nếu Fail:**
   - Button "Xem lại bài giảng" → Back to course
   - Button "Thử lại" → Retry quiz

### **4. Lịch Sử (Attempts History)**
1. Navigate to `/course/:courseId/quiz/:quizId/attempts`
2. Hiển thị tất cả lần làm bài:
   - Thời gian
   - Điểm số
   - Pass/Fail status
   - Progress bar

## 🔐 Quiz Unlock Logic

### **Điều kiện hiển thị Quiz:**
```javascript
// Quiz button chỉ hiện khi:
1. Chapter có quiz (được tạo bởi admin)
2. Tất cả lessons trong chapter đã complete
3. User chưa pass quiz này
```

### **Điều kiện unlock Chapter tiếp theo:**
```javascript
// Chapter N+1 unlock khi:
1. Complete tất cả lessons trong Chapter N
2. Pass quiz của Chapter N (nếu có)
```

## 👨‍💼 Admin Flow

### **1. Tạo Quiz**
1. Login admin → `/admin/quizzes`
2. Chọn khóa học từ dropdown
3. Click "Tạo Quiz mới"
4. Fill form:
   - Chọn bài học (thường là bài cuối chapter)
   - Tiêu đề quiz
   - Thời gian (phút)
   - Điểm đạt (%)
   - Thêm câu hỏi (questions)
5. Mỗi câu hỏi:
   - Câu hỏi
   - 4 đáp án
   - Chọn đáp án đúng
6. Click "Tạo Quiz"

### **2. Sửa/Xóa Quiz**
1. Click "Sửa" → Update quiz content
2. Click "Xóa" → Remove quiz

## 🎯 API Endpoints Used

### **User APIs:**
```javascript
GET /api/quizzes/{quizId}           // Get quiz (no answers shown)
POST /api/quizzes/submit            // Submit quiz answers
GET /api/quizzes/{quizId}/attempts  // Get attempt history
GET /api/quizzes/{quizId}/passed    // Check if passed
```

### **Admin APIs:**
```javascript
POST /api/admin/quizzes/create      // Create quiz
GET /api/admin/quizzes/{quizId}     // Get quiz (with answers)
PUT /api/admin/quizzes/{quizId}     // Update quiz
DELETE /api/admin/quizzes/{quizId}  // Delete quiz
```

## 📊 Submit Request Example

```json
{
  "quizId": "quiz_uuid",
  "answers": [
    {
      "questionIndex": 0,
      "selectedAnswer": "Quản lý state trong functional component"
    },
    {
      "questionIndex": 1,
      "selectedAnswer": "const [state, setState] = useState(initialValue)"
    }
  ]
}
```

## 📈 Submit Response Example

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "quizId": "quiz_uuid",
    "score": 8,
    "totalQuestions": 10,
    "correctAnswers": 8,
    "passingScore": 70,
    "passed": true,
    "attemptDate": "2025-11-24T10:30:00"
  }
}
```

## 🎨 UI Components

### **Created Pages:**
1. `QuizPage.jsx` - Main quiz taking interface
2. `QuizResult.jsx` - Result display after submission
3. `QuizAttempts.jsx` - Attempts history page
4. `AdminQuizzes.jsx` - Admin CRUD interface

### **Created API:**
1. `quizAPI.jsx` - All quiz-related API calls

### **Updated Files:**
1. `CourseContent.jsx` - Added quiz button to chapters
2. `App.jsx` - Added quiz routes
3. `AdminSidebar.jsx` - Added Quizzes menu

## ✅ Features Implemented

- ✅ Quiz creation with multiple questions
- ✅ Timer countdown (auto-submit when time's up)
- ✅ Real-time answer selection
- ✅ Auto-grading after submission
- ✅ Pass/Fail determination
- ✅ Attempts history tracking
- ✅ Quiz unlock based on chapter completion
- ✅ Next chapter unlock based on quiz pass
- ✅ Admin CRUD for quizzes
- ✅ Animated UI with Tailwind CSS
- ✅ Responsive design

## 🚀 Testing Steps

### **Admin:**
1. Login as admin
2. Go to `/admin/quizzes`
3. Select a course
4. Create quiz for last lesson in chapter
5. Add 3-5 questions

### **User:**
1. Login as student
2. Enroll in course
3. Complete all lessons in chapter
4. Quiz button appears
5. Take quiz
6. See result
7. Try next chapter (if passed)

## 📝 Notes

- Quiz chỉ xuất hiện sau khi hoàn thành tất cả lessons
- Mỗi lesson có thể có 1 quiz
- User có thể làm lại quiz nhiều lần
- Chỉ cần pass 1 lần là unlock chapter tiếp theo
- Admin có thể xem câu trả lời đúng, user không xem được
- Timer tự động nộp bài khi hết giờ
- Progress được lưu trong database qua API
