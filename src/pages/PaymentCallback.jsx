import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PaymentAPI from "../api/paymentAPI";
import toast from "../utils/toast";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing"); // processing, success, failed
  const [message, setMessage] = useState("Đang xử lý thanh toán...");
  const [paymentResponse, setPaymentResponse] = useState(null); // Lưu response JSON

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
        
        // Lưu toàn bộ response để hiển thị JSON
        setPaymentResponse(response.data);

        // Backend trả về coursesEnrolled (số lượng khóa học đã enroll)
        const coursesEnrolled = response.data.data?.coursesEnrolled || 0;
        console.log(`✅ Enrolled ${coursesEnrolled} courses`);

        toast.success(`Thanh toán thành công! Đã thêm ${coursesEnrolled} khóa học.`);

        // KHÔNG tự động chuyển hướng - để user xem thông tin và bấm button
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {status === "processing" && (
          <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <div className="mb-6 inline-block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500"></div>
            <h2 className="text-2xl font-bold mb-2 text-white">
              Đang xử lý thanh toán
            </h2>
            <p className="text-gray-400">Vui lòng đợi...</p>
          </div>
        )}

        {status === "success" && paymentResponse && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="text-center p-8 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-2xl">
              <div className="mb-4 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Thanh toán thành công!
              </h1>
              <p className="text-green-100 text-lg">
                Đã thêm {paymentResponse.data?.coursesEnrolled || 0} khóa học vào tài khoản của bạn
              </p>
            </div>

            {/* JSON Response Display */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Chi tiết giao dịch (Response JSON)
                </h2>
              </div>
              <div className="p-6">
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-green-400 font-mono">
                    {JSON.stringify(paymentResponse, null, 2)}
                  </code>
                </pre>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate("/my-courses", { replace: true })}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Vào My Courses
              </button>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-500">
              Thanh toán không thành công
            </h2>
            <p className="mb-6 text-gray-300 text-lg">
              {message}
            </p>
            <button
              onClick={() => navigate("/home", { replace: true })}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
            >
              Quay lại trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
