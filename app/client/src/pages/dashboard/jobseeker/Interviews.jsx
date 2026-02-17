import { useState, useEffect, useCallback } from 'react';
import api from '../../../api';

const STATUS_COLORS = {
  proposed: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function JobseekerInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/interviews/my');
      setInterviews(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmTime = async (interviewId, time) => {
    setConfirming(interviewId);
    try {
      await api.patch(`/interviews/${interviewId}/confirm`, { confirmed_time: time });
      load();
    } catch (e) { alert(e.message || 'Failed to confirm'); }
    finally { setConfirming(null); }
  };

  const cancelInterview = async (id) => {
    if (!confirm('Cancel this interview?')) return;
    try {
      await api.patch(`/interviews/${id}/cancel`, {});
      load();
    } catch (e) { alert(e.message); }
  };

  const pending = interviews.filter(i => i.status === 'proposed');
  const upcoming = interviews.filter(i => ['scheduled', 'confirmed'].includes(i.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Interviews</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-500 dark:text-gray-400">No interviews yet</p>
          <p className="text-sm text-gray-400 mt-1">When employers invite you for an interview, it will appear here</p>
        </div>
      ) : (
        <>
          {/* Pending interview invites */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                ⏳ Pending Invites ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(i => (
                  <div key={i.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{i.job_title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{i.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS.proposed}`}>
                        Action Required
                      </span>
                    </div>

                    {i.type && <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Type: <strong>{i.type}</strong></p>}
                    {i.location && <p className="text-sm text-gray-600 mb-1">📍 {i.location}</p>}
                    {i.video_link && <p className="text-sm mb-1"><a href={i.video_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">🔗 Video Link</a></p>}
                    {i.notes && <p className="text-sm text-gray-500 italic mb-3">"{i.notes}"</p>}
                    {i.duration_minutes && <p className="text-sm text-gray-500 mb-3">Duration: {i.duration_minutes} minutes</p>}

                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select your preferred time:</p>
                      <div className="space-y-2">
                        {(i.proposed_times || []).map((t, idx) => (
                          <button key={idx} onClick={() => confirmTime(i.id, t)} disabled={confirming === i.id}
                            className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm">
                            <span className="font-medium">📅 {formatDate(t)}</span>
                            <span className="float-right text-blue-600 font-medium">
                              {confirming === i.id ? '...' : 'Confirm →'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => cancelInterview(i.id)} className="mt-3 text-sm text-red-500 hover:underline">
                      Decline interview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming confirmed interviews */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                📅 Upcoming Interviews ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map(i => (
                  <div key={i.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{i.job_title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{i.company_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[i.status]}`}>
                        {i.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      📅 {formatDate(i.confirmed_time || i.scheduled_at)}
                      {i.duration_minutes && ` · ${i.duration_minutes} min`}
                      {i.type && ` · ${i.type}`}
                    </p>
                    {i.location && <p className="text-sm text-gray-500 mt-1">📍 {i.location}</p>}
                    {i.video_link && (
                      <a href={i.video_link} target="_blank" rel="noreferrer"
                        className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                        Join Video Call
                      </a>
                    )}
                    {i.notes && <p className="text-sm text-gray-500 mt-2 italic">"{i.notes}"</p>}

                    <button onClick={() => cancelInterview(i.id)} className="mt-3 text-sm text-red-500 hover:underline">
                      Cancel interview
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
