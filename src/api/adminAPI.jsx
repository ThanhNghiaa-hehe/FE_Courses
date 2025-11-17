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
};

export default AdminAPI;
