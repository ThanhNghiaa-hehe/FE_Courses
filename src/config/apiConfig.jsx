const API_BASE_URL = 'http://localhost:8080/api';

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
  REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
  GOOGLE_LOGIN: `${API_BASE_URL}/auth/google`,
  FORGET_PASSWORD: `${API_BASE_URL}/auth/forget-password`,
  VERIFY_OTP_PASSWORD: `${API_BASE_URL}/auth/verify-otpPassword`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
};

export default API_BASE_URL;