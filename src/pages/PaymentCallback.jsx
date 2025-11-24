import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "../utils/toast";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, failed, error
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    handlePaymentResult();
  }, [searchParams]);

  const handlePaymentResult = async () => {
    try {
      // Lấy params từ URL mà backend redirect về
      const statusParam = searchParams.get('status');
      const paymentId = searchParams.get('paymentId');
      const amount = searchParams.get('amount');
      const courses = searchParams.get('courses');
      const message = searchParams.get('message');
      const code = searchParams.get('code');

      console.log('💳 Payment Result:', { statusParam, paymentId, amount, courses, message });

      if (statusParam === 'success') {
        setStatus('success');
        setPaymentData({
          paymentId,
          amount: parseInt(amount),
          coursesEnrolled: parseInt(courses),
          message: decodeURIComponent(message || 'Thanh toán thành công')
        });

        toast.success(`Thanh toán thành công! Đã thêm ${courses} khóa học.`);

        // Optional: Fetch payment details từ API
        if (paymentId) {
          fetchPaymentDetails(paymentId);
        }

      } else if (statusParam === 'failed') {
        setStatus('failed');
        setPaymentData({
          message: decodeURIComponent(message || 'Thanh toán thất bại'),
          code
        });
        toast.error(decodeURIComponent(message || 'Thanh toán thất bại'));

      } else if (statusParam === 'error') {
        setStatus('error');
        setPaymentData({
          message: decodeURIComponent(message || 'Có lỗi xảy ra')
        });
        toast.error('Có lỗi xảy ra khi xử lý thanh toán');
      } else {
        // Fallback nếu không có params
        setStatus('error');
        setPaymentData({
          message: 'URL không hợp lệ'
        });
      }
    } catch (err) {
      console.error("❌ Error processing payment:", err);
      setStatus('error');
      setPaymentData({
        message: err.message || 'Có lỗi xảy ra'
      });
    }
  };

  const fetchPaymentDetails = async (paymentId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `http://localhost:8080/api/payment/${paymentId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        console.log('📊 Payment details:', response.data.data);
        // Có thể cập nhật thêm thông tin
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const handleGoToCourses = () => {
    navigate('/my-courses', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/home', { replace: true });
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="mb-6 inline-block h-16 w-16 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500"></div>
          <h2 className="text-2xl font-bold mb-2 text-white">
            Đang xử lý kết quả thanh toán...
          </h2>
          <p className="text-gray-400">Vui lòng đợi...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success' && paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
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
              {paymentData.message}
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Chi tiết giao dịch
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400 font-medium">Mã giao dịch:</span>
                <span className="text-white font-bold">{paymentData.paymentId}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400 font-medium">Số tiền:</span>
                <span className="text-green-400 font-bold text-xl">
                  {paymentData.amount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400 font-medium">Số khóa học:</span>
                <span className="text-white font-bold text-xl">{paymentData.coursesEnrolled}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGoToCourses}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Vào học ngay
            </button>
            <button
              onClick={handleGoHome}
              className="px-8 py-4 bg-gray-700 text-white text-lg font-semibold rounded-xl hover:bg-gray-600 transition-all duration-200"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  if (status === 'failed' && paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-500">
              Thanh toán thất bại
            </h2>
            <p className="mb-2 text-gray-300 text-lg">
              {paymentData.message}
            </p>
            {paymentData.code && (
              <p className="mb-6 text-gray-500 text-sm">
                Mã lỗi: {paymentData.code}
              </p>
            )}
            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
              >
                Thử lại
              </button>
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center p-12 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20">
            <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-yellow-500">
            Có lỗi xảy ra
          </h2>
          <p className="mb-6 text-gray-300 text-lg">
            {paymentData?.message || 'Không thể xử lý thanh toán'}
          </p>
          <button
            onClick={handleGoHome}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
