import axiosInstance from "../config/axios";

const FavoriteAPI = {
  /**
   * ❤️ Thêm khóa học vào danh sách yêu thích
   * POST /api/favorites/{userId}
   * @param {string} userId - User ID
   * @param {Object} request - FavoriteRequest { courseId, title, thumbnailUrl, price, ... }
   */
  addToFavorite: (userId, request) => {
    return axiosInstance.post(`/favorites/${userId}`, request);
  },

  /**
   * 📋 Lấy danh sách yêu thích của user
   * GET /api/favorites/{userId}
   * @param {string} userId - User ID
   */
  getUserFavorites: (userId) => {
    return axiosInstance.get(`/favorites/${userId}`);
  },

  /**
   * 🗑️ Xóa khóa học khỏi danh sách yêu thích
   * DELETE /api/favorites/{userId}/{courseId}
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   */
  removeFromFavorite: (userId, courseId) => {
    return axiosInstance.delete(`/favorites/${userId}/${courseId}`);
  },

  /**
   * ✅ Kiểm tra khóa học có trong danh sách yêu thích không
   * GET /api/favorites/{userId}/check/{courseId}
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   */
  checkInFavorite: (userId, courseId) => {
    return axiosInstance.get(`/favorites/${userId}/check/${courseId}`);
  },

  /**
   * 🔢 Đếm số lượng yêu thích
   * GET /api/favorites/{userId}/count
   * @param {string} userId - User ID
   */
  countFavorites: (userId) => {
    return axiosInstance.get(`/favorites/${userId}/count`);
  },

  /**
   * 🔄 Cập nhật trạng thái selected
   * PUT /api/favorites/{userId}/{courseId}/select?selected=true
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @param {boolean} selected - Selected status
   */
  updateSelectedStatus: (userId, courseId, selected) => {
    return axiosInstance.put(`/favorites/${userId}/${courseId}/select?selected=${selected}`);
  },

  /**
   * 🗑️ Xóa tất cả khóa học yêu thích
   * DELETE /api/favorites/{userId}/clear
   * @param {string} userId - User ID
   */
  clearFavorites: (userId) => {
    return axiosInstance.delete(`/favorites/${userId}/clear`);
  },
};

export default FavoriteAPI;
