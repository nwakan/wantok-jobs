import { useState, useEffect } from 'react';
import { Bot, ToggleLeft, ToggleRight, Save, RefreshCw, BarChart3, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

const TOGGLE_SETTINGS = [
  { key: 'jean_enabled', label: 'Jean AI Assistant', desc: 'Master toggle — disables the entire chat widget' },
  { key: 'voice_enabled', label: 'Voice Input/Output', desc: 'Allow speech-to-text and text-to-speech' },
  { key: 'auto_apply_enabled', label: 'Auto-Apply (Jobseekers)', desc: 'Allow jobseekers to set up automatic job applications' },
  { key: 'auto_post_enabled', label: 'Auto-Post Jobs (Employers)', desc: 'Allow employers to auto-post from uploaded documents' },
  { key: 'linkedin_import_enabled', label: 'LinkedIn Import', desc: 'Allow profile import from LinkedIn URLs' },
  { key: 'document_parse_enabled', label: 'Document Parsing', desc: 'Allow PDF/Word upload for job creation' },
  { key: 'guest_chat_enabled', label: 'Guest Chat', desc: 'Allow non-logged-in visitors to chat with Jean' },
  { key: 'proactive_triggers_enabled', label: 'Proactive Suggestions', desc: 'Show contextual chat suggestions on pages' },
];

const NUMBER_SETTINGS = [
  { key: 'max_auto_apply_daily', label: 'Max Auto-Apply Per Day', desc: 'Maximum automatic applications per user per day', min: 1, max: 50 },
  { key: 'max_linkedin_scrapes_hourly', label: 'LinkedIn Scrapes/Hour', desc: 'Rate limit for LinkedIn profile imports', min: 1, max: 100 },
  { key: 'auto_apply_min_match_score', label: 'Auto-Apply Min Match %', desc: 'Minimum match score for auto-applications (0-100)', min: 0, max: 100 },
];

const TEXT_SETTINGS = [
  { key: 'jean_greeting', label: 'Greeting Message', desc: 'First message Jean shows when chat opens' },
  { key: 'jean_offline_message', label: 'Offline Message', desc: 'Message shown when Jean is disabled' },
];

export default function JeanSettings() {
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dirty, setDirty] = useState({});

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/admin/settings`, { headers: getAuthHeader() });
      const data = await res.json();
      const map = {};
      (data.settings || []).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    } catch (e) {
      setError('Failed to load settings');
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/admin/stats`, { headers: getAuthHeader() });
      setStats(await res.json());
    } catch (e) {}
  };

  const updateSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(prev => ({ ...prev, [key]: true }));
  };

  const toggleSetting = async (key) => {
    const newValue = settings[key] === 'true' ? 'false' : 'true';
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/chat/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ key, value: newValue }),
      });
      if (!res.ok) throw new Error('Failed');
      setSettings(prev => ({ ...prev, [key]: newValue }));
      setSuccess(`${key} updated`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(`Failed to update ${key}`);
    }
    setSaving(false);
  };

  const saveSetting = async (key) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/chat/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ key, value: settings[key] }),
      });
      if (!res.ok) throw new Error('Failed');
      setDirty(prev => ({ ...prev, [key]: false }));
      setSuccess(`${key} saved`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (e) {
      setError(`Failed to save ${key}`);
    }
    setSaving(false);
  };

  const runAutoApply = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/chat/admin/run-auto-apply`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const data = await res.json();
      setSuccess(`Auto-apply run: ${data.results?.applied || 0} applications made`);
      setTimeout(() => setSuccess(''), 5000);
      loadStats();
    } catch (e) {
      setError('Auto-apply run failed');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading Jean settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Bot className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jean AI Settings</h1>
            <p className="text-sm text-gray-500">Manage your AI sales assistant</p>
          </div>
        </div>
        <button onClick={loadStats} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <RefreshCw size={14} /> Refresh Stats
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">{success}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Sessions Today', value: stats.sessions?.today || 0, icon: '💬' },
            { label: 'Messages Today', value: stats.messages?.today || 0, icon: '📨' },
            { label: 'Unique Users', value: stats.sessions?.uniqueUsers || 0, icon: '👤' },
            { label: 'Auto-Applications', value: stats.autoApply?.applicationsToday || 0, icon: '🤖' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ToggleRight size={18} /> Feature Toggles
          </h2>
        </div>
        {TOGGLE_SETTINGS.map(({ key, label, desc }) => (
          <div key={key} className="px-6 py-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
            <button
              onClick={() => toggleSetting(key)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[key] === 'true' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings[key] === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Number settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={18} /> Limits & Thresholds
          </h2>
        </div>
        {NUMBER_SETTINGS.map(({ key, label, desc, min, max }) => (
          <div key={key} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white text-sm">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={min}
                max={max}
                value={settings[key] || ''}
                onChange={(e) => updateSetting(key, e.target.value)}
                className="w-20 px-2 py-1 border rounded-lg text-sm text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {dirty[key] && (
                <button
                  onClick={() => saveSetting(key)}
                  disabled={saving}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  <Save size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Text settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Messages</h2>
        </div>
        {TEXT_SETTINGS.map(({ key, label, desc }) => (
          <div key={key} className="px-6 py-4">
            <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">{label}</div>
            <div className="text-xs text-gray-500 mb-2">{desc}</div>
            <div className="flex gap-2">
              <textarea
                value={settings[key] || ''}
                onChange={(e) => updateSetting(key, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                rows={2}
              />
              {dirty[key] && (
                <button
                  onClick={() => saveSetting(key)}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 self-end"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runAutoApply}
            disabled={saving || settings.auto_apply_enabled !== 'true'}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            🤖 Run Auto-Apply Now
          </button>
        </div>
        {settings.auto_apply_enabled !== 'true' && (
          <p className="text-xs text-gray-500 mt-2">Enable auto-apply to use this action</p>
        )}
      </div>

      {/* Top Intents */}
      {stats?.topIntents?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Intents (Last 7 Days)</h2>
          <div className="space-y-2">
            {stats.topIntents.filter(i => i.intent).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.intent}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 rounded-full h-2"
                      style={{ width: `${Math.min((item.count / (stats.topIntents[0]?.count || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
