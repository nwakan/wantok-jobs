import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../../api';

export default function RateLimits() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/rate-limits');
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  const handleUnlock = async (userId) => {
    try {
      await api.post(`/api/admin/rate-limits/unlock/${userId}`);
      fetchData();
    } catch (err) {
      alert('Failed to unlock account');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const chartData = (data?.blocksByHour || []).map(d => ({
    ...d,
    label: d.hour.slice(11, 16),
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">🛡️ Rate Limit Monitor</h1>
        <button onClick={fetchData} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Refresh
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <p className="text-lg font-semibold dark:text-white">Total blocks (24h): <span className="text-red-600">{data?.totalBlocks24h || 0}</span></p>
      </div>

      {/* Blocks per hour chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Blocks per Hour (24h)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Blocked IPs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3 dark:text-white">Top Blocked IPs</h2>
        {data?.topBlockedIPs?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2 pr-4">IP</th>
                <th className="pb-2 pr-4">Count</th>
                <th className="pb-2 pr-4">Last Endpoint</th>
                <th className="pb-2">Last Time</th>
              </tr>
            </thead>
            <tbody>
              {data.topBlockedIPs.map((r, i) => (
                <tr key={i} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4 font-mono dark:text-gray-300">{r.ip}</td>
                  <td className="py-2 pr-4 dark:text-gray-300">{r.count}</td>
                  <td className="py-2 pr-4 dark:text-gray-300 truncate max-w-[200px]">{r.lastEndpoint}</td>
                  <td className="py-2 dark:text-gray-300">{new Date(r.lastTime).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-500 dark:text-gray-400">No blocked IPs in last 24h</p>}
      </div>

      {/* Top Endpoints */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3 dark:text-white">Top Hit Endpoints</h2>
        {data?.topEndpoints?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2 pr-4">Endpoint</th>
                <th className="pb-2">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {data.topEndpoints.map((e, i) => (
                <tr key={i} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4 font-mono dark:text-gray-300">{e.endpoint}</td>
                  <td className="py-2 dark:text-gray-300">{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-500 dark:text-gray-400">No endpoint hits in last 24h</p>}
      </div>

      {/* Active Lockouts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3 dark:text-white">Active Account Lockouts</h2>
        {data?.activeLockouts?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Locked Until</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.activeLockouts.map((u) => (
                <tr key={u.id} className="border-b dark:border-gray-700">
                  <td className="py-2 pr-4 dark:text-gray-300">{u.name}</td>
                  <td className="py-2 pr-4 dark:text-gray-300">{u.email}</td>
                  <td className="py-2 pr-4 dark:text-gray-300">{new Date(u.lockout_until).toLocaleString()}</td>
                  <td className="py-2">
                    <button onClick={() => handleUnlock(u.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                      Unlock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-500 dark:text-gray-400">No active lockouts</p>}
      </div>
    </div>
  );
}
