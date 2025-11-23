import axiosInstance from "../config/axios";

const PaymentAPI = {
  /**
   * 💳 Tạo thanh toán VNPay (Direct course purchase)
   * POST /api/payment/vnpay/create
   * Body: { courseIds: string[], orderInfo: string }
   */
  createVNPayPayment: (data) => {
    return axiosInstance.post('/payment/vnpay/create', data);
  },

  /**
   * 🔄 Xử lý VNPay return callback (sau khi thanh toán)
   * GET /api/payment/vnpay/return?vnp_ResponseCode=...&vnp_TxnRef=...
   */
  handleVNPayReturn: (queryParams) => {
    return axiosInstance.get('/payment/vnpay/return', { params: queryParams });
  },

  /**
   * 📊 Kiểm tra trạng thái thanh toán
   * GET /api/payment/{paymentId}/status
   */
  getPaymentStatus: (paymentId) => {
    return axiosInstance.get(`/payment/${paymentId}/status`);
  },

  /**
   * 📜 Lấy lịch sử thanh toán của tôi
   * GET /api/payment/my-payments
   */
  getMyPayments: () => {
    return axiosInstance.get('/payment/my-payments');
  },

  /**
   * ✅ Lấy các thanh toán thành công
   * GET /api/payment/my-payments/success
   */
  getMySuccessfulPayments: () => {
    return axiosInstance.get('/payment/my-payments/success');
  },
};

export default PaymentAPI;
