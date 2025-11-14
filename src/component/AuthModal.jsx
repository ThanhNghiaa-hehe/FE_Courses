import React, { useState } from "react";

// AuthModal: Converted from provided HTML to JSX with tabs + state + fetch APIs
export default function AuthModal() {
  const [activeTab, setActiveTab] = useState("register"); // 'register' | 'login'

  // Register form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const apiBase = "http://localhost:8080/api/auth";

  const register = async () => {
    try {
      const res = await fetch(`${apiBase}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: fullName,
          email: registerEmail,
          password: registerPassword,
          phoneNumber: phoneNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Expected format: { success: true, message: "...", data: {...} }
      if (res.ok && data.success) {
        alert(data.message || "Register success");
      } else {
        const msg = data.message || data.error || `Register failed (status ${res.status})`;
        alert(msg);
      }
    } catch (err) {
      alert(err?.message || "Register error");
    }
  };

  const login = async () => {
    try {
      const res = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Expected format: { success: true, message: "...", data: { accessToken: "..." } }
      const accessToken = data?.data?.accessToken || data.accessToken;
      if (res.ok && data.success && accessToken) {
        localStorage.setItem("accessToken", accessToken);
        alert(data.message || "Login success");
      } else {
        const msg = data.message || data.error || `Login failed (status ${res.status})`;
        alert(msg);
      }
    } catch (err) {
      alert(err?.message || "Login error");
    }
  };

  const googleSignIn = async () => {
    try {
      const res = await fetch(`${apiBase}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: "token_google" }),
      });
      const data = await res.json().catch(() => ({}));
      const accessToken = data?.data?.accessToken || data.accessToken;
      if (res.ok && (data.success || accessToken)) {
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
          alert(data.message || "Login success");
        } else {
          alert(data.message || "Google auth success");
        }
      } else {
        const msg = data.message || data.error || `Google auth failed (status ${res.status})`;
        alert(msg);
      }
    } catch (err) {
      alert(err?.message || "Google auth error");
    }
  };

  const tabBaseClass = "flex flex-1 flex-col items-center justify-center border-b-[3px] pb-3 pt-2";
  const registerTabClass = `${tabBaseClass} ${activeTab === "register" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;
  const loginTabClass = `${tabBaseClass} ${activeTab === "login" ? "border-b-primary text-white" : "border-b-transparent text-gray-500"}`;

  return (
    <div className="font-display bg-background-light dark:bg-background-dark">
      {/* Outer container (modal over splash background) */}
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-black/50 p-4">
        {/* Background Image/Splash Screen */}
        <div className="absolute inset-0 z-[-1]">
          <img
            alt="Abstract blue and purple neon light trails in a high-tech pattern."
            className="h-full w-full object-cover opacity-30"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuALoHXrRt3uQzY134KenohsIkBGNmE6hKnw2UcjVnz-_ifg3KRwYubt5qOl_0A37yMplxHz8lur-yDozzHDCydHpJ4UPFHxnXgV7-REGmc5ykSfojvBxqrsJ68SVoPlAwR81vouq-5ogDWtBXbH1jSndh8uFVDgSfZTaHwB3IdhTbSpkiNlgzpy_zUg4UpiTKgUWRgPu6zFGhjM-kpbXzz8MiqwkBoB0zTuPPS524u_f1DUUt24UV8HeW8pWBCRnH9nmk5gMbRquQ4"
          />
        </div>

        {/* Modal Container */}
        <div className="w-full max-w-md rounded-lg bg-[#0A0A0A] p-8 shadow-2xl">
          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-800">
              <button type="button" className={registerTabClass} onClick={() => setActiveTab("register")}>
                <p className="text-sm font-bold tracking-wider">Register</p>
              </button>
              <button type="button" className={loginTabClass} onClick={() => setActiveTab("login")}>
                <p className="text-sm font-bold tracking-wider">Login</p>
              </button>
            </div>
          </div>

          {/* Forms */}
          {activeTab === "register" ? (
            <div className="flex flex-col gap-4">
              {/* Full Name Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">person</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-4 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Full Name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </label>

              {/* Phone Number Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">phone</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-4 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Phone Number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </label>

              {/* Email Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">mail</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-4 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Email Address"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
              </label>

              {/* Password Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">lock</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-12 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                  <button type="button" className="absolute right-4 text-gray-500 hover:text-white">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </label>

              {/* Create Account Button */}
              <button
                type="button"
                onClick={register}
                className="mt-4 w-full rounded-lg bg-primary py-4 text-base font-bold text-white transition-transform duration-200 hover:scale-[1.02]"
              >
                Create Account
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-4">
                <hr className="w-full border-gray-800" />
                <p className="whitespace-nowrap text-sm text-gray-500">or continue with</p>
                <hr className="w-full border-gray-800" />
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={googleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#F2F2F2] py-4 text-base font-bold text-black transition-transform duration-200 hover:scale-[1.02]"
              >
                <svg className="h-6 w-6" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#4285F4"></path>
                  <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C42.845,35.917,44,32.321,44,28C44,25.43,43.862,22.73,43.611,20.083z" fill="#34A853"></path>
                  <path d="M10.264,28.736C9.458,26.532,9,24.21,9,21.821c0-2.388,0.458-4.71,1.264-6.914l-5.657-5.657C3.045,13.25,2,18.455,2,24s1.045,10.75,3.607,14.536L10.264,28.736z" fill="#FBBC05"></path>
                  <path d="M24,48c5.268,0,10.046-1.947,13.416-5.264l-5.657-5.657c-1.856,1.405-4.272,2.221-6.759,2.221c-5.223,0-9.654-3.343-11.303-8H2.389c1.947,8.274,9.282,14,17.611,14H24z" fill="#EA4335"></path>
                  <path d="M0,0h48v48H0z" fill="none"></path>
                </svg>
                Continue with Google
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Email Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">mail</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-4 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Email Address"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
              </label>

              {/* Password Input */}
              <label className="flex flex-col">
                <div className="relative flex w-full items-center">
                  <span className="material-symbols-outlined absolute left-4 text-gray-500">lock</span>
                  <input
                    className="form-input w-full rounded-lg border-none bg-[#1C1C1E] py-4 pl-12 pr-12 text-white placeholder:text-[#A9A9A9] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button type="button" className="absolute right-4 text-gray-500 hover:text-white">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </label>

              {/* Login Button */}
              <button
                type="button"
                onClick={login}
                className="mt-4 w-full rounded-lg bg-primary py-4 text-base font-bold text-white transition-transform duration-200 hover:scale-[1.02]"
              >
                Login
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-4">
                <hr className="w-full border-gray-800" />
                <p className="whitespace-nowrap text-sm text-gray-500">or continue with</p>
                <hr className="w-full border-gray-800" />
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                onClick={googleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#F2F2F2] py-4 text-base font-bold text-black transition-transform duration-200 hover:scale-[1.02]"
              >
                <svg className="h-6 w-6" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#4285F4"></path>
                  <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l5.657,5.657C42.845,35.917,44,32.321,44,28C44,25.43,43.862,22.73,43.611,20.083z" fill="#34A853"></path>
                  <path d="M10.264,28.736C9.458,26.532,9,24.21,9,21.821c0-2.388,0.458-4.71,1.264-6.914l-5.657-5.657C3.045,13.25,2,18.455,2,24s1.045,10.75,3.607,14.536L10.264,28.736z" fill="#FBBC05"></path>
                  <path d="M24,48c5.268,0,10.046-1.947,13.416-5.264l-5.657-5.657c-1.856,1.405-4.272,2.221-6.759,2.221c-5.223,0-9.654-3.343-11.303-8H2.389c1.947,8.274,9.282,14,17.611,14H24z" fill="#EA4335"></path>
                  <path d="M0,0h48v48H0z" fill="none"></path>
                </svg>
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
