import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Search, CheckCircle, XCircle, RefreshCw, Users, Clock, TrendingUp } from 'lucide-react';

const API = '/api';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function formatKina(amount) {
  return `K${Number(amount || 0).toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 text-${color}-600`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold text-${color}-700`}>{value}</p>
    </div>
  );
}

export default function WalletAdmin() {
  const [stats, setStats] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, d, r] = await Promise.all([
        apiFetch('/wallet/admin/stats'),
        apiFetch('/wallet/admin/deposits'),
        apiFetch('/wallet/admin/refunds'),
      ]);
      setStats(s.data || s);
      setDeposits(d.data || d.deposits || []);
      setRefunds(r.data || r.refunds || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMatch(id) {
    setActionLoading(`match-${id}`);
    try {
      await apiFetch(`/wallet/admin/deposits/${id}/match`, { method: 'POST' });
      load();
    } catch (e) {
      alert('Match failed: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefundAction(id, action) {
    setActionLoading(`${action}-${id}`);
    try {
      await apiFetch(`/wallet/admin/refunds/${id}/${action}`, { method: 'POST' });
      load();
    } catch (e) {
      alert(`${action} failed: ` + e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await apiFetch(`/wallet/admin/stats?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResult(res.data || res);
    } catch {
      setSearchResult({ error: 'Not found' });
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <WalletIcon className="w-7 h-7 text-primary-600" /> Wallet Admin
        </h1>
        <button onClick={load} className="text-gray-500 hover:text-gray-700"><RefreshCw className="w-5 h-5" /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Wallets" value={stats?.totalWallets ?? '—'} />
        <StatCard icon={TrendingUp} label="Total Balance" value={formatKina(stats?.totalBalance)} color="green" />
        <StatCard icon={Clock} label="Pending Deposits" value={stats?.pendingDeposits ?? '—'} color="yellow" />
        <StatCard icon={RefreshCw} label="Pending Refunds" value={stats?.pendingRefunds ?? '—'} color="blue" />
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search wallet by email or user ID…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button type="submit" disabled={searching} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {searching ? '…' : 'Search'}
          </button>
        </form>
        {searchResult && (
          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
            {searchResult.error ? (
              <p className="text-red-600">{searchResult.error}</p>
            ) : (
              <div>
                <p><span className="font-medium">User:</span> {searchResult.email || searchResult.userId || '—'}</p>
                <p><span className="font-medium">Balance:</span> {formatKina(searchResult.balance)}</p>
                <p><span className="font-medium">Total Transactions:</span> {searchResult.totalTransactions ?? '—'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Deposits */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" /> Pending Deposits ({deposits.length})
        </h3>
        {deposits.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No pending deposits.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Reference</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deposits.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{d.email || d.user_email || d.user_id || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">{formatKina(d.amount)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{d.reference || d.id}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(d.created_at)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleMatch(d.id)}
                        disabled={actionLoading === `match-${d.id}`}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> {actionLoading === `match-${d.id}` ? '…' : 'Match'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Refunds */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-100 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-500" /> Pending Refunds ({refunds.length})
        </h3>
        {refunds.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No pending refunds.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Reason</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {refunds.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.email || r.user_email || r.user_id || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatKina(Math.abs(r.amount))}</td>
                    <td className="px-4 py-2 text-gray-600">{r.description || r.reason || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => handleRefundAction(r.id, 'approve')}
                        disabled={!!actionLoading}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleRefundAction(r.id, 'reject')}
                        disabled={!!actionLoading}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
