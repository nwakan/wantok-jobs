import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Sparkles, Search, Bell, ShoppingCart, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

const API = '/api';

async function apiFetch(path) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function CreditMeter({ label, icon: Icon, current, color = 'primary' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 text-${color}-600`} />
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className={`text-3xl font-bold text-${color}-600`}>{current}</p>
      <p className="text-xs text-gray-400 mt-1">credits remaining</p>
    </div>
  );
}

function TrialBadge({ trial, trialUsed }) {
  if (trial?.type === 'premium_indefinite') {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-amber-500" />
        <div>
          <p className="font-semibold text-amber-800">Premium Access — Unlimited</p>
          <p className="text-sm text-amber-600">All features unlocked. No credits consumed.</p>
        </div>
      </div>
    );
  }
  
  if (trial?.type === 'standard') {
    const daysLeft = Math.max(0, Math.ceil((new Date(trial.expiresAt) - Date.now()) / 86400000));
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <Clock className="w-6 h-6 text-blue-500" />
        <div>
          <p className="font-semibold text-blue-800">Free Trial Active — {daysLeft} days left</p>
          <p className="text-sm text-blue-600">All features available. No credits consumed during trial.</p>
        </div>
      </div>
    );
  }
  
  if (!trialUsed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-semibold text-green-800">Free Trial Available!</p>
            <p className="text-sm text-green-600">Start your 14-day trial with free credits. No payment needed.</p>
          </div>
        </div>
        <button
          onClick={async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/credits/trial/activate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (res.ok) window.location.reload();
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition text-sm"
        >
          Activate Trial
        </button>
      </div>
    );
  }
  
  return null;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  overdue: 'bg-orange-100 text-orange-800',
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  completed: CheckCircle,
  rejected: XCircle,
  failed: XCircle,
  overdue: AlertTriangle,
};

export default function OrdersBilling() {
  const [creditStatus, setCreditStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('credits');

  useEffect(() => {
    Promise.all([
      apiFetch('/credits/status').catch(() => null),
      apiFetch('/orders/my').then(d => d.orders || []).catch(() => []),
      apiFetch('/credits/transactions').then(d => d.transactions || []).catch(() => []),
      apiFetch('/credits/packages').then(d => d.packages || []).catch(() => []),
    ]).then(([status, ords, txns, pkgs]) => {
      setCreditStatus(status);
      setOrders(ords);
      setTransactions(txns);
      setPackages(pkgs.filter(p => p.price > 0));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Credits & Billing</h1>

      {/* Trial Banner */}
      <div className="mb-6">
        <TrialBadge trial={creditStatus?.trial} trialUsed={creditStatus?.trialUsed} />
      </div>

      {/* Credit Balances */}
      {creditStatus?.credits && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <CreditMeter label="Job Posting" icon={Coins} current={creditStatus.credits.job_posting} color="primary" />
          <CreditMeter label="AI Matching" icon={Sparkles} current={creditStatus.credits.ai_matching} color="purple" />
          <CreditMeter label="Candidate Search" icon={Search} current={creditStatus.credits.candidate_search} color="blue" />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'credits', label: 'Buy Credits' },
              { key: 'orders', label: 'Order History' },
              { key: 'transactions', label: 'Credit Log' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition ${
                  activeTab === t.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Buy Credits Tab */}
          {activeTab === 'credits' && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Available Packages</h2>
              {packages.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No packages available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map(pkg => (
                    <div key={pkg.id} className={`border rounded-lg p-5 ${pkg.popular ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                      <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                      <p className="text-3xl font-bold text-primary-600 mt-1">K{pkg.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-500 mb-3">one-time purchase</p>
                      <p className="text-sm text-gray-600 mb-4">{pkg.description}</p>
                      <div className="space-y-1 mb-4 text-sm">
                        {pkg.job_posting_credits > 0 && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Coins className="w-4 h-4 text-primary-500" /> {pkg.job_posting_credits} job posting credits
                          </div>
                        )}
                        {pkg.ai_matching_credits > 0 && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Sparkles className="w-4 h-4 text-purple-500" /> {pkg.ai_matching_credits === 999 ? 'Unlimited' : pkg.ai_matching_credits} AI matching
                          </div>
                        )}
                        {pkg.candidate_search_credits > 0 && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Search className="w-4 h-4 text-blue-500" /> {pkg.candidate_search_credits === 999 ? 'Unlimited' : pkg.candidate_search_credits} candidate searches
                          </div>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('token');
                          const res = await fetch(`${API}/orders`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ package_id: pkg.id, payment_method: 'bank_transfer' }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert(`Order created! Invoice: ${data.order.invoice_number}\n\n${data.instructions}`);
                            window.location.reload();
                          } else {
                            alert(data.error || 'Failed to create order');
                          }
                        }}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" /> Purchase
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>💳 Payment:</strong> After purchasing, transfer the amount to our BSP bank account using your invoice number as reference. Credits will be added within 24 hours of verification.
              </div>
            </div>
          )}

          {/* Order History Tab */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet. Purchase a credit package to get started!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map(order => {
                        const StatusIcon = statusIcons[order.status] || Clock;
                        return (
                          <tr key={order.id}>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">{order.invoice_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{order.package_name || '—'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">K{order.amount?.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Credit Transaction Log */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No credit transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                            {tx.credit_type.replace('_', ' ')}
                          </td>
                          <td className={`px-4 py-3 text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{tx.balance_after}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                            {tx.reason.replace('_', ' ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
