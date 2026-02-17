import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Bell, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

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

const BANK_DETAILS = {
  bank: 'BSP',
  accountName: 'WantokJobs Ltd',
  accountNumber: '7001234567',
  branch: 'Waigani',
};

function formatKina(amount) {
  return `K${Number(amount || 0).toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function JobseekerWallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBuy, setShowBuy] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyRef, setBuyRef] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [w, t] = await Promise.all([
        apiFetch('/wallet'),
        apiFetch('/wallet/transactions'),
      ]);
      setWallet(w.data || w);
      setTransactions((t.data || t.transactions || []).slice(0, 30));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy() {
    if (!buyAmount || Number(buyAmount) <= 0) return;
    setBuyLoading(true);
    try {
      const res = await apiFetch('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(buyAmount) }),
      });
      setBuyRef(res.data || res);
      setBuyAmount('');
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setBuyLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  const balance = wallet?.balance || 0;
  const alertCredits = wallet?.alert_credits ?? balance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <WalletIcon className="w-7 h-7 text-primary-600" /> My Wallet
        </h1>
        <button onClick={load} className="text-gray-500 hover:text-gray-700"><RefreshCw className="w-5 h-5" /></button>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5 opacity-80" />
          <p className="text-sm opacity-80">Alert Credits</p>
        </div>
        <p className="text-4xl font-bold">{formatKina(alertCredits)}</p>
        <p className="text-sm opacity-70 mt-1">Use credits to set up job alerts and premium features</p>
        <button
          onClick={() => { setShowBuy(true); setBuyRef(null); }}
          className="mt-4 bg-white text-primary-700 px-4 py-2 rounded-lg font-semibold hover:bg-primary-50 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Buy More Credits
        </button>
      </div>

      {/* Buy Credits */}
      {showBuy && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Buy Credits</h2>
            <button onClick={() => setShowBuy(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          {!buyRef ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Amount (PGK)</label>
              <input
                type="number"
                min="1"
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
                placeholder="e.g. 50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleBuy}
                disabled={buyLoading || !buyAmount}
                className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {buyLoading ? 'Processing…' : 'Get Payment Details'}
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 space-y-1">
              <p className="font-semibold text-green-800 mb-2">Transfer to:</p>
              <p><span className="font-medium">Bank:</span> {BANK_DETAILS.bank}</p>
              <p><span className="font-medium">Account Name:</span> {BANK_DETAILS.accountName}</p>
              <p><span className="font-medium">Account Number:</span> {BANK_DETAILS.accountNumber}</p>
              <p><span className="font-medium">Branch:</span> {BANK_DETAILS.branch}</p>
              <p className="mt-2"><span className="font-medium">Reference:</span>{' '}
                <span className="bg-green-100 px-2 py-0.5 rounded font-mono text-green-900">{buyRef.reference || buyRef.id || '—'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">Credits added once payment is confirmed.</p>
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="px-4 py-3 font-semibold text-gray-800 border-b border-gray-100">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-2 capitalize flex items-center gap-1">
                      {Number(t.amount) >= 0
                        ? <ArrowDownCircle className="w-4 h-4 text-green-500" />
                        : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                      {t.type}
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{formatKina(t.amount)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{t.description || '—'}</td>
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
