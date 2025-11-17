import axiosInstance from "../config/axios";

const UserAPI = {
  /**
   * 👤 Lấy thông tin user hiện tại
   */
  getCurrentUser: () => {
    return axiosInstance.get("/users/find-userId");
  },

  /**
   * 🔒 Đổi mật khẩu
   * @param {Object} data - { password, newPassword }
   */
  changePassword: (data) => {
    return axiosInstance.put("/users/change-password", data);
  },

  /**
   * ✏️ Cập nhật thông tin user
   * @param {FormData} formData - Form data with request JSON and avatarFile
   */
  updateUser: (formData) => {
    return axiosInstance.put("/users/update-user", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * 🗑️ Xóa user theo ID
   * @param {string} id - User ID
   */
  deleteUser: (id) => {
    return axiosInstance.get(`/users/delete/${id}`);
  },
};

export default UserAPI;
