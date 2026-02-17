import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../../../api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

const activityConfig = {
  registration: { icon: '👤', color: 'text-blue-600', verb: 'registered as' },
  job_posted: { icon: '💼', color: 'text-green-600', verb: 'posted' },
  application: { icon: '📝', color: 'text-purple-600', verb: 'applied for' },
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      admin.getDashboardStats().catch(() => null),
      admin.getStats().catch(() => null),
    ]).then(([dashboard, legacyStats]) => {
      setData(dashboard);
      setStats(legacyStats);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const w = data?.weekly || {};
  const h = data?.health || {};
  const p = data?.pending || {};
  const activity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Weekly Quick Stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">This Week</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Jobs Posted" value={w.jobs ?? 0} icon="💼" color="green" />
          <StatCard title="Applications" value={w.applications ?? 0} icon="📝" color="purple" />
          <StatCard title="New Users" value={w.users ?? 0} icon="👥" color="blue" />
          <StatCard title="Revenue" value={`K${(w.revenue ?? 0).toLocaleString()}`} icon="💰" color="orange" />
        </div>
      </div>

      {/* Platform Totals */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Platform Totals</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats?.totalUsers ?? h.totalUsers ?? 0} icon="👥" color="blue" />
          <StatCard title="Active Jobs" value={h.activeJobs ?? 0} icon="✅" color="green" />
          <StatCard title="Closed/Expired" value={h.expiredJobs ?? 0} icon="📦" color="orange" />
          <StatCard title="Total Jobs" value={h.totalJobs ?? 0} icon="💼" color="purple" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activity.map((a, i) => {
                const cfg = activityConfig[a.type] || activityConfig.registration;
                return (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <span className={`text-xl ${cfg.color}`}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        <span className="font-semibold">{a.actor}</span>{' '}
                        {cfg.verb} <span className="text-gray-600">{a.detail}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(a.time)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Items */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Items</h2>
          <div className="space-y-4">
            <Link to="/dashboard/admin/reports" className="flex items-center justify-between p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚩</span>
                <span className="font-medium text-gray-900">Unreviewed Reports</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{p.reports ?? 0}</span>
            </Link>
            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏢</span>
                <span className="font-medium text-gray-900">Pending Claims</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{p.claims ?? 0}</span>
            </div>
            <Link to="/dashboard/admin/orders" className="flex items-center justify-between p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <span className="font-medium text-gray-900">Pending Orders</span>
              </div>
              <span className="text-2xl font-bold text-orange-600">{p.refunds ?? 0}</span>
            </Link>
          </div>

          {/* System Health */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">System Health</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className="text-xl font-bold text-green-700">{h.activeJobs ?? 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-xs text-gray-500">Expired/Closed</p>
                <p className="text-xl font-bold text-gray-700">{h.expiredJobs ?? 0}</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center gap-2">
              <span className="text-green-600 text-lg">✓</span>
              <span className="text-sm text-green-800 font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      {stats && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">User Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-5 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Job Seekers</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalJobseekers || 0}</p>
            </div>
            <div className="text-center p-5 bg-green-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Employers</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalEmployers || 0}</p>
            </div>
            <div className="text-center p-5 bg-purple-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">New This Week</p>
              <p className="text-3xl font-bold text-purple-600">{stats.recentUsers || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/dashboard/admin/users" className="px-4 py-3 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-center text-sm">
            👥 Manage Users
          </Link>
          <Link to="/dashboard/admin/jobs" className="px-4 py-3 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition-colors text-center text-sm">
            💼 Manage Jobs
          </Link>
          <Link to="/dashboard/admin/fraud-security" className="px-4 py-3 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-colors text-center text-sm">
            🔒 Security
          </Link>
          <Link to="/dashboard/admin/reports" className="px-4 py-3 bg-purple-50 text-purple-700 font-semibold rounded-lg hover:bg-purple-100 transition-colors text-center text-sm">
            📊 Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
