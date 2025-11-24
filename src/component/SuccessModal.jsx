import React, { useEffect } from "react";

export default function SuccessModal({ isOpen, onClose, message, autoCloseDelay = 2000 }) {
  useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scaleIn">
        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer Circle Animation */}
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping"></div>
            
            {/* Success Icon */}
            <div className="relative bg-gradient-to-br from-green-400 to-green-600 rounded-full p-4 animate-bounce-slow">
              <svg
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Thành công!
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          {message || "Đăng nhập thành công!"}
        </p>

        {/* Confetti Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        {autoCloseDelay > 0 && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 animate-progress"
              style={{ animationDuration: `${autoCloseDelay}ms` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
