import { useEffect, useState } from 'react';

/**
 * Dark mode hook with system preference detection
 * Persists user preference in localStorage
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }
    
    // Fall back to system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Persist to localStorage
    localStorage.setItem('darkMode', isDark.toString());
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return [isDark, toggle];
}
