import axiosInstance from "../config/axios";

const CartAPI = {
  /**
   * 🛒 Thêm khóa học vào giỏ hàng
   * POST /api/cart/add/{userId}
   * @param {string} userId - User ID
   * @param {Object} cartItem - Cart item data (courseId, title, price, etc.)
   */
  addToCart: (userId, cartItem) => {
    return axiosInstance.post(`/cart/add/${userId}`, cartItem);
  },

  /**
   * 📋 Lấy giỏ hàng của user
   * GET /api/cart/{userId}
   * @param {string} userId - User ID
   */
  getCartByUserId: (userId) => {
    return axiosInstance.get(`/cart/${userId}`);
  },

  /**
   * 🗑️ Xóa khóa học khỏi giỏ hàng
   * DELETE /api/cart/{userId}/item/{courseId}
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   */
  deleteCartItem: (userId, courseId) => {
    return axiosInstance.delete(`/cart/${userId}/item/${courseId}`);
  },

  /**
   * 🔍 Lấy tất cả giỏ hàng (Admin/User)
   * GET /api/cart/all
   */
  getAllCarts: () => {
    return axiosInstance.get("/cart/all");
  },
};

export default CartAPI;
