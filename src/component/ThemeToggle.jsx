import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-all bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700"
      title={theme === 'dark' ? 'Chuyển sang theme sáng' : 'Chuyển sang theme tối'}
    >
      {theme === 'dark' ? (
        <span className="material-symbols-outlined text-yellow-400 text-xl">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-gray-700 text-xl">dark_mode</span>
      )}
    </button>
  );
}
