import API from '../config/axios';

const AuthAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  googleLogin: (idToken) => API.post('/auth/google', { idToken }),
  verifyOtp: (data) => API.post('/auth/verify-otp', data),
  
  // Forgot Password Flow
  forgotPassword: (email) => API.post('/auth/forget-password', { email }),
  verifyOtpPassword: (data) => API.post('/auth/verify-otpPassword', data),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  
  // Refresh Token
  refreshToken: () => API.post('/auth/refresh-token'),
};

export default AuthAPI;
