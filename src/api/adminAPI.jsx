import axiosInstance from "../config/axios";

const AdminAPI = {
  // ==================== COURSE CATEGORIES ====================
  
  /**
   * 📂 Tạo danh mục khóa học mới
   * @param {Object} data { code, name, description }
   */
  createCategory: (data) => {
    return axiosInstance.post("/admin/course-categories/create", data);
  },

  /**
   * 📋 Lấy tất cả danh mục
   */
  getAllCategories: () => {
    return axiosInstance.get("/admin/course-categories/getAll");
  },

  /**
   * ✏️ Cập nhật danh mục
   * @param {Object} data { id, code, name, description }
   */
  updateCategory: (data) => {
    return axiosInstance.put("/admin/course-categories/update", data);
  },

  /**
   * 🗑️ Xóa danh mục
   * @param {string} code - Category code
   */
  deleteCategory: (code) => {
    return axiosInstance.delete(`/admin/course-categories/delete/${code}`);
  },

  // ==================== COURSES ====================

  /**
   * 📚 Tạo khóa học mới
   * @param {Object} data { categoryCode, title, description, price, thumbnailUrl, duration, level, isPublished }
   */
  createCourse: (data) => {
    return axiosInstance.post("/admin/courses/create", data);
  },

  /**
   * 📖 Lấy tất cả khóa học (bao gồm cả unpublished)
   */
  getAllCourses: () => {
    return axiosInstance.get("/admin/courses/getAll");
  },

  /**
   * 🔍 Lấy chi tiết khóa học
   * @param {string} id - Course ID
   */
  getCourseById: (id) => {
    return axiosInstance.get(`/admin/courses/${id}`);
  },

  /**
   * ✏️ Cập nhật khóa học
   * @param {Object} data { id, categoryCode, title, description, price, thumbnailUrl, duration, level, isPublished }
   */
  updateCourse: (data) => {
    return axiosInstance.put("/admin/courses/update", data);
  },

  /**
   * 🗑️ Xóa khóa học
   * @param {string} id - Course ID
   */
  deleteCourse: (id) => {
    return axiosInstance.delete(`/admin/courses/delete/${id}`);
  },

  /**
   * 📤 Upload thumbnail cho khóa học
   * @param {File} file - Image file
   * @returns Response format: { success: true, data: "http://localhost:8080/static/courses/filename.jpg" }
   */
  uploadThumbnail: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post("/admin/courses/upload-thumbnail", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // ==================== USERS ====================

  /**
   * 👥 Lấy tất cả users (Admin only)
   */
  getAllUsers: () => {
    return axiosInstance.get("/admin/users/read-users");
  },

  /**
   * 🔄 Toggle user active status (Enable/Disable)
   * @param {string} id - User ID
   * @param {boolean} isActive - New active status
   */
  updateUserActive: (id, isActive) => {
    return axiosInstance.put(`/admin/users/active/${id}`, { isActive });
  },

  /**
   * 👑 Cập nhật role của user
   * @param {string} id - User ID
   * @param {Object} data - { role: "USER" | "ADMIN" }
   */
  updateUserRole: (id, data) => {
    return axiosInstance.put(`/admin/users/${id}/role`, data);
  },
};

export default AdminAPI;
