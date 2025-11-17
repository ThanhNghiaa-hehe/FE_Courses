import axiosInstance from "../config/axios";

const CourseAPI = {
  /**
   * 📚 Lấy tất cả khóa học đã publish (user)
   */
  getAllPublishedCourses: () => {
    return axiosInstance.get("/courses");
  },

  /**
   * 📖 Lấy chi tiết khóa học theo ID
   * @param {string} id - Course ID
   */
  getCourseById: (id) => {
    return axiosInstance.get(`/courses/${id}`);
  },

  /**
   * 🔍 Tìm kiếm khóa học theo từ khóa
   * @param {string} keyword - Từ khóa tìm kiếm
   */
  searchCourses: (keyword) => {
    return axiosInstance.get(`/courses/search?keyword=${keyword}`);
  },

  /**
   * 📂 Lấy khóa học theo danh mục
   * @param {string} categoryCode - Mã danh mục
   */
  getCoursesByCategory: (categoryCode) => {
    return axiosInstance.get(`/courses/category/${categoryCode}`);
  },
};

export default CourseAPI;
