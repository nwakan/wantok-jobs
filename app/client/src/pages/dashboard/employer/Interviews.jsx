import { useState, useEffect, useCallback } from 'react';
import api from '../../../api';

const STATUS_COLORS = {
  proposed: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  'no-show': 'bg-red-100 text-red-700',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [showModal, setShowModal] = useState(false);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({ application_id: '', times: [''], type: 'in-person', location: '', video_link: '', notes: '', duration_minutes: 60 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // list | calendar

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/interviews?period=${filter}`);
      setInterviews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const loadApps = async () => {
    try {
      const data = await api.get('/applications?status=screening,shortlisted,interview&role=employer');
      setApplications(Array.isArray(data?.applications) ? data.applications : Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const openModal = (appId = '') => {
    setForm({ application_id: appId, times: [''], type: 'in-person', location: '', video_link: '', notes: '', duration_minutes: 60 });
    setError('');
    loadApps();
    setShowModal(true);
  };

  const addTimeSlot = () => {
    if (form.times.length < 3) setForm(f => ({ ...f, times: [...f.times, ''] }));
  };

  const removeTimeSlot = (idx) => {
    setForm(f => ({ ...f, times: f.times.filter((_, i) => i !== idx) }));
  };

  const updateTime = (idx, val) => {
    setForm(f => ({ ...f, times: f.times.map((t, i) => i === idx ? val : t) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const validTimes = form.times.filter(Boolean);
    if (!form.application_id || validTimes.length === 0) {
      setError('Please select an applicant and at least one time slot');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/interviews', {
        application_id: parseInt(form.application_id),
        proposed_times: validTimes,
        type: form.type,
        location: form.location || undefined,
        video_link: form.video_link || undefined,
        notes: form.notes || undefined,
        duration_minutes: form.duration_minutes,
      });
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelInterview = async (id) => {
    if (!confirm('Cancel this interview?')) return;
    try {
      await api.patch(`/interviews/${id}/cancel`, {});
      load();
    } catch (e) { alert(e.message); }
  };

  // Simple calendar view — group by date
  const calendarData = {};
  interviews.filter(i => i.status !== 'cancelled').forEach(i => {
    const d = i.confirmed_time || i.scheduled_at || (i.proposed_times?.[0]);
    if (!d) return;
    const key = new Date(d).toLocaleDateString('en-PG', { dateStyle: 'medium' });
    if (!calendarData[key]) calendarData[key] = [];
    calendarData[key].push(i);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interviews</h1>
        <div className="flex gap-2">
          <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Schedule Interview
          </button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {['upcoming', 'past', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={`px-3 py-1 rounded text-sm ${view === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>List</button>
          <button onClick={() => setView('calendar')} className={`px-3 py-1 rounded text-sm ${view === 'calendar' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>Calendar</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No interviews found</p>
          <button onClick={() => openModal()} className="text-blue-600 hover:underline">Schedule your first interview</button>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {interviews.map(i => (
            <div key={i.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{i.applicant_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[i.status] || 'bg-gray-100'}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{i.job_title}</p>
                  
                  {i.status === 'proposed' && i.proposed_times?.length > 0 ? (
                    <div className="text-sm">
                      <span className="text-gray-500">Proposed times:</span>
                      <ul className="mt-1 space-y-0.5">
                        {i.proposed_times.map((t, idx) => (
                          <li key={idx} className="text-gray-700 dark:text-gray-300">• {formatDate(t)}</li>
                        ))}
                      </ul>
                      <p className="text-yellow-600 text-xs mt-1">⏳ Awaiting applicant confirmation</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      📅 {formatDate(i.confirmed_time || i.scheduled_at)}
                      {i.duration_minutes && ` · ${i.duration_minutes} min`}
                    </p>
                  )}

                  {i.location && <p className="text-sm text-gray-500 mt-1">📍 {i.location}</p>}
                  {i.video_link && <p className="text-sm text-blue-500 mt-1"><a href={i.video_link} target="_blank" rel="noreferrer">🔗 Video Link</a></p>}
                  {i.notes && <p className="text-sm text-gray-500 mt-1 italic">"{i.notes}"</p>}
                </div>
                <div className="flex gap-2">
                  {['proposed', 'scheduled', 'confirmed'].includes(i.status) && (
                    <button onClick={() => cancelInterview(i.id)} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar View */
        <div className="space-y-6">
          {Object.keys(calendarData).length === 0 ? (
            <p className="text-center text-gray-500 py-8">No upcoming interviews to display</p>
          ) : Object.entries(calendarData).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{date}</h3>
              <div className="space-y-2">
                {items.map(i => (
                  <div key={i.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className={`w-1 h-12 rounded-full ${i.status === 'confirmed' ? 'bg-green-500' : i.status === 'proposed' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{i.applicant_name} — {i.job_title}</p>
                      <p className="text-xs text-gray-500">{formatDate(i.confirmed_time || i.scheduled_at || i.proposed_times?.[0])} · {i.type} · {i.duration_minutes}min</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[i.status]}`}>{i.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Schedule Interview</h2>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicant</label>
                <select value={form.application_id} onChange={e => setForm(f => ({ ...f, application_id: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">Select an applicant...</option>
                  {applications.map(a => (
                    <option key={a.id} value={a.id}>{a.applicant_name || a.name} — {a.job_title || 'Job'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proposed Time Slots <span className="text-gray-400">(up to 3)</span>
                </label>
                {form.times.map((t, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="datetime-local" value={t} onChange={e => updateTime(idx, e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                    {form.times.length > 1 && (
                      <button type="button" onClick={() => removeTimeSlot(idx)} className="px-2 text-red-500 hover:text-red-700">✕</button>
                    )}
                  </div>
                ))}
                {form.times.length < 3 && (
                  <button type="button" onClick={addTimeSlot} className="text-sm text-blue-600 hover:underline">+ Add another time slot</button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-sm">
                    <option value="in-person">In Person</option>
                    <option value="video">Video Call</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                  <select value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-sm">
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {form.type === 'video' ? 'Video Link' : 'Location'}
                </label>
                {form.type === 'video' ? (
                  <input type="url" placeholder="https://zoom.us/j/..." value={form.video_link}
                    onChange={e => setForm(f => ({ ...f, video_link: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-sm" />
                ) : (
                  <input type="text" placeholder="Office address..." value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-sm" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea rows={3} placeholder="Anything the applicant should know..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-sm" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send Interview Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
