import { useState, useEffect } from 'react';
import { profile, savedResumes } from '../../../api';
import { useToast } from '../../../components/Toast';
import { Link } from 'react-router-dom';

export default function CandidateSearch() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedCandidateIds, setSavedCandidateIds] = useState([]);
  const { showToast } = useToast();

  const [searchFilters, setSearchFilters] = useState({
    keywords: '',
    skills: '',
    location: '',
    experience: '',
  });

  useEffect(() => {
    loadSavedCandidates();
  }, []);

  const loadSavedCandidates = async () => {
    try {
      const saved = await savedResumes.getAll();
      setSavedCandidateIds(saved.map(s => s.user_id));
    } catch (error) {
      console.error('Failed to load saved candidates:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Placeholder - would call actual search API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock results
      setCandidates([
        {
          id: 1,
          user_id: 'U-001',
          name: 'Sarah Johnson',
          headline: 'Senior Software Engineer',
          location: 'Port Moresby',
          skills: ['React', 'Node.js', 'Python', 'AWS'],
          experience_years: 5,
          match_percentage: 95,
        },
        {
          id: 2,
          user_id: 'U-002',
          name: 'Michael Chen',
          headline: 'Full Stack Developer',
          location: 'Lae',
          skills: ['JavaScript', 'Vue.js', 'Django', 'Docker'],
          experience_years: 3,
          match_percentage: 87,
        },
        {
          id: 3,
          user_id: 'U-003',
          name: 'Emma Wilson',
          headline: 'Frontend Developer',
          location: 'Port Moresby',
          skills: ['React', 'TypeScript', 'CSS', 'Figma'],
          experience_years: 4,
          match_percentage: 82,
        },
      ]);
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCandidate = async (userId) => {
    try {
      await savedResumes.save(userId);
      setSavedCandidateIds([...savedCandidateIds, userId]);
      showToast('Candidate saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save candidate', 'error');
    }
  };

  const handleUnsaveCandidate = async (userId) => {
    try {
      await savedResumes.remove(userId);
      setSavedCandidateIds(savedCandidateIds.filter(id => id !== userId));
      showToast('Candidate removed from saved', 'success');
    } catch (error) {
      showToast('Failed to remove candidate', 'error');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Candidates</h1>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords
              </label>
              <input
                type="text"
                value={searchFilters.keywords}
                onChange={e => setSearchFilters({ ...searchFilters, keywords: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Job title, company, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <input
                type="text"
                value={searchFilters.skills}
                onChange={e => setSearchFilters({ ...searchFilters, skills: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="React, Python, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={searchFilters.location}
                onChange={e => setSearchFilters({ ...searchFilters, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="City or region"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={searchFilters.experience}
                onChange={e => setSearchFilters({ ...searchFilters, experience: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Any</option>
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (3-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Candidates'}
          </button>
        </form>
      </div>

      {/* Results */}
      {candidates.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Search Results ({candidates.length})
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {candidates.map(candidate => {
              const isSaved = savedCandidateIds.includes(candidate.user_id);
              
              return (
                <div key={candidate.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {candidate.name}
                        </h3>
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                          {candidate.match_percentage}% Match
                        </span>
                      </div>
                      <p className="text-gray-700 font-medium mb-1">{candidate.headline}</p>
                      <p className="text-sm text-gray-600">
                        📍 {candidate.location} • {candidate.experience_years} years experience
                      </p>
                    </div>

                    <button
                      onClick={() => isSaved ? handleUnsaveCandidate(candidate.user_id) : handleSaveCandidate(candidate.user_id)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        isSaved
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSaved ? '✓ Saved' : 'Save'}
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
              );
            })}
          </div>
        </div>
      )}

      {candidates.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Enter search criteria and click "Search Candidates" to find talent.</p>
        </div>
      )}
    </div>
  );
}
