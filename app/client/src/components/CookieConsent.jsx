import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'wantokjobs_cookie_consent';
const CONSENT_EXPIRY_DAYS = 180; // 6 months

function getConsent() {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Check expiry
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(preferences) {
  const data = {
    ...preferences,
    timestamp: Date.now(),
    expiry: Date.now() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));
}

export function getCookieConsent() {
  const consent = getConsent();
  return consent || { essential: true, analytics: false, marketing: false };
}

export function hasAnalyticsConsent() {
  return getCookieConsent().analytics === true;
}

export function hasMarketingConsent() {
  return getCookieConsent().marketing === true;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const all = { essential: true, analytics: true, marketing: true };
    saveConsent(all);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent({ ...preferences, essential: true });
    setVisible(false);
    setShowPreferences(false);
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
    setVisible(false);
    setShowPreferences(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Banner */}
      {!showPreferences && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center sm:text-left">
              🍪 We use cookies to improve your experience on WantokJobs. By continuing to browse, you agree to our use of essential cookies.
              {' '}
              <a href="/privacy" className="text-primary-600 hover:underline">Learn more</a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
              >
                Manage Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cookie Preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Choose which cookies you'd like to allow. Essential cookies are required for the site to function.
            </p>

            <div className="space-y-4 mb-6">
              {/* Essential */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Essential</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Required for basic site functionality</p>
                </div>
                <div className="w-11 h-6 bg-primary-600 rounded-full relative cursor-not-allowed opacity-75">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full" />
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Help us understand how you use the site</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                  className={`w-11 h-6 rounded-full relative transition-colors ${preferences.analytics ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${preferences.analytics ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Marketing</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Personalized ads and recommendations</p>
                </div>
                <button
                  onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                  className={`w-11 h-6 rounded-full relative transition-colors ${preferences.marketing ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${preferences.marketing ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRejectNonEssential}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition"
              >
                Essential Only
              </button>
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
