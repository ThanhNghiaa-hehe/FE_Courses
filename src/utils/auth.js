/**
 * Utility function để logout an toàn
 * Clear authentication data nhưng giữ lại enrolled courses và favorites
 */
export const handleLogout = (navigate) => {
  // Backup enrolled courses và favorites trước khi clear
  const enrolledCourses = localStorage.getItem("enrolledCourses");
  const favoriteCourses = localStorage.getItem("favoriteCourses");
  
  // Backup tất cả progress data (có format: progress_userId_courseId)
  const progressData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("progress_")) {
      progressData[key] = localStorage.getItem(key);
    }
  }
  
  // Clear all localStorage
  localStorage.clear();
  
  // Restore enrolled courses và favorites
  if (enrolledCourses) {
    localStorage.setItem("enrolledCourses", enrolledCourses);
  }
  if (favoriteCourses) {
    localStorage.setItem("favoriteCourses", favoriteCourses);
  }
  
  // Restore progress data
  Object.keys(progressData).forEach(key => {
    localStorage.setItem(key, progressData[key]);
  });
  
  // Clear session storage
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
