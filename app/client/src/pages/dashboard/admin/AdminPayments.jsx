import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-600',
};

export default function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [outboxStats, setOutboxStats] = useState({});
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/payments?status=${status}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      setPayments(res.data.payments || []);
    } catch (e) {
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, outboxRes] = await Promise.all([
        api.get('/admin/payments/stats'),
        api.get('/admin/payments/outbox-stats'),
      ]);
      setStats(statsRes.data || {});
      setOutboxStats(outboxRes.data || {});
    } catch (e) {}
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleVerify = async (id) => {
    setActionLoading(a => ({ ...a, [id]: 'verify' }));
    try {
      await api.post(`/admin/payments/${id}/verify`);
      showToast('Payment verified! Credits added and user notified.');
      fetchPayments(); fetchStats();
    } catch (e) {
      showToast(e.response?.data?.error || 'Verify failed', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [id]: null }));
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (shown to user):', 'Payment could not be verified.');
    if (!reason) return;
    setActionLoading(a => ({ ...a, [id]: 'reject' }));
    try {
      await api.post(`/admin/payments/${id}/reject`, { reason });
      showToast('Payment rejected and user notified.');
      fetchPayments(); fetchStats();
    } catch (e) {
      showToast(e.response?.data?.error || 'Reject failed', 'error');
    } finally {
      setActionLoading(a => ({ ...a, [id]: null }));
    }
  };

  const handleProcessOutbox = async () => {
    setActionLoading(a => ({ ...a, outbox: true }));
    try {
      const res = await api.post('/admin/payments/process-outbox');
      showToast(`Outbox processed: sent=${res.data.sent} failed=${res.data.failed}`);
      fetchStats();
    } catch (e) {
      showToast('Outbox processing failed', 'error');
    } finally {
      setActionLoading(a => ({ ...a, outbox: false }));
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return showToast('Select a CSV file first', 'error');
    const formData = new FormData();
    formData.append('csv', csvFile);
    setActionLoading(a => ({ ...a, csv: true }));
    try {
      const res = await api.post('/admin/payments/reconcile-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast(`Reconciliation: ${res.data.matched} matched, ${res.data.unmatched} unmatched`);
      fetchPayments(); fetchStats();
    } catch (e) {
      showToast('CSV upload failed', 'error');
    } finally {
      setActionLoading(a => ({ ...a, csv: false }));
      setCsvFile(null);
    }
  };

  const handleExpireStale = async () => {
    if (!window.confirm('Expire all payments pending >72h?')) return;
    try {
      const res = await api.post('/admin/payments/expire-stale');
      showToast(`Expired ${res.data.expired} stale payments`);
      fetchPayments(); fetchStats();
    } catch (e) {
      showToast('Expire failed', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.msg}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">💳 Payment Management</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: stats.pending || 0, color: 'text-yellow-600' },
          { label: 'Verified Today', value: stats.verified_today || 0, color: 'text-green-600' },
          { label: 'Total Revenue (PGK)', value: `K${(stats.total_revenue || 0).toFixed(2)}`, color: 'text-blue-600' },
          { label: 'WA Outbox Pending', value: outboxStats.pending || 0, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
          <input
            type="file"
            accept=".csv"
            onChange={e => setCsvFile(e.target.files[0])}
            className="text-sm"
          />
          <button
            onClick={handleCsvUpload}
            disabled={!csvFile || actionLoading.csv}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {actionLoading.csv ? 'Uploading...' : 'Reconcile CSV'}
          </button>
        </div>
        <button
          onClick={handleProcessOutbox}
          disabled={actionLoading.outbox}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {actionLoading.outbox ? 'Processing...' : `📤 Process WA Outbox (${outboxStats.pending || 0})`}
        </button>
        <button
          onClick={handleExpireStale}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm"
        >
          🕐 Expire Stale (&gt;72h)
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-4">
        {['pending', 'verified', 'rejected', 'expired'].map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              status === s ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No {status} payments found.</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['User', 'Plan', 'Amount', 'Bank', 'Status', 'Receipt', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.user_name}</div>
                    <div className="text-gray-400 text-xs">{p.user_email}</div>
                    {p.user_phone && <div className="text-gray-400 text-xs">{p.user_phone}</div>}
                  </td>
                  <td className="px-4 py-3">{p.plan_name || p.plan_id}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">K{parseFloat(p.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.bank_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.receipt_url ? (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer"
                        className="text-blue-600 hover:underline text-xs">View</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(p.id)}
                          disabled={actionLoading[p.id] === 'verify'}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                        >
                          {actionLoading[p.id] === 'verify' ? '...' : '✓ Verify'}
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          disabled={actionLoading[p.id] === 'reject'}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                        >
                          {actionLoading[p.id] === 'reject' ? '...' : '✗ Reject'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40">← Prev</button>
            <span className="text-sm text-gray-500">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={payments.length < PAGE_SIZE}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}