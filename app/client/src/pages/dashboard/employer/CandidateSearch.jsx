import { useState, useEffect } from 'react';
import { profile, savedResumes } from '../../../api';
import { useToast } from '../../../components/Toast';
import { Link } from 'react-router-dom';
import { getFlag } from '../../../utils/countryFlags';

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
    availability: '',
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
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      // Placeholder - would call actual search API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock results with more variety
      const mockCandidates = [
        {
          id: 1,
          user_id: 'U-001',
          name: 'Sarah Johnson',
          headline: 'Senior Software Engineer',
          location: 'Port Moresby',
          skills: ['React', 'Node.js', 'Python', 'AWS', 'Docker'],
          experience_years: 5,
          match_percentage: 95,
          availability: 'Immediate',
        },
        {
          id: 2,
          user_id: 'U-002',
          name: 'Michael Chen',
          headline: 'Full Stack Developer',
          location: 'Lae',
          skills: ['JavaScript', 'Vue.js', 'Django', 'Docker', 'PostgreSQL'],
          experience_years: 3,
          match_percentage: 87,
          availability: '2 weeks',
        },
        {
          id: 3,
          user_id: 'U-003',
          name: 'Emma Wilson',
          headline: 'Frontend Developer',
          location: 'Port Moresby',
          skills: ['React', 'TypeScript', 'CSS', 'Figma', 'Jest'],
          experience_years: 4,
          match_percentage: 82,
          availability: '1 month',
        },
        {
          id: 4,
          user_id: 'U-004',
          name: 'David Kila',
          headline: 'Marketing Manager',
          location: 'Mt. Hagen',
          skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'Social Media'],
          experience_years: 6,
          match_percentage: 78,
          availability: 'Immediate',
        },
        {
          id: 5,
          user_id: 'U-005',
          name: 'Lisa Tau',
          headline: 'Data Analyst',
          location: 'Port Moresby',
          skills: ['Python', 'SQL', 'Tableau', 'Excel', 'Statistics'],
          experience_years: 2,
          match_percentage: 75,
          availability: '2 weeks',
        },
        {
          id: 6,
          user_id: 'U-006',
          name: 'James Koima',
          headline: 'Accountant',
          location: 'Lae',
          skills: ['Accounting', 'QuickBooks', 'Financial Reporting', 'Tax', 'Audit'],
          experience_years: 7,
          match_percentage: 72,
          availability: '1 month',
        },
      ];

      // Apply filters
      let filtered = mockCandidates;
      if (searchFilters.keywords) {
        const kw = searchFilters.keywords.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(kw) ||
          c.headline.toLowerCase().includes(kw)
        );
      }
      if (searchFilters.location) {
        filtered = filtered.filter(c => 
          c.location.toLowerCase().includes(searchFilters.location.toLowerCase())
        );
      }
      if (searchFilters.experience) {
        const [min, max] = searchFilters.experience === 'entry' ? [0, 2] :
                           searchFilters.experience === 'mid' ? [3, 5] :
                           [6, 100];
        filtered = filtered.filter(c => c.experience_years >= min && c.experience_years <= max);
      }

      setCandidates(filtered);
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
    <div className="flex gap-6">
      {/* Filter Sidebar */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Search Filters</h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords
              </label>
              <input
                type="text"
                value={searchFilters.keywords}
                onChange={e => setSearchFilters({ ...searchFilters, keywords: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Job title, name, etc."
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (3-5 years)</option>
                <option value="senior">Senior (6+ years)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select
                value={searchFilters.availability}
                onChange={e => setSearchFilters({ ...searchFilters, availability: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Any</option>
                <option value="immediate">Immediate</option>
                <option value="2weeks">Within 2 weeks</option>
                <option value="1month">Within 1 month</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Searching...' : '🔍 Search Candidates'}
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchFilters({ keywords: '', skills: '', location: '', experience: '', availability: '' });
                setCandidates([]);
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <Link to="/dashboard/employer/saved-candidates" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              📋 View Saved Candidates ({savedCandidateIds.length})
            </Link>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Candidates</h1>
          <p className="text-gray-600">
            {candidates.length > 0 ? `${candidates.length} candidates found` : 'Use the filters to search for talent'}
          </p>
        </div>

        {candidates.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {candidates.map(candidate => {
              const isSaved = savedCandidateIds.includes(candidate.user_id);
              
              return (
                <div key={candidate.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0">
                        {candidate.name.charAt(0)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {candidate.name}
                          </h3>
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                            {candidate.match_percentage}% Match
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mb-2">{candidate.headline}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{getFlag(candidate)} {candidate.location}</span>
                          <span>💼 {candidate.experience_years} years experience</span>
                          <span>⏰ Available: {candidate.availability}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => isSaved ? handleUnsaveCandidate(candidate.user_id) : handleSaveCandidate(candidate.user_id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSaved
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isSaved ? '✓ Saved' : '🔖 Save'}
                    </button>
                  </div>

                  {/* Match Score Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-600">Profile Match</span>
                      <span className="text-xs font-bold text-primary-600">{candidate.match_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${candidate.match_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Link
                      to={`/profile/${candidate.user_id}`}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center font-medium"
                    >
                      👤 View Full Profile
                    </Link>
                    <button className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                      📧 Send Message
                    </button>
                    <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium">
                      📋 Invite to Apply
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Your Search</h3>
            <p className="text-gray-600 mb-6">
              Use the filters on the left to find the perfect candidates for your positions
            </p>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
            >
              Search All Candidates
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
