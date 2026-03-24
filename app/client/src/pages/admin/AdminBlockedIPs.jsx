import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminBlockedIPs = () => {
  const [blockedIps, setBlockedIps] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ ip_address: '', reason: '', duration_days: 30 });
  const limit = 100;

  useEffect(() => {
    fetchBlockedIps();
  }, [activeOnly, page]);

  const fetchBlockedIps = async () => {
    try {
      setLoading(true);
      const params = { limit, offset: page * limit, active_only: activeOnly };
      const { data } = await axios.get('/api/admin/blocked-ips', { params });
      setBlockedIps(data.blockedIps);
      setCounts(data.counts);
    } catch (error) {
      console.error('Failed to fetch blocked IPs:', error);
      alert('Failed to load blocked IPs');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (ip) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;
    try {
      await axios.delete(`/api/admin/blocked-ips/${ip}`);
      alert(`IP ${ip} unblocked successfully`);
      fetchBlockedIps();
    } catch (error) {
      alert('Failed to unblock IP');
    }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/blocked-ips', formData);
      alert(`IP ${formData.ip_address} blocked successfully`);
      setFormData({ ip_address: '', reason: '', duration_days: 30 });
      setShowForm(false);
      fetchBlockedIps();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to block IP');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blocked IPs</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          {showForm ? 'Cancel' : 'Block IP'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </div>
        <div className="bg-red-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-red-600">{counts.active}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Expired</div>
          <div className="text-2xl font-bold text-gray-600">{counts.expired}</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-lg font-bold mb-4">Block IP Address</h2>
          <form onSubmit={handleBlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">IP Address *</label>
              <input type="text" placeholder="e.g. 192.168.1.100" className="w-full border rounded p-2" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason *</label>
              <input type="text" placeholder="e.g. Suspicious activity" className="w-full border rounded p-2" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duration (days)</label>
              <input type="number" min="1" max="365" className="w-full border rounded p-2" value={formData.duration_days} onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })} />
            </div>
            <button type="submit" className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Block IP</button>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6">
        <label className="flex items-center">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="mr-2" />
          <span className="text-sm font-medium">Show active blocks only</span>
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blockedIps.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No blocked IPs found</td></tr>
              ) : (
                blockedIps.map((block) => (
                  <tr key={block.id}>
                    <td className="px-4 py-3 text-sm font-mono">{block.ip_address}</td>
                    <td className="px-4 py-3 text-sm">{block.reason}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        block.confidence >= 0.8 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{(block.confidence * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(block.blocked_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{block.expires_at ? new Date(block.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3 text-sm">
                      <button onClick={() => handleUnblock(block.ip_address)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">Unblock</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <div className="text-sm text-gray-600">Showing {page * limit + 1} - {Math.min((page + 1) * limit, counts.total)} of {counts.total}</div>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 border rounded disabled:opacity-50">Previous</button>
          <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= counts.total} className="px-4 py-2 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
};

export default AdminBlockedIPs;
