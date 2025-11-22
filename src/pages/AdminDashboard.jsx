import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import toast from "../utils/toast.js";

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");
    
    if (!token) {
      navigate("/auth");
      return;
    }

    // Kiểm tra role admin - chỉ ADMIN hoặc ROLE_ADMIN mới được truy cập
    if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
      toast.error("Access denied! Admin only.");
      navigate("/home");
      return;
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const stats = [
    { label: "Total Courses", value: "45", icon: "school", color: "blue", change: "+12%" },
    { label: "Total Users", value: "1,234", icon: "people", color: "green", change: "+23%" },
    { label: "Active Enrollments", value: "3,456", icon: "assignment_turned_in", color: "purple", change: "+8%" },
    { label: "Revenue", value: "₫125M", icon: "payments", color: "orange", change: "+15%" },
  ];

  const recentCourses = [
    { title: "Java Spring Boot Master", students: 234, status: "Published", revenue: "₫35M" },
    { title: "ReactJS Advanced", students: 189, status: "Published", revenue: "₫28M" },
    { title: "Python Django Pro", students: 156, status: "Draft", revenue: "₫0" },
  ];

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-gray-400">Welcome back, Admin!</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white">
                  <span className="material-symbols-outlined">notifications</span>
                </button>
                <button className="rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-lg">
                  Quick Actions
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <span className={`material-symbols-outlined text-2xl text-${stat.color}-500`}>
                      {stat.icon}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-500">{stat.change}</span>
                </div>
                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Quick Stats */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Courses */}
            <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Recent Courses</h2>
              <div className="space-y-3">
                {recentCourses.map((course, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{course.title}</h3>
                      <p className="text-sm text-gray-400">{course.students} students enrolled</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`rounded px-3 py-1 text-xs font-semibold ${
                        course.status === "Published" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-gray-500/10 text-gray-500"
                      }`}>
                        {course.status}
                      </span>
                      <span className="text-sm font-bold text-orange-400">{course.revenue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/admin/courses")}
                  className="flex w-full items-center gap-3 rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span className="text-sm font-medium">Create Course</span>
                </button>
                <button
                  onClick={() => navigate("/admin/categories")}
                  className="flex w-full items-center gap-3 rounded-lg bg-purple-600 p-3 text-white transition hover:bg-purple-700"
                >
                  <span className="material-symbols-outlined">category</span>
                  <span className="text-sm font-medium">Manage Categories</span>
                </button>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="flex w-full items-center gap-3 rounded-lg bg-green-600 p-3 text-white transition hover:bg-green-700"
                >
                  <span className="material-symbols-outlined">people</span>
                  <span className="text-sm font-medium">View Users</span>
                </button>
                <button
                  onClick={() => navigate("/admin/analytics")}
                  className="flex w-full items-center gap-3 rounded-lg bg-orange-600 p-3 text-white transition hover:bg-orange-700"
                >
                  <span className="material-symbols-outlined">analytics</span>
                  <span className="text-sm font-medium">Analytics</span>
                </button>
              </div>
            </div>
          </div>

          {/* Activity Chart Placeholder */}
          <section className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Activity Overview</h2>
            <div className="flex h-64 items-center justify-center rounded-lg bg-gray-800/50">
              <div className="text-center">
                <span className="material-symbols-outlined mb-2 text-5xl text-gray-600">
                  show_chart
                </span>
                <p className="text-gray-400">Activity chart will be displayed here</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
