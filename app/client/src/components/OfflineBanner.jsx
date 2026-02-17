import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Auto-hide reconnection message after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-16 left-0 right-0 z-50 ${
        isOnline
          ? 'bg-green-600'
          : 'bg-orange-600'
      } text-white px-4 py-3 shadow-lg animate-slide-down`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <>
              <Wifi className="w-5 h-5" />
              <span className="font-medium">{t('offline.reconnect')}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 animate-pulse" />
              <div>
                <div className="font-semibold">{t('offline.banner')}</div>
                <div className="text-sm opacity-90">{t('offline.jobsSaved')}</div>
              </div>
            </>
          )}
        </div>
        {isOnline && (
          <button
            onClick={() => setShowBanner(false)}
            className="text-white hover:text-green-100"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
