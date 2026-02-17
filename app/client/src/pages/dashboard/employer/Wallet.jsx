import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react';

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

const TX_ICONS = {
  deposit: <ArrowDownCircle className="w-4 h-4 text-green-500" />,
  debit: <ArrowUpCircle className="w-4 h-4 text-red-500" />,
  refund: <RefreshCw className="w-4 h-4 text-blue-500" />,
  credit: <ArrowDownCircle className="w-4 h-4 text-green-500" />,
};

export default function EmployerWallet() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Deposit flow
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositRef, setDepositRef] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);

  // Refund
  const [refundingTx, setRefundingTx] = useState(null);

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
      setTransactions((t.data || t.transactions || []).slice(0, 50));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeposit() {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setDepositLoading(true);
    try {
      const res = await apiFetch('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(depositAmount) }),
      });
      setDepositRef(res.data || res);
      setDepositAmount('');
    } catch (e) {
      alert('Failed to create deposit: ' + e.message);
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleRefund(txId) {
    if (!confirm('Request a refund for this transaction?')) return;
    setRefundingTx(txId);
    try {
      await apiFetch(`/wallet/refund/${txId}`, { method: 'POST' });
      alert('Refund requested successfully');
      load();
    } catch (e) {
      alert('Refund request failed: ' + e.message);
    } finally {
      setRefundingTx(null);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>;

  const balance = wallet?.balance || 0;

  // Simple usage chart — last 7 entries of debits
  const debits = transactions.filter(t => t.type === 'debit' || Number(t.amount) < 0).slice(0, 7).reverse();
  const maxDebit = Math.max(...debits.map(t => Math.abs(t.amount)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <WalletIcon className="w-7 h-7 text-primary-600" /> Wallet
        </h1>
        <button onClick={load} className="text-gray-500 hover:text-gray-700"><RefreshCw className="w-5 h-5" /></button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow-lg">
        <p className="text-sm opacity-80">Current Balance</p>
        <p className="text-4xl font-bold mt-1">{formatKina(balance)}</p>
        <div className="mt-4">
          <button
            onClick={() => { setShowDeposit(true); setDepositRef(null); }}
            className="bg-white text-primary-700 px-4 py-2 rounded-lg font-semibold hover:bg-primary-50 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Credits
          </button>
        </div>
      </div>

      {/* Deposit Flow Modal */}
      {showDeposit && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Credits</h2>
            <button onClick={() => setShowDeposit(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          {!depositRef ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Amount (PGK)</label>
              <input
                type="number"
                min="1"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleDeposit}
                disabled={depositLoading || !depositAmount}
                className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {depositLoading ? 'Processing…' : 'Get Bank Details'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-800 mb-2">Transfer the funds to:</p>
                <div className="text-sm space-y-1 text-green-700">
                  <p><span className="font-medium">Bank:</span> {BANK_DETAILS.bank}</p>
                  <p><span className="font-medium">Account Name:</span> {BANK_DETAILS.accountName}</p>
                  <p><span className="font-medium">Account Number:</span> {BANK_DETAILS.accountNumber}</p>
                  <p><span className="font-medium">Branch:</span> {BANK_DETAILS.branch}</p>
                  <p className="mt-2"><span className="font-medium">Reference:</span>{' '}
                    <span className="bg-green-100 px-2 py-0.5 rounded font-mono text-green-900">{depositRef.reference || depositRef.id || '—'}</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Use the reference above so we can match your payment. Credits will be added once confirmed by admin.</p>
            </div>
          )}
        </div>
      )}

      {/* Usage Chart */}
      {debits.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" /> Recent Usage
          </h3>
          <div className="flex items-end gap-2 h-24">
            {debits.map((t, i) => {
              const h = (Math.abs(t.amount) / maxDebit) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-red-400 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} title={formatKina(Math.abs(t.amount))} />
                  <span className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Deposits */}
      {transactions.filter(t => t.status === 'pending' && t.type === 'deposit').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2"><Clock className="w-4 h-4" /> Pending Deposits</h3>
          <ul className="space-y-1 text-sm text-yellow-700">
            {transactions.filter(t => t.status === 'pending' && t.type === 'deposit').map(t => (
              <li key={t.id} className="flex justify-between">
                <span>{formatKina(t.amount)} — Ref: {t.reference || t.id}</span>
                <span>{formatDate(t.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refund Requests */}
      {transactions.filter(t => t.status === 'refund_pending' || t.type === 'refund_request').length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-2"><RefreshCw className="w-4 h-4" /> Refund Requests</h3>
          <ul className="space-y-1 text-sm text-blue-700">
            {transactions.filter(t => t.status === 'refund_pending' || t.type === 'refund_request').map(t => (
              <li key={t.id} className="flex justify-between">
                <span>{formatKina(Math.abs(t.amount))} — {t.description || 'Refund requested'}</span>
                <span className="text-blue-500">Pending review</span>
              </li>
            ))}
          </ul>
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
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-2 flex items-center gap-1 capitalize">{TX_ICONS[t.type] || null} {t.type}</td>
                    <td className={`px-4 py-2 text-right font-medium ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(t.amount) >= 0 ? '+' : ''}{formatKina(t.amount)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{t.running_balance != null ? formatKina(t.running_balance) : '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{t.description || '—'}</td>
                    <td className="px-4 py-2">
                      {t.type === 'debit' && t.status !== 'refund_pending' && (
                        <button
                          onClick={() => handleRefund(t.id)}
                          disabled={refundingTx === t.id}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {refundingTx === t.id ? '…' : 'Refund'}
                        </button>
                      )}
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
