import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Package, Users, CreditCard, Shield, Database, Sparkles, UserCheck, UserX, RefreshCw } from 'lucide-react';

const API = '/api';
const token = () => localStorage.getItem('token');
const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: headers(), ...opts });
  return res.json();
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState(null);
  const [trialUserId, setTrialUserId] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantType, setGrantType] = useState('job_posting');
  const [grantAmount, setGrantAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/credits/packages/all').then(d => d.packages || []).catch(() => []),
      api('/orders/admin/stats').catch(() => null),
      api('/admin/stats').catch(() => null),
    ]).then(([pkgs, orderStats, adminStats]) => {
      setPackages(pkgs);
      setStats(orderStats);
      setDbStats(adminStats);
    });
  }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Settings</h1>
      
      {msg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm">{msg}</div>
      )}

      {/* System Info */}
      <Section title="System Information" icon={Database}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Platform</p>
            <p className="font-bold text-gray-900">WantokJobs v2.0</p>
          </div>
          <div>
            <p className="text-gray-500">Environment</p>
            <p className="font-bold text-gray-900">{import.meta.env.MODE}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Users</p>
            <p className="font-bold text-gray-900">{dbStats?.totalUsers?.toLocaleString() || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Active Jobs</p>
            <p className="font-bold text-gray-900">{dbStats?.activeJobs?.toLocaleString() || '—'}</p>
          </div>
        </div>
      </Section>

      {/* Credit Revenue Stats */}
      {stats && (
        <Section title="Revenue & Credits" icon={CreditCard}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-green-600">Total Revenue</p>
              <p className="text-xl font-bold text-green-800">K{stats.totalRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-yellow-600">Pending Revenue</p>
              <p className="text-xl font-bold text-yellow-800">K{stats.pendingRevenue?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-blue-600">Active Trials</p>
              <p className="text-xl font-bold text-blue-800">{stats.activeTrials || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-purple-600">Premium Trials</p>
              <p className="text-xl font-bold text-purple-800">{stats.premiumTrials || 0}</p>
            </div>
          </div>
          {stats.totalCreditsOutstanding && (
            <div className="text-sm text-gray-600">
              <strong>Outstanding credits:</strong>{' '}
              Job posting: {stats.totalCreditsOutstanding.job_posting} | 
              AI matching: {stats.totalCreditsOutstanding.ai_matching} | 
              Candidate search: {stats.totalCreditsOutstanding.candidate_search} | 
              Alert: {stats.totalCreditsOutstanding.alert}
            </div>
          )}
        </Section>
      )}

      {/* Credit Packages */}
      <Section title="Credit Packages" icon={Package}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Role</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Price</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">JP</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">AI</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">CS</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Alert</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map(p => (
                <tr key={p.id} className={p.popular ? 'bg-primary-50' : ''}>
                  <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                  <td className="px-3 py-2 text-gray-600 capitalize">{p.target_role}</td>
                  <td className="px-3 py-2 text-gray-600">{p.package_type}</td>
                  <td className="px-3 py-2 text-right font-semibold">K{p.price}</td>
                  <td className="px-3 py-2 text-right">{p.job_posting_credits || '—'}</td>
                  <td className="px-3 py-2 text-right">{p.ai_matching_credits || '—'}</td>
                  <td className="px-3 py-2 text-right">{p.candidate_search_credits || '—'}</td>
                  <td className="px-3 py-2 text-right">{p.alert_credits || '—'}</td>
                  <td className="px-3 py-2 text-center">{p.active ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Trial Management */}
      <Section title="Trial Management" icon={Sparkles}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Grant Premium Trial */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-600" /> Grant Premium Trial
            </h3>
            <p className="text-sm text-gray-500 mb-3">Give a user unlimited access (no credit consumption, no expiry).</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="User ID"
                value={trialUserId}
                onChange={e => setTrialUserId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <button
                onClick={async () => {
                  if (!trialUserId) return;
                  const r = await api('/credits/admin/grant-trial', {
                    method: 'POST', body: JSON.stringify({ user_id: parseInt(trialUserId) }),
                  });
                  flash(r.success ? `✅ Premium trial granted to user ${trialUserId}` : `❌ ${r.error}`);
                  setTrialUserId('');
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                Grant
              </button>
            </div>
          </div>

          {/* Revoke Premium Trial */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-600" /> Revoke Premium Trial
            </h3>
            <p className="text-sm text-gray-500 mb-3">Remove unlimited access from a user.</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="User ID"
                value={trialUserId}
                onChange={e => setTrialUserId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <button
                onClick={async () => {
                  if (!trialUserId) return;
                  const r = await api('/credits/admin/revoke-trial', {
                    method: 'POST', body: JSON.stringify({ user_id: parseInt(trialUserId) }),
                  });
                  flash(r.success ? `✅ Premium trial revoked for user ${trialUserId}` : `❌ ${r.error}`);
                  setTrialUserId('');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Manual Credit Grant */}
      <Section title="Manual Credit Grant" icon={CreditCard}>
        <p className="text-sm text-gray-500 mb-4">Manually add credits to a user's account (e.g., as compensation or promotion).</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
            <input
              type="number"
              placeholder="User ID"
              value={grantUserId}
              onChange={e => setGrantUserId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Credit Type</label>
            <select
              value={grantType}
              onChange={e => setGrantType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="job_posting">Job Posting</option>
              <option value="ai_matching">AI Matching</option>
              <option value="candidate_search">Candidate Search</option>
              <option value="alert">Alert</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              placeholder="Amount"
              value={grantAmount}
              onChange={e => setGrantAmount(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-24"
            />
          </div>
          <button
            onClick={async () => {
              if (!grantUserId || !grantAmount) return;
              const r = await api('/credits/admin/grant-credits', {
                method: 'POST',
                body: JSON.stringify({
                  user_id: parseInt(grantUserId),
                  credit_type: grantType,
                  amount: parseInt(grantAmount),
                  reason: 'admin_manual_grant',
                }),
              });
              flash(r.success ? `✅ Added ${grantAmount} ${grantType} credits to user ${grantUserId} (new balance: ${r.newBalance})` : `❌ ${r.error}`);
              setGrantUserId(''); setGrantAmount('');
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700"
          >
            Grant Credits
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Shield}>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Helmet.js Security Headers</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">ENABLED</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Rate Limiting (200/min global, 10/min auth)</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">ENABLED</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Zod Input Validation (13 schemas)</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">ENABLED</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">FTS5 Full-Text Search</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">ENABLED</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-700">Brevo Email Delivery</span>
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">CONFIGURED</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">HTTPS / TLS</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">PENDING</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
