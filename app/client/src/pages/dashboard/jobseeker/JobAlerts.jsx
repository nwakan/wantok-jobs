import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';

const API_BASE = '/api/job-alerts';
const api = (url, opts = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}`, ...opts.headers } }).then(r => r.json());

export default function JobAlerts() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keywords: '', location: '', job_type: '', salary_min: '', frequency: 'daily', channel: 'email' });

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = () => {
    api(API_BASE).then(data => { setAlerts(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => { setAlerts([]); setLoading(false); });
  };

  const handleCreate = () => {
    api(API_BASE, { method: 'POST', body: JSON.stringify(form) })
      .then(() => { showToast('Job alert created! 🎯', 'success'); setShowForm(false); setForm({ keywords: '', location: '', job_type: '', salary_min: '', frequency: 'daily', channel: 'email' }); loadAlerts(); })
      .catch(() => showToast('Failed to create alert', 'error'));
  };

  const toggleAlert = (id, active) => {
    api(`${API_BASE}/${id}`, { method: 'PUT', body: JSON.stringify({ active: active ? 0 : 1 }) })
      .then(() => { showToast(active ? 'Alert paused' : 'Alert activated', 'success'); loadAlerts(); })
      .catch(() => showToast('Failed to update', 'error'));
  };

  const deleteAlert = (id) => {
    if (!confirm('Delete this alert?')) return;
    api(`${API_BASE}/${id}`, { method: 'DELETE' })
      .then(() => { showToast('Alert deleted', 'success'); loadAlerts(); })
      .catch(() => showToast('Failed to delete', 'error'));
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Alerts</h1>
          <p className="text-gray-600 mt-1">Get notified when jobs matching your criteria are posted</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          {showForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <input type="text" value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} placeholder="e.g. accountant, driver, IT" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Port Moresby, Lae" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select value={form.job_type} onChange={e => setForm({...form, job_type: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary (PGK)</label>
              <input type="number" value={form.salary_min} onChange={e => setForm({...form, salary_min: e.target.value})} placeholder="e.g. 2000" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="instant">Instant</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select value={form.channel} onChange={e => setForm({...form, channel: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="push">In-app</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Create Alert</button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No alerts yet</h3>
          <p className="text-gray-600 mb-4">Create a job alert and we'll notify you when matching jobs are posted. Our AI matches your profile for the best results!</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Create Your First Alert</button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`bg-white rounded-lg shadow p-5 border-l-4 ${alert.active ? 'border-primary-500' : 'border-gray-300'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {alert.keywords || 'All jobs'}
                    {alert.location && <span className="text-gray-500 font-normal"> in {alert.location}</span>}
                  </h3>
                  <div className="flex gap-3 mt-2 text-sm text-gray-600">
                    {alert.job_type && <span className="bg-gray-100 px-2 py-1 rounded">{alert.job_type}</span>}
                    {alert.salary_min && <span className="bg-gray-100 px-2 py-1 rounded">K{alert.salary_min}+</span>}
                    <span className="bg-primary-50 text-primary-700 px-2 py-1 rounded">{alert.frequency}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">via {alert.channel}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAlert(alert.id, alert.active)} className={`px-3 py-1 text-sm rounded ${alert.active ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {alert.active ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => deleteAlert(alert.id)} className="px-3 py-1 text-sm rounded bg-red-100 text-red-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
