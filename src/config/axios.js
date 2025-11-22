// src/config/axios.js
import axios from "axios";
import API_BASE_URL from "./apiConfig";

// 👉 Tạo một instance của axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true, // Tắt vì dùng JWT trong header, không cần cookies
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
    // Nếu token hết hạn hoặc lỗi 401 → tự logout và redirect
    if (error.response && error.response.status === 401) {
      console.warn("⚠️ Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
      
      // Clear all auth data
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      localStorage.removeItem("enrolledCourses");
      
      // Redirect to auth page
      if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
