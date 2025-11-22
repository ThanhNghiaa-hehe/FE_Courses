import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

/**
 * Protected Route Component
 * Kiểm tra authentication và authorization
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem("accessToken");
  
  // Nếu không có token → redirect về auth
  if (!token) {
    console.warn("⚠️ No token found, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  try {
    // Decode token để kiểm tra
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Kiểm tra token hết hạn
    if (decoded.exp && decoded.exp < currentTime) {
      console.warn("⚠️ Token expired, clearing and redirecting to /auth");
      // Chỉ xóa token, giữ lại user data
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userRole");
      return <Navigate to="/auth" replace />;
    }

    // Nếu route yêu cầu admin role
    if (requireAdmin) {
      const userRole = decoded.role || decoded.authorities?.[0] || decoded.scope;
      
      if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
        console.warn("⚠️ Access denied: User is not admin");
        return <Navigate to="/home" replace />;
      }
    }

    // Token hợp lệ → render children
    return children;

  } catch (error) {
    console.error("❌ Invalid token:", error);
    // Chỉ xóa token, giữ lại user data
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    return <Navigate to="/auth" replace />;
  }
}
