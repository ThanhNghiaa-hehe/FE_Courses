import React, { useState } from "react";
import SplashScreen from "./pages/SplashScreen.jsx";
import AuthModal from "./component/AuthModal.jsx";

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  return (
    <>
      <SplashScreen onOpen={() => setShowAuthModal(true)} />
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />
          {/* Modal wrapper ensures click inside doesn't close */}
          <div className="relative z-10 w-full max-w-md">
            <AuthModal />
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -right-2 -top-2 rounded-full bg-[#1C1C1E] p-2 text-gray-400 hover:text-white shadow-lg"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
  