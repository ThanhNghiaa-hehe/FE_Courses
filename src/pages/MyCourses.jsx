import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar.jsx";
import CourseAPI from "../api/courseAPI.jsx";

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, inProgress, completed

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }

    fetchCourses();
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await CourseAPI.getAllPublishedCourses();
      
      if (response.data.success) {
        setCourses(response.data.data || []);
      } else {
        setError(response.data.message || "Failed to load courses");
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.response?.data?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    navigate("/auth");
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getLevelColor = (level) => {
    const colors = {
      Beginner: "text-green-500 bg-green-500/10",
      Intermediate: "text-yellow-500 bg-yellow-500/10",
      Advanced: "text-red-500 bg-red-500/10",
    };
    return colors[level] || "text-gray-500 bg-gray-500/10";
  };

  const filteredCourses = courses.filter((course) => {
    if (filter === "all") return true;
    // Có thể thêm logic filter theo progress sau
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">My Courses</h1>
                <p className="text-sm text-gray-400">
                  {courses.length} courses available
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchCourses}
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white"
                  title="Refresh"
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
                <button className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white">
                  <span className="material-symbols-outlined">search</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-4 flex gap-2">
              {[
                { key: "all", label: "All Courses", icon: "library_books" },
                { key: "inProgress", label: "In Progress", icon: "pending" },
                { key: "completed", label: "Completed", icon: "check_circle" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    filter === tab.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
                <p className="text-gray-400">Loading courses...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-8 text-center">
              <span className="material-symbols-outlined mb-3 text-5xl text-red-500">
                error
              </span>
              <h3 className="mb-2 text-lg font-semibold text-red-500">Error</h3>
              <p className="text-gray-400">{error}</p>
              <button
                onClick={fetchCourses}
                className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
              <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">
                school
              </span>
              <h3 className="mb-2 text-xl font-semibold text-white">
                No courses found
              </h3>
              <p className="mb-6 text-gray-400">
                Start exploring and enroll in courses to see them here
              </p>
              <button
                onClick={() => navigate("/explore")}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
              >
                Explore Courses
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10"
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
                        <span className="material-symbols-outlined text-6xl text-gray-700">
                          school
                        </span>
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getLevelColor(
                          course.level
                        )}`}
                      >
                        {course.level}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-white group-hover:text-purple-400">
                      {course.title}
                    </h3>
                    <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                      {course.description}
                    </p>

                    {/* Meta Info */}
                    <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">
                          schedule
                        </span>
                        {course.duration}h
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">
                          bar_chart
                        </span>
                        {course.level}
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-lg font-bold text-purple-400">
                          {formatPrice(course.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                      >
                        View Course
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar (optional - có thể thêm sau) */}
                  {/* <div className="px-5 pb-5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: "0%" }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">0% completed</p>
                  </div> */}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
