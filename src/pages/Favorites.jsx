import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteAPI from "../api/favoriteAPI";
import CartAPI from "../api/cartAPI";
import {jwtDecode} from "jwt-decode";

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      // Ưa tiên field 'id'
      const uid = decoded.id || decoded.userId || decoded.sub;
      setUserId(uid);
      fetchFavorites(uid);
    } catch (e) {
      console.error("Token decode error:", e);
      navigate("/auth");
    }
  }, [navigate]);

  const fetchFavorites = async (uid) => {
    try {
      setLoading(true);
      console.log("🔄 Fetching favorites for userId:", uid);
      const res = await FavoriteAPI.getUserFavorites(uid);
      
      console.log("📡 Favorites Response:", res);
      console.log("✅ Success:", res.data.success);
      console.log("📚 Favorites Data:", res.data.data);

      if (res.data.success) {
        const favoritesData = res.data.data || [];
        // Backend trả về array với 1 object chứa favoriteItem array
        const favoriteItems = favoritesData[0]?.favoriteItem || [];
        console.log("✨ Setting favorites:", favoriteItems.length, "items");
        console.log("📖 First favorite sample:", favoriteItems[0]);
        setFavorites(favoriteItems);
      } else {
        console.warn("⚠️ Favorites success = false");
      }
    } catch (err) {
      console.error("❌ Error fetching favorites:", err);
      console.error("❌ Error details:", err.response?.data);
      alert("Không thể tải danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (courseId) => {
    try {
      const res = await FavoriteAPI.removeFromFavorite(userId, courseId);

      if (res.data.success) {
        setFavorites(favorites.filter((item) => item.courseId !== courseId));
        alert("Đã xóa khỏi danh sách yêu thích");
      } else {
        alert(res.data.message || "Xóa thất bại");
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
      alert("Đồi khi xóa khỏi danh sách yêu thích");
    }
  };

  const handleAddToCart = async (course) => {
    try {
      const cartItem = {
        courseId: course.courseId,
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

      const res = await CartAPI.addToCart(userId, cartItem);

      if (res.data.success) {
        alert("Đã thêm vào giỏ hàng!");
        navigate("/cart");
      } else {
        alert(res.data.message || "Thêm vào giỏ hàng thất bại");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert(err.response?.data?.message || "Lỗi khi thêm vào giỏ hàng");
    }
  };

  const handleViewCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <button
              onClick={() => navigate("/home")}
              className="text-gray-400 hover:text-white mb-2"
            >
              ← Quay lại
            </button>
            <h1 className="text-2xl font-bold text-white">
              Danh sách yêu thích ❤️
            </h1>
            <p className="text-sm text-gray-400">
              {favorites.length} khóa học
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-8">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold mb-2">
              Danh sách yêu thích trống
            </h2>
            <p className="text-gray-400 mb-6">
              Hãy thêm các khóa học bạn thích vào đây
            </p>
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-3 bg-primary rounded-lg hover:bg-primary/80"
            >
              Khám phá khóa học
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((course) => (
              <div
                key={course.courseId}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-primary transition group"
              >
                {/* Course Image */}
                <div className="relative overflow-hidden h-48">
                  <img
                    src={course.thumbnailUrl || "/assets/default-course.jpg"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => handleRemove(course.courseId)}
                      className="bg-red-600 hover:bg-red-700 p-2 rounded-full"
                      title="Xóa khỏi yêu thích"
                    >
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  {course.discountPercent > 0 && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-bold">
                      -{course.discountPercent}%
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary">
                    {course.title}
                  </h3>

                  {/* Instructor & Rating */}
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                    <span>{course.instructorName || "Instructor"}</span>
                    {course.rating && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span>{course.rating}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Course Details */}
                  <div className="flex items-center gap-3 mb-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <span>📚</span> {course.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <span>⏱️</span> {course.duration}h
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {course.discountedPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {course.discountedPrice?.toLocaleString("vi-VN") || 0}₫
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          {course.price?.toLocaleString("vi-VN") || 0}₫
                        </span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {course.price?.toLocaleString("vi-VN") || 0}₫
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(course)}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 rounded-lg font-medium"
                    >
                      Thêm vào giỏ
                    </button>
                    <button
                      onClick={() => handleViewCourse(course.courseId)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                      title="Xem chi tiết"
                    >
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
