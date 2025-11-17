import React from "react";

import { useNavigate } from "react-router-dom";

export default function SplashScreen() {
  const navigate = useNavigate();
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background-dark text-white font-display">
      {/* Dynamic Background Container */}
      <div className="absolute inset-0 z-0">
        {/* This image represents the dynamic, animated background of code, nodes, and circuits */}
        <img
          alt="Abstract background with glowing blue lines and network patterns representing code and data nodes on a dark digital circuit board."
          className="h-full w-full object-cover opacity-30"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKOQZltFx3CTO_2KxtRkrnKXEHwQvsg51iDFzpY0rDlpTvo-XYnPwU2FMmR6zHBcLBAtA-t0gB5tZ7oA-ysFiNzsGm1LL8XaJfFhL4ZZJhN4bb3KCmy9MgIvq4xiwN6RdK5ob4EMxHp2_wkfLHG6YHY75ajOUML6wNZZbk2PasreTOe7gkdpqdNXuJmOqRCFMVRSlCh7QLWwdi58zYko2HBDXbDKfb79fAnvlAgSckFujkAlQ-d6CjOO6nucpBNNozT7YxXbqyYG0"
        />
        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background-dark/30 via-background-dark/80 to-background-dark"></div>
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Logo */}
          <div className="flex items-center gap-3 pb-4">
            <span className="material-symbols-outlined text-primary text-5xl">
              data_object
            </span>
            {/* HeadlineText component */}
            <h1 className="text-white tracking-light text-[32px] font-bold leading-tight md:text-5xl">
              CodeLearn
            </h1>
          </div>
          {/* BodyText component (Tagline) */}
          <p className="text-white/80 text-lg font-normal leading-normal pb-3 pt-1 px-4 text-center md:text-xl">
            Master the Code. Build Your Future.
          </p>
        </div>

        <div className="absolute bottom-16 md:bottom-24">
          {/* SingleButton component */}
          <div className="flex px-4 py-3 justify-center">
            <button onClick={() => navigate("/auth")} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] transition-transform duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 focus:outline-none focus:ring-4 focus:ring-primary/50">
              <span className="truncate">Get started</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

