import axiosInstance from "../config/axios";

const LessonAPI = {
  // ==================== CHAPTERS (Admin) ====================

  /**
   * 📁 Tạo chapter mới
   * @param {Object} data { courseId, title, description, order }
   */
  createChapter: (data) => {
    return axiosInstance.post("/admin/chapters/create", data);
  },

  /**
   * 📋 Lấy tất cả chapters của khóa học (Public - for users)
   * @param {string} courseId
   */
  getChaptersByCourse: (courseId) => {
    return axiosInstance.get(`/curriculum/course/${courseId}/chapters`);
  },

  /**
   * 📋 Lấy tất cả chapters của khóa học (Admin only)
   * @param {string} courseId
   */
  getChaptersByCourseAdmin: (courseId) => {
    return axiosInstance.get(`/admin/chapters/course/${courseId}`);
  },

  /**
   * 🔍 Lấy chi tiết chapter
   * @param {string} id - Chapter ID
   */
  getChapterById: (id) => {
    return axiosInstance.get(`/admin/chapters/${id}`);
  },

  /**
   * ✏️ Cập nhật chapter
   * @param {string} id - Chapter ID
   * @param {Object} data { title, description, order }
   */
  updateChapter: (id, data) => {
    return axiosInstance.put(`/admin/chapters/${id}`, data);
  },

  /**
   * 🗑️ Xóa chapter
   * @param {string} id - Chapter ID
   */
  deleteChapter: (id) => {
    return axiosInstance.delete(`/admin/chapters/${id}`);
  },

  // ==================== LESSONS (Admin) ====================

  /**
   * 📝 Tạo lesson mới
   * @param {Object} data { chapterId, courseId, title, description, content, videoUrl, duration, order, type }
   */
  createLesson: (data) => {
    return axiosInstance.post("/admin/lessons/create", data);
  },

  /**
   * 📚 Lấy lessons theo chapter (Public - for users)
   * @param {string} chapterId
   */
  getLessonsByChapter: (chapterId) => {
    return axiosInstance.get(`/curriculum/chapters/${chapterId}/lessons`);
  },

  /**
   * 📚 Lấy lessons theo chapter (Admin only)
   * @param {string} chapterId
   */
  getLessonsByChapterAdmin: (chapterId) => {
    return axiosInstance.get(`/admin/lessons/chapter/${chapterId}`);
  },

  /**
   * 📖 Lấy tất cả lessons của khóa học (Public - for users)
   * @param {string} courseId
   */
  getLessonsByCourse: (courseId) => {
    return axiosInstance.get(`/curriculum/course/${courseId}/full`);
  },

  /**
   * 📖 Lấy tất cả lessons của khóa học (Admin only)
   * @param {string} courseId
   */
  getLessonsByCourseAdmin: (courseId) => {
    return axiosInstance.get(`/admin/lessons/course/${courseId}`);
  },

  /**
   * 🔍 Lấy chi tiết lesson
   * @param {string} id - Lesson ID
   */
  getLessonById: (id) => {
    return axiosInstance.get(`/admin/lessons/${id}`);
  },

  /**
   * ✏️ Cập nhật lesson
   * @param {string} id - Lesson ID
   * @param {Object} data
   */
  updateLesson: (id, data) => {
    return axiosInstance.put(`/admin/lessons/${id}`, data);
  },

  /**
   * 🗑️ Xóa lesson
   * @param {string} id - Lesson ID
   */
  deleteLesson: (id) => {
    return axiosInstance.delete(`/admin/lessons/${id}`);
  },

  // ==================== USER LESSON ACCESS ====================

  /**
   * 👁️ Lấy lesson (user view với kiểm tra quyền truy cập)
   * @param {string} id - Lesson ID
   */
  getUserLesson: (id) => {
    return axiosInstance.get(`/lessons/${id}`);
  },

  /**
   * ❤️ Like lesson
   * @param {string} id - Lesson ID
   */
  likeLesson: (id) => {
    return axiosInstance.post(`/lessons/${id}/like`);
  },

  /**
   * ✅ Đánh dấu lesson hoàn thành
   * @param {string} id - Lesson ID
   */
  markLessonComplete: (id) => {
    return axiosInstance.post(`/lessons/${id}/complete`);
  },

  /**
   * 📊 Cập nhật tiến độ video
   * @param {string} id - Lesson ID
   * @param {number} percent - Phần trăm đã xem (0-100)
   */
  updateVideoProgress: (id, percent) => {
    return axiosInstance.post(`/lessons/${id}/progress`, null, {
      params: { percent }
    });
  },

  /**
   * 📝 Nộp bài quiz
   * @param {Object} submission { lessonId, answers: [{ questionId, selectedAnswer }] }
   */
  submitQuiz: (submission) => {
    return axiosInstance.post("/lessons/quiz/submit", submission);
  },

  /**
   * 🔒 Kiểm tra quyền truy cập lesson
   * @param {string} id - Lesson ID
   */
  checkLessonAccess: (id) => {
    return axiosInstance.get(`/lessons/${id}/access`);
  },

  // ==================== USER PROGRESS (Theo tài liệu API chuẩn) ====================

  /**
   * 🎯 Lấy chapters với progress (API chuẩn)
   * @param {string} courseId
   * @returns Response: { chapterId, title, order, totalLessons, completedLessons, progressPercent, isUnlocked, lessons: [...] }
   */
  getChaptersWithProgress: (courseId) => {
    return axiosInstance.get(`/progress/course/${courseId}/chapters`);
  },

  /**
   * 📈 Lấy tiến độ học tập
   * @param {string} courseId
   */
  getCourseProgress: (courseId) => {
    return axiosInstance.get(`/progress/course/${courseId}`);
  },

  /**
   * 🎯 Khởi tạo tiến độ khi đăng ký khóa học
   * @param {string} courseId
   */
  enrollCourse: (courseId) => {
    return axiosInstance.post(`/progress/enroll/${courseId}`);
  },

  /**
   * 📊 Cập nhật tiến độ video (API chuẩn)
   * @param {string} lessonId - Lesson ID
   * @param {number} percent - Phần trăm đã xem (0-100)
   */
  updateVideoProgress: (lessonId, percent) => {
    return axiosInstance.post(`/lessons/${lessonId}/progress`, null, {
      params: { percent }
    });
  },

  /**
   * ➡️ Lấy thông tin lesson tiếp theo (API chuẩn)
   * @param {string} lessonId - Current lesson ID
   * @returns Response: { nextLesson, requiresQuiz, courseCompleted, totalProgress }
   */
  getNextLesson: (lessonId) => {
    return axiosInstance.get(`/lessons/${lessonId}/next`);
  },
};

export default LessonAPI;
