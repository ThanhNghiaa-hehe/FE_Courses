import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./component/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Home from "./pages/Home.jsx";
import MyCourses from "./pages/MyCourses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import CourseContent from "./pages/CourseContent.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import Favorites from "./pages/Favorites.jsx";
import PaymentCallback from "./pages/PaymentCallback.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminCourses from "./pages/Admin.jsx";
import AdminCourseContent from "./pages/AdminCourseContent.jsx";
import AdminCategories from "./pages/AdminCategories.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AuthModal from "./component/AuthModal.jsx";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthModal />} />
        
        {/* User Routes - Protected */}
        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/my-courses" element={
          <ProtectedRoute>
            <MyCourses />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId" element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        } />
        <Route path="/course/:courseId/learn" element={
          <ProtectedRoute>
            <CourseContent />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        } />
        
        {/* Payment Callback Route */}
        <Route path="/payment/callback" element={
          <ProtectedRoute>
            <PaymentCallback />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes - Protected & Require Admin Role */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/courses" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCourses />
          </ProtectedRoute>
        } />
        <Route path="/admin/courses/:courseId/content" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCourseContent />
          </ProtectedRoute>
        } />
        <Route path="/admin/categories" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminCategories />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
  