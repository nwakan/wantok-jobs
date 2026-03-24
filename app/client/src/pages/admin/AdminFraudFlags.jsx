import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminFraudFlags = () => {
  const [flags, setFlags] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, resolved: 0, high_severity: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', severity: '' });
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchFlags();
  }, [filters, page]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params = { limit, offset: page * limit, ...filters };
      const { data } = await axios.get('/api/admin/fraud/flags', { params });
      setFlags(data.flags);
      setCounts(data.counts);
    } catch (error) {
      console.error('Failed to fetch fraud flags:', error);
      alert('Failed to load fraud flags');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (flagId, action) => {
    const note = prompt(`Note for ${action}:`);
    try {
      await axios.post(`/api/admin/fraud/${flagId}/action`, { action, note });
      alert(`Fraud flag ${action}d successfully`);
      fetchFlags();
    } catch (error) {
      alert(`Failed to ${action} fraud flag`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fraud Flags</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-yellow-600">{counts.active}</div>
        </div>
        <div className="bg-green-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Resolved</div>
          <div className="text-2xl font-bold text-green-600">{counts.resolved}</div>
        </div>
        <div className="bg-red-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">High Severity</div>
          <div className="text-2xl font-bold text-red-600">{counts.high_severity}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <select className="border rounded p-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
          </select>
          <select className="border rounded p-2" value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
            <option value="">All Severities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {flags.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No fraud flags found</td></tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{flag.entity_name || 'N/A'}</div>
                      <div className="text-gray-500 text-xs">{flag.entity_type}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{flag.category}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        flag.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{flag.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        flag.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{flag.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {flag.status === 'active' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(flag.id, 'resolve')} className="px-3 py-1 bg-green-500 text-white rounded text-xs">Resolve</button>
                          <button onClick={() => handleAction(flag.id, 'escalate')} className="px-3 py-1 bg-orange-500 text-white rounded text-xs">Escalate</button>
                        </div>
                      )}
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

export default AdminFraudFlags;
