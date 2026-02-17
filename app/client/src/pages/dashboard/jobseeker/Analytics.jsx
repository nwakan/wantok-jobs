import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/analytics/jobseeker`, { headers: getAuthHeader() })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load analytics');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Application Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse h-64" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="text-center py-12">
      <p className="text-red-500">{error}</p>
    </div>
  );

  const { funnel, timeline, responseRate, avgResponseDays, totalApplications, topCategories, tips } = data;

  const stageLabels = { pending: 'Pending', reviewed: 'Reviewed', shortlisted: 'Shortlisted', interviewed: 'Interviewed', offered: 'Offered', hired: 'Hired' };
  const funnelDisplay = funnel.map(f => ({ ...f, label: stageLabels[f.stage] || f.stage }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Application Analytics</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="📝" label="Total Applications" value={totalApplications} />
        <StatCard icon="📬" label="Response Rate" value={`${responseRate}%`} sub={responseRate >= 50 ? 'Great!' : responseRate >= 25 ? 'Average' : 'Needs improvement'} />
        <StatCard icon="⏱️" label="Avg Response Time" value={avgResponseDays ? `${avgResponseDays} days` : 'N/A'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Funnel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Application Funnel</h2>
          {totalApplications === 0 ? (
            <p className="text-gray-500 text-center py-8">No applications yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelDisplay} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Applications per Week</h2>
          {timeline.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent applications</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week_start" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Applications" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Top Categories Applied To</h2>
          {topCategories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={topCategories} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {topCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-1 text-sm">
                {topCategories.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                    <span className="text-gray-500 ml-auto">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">💡 Application Tips</h2>
          {tips.length === 0 ? (
            <p className="text-green-600 dark:text-green-400">You're doing great! Keep applying and following up.</p>
          ) : (
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-gray-700 dark:text-gray-300">
                  <span className="text-yellow-500 flex-shrink-0">⚡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
