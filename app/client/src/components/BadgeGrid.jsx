import { useState, useEffect } from 'react';
import { badges as badgesApi } from '../api';
import { Award } from 'lucide-react';

export default function BadgeGrid({ userId, compact = false }) {
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId]);

  const loadBadges = async () => {
    try {
      if (userId) {
        const data = await badgesApi.getForUser(userId);
        // Public view - only earned badges
        setAllBadges((data.badges || []).map(b => ({ ...b, earned: true })));
      } else {
        const data = await badgesApi.getMy();
        setAllBadges(data.badges || []);
      }
    } catch {
      setAllBadges([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse grid grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  const earnedCount = allBadges.filter(b => b.earned).length;

  if (compact) {
    const earned = allBadges.filter(b => b.earned);
    if (earned.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {earned.map(badge => (
          <span
            key={badge.badge_type || badge.type}
            title={`${badge.badge_name || badge.name} — ${badge.description}`}
            className="text-xl cursor-default hover:scale-125 transition-transform"
          >
            {badge.icon}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Achievement Badges</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {earnedCount}/{allBadges.length} earned
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {allBadges.map(badge => (
          <div
            key={badge.type || badge.badge_type}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
              badge.earned
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700 shadow-sm'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-40 grayscale'
            }`}
            title={badge.earned ? `Earned: ${badge.earned_at ? new Date(badge.earned_at).toLocaleDateString() : ''}` : 'Not yet earned'}
          >
            <span className="text-2xl">{badge.icon}</span>
            <span className={`text-xs font-medium text-center leading-tight ${
              badge.earned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {badge.name || badge.badge_name}
            </span>
            {badge.earned && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
