import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar.jsx";
import CourseAPI from "../api/courseAPI.jsx";
import AdminAPI from "../api/adminAPI.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }

    setUser({
      name: "User",
      email: localStorage.getItem("userEmail") || "user@example.com"
    });

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, coursesRes] = await Promise.all([
        AdminAPI.getAllCategories(),
        CourseAPI.getAllPublishedCourses()
      ]);
      
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data || []);
      }
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    navigate("/auth");
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-gray-400">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white">
                <span className="material-symbols-outlined">search</span>
              </button>
              <button 
                onClick={() => navigate("/profile")}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white"
                title="Thông tin cá nhân"
              >
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Welcome Banner */}
          <section className="mb-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-8 text-white">
              <div className="relative z-10">
                <h2 className="mb-2 text-3xl font-bold">Continue Your Learning Journey! 🚀</h2>
                <p className="mb-4 text-purple-100">You're making great progress. Keep it up!</p>
                <button className="rounded-lg bg-white px-6 py-2 font-semibold text-purple-600 transition hover:bg-gray-100">
                  Resume Learning
                </button>
              </div>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"></div>
              <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-white/10"></div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-blue-500">school</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">{courses.length}</h3>
              <p className="text-sm text-gray-400">Courses Available</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-green-500">category</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">{categories.length}</h3>
              <p className="text-sm text-gray-400">Categories</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-orange-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-orange-500">trending_up</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {courses.filter(c => c.level === 'Beginner').length}
              </h3>
              <p className="text-sm text-gray-400">Beginner Courses</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-purple-500">workspace_premium</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {courses.filter(c => c.level === 'Advanced').length}
              </h3>
              <p className="text-sm text-gray-400">Advanced Courses</p>
            </div>
          </section>

          {/* Categories Section */}
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Course Categories</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
                <p className="text-gray-400">No categories available yet</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="group cursor-pointer rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-6 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      <span className="material-symbols-outlined text-2xl text-white">
                        category
                      </span>
                    </div>
                    <h3 className="mb-1 font-bold text-white group-hover:text-purple-400">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {category.description || "Explore courses"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Featured Courses */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Featured Courses</h2>
                <button 
                  onClick={() => navigate("/courses")}
                  className="text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                  View All
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
                  <span className="material-symbols-outlined mb-3 text-5xl text-gray-700">
                    school
                  </span>
                  <p className="mb-4 text-gray-400">No courses available yet</p>
                  <button 
                    onClick={() => navigate("/courses")}
                    className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {courses.slice(0, 4).map((course) => (
                    <div
                      key={course.id}
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video overflow-hidden bg-gray-800">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/400x225/1a1a1a/666?text=No+Image";
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-gray-700">
                              school
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="mb-2 line-clamp-1 font-bold text-white group-hover:text-purple-400">
                          {course.title}
                        </h3>
                        <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {course.level}
                          </span>
                          <span className="font-semibold text-purple-400">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(course.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming & Activity */}
            <div className="space-y-6">
              {/* Upcoming Deadlines */}
              <div>
                <h2 className="mb-4 text-xl font-bold text-white">Upcoming</h2>
                <div className="space-y-3">
                  {[
                    { title: "React Quiz", date: "Tomorrow", color: "red" },
                    { title: "Python Project", date: "3 days", color: "orange" },
                    { title: "Design Assignment", date: "1 week", color: "blue" },
                  ].map((item, index) => (
                    <div key={index} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full bg-${item.color}-500`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs text-gray-400">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 p-6">
                <h3 className="mb-4 font-semibold text-white">This Week</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Study Time</span>
                    <span className="font-semibold text-white">12.5 hrs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Lessons Completed</span>
                    <span className="font-semibold text-white">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Quiz Score</span>
                    <span className="font-semibold text-green-500">92%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}