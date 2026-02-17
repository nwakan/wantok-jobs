import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

/**
 * Dark mode toggle button
 */
export default function DarkModeToggle() {
  const [isDark, toggleDark] = useDarkMode();

  return (
    <button
      onClick={toggleDark}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
}
