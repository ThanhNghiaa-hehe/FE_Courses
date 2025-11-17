import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen.jsx";
import Home from "./pages/Home.jsx";
import MyCourses from "./pages/MyCourses.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminCourses from "./pages/Admin.jsx";
import AdminCategories from "./pages/AdminCategories.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AuthModal from "./component/AuthModal.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/auth" element={<AuthModal />} />
        
        {/* User Routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/courses" element={<MyCourses />} />
        <Route path="/profile" element={<UserProfile />} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/courses" element={<AdminCourses />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
  