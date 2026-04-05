import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Package, Users, CreditCard, Shield, Database, Sparkles, UserCheck, UserX, RefreshCw, MessageSquare } from 'lucide-react';

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

  // WhatsApp Integration State
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [integrationType, setIntegrationType] = useState('api'); // 'web' or 'api'
  const [webEnabled, setWebEnabled] = useState(false);
  const [apiEnabled, setApiEnabled] = useState(true);
  const [webConnected, setWebConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [apiToken, setApiToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/credits/packages/all').then(d => d.packages || []).catch(() => []),
      api('/orders/admin/stats').catch(() => null),
      api('/admin/stats').catch(() => null),
      api('/admin/whatsapp/status').catch(() => null),
      api('/admin/whatsapp/api/config').catch(() => null),
      api('/admin/whatsapp/logs').then(d => d.logs || []).catch(() => []),
    ]).then(([pkgs, orderStats, adminStats, whatsappStatus, whatsappConfig, whatsappLogs]) => {
      setPackages(pkgs);
      setStats(orderStats);
      setDbStats(adminStats);
      
      // WhatsApp status
      if (whatsappStatus) {
        setIntegrationType(whatsappStatus.integrationType || 'api');
        setWebConnected(whatsappStatus.webConnected || false);
        setWebEnabled(whatsappStatus.webEnabled || false);
        setQrCode(whatsappStatus.qrCode || null);
      }
      
      // WhatsApp API config
      if (whatsappConfig) {
        setApiToken(whatsappConfig.apiToken || '');
        setPhoneNumberId(whatsappConfig.phoneNumberId || '');
        setVerifyToken(whatsappConfig.webhookVerifyToken || '');
        setApiEnabled(whatsappConfig.enabled || false);
      }
      
      // WhatsApp logs
      setWhatsappLogs(whatsappLogs);
    });
  }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  // WhatsApp Integration Event Handlers
  const handleIntegrationTypeChange = async (type) => {
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/integration-type', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      if (res.success) {
        setIntegrationType(type);
        flash(`✅ Integration switched to ${type === 'none' ? 'disabled' : type === 'web' ? 'Web.js' : 'Meta Cloud API'}`);
        // Reload status
        const status = await api('/admin/whatsapp/status').catch(() => null);
        if (status) {
          setWebConnected(status.webConnected || false);
          setWebEnabled(status.webEnabled || false);
          setQrCode(status.qrCode || null);
        }
      } else {
        flash(`❌ Failed to switch integration: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      flash(`❌ Error switching integration: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleWebStart = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/web/start', { method: 'POST' });
      if (res.success) {
        flash('✅ Web.js service started');
        setWebEnabled(true);
        // Wait 2 seconds for QR generation
        setTimeout(async () => {
          const qrRes = await api('/admin/whatsapp/web/qr').catch(() => null);
          if (qrRes && qrRes.qr) {
            setQrCode(qrRes.qr);
          }
        }, 2000);
      } else {
        flash(`❌ Failed to start Web.js: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      flash(`❌ Error starting Web.js: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleWebStop = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/web/stop', { method: 'POST' });
      if (res.success) {
        flash('✅ Web.js service stopped');
        setWebEnabled(false);
        setWebConnected(false);
        setQrCode(null);
      } else {
        flash(`❌ Failed to stop Web.js: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      flash(`❌ Error stopping Web.js: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleGenerateQR = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/web/qr');
      if (res.qr) {
        setQrCode(res.qr);
        flash('✅ QR code generated');
      } else {
        flash('❌ No QR code available. Ensure Web.js service is running.');
      }
    } catch (error) {
      flash(`❌ Error generating QR code: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleSaveApiConfig = async () => {
    if (!apiToken || !phoneNumberId || !verifyToken) {
      flash('❌ Please fill in all Meta Cloud API credentials');
      return;
    }
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/api/config', {
        method: 'POST',
        body: JSON.stringify({
          apiToken,
          phoneNumberId,
          webhookVerifyToken: verifyToken,
          enabled: true,
        }),
      });
      if (res.success) {
        flash('✅ Meta Cloud API credentials saved successfully');
        setApiEnabled(true);
      } else {
        flash(`❌ Failed to save credentials: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      flash(`❌ Error saving credentials: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleRefreshLogs = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await api('/admin/whatsapp/logs');
      if (res.logs) {
        setWhatsappLogs(res.logs);
        flash('✅ Logs refreshed');
      } else {
        flash('❌ No logs available');
      }
    } catch (error) {
      flash(`❌ Error refreshing logs: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };


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

      {/* WhatsApp Integration */}
      <Section title="WhatsApp Integration" icon={MessageSquare}>
        <div className="space-y-6">
          {/* Integration Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Integration Type
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="none"
                  checked={integrationType === 'none'}
                  onChange={(e) => handleIntegrationTypeChange(e.target.value)}
                  disabled={loadingWhatsapp}
                  className="mr-2 cursor-pointer"
                />
                <span className="text-sm text-gray-700">None (Disabled)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="web"
                  checked={integrationType === 'web'}
                  onChange={(e) => handleIntegrationTypeChange(e.target.value)}
                  disabled={loadingWhatsapp}
                  className="mr-2 cursor-pointer"
                />
                <span className="text-sm text-gray-700">Web.js (QR Code)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="api"
                  checked={integrationType === 'api'}
                  onChange={(e) => handleIntegrationTypeChange(e.target.value)}
                  disabled={loadingWhatsapp}
                  className="mr-2 cursor-pointer"
                />
                <span className="text-sm text-gray-700">Meta Cloud API</span>
              </label>
            </div>
          </div>

          {/* Web.js Service Section */}
          {integrationType === 'web' && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Web.js Service (QR Code Authentication)</h3>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleWebStart}
                  disabled={webConnected || loadingWhatsapp}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWhatsapp ? 'Starting...' : 'Start Service'}
                </button>
                <button
                  onClick={handleWebStop}
                  disabled={!webConnected || loadingWhatsapp}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWhatsapp ? 'Stopping...' : 'Stop Service'}
                </button>
                <button
                  onClick={handleGenerateQR}
                  disabled={!webConnected || loadingWhatsapp}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWhatsapp ? 'Generating...' : 'Generate QR Code'}
                </button>
              </div>
              {qrCode && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto" />
                  <p className="text-sm text-gray-600 mt-3 text-center">Scan this QR code with WhatsApp mobile app to connect</p>
                </div>
              )}
              <div className="mt-3">
                <span className="text-sm text-gray-700 mr-2">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  webConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {webConnected ? '✅ Connected' : '⚪ Disconnected'}
                </span>
              </div>
            </div>
          )}

          {/* Meta Cloud API Configuration Section */}
          {integrationType === 'api' && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Meta Cloud API Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token (Access Token)
                  </label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    disabled={loadingWhatsapp}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="EAAxxxxxxxxxxxx..."
                  />
                  <p className="text-xs text-gray-500 mt-1">200+ character Meta Cloud API access token</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    disabled={loadingWhatsapp}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="1021501414387667"
                  />
                  <p className="text-xs text-gray-500 mt-1">15-digit phone number ID from Meta Developer Console</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Verify Token
                  </label>
                  <input
                    type="text"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    disabled={loadingWhatsapp}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="wantokjobs_webhook_..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom webhook verification token (matches Meta Developer Console)</p>
                </div>
                <button
                  onClick={handleSaveApiConfig}
                  disabled={loadingWhatsapp || !apiToken || !phoneNumberId || !verifyToken}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWhatsapp ? 'Saving...' : 'Save Configuration'}
                </button>
                <div className="mt-3">
                  <span className="text-sm text-gray-700 mr-2">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    apiEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {apiEnabled ? '✅ Configured' : '⚪ Not Configured'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Logs */}
          {integrationType !== 'none' && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Integration Logs</h3>
                <button
                  onClick={handleRefreshLogs}
                  disabled={loadingWhatsapp}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold hover:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingWhatsapp ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>
              {whatsappLogs && whatsappLogs.length > 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Timestamp</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">From</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">To</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {whatsappLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-gray-100">
                            <td className="px-3 py-2 text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                {log.from_type}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                {log.to_type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{log.admin_email || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
                  No integration switches recorded yet
                </p>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
