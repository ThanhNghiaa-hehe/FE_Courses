import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PaymentAPI from "../api/paymentAPI";
import toast from "../utils/toast";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // processing, success, failed
  const [message, setMessage] = useState("Đang xử lý thanh toán...");

  useEffect(() => {
    handlePaymentCallback();
  }, []);

  const handlePaymentCallback = async () => {
    try {
      // Lấy tất cả query params từ VNPay callback URL
      const queryParams = {};
      for (let [key, value] of searchParams.entries()) {
        queryParams[key] = value;
      }

      console.log("💳 Payment callback params:", queryParams);
      console.log("💳 Response Code:", queryParams.vnp_ResponseCode);

      // Gọi backend để xử lý VNPay return và tự động enroll
      const response = await PaymentAPI.handleVNPayReturn(queryParams);
      
      console.log("💳 Backend response:", response.data);

      // Kiểm tra response code từ VNPay
      const vnpResponseCode = queryParams.vnp_ResponseCode;

      if (vnpResponseCode === "00" && response.data.success) {
        // Thanh toán thành công
        console.log("✅ Payment successful!");
        setStatus("success");
        setMessage("Thanh toán thành công!");

        // Backend trả về coursesEnrolled (số lượng khóa học đã enroll)
        const coursesEnrolled = response.data.data?.coursesEnrolled || 0;
        console.log(`✅ Enrolled ${coursesEnrolled} courses`);

        toast.success(`Thanh toán thành công! Đã thêm ${coursesEnrolled} khóa học.`);

        // Chuyển đến My Courses ngay lập tức
        console.log("🚀 Navigating to /my-courses...");
        setTimeout(() => {
          navigate("/my-courses", { replace: true });
        }, 1500);
      } else {
        // Thanh toán thất bại hoặc bị hủy
        console.log("❌ Payment failed with code:", vnpResponseCode);
        setStatus("failed");
        const errorMessages = {
          "07": "Giao dịch bị từ chối bởi ngân hàng",
          "09": "Thẻ chưa đăng ký Internet Banking",
          "10": "Xác thực thông tin thẻ không đúng quá 3 lần",
          "11": "Hết thời gian thanh toán",
          "12": "Thẻ bị khóa",
          "13": "OTP không đúng",
          "24": "Bạn đã hủy giao dịch thanh toán",
          "51": "Tài khoản không đủ số dư",
          "65": "Vượt quá số lần nhập OTP",
          "75": "Ngân hàng đang bảo trì",
          "79": "Giao dịch vượt quá số tiền cho phép",
        };

        const errorMessage = errorMessages[vnpResponseCode] || "Thanh toán không thành công!";
        setMessage(errorMessage);
        toast.error(errorMessage);

        // Chuyển về home
        setTimeout(() => {
          navigate("/home");
        }, 3000);
      }
    } catch (err) {
      console.error("❌ Error processing payment callback:", err);
      console.error("❌ Error response:", err.response?.data);
      setStatus("failed");
      setMessage(err.response?.data?.message || err.message || "Có lỗi xảy ra khi xử lý thanh toán");
      toast.error("Có lỗi xảy ra!");
      
      setTimeout(() => {
        navigate("/home");
      }, 3000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center p-8 rounded-xl max-w-md w-full" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {status === "processing" && (
          <>
            <div className="mb-6 inline-block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500"></div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Đang xử lý thanh toán
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Vui lòng đợi...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
              <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-500">
              Thanh toán thành công!
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Bạn đã được thêm vào khóa học.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Đang chuyển đến My Courses...
            </p>
            <button
              onClick={() => navigate("/my-courses")}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Đi đến My Courses ngay
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
              <span className="material-symbols-outlined text-5xl text-red-500">cancel</span>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-500">
              Thanh toán không thành công
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Đang chuyển về trang chủ...
            </p>
            <button
              onClick={() => navigate("/home")}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Quay lại ngay
            </button>
          </>
        )}
      </div>
    </div>
  );
}
