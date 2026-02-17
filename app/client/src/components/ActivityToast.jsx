import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Social proof toast notifications
 * Shows rotating activity events in bottom-left corner
 */
export default function ActivityToast() {
  const [events, setEvents] = useState([]);
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shownCount, setShownCount] = useState(0);

  // Fetch events once
  useEffect(() => {
    fetch('/api/activity/feed?limit=10')
      .then(r => r.json())
      .then(data => {
        if (data.events?.length > 0) {
          setEvents(data.events);
        }
      })
      .catch(() => {});
  }, []);

  // Rotate through events
  useEffect(() => {
    if (events.length === 0 || dismissed) return;
    
    // Show first toast after 3 seconds
    const initialDelay = setTimeout(() => {
      showNext(0);
    }, 3000);

    return () => clearTimeout(initialDelay);
  }, [events, dismissed]);

  const showNext = useCallback((index) => {
    if (index >= events.length || index >= 5 || dismissed) return; // Max 5 toasts
    
    setCurrent(events[index]);
    setVisible(true);
    setShownCount(index + 1);

    // Hide after 6 seconds
    setTimeout(() => {
      setVisible(false);
      // Show next after 2 second gap
      setTimeout(() => {
        showNext(index + 1);
      }, 2000);
    }, 6000);
  }, [events, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!current || dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 max-w-sm transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{current.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">
            {current.text}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTimeAgo(current.time)}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Progress dots */}
      <div className="flex justify-center gap-1 mt-2">
        {events.slice(0, 5).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < shownCount ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr + 'Z'); // UTC
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
