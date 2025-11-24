import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { signInWithGoogle } from "../config/firebaseConfig.jsx";
import AuthAPI from "../api/authApi.jsx";
import toast from "../utils/toast.js";
 // Firebase config và signInWithGoogle

export default function AuthModal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("register");

  // Register state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [step, setStep] = useState("register");
  

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot Password state
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordToken, setForgotPasswordToken] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotPasswordStep, setForgotPasswordStep] = useState("email"); // email, verify-otp, reset-password
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // UI toggles
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading states
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const apiBase = "http://localhost:8080/api/auth";

  const safeJson = async (res) => {
    try { return await res.json(); } catch { return {}; }
  };

  // Register
  const register = async () => {
  try {
    setRegisterLoading(true);
    const res = await AuthAPI.register({
      fullname: fullName,
      email: registerEmail,
      password: registerPassword,
      phoneNumber,
    });

    const token = res.data?.data?.token;

    if (res.data.success && token) {
      setOtpToken(token);
      setStep("verify-otp"); // ← THÊM DÒNG NÀY để chuyển sang bước nhập OTP
      toast.success("Gửi OTP thành công! Vui lòng kiểm tra email của bạn.");
    } else {
      toast.error(res.data.message || "Register failed");
    }
  } catch (e) {
    toast.error(e.response?.data?.message || "Error");
  } finally {
    setRegisterLoading(false);
  }
};


  // Verify OTP
 const verifyOtp = async () => {
  try {
    setOtpLoading(true);

    console.log("👉 Running verifyOtp...");
    console.log("Token gửi lên:", otpToken);
    console.log("OTP gửi lên:", otpCode);

    const res = await AuthAPI.verifyOtp({
      token: otpToken,
      otp: otpCode,
    });

    console.log("👉 VERIFY RESPONSE:", res.data);

    if (res.data.success) {
      console.log("OTP OK, chuyển về login");
      setActiveTab("login");
    } else {
      console.warn("Server báo lỗi:", res.data.message);
    }

  } catch (e) {
    console.error("❌ VERIFY ERROR:", e);
    console.error("❌ RESPONSE ERROR:", e.response?.data);
  } finally {
    setOtpLoading(false);
  }
};




  // Login
  const login = async () => {
    try {
      setLoginLoading(true);
      const res = await AuthAPI.login({
        email: loginEmail,
        password: loginPassword,
      });

      console.log("🔍 LOGIN RESPONSE:", res.data);

      const accessToken = res.data?.data?.accessToken;

      if (res.data.success && accessToken) {
        // Decode JWT token để lấy role
        const decoded = jwtDecode(accessToken);
        console.log("🔓 Decoded Token:", decoded);
        
        let userRole = decoded.role || decoded.authorities?.[0] || decoded.scope;
        
        // Remove ROLE_ prefix if exists (Spring Security adds it)
        if (userRole && userRole.startsWith("ROLE_")) {
          userRole = userRole.substring(5); // "ROLE_ADMIN" -> "ADMIN"
        }
        
        console.log("👤 User Role:", userRole);

        // Backup enrolled courses và favorites trước khi clear
        const enrolledCourses = localStorage.getItem("enrolledCourses");
        const favoriteCourses = localStorage.getItem("favoriteCourses");

        // Clear old auth data
        localStorage.clear();
        
        // Restore user data
        if (enrolledCourses) {
          localStorage.setItem("enrolledCourses", enrolledCourses);
        }
        if (favoriteCourses) {
          localStorage.setItem("favoriteCourses", favoriteCourses);
        }
        
        // Set new auth data
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("userEmail", loginEmail);
        if (userRole) {
          localStorage.setItem("userRole", userRole);
        }
        
        console.log("✅ Auth data saved to localStorage");
        
        // Tự động redirect dựa vào role
        if (userRole === "ADMIN" || userRole === "ROLE_ADMIN") {
          console.log("🔴 Redirecting to ADMIN dashboard");
          navigate("/admin/dashboard", { replace: true });
        } else {
          console.log("🟢 Redirecting to USER home");
          navigate("/home", { replace: true });
        }
      } else {
        toast.error(res.data.message || "Login failed");
      }
    } catch (e) {
      console.error("❌ Login error:", e);
      toast.error(e.response?.data?.message || "Login error");
    } finally {
      setLoginLoading(false);
    }
  };


  // Firebase Google Sign-In
  const googleSignIn = async () => {
    try {
      setGoogleLoading(true);

      const idToken = await signInWithGoogle();

      const res = await AuthAPI.googleLogin(idToken);

      if (res.data.success) {
        const token = res.data.data?.accessToken;
        
        // Decode JWT token để lấy role
        const decoded = jwtDecode(token);
        let userRole = decoded.role || decoded.authorities?.[0] || decoded.scope;
        const userEmail = decoded.email || decoded.sub;
        
        // Remove ROLE_ prefix if exists (Spring Security adds it)
        if (userRole && userRole.startsWith("ROLE_")) {
          userRole = userRole.substring(5); // "ROLE_ADMIN" -> "ADMIN"
        }
        
        // Backup enrolled courses và favorites trước khi clear
        const enrolledCourses = localStorage.getItem("enrolledCourses");
        const favoriteCourses = localStorage.getItem("favoriteCourses");
        
        // Clear old data first
        localStorage.clear();
        
        // Restore user data
        if (enrolledCourses) {
          localStorage.setItem("enrolledCourses", enrolledCourses);
        }
        if (favoriteCourses) {
          localStorage.setItem("favoriteCourses", favoriteCourses);
        }
        
        // Set new auth data
        localStorage.setItem("accessToken", token);
        if (userEmail) {
          localStorage.setItem("userEmail", userEmail);
        }
        if (userRole) {
          localStorage.setItem("userRole", userRole);
        }
        
        // Tự động redirect dựa vào role
        if (userRole === "ADMIN" || userRole === "ROLE_ADMIN") {
          navigate("/admin/dashboard", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      } else {
        toast.error(res.data.message || "Google login failed");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Google login error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Forgot Password - Step 1: Send OTP to email
  const sendForgotPasswordOtp = async () => {
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.forgotPassword(forgotPasswordEmail);

      if (res.data.success) {
        setForgotPasswordToken(res.data.data?.token);
        setForgotPasswordStep("verify-otp");
        toast.success("OTP đã được gửi đến email của bạn!");
      } else {
        toast.error(res.data.message || "Gửi OTP thất bại");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Email không tồn tại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Forgot Password - Step 2: Verify OTP
  const verifyForgotPasswordOtp = async () => {
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.verifyOtpPassword({
        token: forgotPasswordToken,
        otp: forgotPasswordOtp,
      });

      if (res.data.success) {
        setForgotPasswordStep("reset-password");
        toast.success("Xác thực OTP thành công!");
      } else {
        toast.error(res.data.message || "OTP không đúng");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Xác thực OTP thất bại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Forgot Password - Step 3: Reset Password
  const resetPassword = async () => {
    try {
      setForgotPasswordLoading(true);
      const res = await AuthAPI.resetPassword({
        email: forgotPasswordEmail,
        token: forgotPasswordToken,
        newPassword: newPassword,
      });

      if (res.data.success) {
        toast.success("Đặt lại mật khẩu thành công!");
        // Reset states
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setForgotPasswordEmail("");
        setForgotPasswordOtp("");
        setNewPassword("");
        setActiveTab("login");
      } else {
        toast.error(res.data.message || "Đặt lại mật khẩu thất bại");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setForgotPasswordLoading(false);
    }
  };


  const Spinner = () => (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" className="opacity-75" />
    </svg>
  );

  const tabBase = "flex flex-1 flex-col items-center justify-center border-b-[3px] pb-3 pt-2";
  const registerTabClass = `${tabBase} ${activeTab === "register" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;
  const loginTabClass = `${tabBase} ${activeTab === "login" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;

  return (
    <div className="font-display bg-background-light dark:bg-background-dark">
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-black/50 p-4">
        <div className="absolute inset-0 z-[-1]">
          <img
            alt="Background"
            className="h-full w-full object-cover opacity-30"
            src="/assets/LoginAndRegister.png"
          />
        </div>
        <div className="w-full max-w-md rounded-lg bg-[#0A0A0A] p-8 shadow-2xl">
          <div className="mb-6 flex border-b border-gray-800">
            <button type="button" className={registerTabClass} onClick={() => setActiveTab("register")}>
              <p className="text-sm font-bold tracking-wider">Register</p>
            </button>
            <button type="button" className={loginTabClass} onClick={() => setActiveTab("login")}>
              <p className="text-sm font-bold tracking-wider">Login</p>
            </button>
          </div>

          {activeTab === "register" ? (
  <div className="flex flex-col gap-4">
    {step === "register" ? (
      <>
        <input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
        <input placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="form-input" />
        <input placeholder="Email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="form-input" />
        <input
          placeholder="Password"
          type={showRegisterPassword ? "text" : "password"}
          value={registerPassword}
          onChange={(e) => setRegisterPassword(e.target.value)}
          className="form-input"
        />
        <button onClick={() => setShowRegisterPassword((s) => !s)} className="text-sm text-gray-400">
          {showRegisterPassword ? "Hide Password" : "Show Password"}
        </button>
        <button onClick={register} disabled={registerLoading || !fullName || !registerEmail || !registerPassword || !phoneNumber} className="bg-primary text-white py-2 rounded">
          {registerLoading ? <Spinner /> : "Create Account"}
        </button>
      </>
    ) : (
      <>
        <p className="text-white mb-2">Nhập mã OTP đã được gửi đến email: {registerEmail}</p>
        <input placeholder="OTP Code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="form-input" />
        <button onClick={verifyOtp} disabled={otpLoading || !otpCode} className="bg-primary text-white py-2 rounded">
          {otpLoading ? <Spinner /> : "Verify OTP"}
        </button>
        <button onClick={() => setStep("register")} className="text-sm text-gray-400">
          Quay lại
        </button>
      </>
    )}
    <div className="my-2 text-center text-gray-500">OR</div>
    <button onClick={googleSignIn} disabled={googleLoading} className="border border-gray-600 text-white py-2 rounded">
      {googleLoading ? <Spinner /> : "Continue with Google"}
    </button>
  </div>
) :  (
            <div className="flex flex-col gap-4">
              <input placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="form-input" />
              <input
                placeholder="Password"
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="form-input"
              />
              <button onClick={() => setShowLoginPassword((s) => !s)} className="text-sm text-gray-400">
                {showLoginPassword ? "Hide Password" : "Show Password"}
              </button>
              
              {/* Forgot Password Link */}
              <button 
                onClick={() => setShowForgotPassword(true)} 
                className="text-sm text-primary hover:underline text-right"
              >
                Quên mật khẩu?
              </button>

              <button onClick={login} disabled={loginLoading || !loginEmail || !loginPassword} className="bg-primary text-white py-2 rounded disabled:opacity-50">
                {loginLoading ? <Spinner /> : "Login"}
              </button>
              
              <div className="my-2 text-center text-gray-500">OR</div>
              
              <button onClick={googleSignIn} disabled={googleLoading} className="border border-gray-600 text-white py-2 rounded">
                {googleLoading ? <Spinner /> : "Continue with Google"}
              </button>
            </div>
          )}
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-lg bg-[#0A0A0A] p-8 shadow-2xl border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Quên mật khẩu</h2>
                <button 
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordStep("email");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {forgotPasswordStep === "email" && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-400 text-sm">Nhập email của bạn để nhận mã OTP</p>
                  <input 
                    placeholder="Email" 
                    type="email"
                    value={forgotPasswordEmail} 
                    onChange={(e) => setForgotPasswordEmail(e.target.value)} 
                    className="form-input bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-primary"
                  />
                  <button 
                    onClick={sendForgotPasswordOtp} 
                    disabled={forgotPasswordLoading || !forgotPasswordEmail}
                    className="bg-primary text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Gửi OTP"}
                  </button>
                </div>
              )}

              {forgotPasswordStep === "verify-otp" && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-400 text-sm">Nhập mã OTP đã được gửi đến: <span className="text-white">{forgotPasswordEmail}</span></p>
                  <input 
                    placeholder="Mã OTP (6 chữ số)" 
                    value={forgotPasswordOtp} 
                    onChange={(e) => setForgotPasswordOtp(e.target.value)} 
                    className="form-input bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-primary"
                    maxLength="6"
                  />
                  <button 
                    onClick={verifyForgotPasswordOtp} 
                    disabled={forgotPasswordLoading || !forgotPasswordOtp}
                    className="bg-primary text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Xác thực OTP"}
                  </button>
                  <button 
                    onClick={() => setForgotPasswordStep("email")}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    ← Quay lại
                  </button>
                </div>
              )}

              {forgotPasswordStep === "reset-password" && (
                <div className="flex flex-col gap-4">
                  <p className="text-gray-400 text-sm">Nhập mật khẩu mới của bạn</p>
                  <input 
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="form-input bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded focus:border-primary"
                  />
                  <button 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="text-sm text-gray-400 hover:text-white text-left"
                  >
                    {showNewPassword ? "🙈 Ẩn mật khẩu" : "👁️ Hiện mật khẩu"}
                  </button>
                  <button 
                    onClick={resetPassword} 
                    disabled={forgotPasswordLoading || !newPassword || newPassword.length < 6}
                    className="bg-primary text-white py-2 rounded disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? <Spinner /> : "Đặt lại mật khẩu"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
