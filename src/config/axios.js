// src/config/axios.js
import axios from "axios";
import API_BASE_URL from "./apiConfig";

// 👉 Tạo một instance của axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cho phép gửi cookie nếu BE dùng refresh-token
});

// 🧩 Interceptor trước khi gửi request
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (nếu có)
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⚠️ Interceptor khi nhận response
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu token hết hạn hoặc lỗi 401 → có thể tự logout hoặc refresh token
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
      localStorage.removeItem("accessToken");
      // window.location.href = "/login"; // Tùy chọn: điều hướng về login
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
