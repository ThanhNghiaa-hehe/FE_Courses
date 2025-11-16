import React, { useState } from "react";
import { signInWithGoogle } from "../config/firebaseConfig.jsx";
import AuthAPI from "../api/authApi.jsx";
 // Firebase config và signInWithGoogle

export default function AuthModal() {
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

  // UI toggles
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Loading states
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

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
      alert("Gửi OTP thành công! Vui lòng kiểm tra email của bạn.");
    } else {
      alert(res.data.message || "Register failed");
    }
  } catch (e) {
    alert(e.response?.data?.message || "Error");
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

    const accessToken = res.data?.data?.accessToken;

    if (res.data.success && accessToken) {
      localStorage.setItem("accessToken", accessToken);
      alert("Login OK!");
    } else {
      alert(res.data.message || "Login failed");
    }
  } catch (e) {
    alert(e.response?.data?.message || "Login error");
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
      localStorage.setItem("accessToken", token);
      alert("Google Login thành công");
    } else {
      alert(res.data.message || "Google login failed");
    }
  } catch (e) {
    alert(e.response?.data?.message || "Google login error");
  } finally {
    setGoogleLoading(false);
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
              <button onClick={() => setShowLoginPassword((s) => !s)}>
                {showLoginPassword ? "Hide Password" : "Show Password"}
              </button>
              <button onClick={login} disabled={loginLoading}>
                {loginLoading ? <Spinner /> : "Login"}
              </button>
              <button onClick={googleSignIn} disabled={googleLoading}>
                {googleLoading ? <Spinner /> : "Continue with Google"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
