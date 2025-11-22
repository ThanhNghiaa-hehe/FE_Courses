import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: "home", label: "Dashboard", path: "/home" },
    { icon: "school", label: "My Courses", path: "/my-courses" },
    { icon: "favorite", label: "Favorites", path: "/favorites" },
  ];

  const settingsItems = [
    { icon: "account_circle", label: "Profile", path: "/profile" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`flex h-screen flex-col border-r border-gray-800 bg-gray-900 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-800 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
          <span className="text-xl font-bold text-white">C</span>
        </div>
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-white">CodeLearn</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto text-gray-400 hover:text-white"
        >
          <span className="material-symbols-outlined">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-800"></div>

        {/* Settings */}
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-800 p-4">
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0">
            <span className="text-sm font-bold text-white">U</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">User</p>
              <p className="truncate text-xs text-gray-400">
                {localStorage.getItem("userEmail") || "user@example.com"}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-lg bg-red-600 px-3 py-2.5 text-white transition hover:bg-red-700 ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Logout" : ""}
        >
          <span className="material-symbols-outlined text-[22px] flex-shrink-0">logout</span>
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
