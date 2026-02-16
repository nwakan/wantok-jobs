import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';
import { jobAlerts, jobs as jobsAPI } from '../../../api';

export default function JobAlerts() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [matchingJobsCount, setMatchingJobsCount] = useState({});
  const [form, setForm] = useState({ 
    keywords: '', 
    location: '', 
    job_type: '', 
    salary_min: '', 
    frequency: 'daily', 
    channel: 'email',
    active: 1,
  });

  useEffect(() => { 
    loadAlerts(); 
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await jobAlerts.getAll();
      const alertsList = Array.isArray(data) ? data : [];
      setAlerts(alertsList);
      
      // Load matching jobs count for each alert
      alertsList.forEach(alert => {
        loadMatchingJobsCount(alert);
      });
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMatchingJobsCount = async (alert) => {
    try {
      const params = {};
      if (alert.keywords) params.search = alert.keywords;
      if (alert.location) params.location = alert.location;
      if (alert.job_type) params.type = alert.job_type;
      
      const result = await jobsAPI.getAll(params);
      const count = result.data?.length || 0;
      
      setMatchingJobsCount(prev => ({
        ...prev,
        [alert.id]: count,
      }));
    } catch (error) {
      console.error('Failed to load matching jobs:', error);
    }
  };

  const handleCreate = async () => {
    if (!form.keywords && !form.location && !form.job_type) {
      showToast('Please fill in at least one filter (keywords, location, or job type)', 'error');
      return;
    }

    try {
      if (editingId) {
        await jobAlerts.update(editingId, form);
        showToast('Job alert updated! 🎯', 'success');
      } else {
        await jobAlerts.create(form);
        showToast('Job alert created! 🎯', 'success');
      }
      
      setShowForm(false);
      setEditingId(null);
      setForm({ 
        keywords: '', 
        location: '', 
        job_type: '', 
        salary_min: '', 
        frequency: 'daily', 
        channel: 'email',
        active: 1,
      });
      loadAlerts();
    } catch (error) {
      showToast('Failed to save alert: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleEdit = (alert) => {
    setForm({
      keywords: alert.keywords || '',
      location: alert.location || '',
      job_type: alert.job_type || '',
      salary_min: alert.salary_min || '',
      frequency: alert.frequency || 'daily',
      channel: alert.channel || 'email',
      active: alert.active,
    });
    setEditingId(alert.id);
    setShowForm(true);
  };

  const toggleAlert = async (id, active) => {
    try {
      await jobAlerts.update(id, { active: active ? 0 : 1 });
      showToast(active ? 'Alert paused ⏸️' : 'Alert activated ✅', 'success');
      loadAlerts();
    } catch (error) {
      showToast('Failed to update alert', 'error');
    }
  };

  const deleteAlert = async (id) => {
    if (!confirm('Delete this alert? You won\'t receive notifications for matching jobs anymore.')) return;
    
    try {
      await jobAlerts.remove(id);
      showToast('Alert deleted 🗑️', 'success');
      loadAlerts();
    } catch (error) {
      showToast('Failed to delete alert', 'error');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ 
      keywords: '', 
      location: '', 
      job_type: '', 
      salary_min: '', 
      frequency: 'daily', 
      channel: 'email',
      active: 1,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Alerts</h1>
          <p className="text-gray-600">Get notified when jobs matching your criteria are posted</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition shadow-md"
        >
          {showForm ? '✕ Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-primary-500 p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">
            {editingId ? '✏️ Edit Alert' : '➕ Create New Alert'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Keywords <span className="text-gray-400 font-normal">(job title, skills, etc.)</span>
              </label>
              <input 
                type="text" 
                value={form.keywords} 
                onChange={e => setForm({...form, keywords: e.target.value})} 
                placeholder="e.g. accountant, driver, software developer" 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <input 
                type="text" 
                value={form.location} 
                onChange={e => setForm({...form, location: e.target.value})} 
                placeholder="e.g. Port Moresby, Lae" 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Type</label>
              <select 
                value={form.job_type} 
                onChange={e => setForm({...form, job_type: e.target.value})} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Min Salary (PGK)</label>
              <input 
                type="number" 
                value={form.salary_min} 
                onChange={e => setForm({...form, salary_min: e.target.value})} 
                placeholder="e.g. 2000" 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
              <select 
                value={form.frequency} 
                onChange={e => setForm({...form, frequency: e.target.value})} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none"
              >
                <option value="instant">Instant (as soon as posted)</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Channel</label>
              <select 
                value={form.channel} 
                onChange={e => setForm({...form, channel: e.target.value})} 
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none"
              >
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="push">🔔 In-app</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleCreate} 
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
            >
              {editingId ? '💾 Update Alert' : '✅ Create Alert'}
            </button>
            <button 
              onClick={cancelForm}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No alerts yet</h3>
          <p className="text-gray-600 mb-6">
            Create a job alert and we'll notify you when matching jobs are posted.<br />
            Our AI matches your profile for the best results!
          </p>
          <button 
            onClick={() => setShowForm(true)} 
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => {
            const matchCount = matchingJobsCount[alert.id];
            
            return (
              <div 
                key={alert.id} 
                className={`bg-white rounded-lg shadow-md border-l-4 p-6 transition ${
                  alert.active 
                    ? 'border-primary-500 hover:shadow-lg' 
                    : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {alert.keywords || 'All jobs'}
                        {alert.location && <span className="text-gray-500 font-normal"> in {alert.location}</span>}
                      </h3>
                      {!alert.active && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold">
                          ⏸️ Paused
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-3">
                      {alert.job_type && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                          💼 {alert.job_type}
                        </span>
                      )}
                      {alert.salary_min && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          💰 K{parseInt(alert.salary_min).toLocaleString()}+
                        </span>
                      )}
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        🔔 {alert.frequency}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                        {alert.channel === 'email' && '📧'}
                        {alert.channel === 'sms' && '📱'}
                        {alert.channel === 'whatsapp' && '💬'}
                        {alert.channel === 'push' && '🔔'}
                        {' '}{alert.channel}
                      </span>
                    </div>

                    {/* Matching Jobs Count */}
                    {matchCount !== undefined && (
                      <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded inline-block">
                        📊 <span className="font-semibold">{matchCount}</span> matching job{matchCount !== 1 ? 's' : ''} currently available
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handleEdit(alert)}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition"
                      title="Edit alert"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => toggleAlert(alert.id, alert.active)} 
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition ${
                        alert.active 
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {alert.active ? '⏸️ Pause' : '▶️ Activate'}
                    </button>
                    <button 
                      onClick={() => deleteAlert(alert.id)} 
                      className="px-3 py-2 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      {alerts.length > 0 && (
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>Job Alert Tips</span>
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Be specific:</strong> Use detailed keywords for better matches (e.g., "senior accountant" vs "accountant")</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Multiple alerts:</strong> Create separate alerts for different job types to stay organized</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Frequency:</strong> Choose "instant" for urgent job search, or "daily" to reduce notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span><strong>Review regularly:</strong> Update your alerts as your job search evolves</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
