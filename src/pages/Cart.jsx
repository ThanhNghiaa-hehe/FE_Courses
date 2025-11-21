import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CartAPI from "../api/cartAPI";
import {jwtDecode} from "jwt-decode";
import { getImageUrl } from "../config/apiConfig.jsx";

export default function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
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
      // Sửa thứ tự ưu tiên giống Home.jsx
      const uid = decoded.id || decoded.userId || decoded.sub;
      setUserId(uid);
      fetchCart(uid);
    } catch (e) {
      console.error("Token decode error:", e);
      navigate("/auth");
    }
  }, [navigate]);

  const fetchCart = async (uid) => {
    try {
      setLoading(true);
      // Backend endpoint: GET /api/cart/{userId}
      const res = await CartAPI.getCartByUserId(uid);

      if (res.data.success) {
        const cart = res.data.data;
        setCartItems(cart?.items || []);
        setTotalPrice(cart?.totalPrice || 0);
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
      alert("Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (courseId) => {
    try {
      const res = await CartAPI.deleteCartItem(userId, courseId);

      if (res.data.success) {
        await fetchCart(userId);
        alert("Đã xóa khỏi giỏ hàng");
      } else {
        alert(res.data.message || "Xóa thất bại");
      }
    } catch (err) {
      console.error("Error removing item:", err);
      alert("Lỗi khi xóa khỏi giỏ hàng");
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Giỏ hàng trống!");
      return;
    }
    // TODO: Implement checkout logic or payment integration
    alert("Tính năng thanh toán đang được phát triển!");
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
            <h1 className="text-2xl font-bold text-white">Giỏ hàng 🛒</h1>
            <p className="text-sm text-gray-400">
              {cartItems.length} khóa học
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-8">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Giỏ hàng trống</h2>
            <p className="text-gray-400 mb-6">
              Hãy thêm khóa học vào giỏ hàng để mua
            </p>
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-3 bg-primary rounded-lg hover:bg-primary/80"
            >
              Khám phá khóa học
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.courseId}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-primary transition"
                >
                  <div className="flex gap-4">
                    {/* Course Image */}
                    <img
                      src={getImageUrl(item.thumbnailUrl) || "/assets/default-course.jpg"}
                      alt={item.title}
                      className="w-32 h-24 object-cover rounded-lg"
                    />

                    {/* Course Info */}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
                        <span>{item.instructorName || "Instructor"}</span>
                        {item.rating && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">⭐</span>
                              <span>{item.rating}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>📚 {item.level}</span>
                        <span>⏱️ {item.duration}h</span>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right">
                        {item.discountedPrice ? (
                          <>
                            <div className="text-xl font-bold text-primary">
                              {item.discountedPrice.toLocaleString("vi-VN")}₫
                            </div>
                            <div className="text-sm text-gray-500 line-through">
                              {item.price.toLocaleString("vi-VN")}₫
                            </div>
                            {item.discountPercent > 0 && (
                              <div className="text-xs text-red-500">
                                Giảm {item.discountPercent}%
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xl font-bold text-primary">
                            {item.price.toLocaleString("vi-VN")}₫
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.courseId)}
                        className="text-red-500 hover:text-red-400 text-sm"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 sticky top-24">
                <h2 className="text-xl font-bold mb-4">Tổng cộng</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Tạm tính:</span>
                    <span>{totalPrice.toLocaleString("vi-VN")}₫</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Giảm giá:</span>
                    <span className="text-green-500">
                      {cartItems
                        .reduce(
                          (sum, item) =>
                            sum +
                            (item.price - (item.discountedPrice || item.price)),
                          0
                        )
                        .toLocaleString("vi-VN")}
                      ₫
                    </span>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Tổng:</span>
                      <span className="text-primary">
                        {totalPrice.toLocaleString("vi-VN")}₫
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-primary hover:bg-primary/80 rounded-lg font-bold text-lg"
                >
                  Thanh toán
                </button>

                <div className="mt-4 p-3 bg-gray-700/50 rounded text-sm text-gray-400">
                  <p className="mb-1">💳 Hỗ trợ thanh toán:</p>
                  <p>• Thẻ tín dụng/ghi nợ</p>
                  <p>• Ví điện tử</p>
                  <p>• Chuyển khoản ngân hàng</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
