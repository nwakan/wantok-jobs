import { useEffect } from 'react';

/**
 * Global keyboard shortcuts hook
 * 
 * Shortcuts:
 * - '/' : Focus search input
 * - 'Escape' : Close modals, unfocus inputs
 * - 'Ctrl+K' / 'Cmd+K' : Quick search (can be customized)
 */
export function useKeyboardShortcuts(callbacks = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // '/' - Focus search
      if (e.key === '/' && !isInputFocused()) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[name="search"], input[name="keyword"], input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        if (callbacks.onSearchFocus) callbacks.onSearchFocus();
      }
      
      // 'Escape' - Close/unfocus
      if (e.key === 'Escape') {
        // Unfocus active element
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        if (callbacks.onEscape) callbacks.onEscape();
      }
      
      // 'Ctrl+K' or 'Cmd+K' - Quick action (customizable)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (callbacks.onQuickAction) callbacks.onQuickAction();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [callbacks]);
}

/**
 * Check if an input element is currently focused
 */
function isInputFocused() {
  const activeElement = document.activeElement;
  return (
    activeElement &&
    (activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable)
  );
}

/**
 * Display keyboard shortcuts help modal (optional enhancement)
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', description: 'Focus search' },
    { key: 'Esc', description: 'Close modal / Unfocus' },
    { key: 'Ctrl+K', description: 'Quick search' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
        
        <div className="space-y-3">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-700">{description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
