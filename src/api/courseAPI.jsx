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

  /**
   * 📚 Lấy toàn bộ nội dung khóa học (course + chapters + lessons)
   * GET /api/courses/{courseId}/content
   * @param {string} courseId - Course ID
   * @returns {Object} { course, chapters: [{ chapter, lessons: [...] }] }
   */
  getCourseContent: (courseId) => {
    return axiosInstance.get(`/courses/${courseId}/content`);
  },
};

export default CourseAPI;
