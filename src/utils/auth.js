/**
 * Utility function để logout an toàn
 * Clear tất cả data và redirect về auth page
 */
export const handleLogout = (navigate) => {
  // Clear all authentication data
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userRole");
  localStorage.removeItem("enrolledCourses");
  
  // Clear any other cached data
  sessionStorage.clear();
  
  console.log("✅ Logged out successfully");
  
  // Redirect to auth page
  navigate("/auth", { replace: true });
};

/**
 * Kiểm tra xem user có phải admin không
 */
export const isAdmin = () => {
  const role = localStorage.getItem("userRole");
  return role === "ADMIN" || role === "ROLE_ADMIN";
};

/**
 * Lấy thông tin user từ token
 */
export const getUserInfo = () => {
  const email = localStorage.getItem("userEmail");
  const role = localStorage.getItem("userRole");
  
  return {
    email: email || null,
    role: role || null,
    isAdmin: isAdmin()
  };
};

/**
 * Kiểm tra xem user đã login chưa
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("accessToken");
  return !!token;
};
