import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/Toast';
import { savedSearches as api } from '../../../api';
import { Search, Bell, BellOff, Trash2, Play, Clock } from 'lucide-react';

export default function SavedSearches() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSearches();
  }, []);

  const loadSearches = async () => {
    try {
      const data = await api.getAll();
      setSearches(data?.searches || []);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
      showToast('Failed to load saved searches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotify = async (id) => {
    try {
      const result = await api.toggleNotify(id);
      setSearches(prev => prev.map(s => s.id === id ? { ...s, notify: result.notify ? 1 : 0 } : s));
      showToast(result.notify ? 'Notifications enabled 🔔' : 'Notifications disabled', 'success');
    } catch (error) {
      showToast('Failed to update notifications', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this saved search?')) return;
    try {
      await api.remove(id);
      setSearches(prev => prev.filter(s => s.id !== id));
      showToast('Saved search deleted', 'success');
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleRunSearch = (search) => {
    const params = new URLSearchParams();
    if (search.query) params.set('keyword', search.query);
    if (search.category) params.set('category', search.category);
    if (search.location) params.set('location', search.location);
    if (search.experience_level) params.set('experience', search.experience_level);
    if (search.salary_min) params.set('salary_min', search.salary_min);
    if (search.salary_max) params.set('salary_max', search.salary_max);
    navigate(`/jobs?${params.toString()}`);
  };

  const getCriteriaSummary = (search) => {
    const parts = [];
    if (search.query) parts.push(`"${search.query}"`);
    if (search.category) parts.push(search.category);
    if (search.location) parts.push(search.location);
    if (search.experience_level) parts.push(search.experience_level);
    if (search.salary_min || search.salary_max) {
      const min = search.salary_min ? `K${search.salary_min.toLocaleString()}` : '';
      const max = search.salary_max ? `K${search.salary_max.toLocaleString()}` : '';
      parts.push(min && max ? `${min}–${max}` : min || max);
    }
    return parts.join(' · ') || 'All jobs';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 h-24" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
        <span className="text-sm text-gray-500">{searches.length}/20 searches</span>
      </div>

      {searches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved searches yet</h3>
          <p className="text-gray-500 mb-4">Search for jobs and save your criteria to quickly run them again later.</p>
          <button
            onClick={() => navigate('/jobs')}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map(search => (
            <div key={search.id} className="bg-white rounded-lg shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{search.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{getCriteriaSummary(search)}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="font-medium text-primary-600">{search.match_count} matching jobs</span>
                  {search.last_notified_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last notified {new Date(search.last_notified_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRunSearch(search)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
                  title="Run this search"
                >
                  <Play className="w-4 h-4" />
                  Run
                </button>
                <button
                  onClick={() => handleToggleNotify(search.id)}
                  className={`p-2 rounded-lg ${search.notify ? 'text-primary-600 bg-primary-50 hover:bg-primary-100' : 'text-gray-400 hover:bg-gray-100'}`}
                  title={search.notify ? 'Notifications on' : 'Notifications off'}
                >
                  {search.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(search.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
