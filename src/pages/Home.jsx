import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Sidebar from "../component/Sidebar.jsx";
import CourseAPI from "../api/courseAPI.jsx";
import FavoriteAPI from "../api/favoriteAPI.jsx";
import CartAPI from "../api/cartAPI.jsx";
import { getImageUrl } from "../config/apiConfig.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      console.log("🔑 Decoded token:", decoded);
      
      // Lấy userId từ token - ưu tiên field 'id'
      const uid = decoded.id || decoded.userId || decoded.sub;
      console.log("👤 Extracted userId:", uid);
      setUserId(uid);
      
      setUser({
        name: decoded.fullname || decoded.name || "User",
        email: decoded.email || decoded.sub || localStorage.getItem("userEmail") || "user@example.com"
      });
    } catch (e) {
      console.error("Token decode error:", e);
    }

    fetchData();
  }, [navigate]);

  useEffect(() => {
    // Filter courses based on category and search query
    console.log("🔍 Filtering courses. Total:", courses.length);
    console.log("🏷️ Selected category:", selectedCategory);
    console.log("🔎 Search query:", searchQuery);
    
    let filtered = courses;

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((course) => course.categoryCode === selectedCategory);
      console.log(`📂 After category filter (${selectedCategory}):`, filtered.length);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`🔎 After search filter:`, filtered.length);
    }

    console.log("✨ Final filtered courses:", filtered.length);
    setFilteredCourses(filtered);
  }, [courses, selectedCategory, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching courses...");
      
      const coursesRes = await CourseAPI.getAllPublishedCourses();
      
      console.log("📡 Courses Response:", coursesRes);
      
      if (coursesRes.data.success) {
        const coursesData = coursesRes.data.data || [];
        console.log("✅ Courses loaded:", coursesData.length, "items");
        console.log("📚 Course data sample:", coursesData[0]);
        console.log("📊 All courses:", coursesData);
        setCourses(coursesData);
        
        // Extract unique categories from courses
        const uniqueCategories = [...new Set(coursesData.map(c => c.categoryCode))]
          .filter(Boolean)
          .map(code => ({
            code,
            name: coursesData.find(c => c.categoryCode === code)?.categoryName || code
          }));
        console.log("📂 Extracted categories:", uniqueCategories);
        setCategories(uniqueCategories);
      } else {
        console.warn("⚠️ Courses success = false");
      }
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      console.error("❌ Error details:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const handleAddToFavorite = async (course) => {
    if (!userId) {
      alert("Vui lòng đăng nhập!");
      return;
    }

    try {
      const favoriteRequest = {
        courseId: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        discountedPrice: course.discountedPrice,
        discountPercent: course.discountPercent,
        level: course.level,
        duration: course.duration,
        instructorName: course.instructorName,
        rating: course.rating,
        totalStudents: course.totalStudents,
      };

      const res = await FavoriteAPI.addToFavorite(userId, favoriteRequest);

      if (res.data.success) {
        alert("Đã thêm vào danh sách yêu thích! ❤️");
      } else {
        alert(res.data.message || "Thêm vào yêu thích thất bại");
      }
    } catch (err) {
      console.error("Error adding to favorite:", err);
      alert(err.response?.data?.message || "Lỗi khi thêm vào yêu thích");
    }
  };

  const handleAddToCart = async (course) => {
    if (!userId) {
      alert("Vui lòng đăng nhập!");
      return;
    }

    console.log("🛒 Adding to cart - userId:", userId);
    console.log("📚 Course:", course);

    try {
      const cartItem = {
        courseId: course.id,
        title: course.title,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        discountedPrice: course.discountedPrice,
        discountPercent: course.discountPercent,
        level: course.level,
        duration: course.duration,
        instructorName: course.instructorName,
        rating: course.rating,
        totalStudents: course.totalStudents,
      };

      console.log("📦 Cart item payload:", cartItem);
      const res = await CartAPI.addToCart(userId, cartItem);
      console.log("✅ Cart response:", res.data);

      if (res.data.success) {
        alert("Đã thêm vào giỏ hàng! 🛒");
      } else {
        alert(res.data.message || "Thêm vào giỏ hàng thất bại");
      }
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      console.error("❌ Error response:", err.response?.data);
      alert(err.response?.data?.message || "Lỗi khi thêm vào giỏ hàng");
    }
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
              <button 
                onClick={() => navigate("/favorites")}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white"
                title="Yêu thích"
              >
                <span className="material-symbols-outlined">favorite</span>
              </button>
              <button 
                onClick={() => navigate("/cart")}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white"
                title="Giỏ hàng"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
              </button>
              <button 
                onClick={() => navigate("/orders")}
                className="rounded-lg bg-gray-800 p-2 text-gray-400 transition hover:text-white"
                title="Đơn hàng"
              >
                <span className="material-symbols-outlined">receipt_long</span>
              </button>
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
          {/* Search and Filter Bar */}
          <section className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 pl-10 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === "ALL"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  Tất cả ({courses.length})
                </button>
                {categories.map((category) => {
                  const count = courses.filter((c) => c.categoryCode === category.code).length;
                  return (
                    <button
                      key={category.code}
                      onClick={() => setSelectedCategory(category.code)}
                      className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                        selectedCategory === category.code
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                      }`}
                    >
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-purple-500/50 transition">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-blue-500">school</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">{courses.length}</h3>
              <p className="text-sm text-gray-400">Tổng khóa học</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-green-500/50 transition">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-green-500">category</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">{categories.length}</h3>
              <p className="text-sm text-gray-400">Danh mục</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-orange-500/50 transition">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-orange-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-orange-500">trending_up</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {courses.filter((c) => c.level === "Beginner").length}
              </h3>
              <p className="text-sm text-gray-400">Cơ bản</p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-purple-500/50 transition">
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-purple-500">workspace_premium</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white">
                {courses.filter((c) => c.level === "Advanced").length}
              </h3>
              <p className="text-sm text-gray-400">Nâng cao</p>
            </div>
          </section>

          {/* Courses Grid */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedCategory === "ALL"
                    ? "Tất cả khóa học"
                    : categories.find((c) => c.code === selectedCategory)?.name || "Khóa học"}
                </h2>
                <p className="text-sm text-gray-400">
                  {filteredCourses.length} khóa học
                  {searchQuery && ` với từ khóa "${searchQuery}"`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
                <span className="material-symbols-outlined mb-4 text-6xl text-gray-700">
                  search_off
                </span>
                <h3 className="mb-2 text-xl font-bold text-white">Không tìm thấy khóa học</h3>
                <p className="mb-6 text-gray-400">
                  {searchQuery
                    ? `Không có khóa học nào phù hợp với "${searchQuery}"`
                    : "Chưa có khóa học trong danh mục này"}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                  }}
                  className="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
                >
                  Xem tất cả khóa học
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden bg-gray-800">
                      {course.thumbnailUrl ? (
                        <img
                          src={getImageUrl(course.thumbnailUrl)}
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

                      {/* Discount Badge */}
                      {course.discountPercent > 0 && (
                        <div className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                          -{course.discountPercent}%
                        </div>
                      )}

                      {/* Level Badge */}
                      <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {course.level}
                      </div>

                      {/* Quick Actions */}
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToFavorite(course);
                          }}
                          className="rounded-full bg-white/90 p-2 text-red-500 hover:bg-white"
                          title="Thêm vào yêu thích"
                        >
                          <span className="material-symbols-outlined text-xl">favorite</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(course);
                          }}
                          className="rounded-full bg-white/90 p-2 text-purple-600 hover:bg-white"
                          title="Thêm vào giỏ hàng"
                        >
                          <span className="material-symbols-outlined text-xl">shopping_cart</span>
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="mb-2 line-clamp-2 cursor-pointer font-bold text-white hover:text-purple-400"
                      >
                        {course.title}
                      </h3>

                      <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                        {course.description || "Khóa học chất lượng cao"}
                      </p>

                      {/* Instructor & Rating */}
                      {(course.instructorName || course.rating) && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
                          {course.instructorName && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              {course.instructorName}
                            </span>
                          )}
                          {course.rating && (
                            <>
                              {course.instructorName && <span>•</span>}
                              <span className="flex items-center gap-1">
                                <span className="text-yellow-500">⭐</span>
                                {course.rating}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Duration & Students */}
                      <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {course.duration}h
                          </span>
                        )}
                        {course.totalStudents && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {course.totalStudents.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                        <div>
                          {course.discountedPrice ? (
                            <div>
                              <div className="text-lg font-bold text-purple-400">
                                {course.discountedPrice.toLocaleString("vi-VN")}₫
                              </div>
                              <div className="text-xs text-gray-500 line-through">
                                {course.price.toLocaleString("vi-VN")}₫
                              </div>
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-purple-400">
                              {course.price.toLocaleString("vi-VN")}₫
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => navigate(`/course/${course.id}`)}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}