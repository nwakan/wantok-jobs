import { useState, useEffect } from 'react';
import { Activity, Briefcase, UserPlus, FileText, Eye, TrendingUp } from 'lucide-react';

/**
 * Activity feed section for homepage
 * Shows recent platform activity as a timeline
 */
export default function ActivityFeed() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activity/feed?limit=15')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.events?.length) return null;

  const iconMap = {
    job_posted: { icon: Briefcase, color: 'bg-green-100 text-green-600' },
    signup: { icon: UserPlus, color: 'bg-blue-100 text-blue-600' },
    application: { icon: FileText, color: 'bg-purple-100 text-purple-600' },
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Live Activity</h2>
              <p className="text-sm text-gray-500">What's happening on WantokJobs right now</p>
            </div>
          </div>
          {/* Today's quick stats */}
          {data.stats && (
            <div className="hidden md:flex items-center gap-6 text-sm">
              {data.stats.jobsToday > 0 && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">{data.stats.jobsToday}</span>
                  <span className="text-gray-500">jobs today</span>
                </div>
              )}
              {data.stats.signupsToday > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <UserPlus className="w-4 h-4" />
                  <span className="font-semibold">{data.stats.signupsToday}</span>
                  <span className="text-gray-500">new members</span>
                </div>
              )}
              {data.stats.viewsToday > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <Eye className="w-4 h-4" />
                  <span className="font-semibold">{data.stats.viewsToday.toLocaleString()}</span>
                  <span className="text-gray-500">job views</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {data.events.slice(0, 8).map((event, idx) => {
            const config = iconMap[event.type] || iconMap.job_posted;
            const IconComponent = config.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className={`p-2 rounded-full flex-shrink-0 ${config.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <p className="flex-1 text-sm text-gray-700 min-w-0">
                  <span className="font-medium text-gray-900">{event.text}</span>
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                  {formatTimeAgo(event.time)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile today stats */}
        {data.stats && (
          <div className="md:hidden grid grid-cols-3 gap-3 mt-4">
            {data.stats.jobsToday > 0 && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-lg font-bold text-green-600">{data.stats.jobsToday}</div>
                <div className="text-xs text-gray-500">jobs today</div>
              </div>
            )}
            {data.stats.signupsToday > 0 && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-lg font-bold text-blue-600">{data.stats.signupsToday}</div>
                <div className="text-xs text-gray-500">new members</div>
              </div>
            )}
            {data.stats.viewsToday > 0 && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-lg font-bold text-amber-600">{data.stats.viewsToday.toLocaleString()}</div>
                <div className="text-xs text-gray-500">views</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
