import API from '../config/axios';

const AuthAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  googleLogin: (token) => API.post('/auth/google', { token }),
  verifyOtp: (data) => API.post('/auth/verify-otp', data),
};

export default AuthAPI;
