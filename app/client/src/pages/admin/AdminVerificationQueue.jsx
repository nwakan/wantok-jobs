import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminVerificationQueue = () => {
  const [checks, setChecks] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, flagged: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', entity_type: '' });
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchChecks();
  }, [filters, page]);

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const params = {
        limit,
        offset: page * limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.entity_type && { entity_type: filters.entity_type }),
      };
      const { data } = await axios.get('/api/admin/verification/checks', { params });
      setChecks(data.checks);
      setCounts(data.counts);
    } catch (error) {
      console.error('Failed to fetch verification checks:', error);
      alert('Failed to load verification checks');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (checkId, action) => {
    const note = action === 'flag' 
      ? prompt('Enter note for flagging:')
      : action === 'reject' 
      ? prompt('Enter reason for rejection (optional):') 
      : null;
    
    if (action === 'flag' && !note) return;

    try {
      await axios.post(`/api/admin/verification/${checkId}/action`, { action, note });
      alert(`Verification ${action}d successfully`);
      fetchChecks();
    } catch (error) {
      console.error(`Failed to ${action} verification:`, error);
      alert(`Failed to ${action} verification`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Verification Queue</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
        </div>
        <div className="bg-green-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
        </div>
        <div className="bg-red-50 p-4 rounded shadow">
          <div className="text-sm text-gray-600">Flagged</div>
          <div className="text-2xl font-bold text-red-600">{counts.flagged}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full border rounded p-2"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Entity Type</label>
            <select
              className="w-full border rounded p-2"
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="employer">Employer</option>
              <option value="job">Job</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No verification checks found
                  </td>
                </tr>
              ) : (
                checks.map((check) => (
                  <tr key={check.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{check.id}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{check.entity_name || 'N/A'}</div>
                      <div className="text-gray-500 text-xs">
                        {check.entity_type} (ID: {check.entity_id})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{check.check_type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        check.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                        check.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(check.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        check.status === 'approved' ? 'bg-green-100 text-green-800' :
                        check.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(check.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {check.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(check.id, 'approve')}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(check.id, 'reject')}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(check.id, 'flag')}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                          >
                            Flag
                          </button>
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

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {page * limit + 1} - {Math.min((page + 1) * limit, counts.total)} of {counts.total}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * limit >= counts.total}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminVerificationQueue;
