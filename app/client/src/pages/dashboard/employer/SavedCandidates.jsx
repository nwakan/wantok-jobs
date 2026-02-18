import { useState, useEffect } from 'react';
import { savedResumes } from '../../../api';
import { useToast } from '../../../components/Toast';
import { Link } from 'react-router-dom';
import { getFlag } from '../../../utils/countryFlags';

export default function SavedCandidates() {
  const [savedList, setSavedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    loadSavedCandidates();
  }, []);

  const loadSavedCandidates = async () => {
    try {
      const data = await savedResumes.getAll();
      setSavedList(data || []);
      
      // Initialize notes from saved data
      const notesMap = {};
      data.forEach(item => {
        notesMap[item.user_id] = item.notes || '';
      });
      setNotes(notesMap);
    } catch (error) {
      console.error('Failed to load saved candidates:', error);
      // Placeholder data
      setSavedList([
        {
          id: 1,
          user_id: 'U-001',
          user_name: 'Sarah Johnson',
          headline: 'Senior Software Engineer',
          location: 'Port Moresby',
          skills: ['React', 'Node.js', 'Python', 'AWS'],
          experience_years: 5,
          saved_at: new Date(Date.now() - 86400000).toISOString(),
          notes: 'Strong candidate for senior position',
          folder: 'Top Picks',
        },
        {
          id: 2,
          user_id: 'U-002',
          user_name: 'Michael Chen',
          headline: 'Full Stack Developer',
          location: 'Lae',
          skills: ['JavaScript', 'Vue.js', 'Django', 'Docker'],
          experience_years: 3,
          saved_at: new Date(Date.now() - 172800000).toISOString(),
          notes: '',
          folder: 'General',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Are you sure you want to remove this candidate from saved?')) return;
    
    try {
      await savedResumes.remove(userId);
      setSavedList(savedList.filter(c => c.user_id !== userId));
      showToast('Candidate removed from saved', 'success');
    } catch (error) {
      showToast('Failed to remove candidate', 'error');
    }
  };

  const handleSaveNotes = async (userId) => {
    try {
      // Would call API to save notes
      showToast('Notes saved', 'success');
    } catch (error) {
      showToast('Failed to save notes', 'error');
    }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Candidates</h1>

      {savedList.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600 mb-4">You haven't saved any candidates yet.</p>
          <Link
            to="/dashboard/employer/candidate-search"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Search Candidates
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {savedList.map(candidate => (
            <div key={candidate.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {candidate.user_name}
                    </h3>
                    {candidate.folder && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                        {candidate.folder}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 font-medium mb-1">{candidate.headline}</p>
                  <p className="text-sm text-gray-600 mb-2">
                    {getFlag(candidate)} {candidate.location} • {candidate.experience_years} years experience
                  </p>
                  <p className="text-xs text-gray-500">
                    Saved {new Date(candidate.saved_at).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleRemove(candidate.user_id)}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Notes:
                </label>
                <textarea
                  value={notes[candidate.user_id] || ''}
                  onChange={e => setNotes({ ...notes, [candidate.user_id]: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  rows="3"
                  placeholder="Add notes about this candidate..."
                />
                <button
                  onClick={() => handleSaveNotes(candidate.user_id)}
                  className="mt-2 px-4 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                >
                  Save Notes
                </button>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/profile/${candidate.user_id}`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  View Full Profile
                </Link>
                <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
