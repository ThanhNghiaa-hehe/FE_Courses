import axiosInstance from "../config/axios";

const QuizAPI = {
  // ==================== USER APIs ====================
  
  /**
   * 📝 Get quiz for student (without answers)
   * GET /api/quizzes/{quizId}
   */
  getQuiz: (quizId) => {
    return axiosInstance.get(`/quizzes/${quizId}`);
  },

  /**
   * ✅ Submit quiz answers
   * POST /api/quizzes/submit
   * Body: { quizId, answers: [{ questionIndex, selectedAnswer }] }
   */
  submitQuiz: (data) => {
    return axiosInstance.post('/quizzes/submit', data);
  },

  /**
   * 📊 Get quiz attempts history
   * GET /api/quizzes/{quizId}/attempts
   */
  getQuizAttempts: (quizId) => {
    return axiosInstance.get(`/quizzes/${quizId}/attempts`);
  },

  /**
   * 🎯 Check if user passed quiz
   * GET /api/quizzes/{quizId}/passed
   */
  hasPassedQuiz: (quizId) => {
    return axiosInstance.get(`/quizzes/${quizId}/passed`);
  },

  /**
   * 🔍 Get quiz by lesson ID (User)
   * Note: Backend should have /api/quizzes/lesson/{lessonId}
   * For now, we'll use getAllQuizzes and filter
   */
  getQuizByLesson: async (lessonId) => {
    try {
      const response = await axiosInstance.get('/admin/quizzes/all');
      if (response.data.success) {
        const quiz = response.data.data.find(q => q.lessonId === lessonId);
        return {
          data: {
            success: !!quiz,
            data: quiz || null
          }
        };
      }
      return { data: { success: false, data: null } };
    } catch (err) {
      console.error('Error getting quiz by lesson:', err);
      return { data: { success: false, data: null } };
    }
  },

  // ==================== ADMIN APIs ====================

  /**
   * 📋 Get all quizzes (Admin)
   * GET /api/admin/quizzes/all
   */
  getAllQuizzes: () => {
    return axiosInstance.get('/admin/quizzes/all');
  },

  /**
   * ➕ Create quiz (Admin)
   * POST /api/admin/quizzes/create
   */
  createQuiz: (data) => {
    return axiosInstance.post('/admin/quizzes/create', data);
  },

  /**
   * 📖 Get quiz by ID (Admin - with answers)
   * GET /api/admin/quizzes/{quizId}
   */
  getQuizByIdAdmin: (quizId) => {
    return axiosInstance.get(`/admin/quizzes/${quizId}`);
  },

  /**
   * ✏️ Update quiz (Admin)
   * PUT /api/admin/quizzes/{quizId}
   */
  updateQuiz: (quizId, data) => {
    return axiosInstance.put(`/admin/quizzes/${quizId}`, data);
  },

  /**
   * 🗑️ Delete quiz (Admin)
   * DELETE /api/admin/quizzes/{quizId}
   */
  deleteQuiz: (quizId) => {
    return axiosInstance.delete(`/admin/quizzes/${quizId}`);
  },
};

export default QuizAPI;
