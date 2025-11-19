import axiosInstance from "../config/axios";

const CourseAPI = {
  /**
   * 📚 Lấy tất cả khóa học đã publish (user)
   * GET /api/courses
   */
  getAllPublishedCourses: () => {
    return axiosInstance.get("/courses");
  },

  /**
   * 📖 Lấy chi tiết khóa học theo ID
   * GET /api/courses/{id}
   * @param {string} id - Course ID
   */
  getCourseById: (id) => {
    return axiosInstance.get(`/courses/${id}`);
  },
};

export default CourseAPI;
