'use client';

import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    // Cycle through: system -> light -> dark -> system
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex flex-col items-center p-1.5 sm:p-2 text-secondary-700 dark:text-secondary-300 hover:text-primary-500 transition-colors group"
      title={`Aktualny motyw: ${theme === 'system' ? 'systemowy' : theme === 'dark' ? 'ciemny' : 'jasny'}`}
    >
      <div className="relative w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform">
        {/* Sun icon - shown in light mode or system mode when light */}
        <svg
          className={`absolute inset-0 w-full h-full transition-all duration-300 ${
            resolvedTheme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        
        {/* Moon icon - shown in dark mode */}
        <svg
          className={`absolute inset-0 w-full h-full transition-all duration-300 ${
            resolvedTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
        
        {/* System indicator badge */}
        {theme === 'system' && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white dark:border-secondary-900 flex items-center justify-center">
            <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </span>
        )}
      </div>
      <span className="text-xs font-medium mt-1 hidden sm:block">
        {theme === 'system' ? 'Auto' : theme === 'dark' ? 'Ciemny' : 'Jasny'}
      </span>
    </button>
  );
}
