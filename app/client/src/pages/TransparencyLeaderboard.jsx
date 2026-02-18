import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function TransparencyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, government, soe, statutory, private
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load leaderboard
      const filterParam = filter !== 'all' ? `?employer_type=${filter}` : '';
      const leaderboardRes = await api.get(`/transparency-public/leaderboard${filterParam}`);
      setLeaderboard(leaderboardRes.data || leaderboardRes || []);
      
      // Load stats
      const statsRes = await api.get('/transparency-public/stats');
      setStats(statsRes.data || statsRes || null);
      
      setError(null);
    } catch (err) {
      console.error('Failed to load transparency data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBandColor = (band) => {
    switch (band) {
      case 'high': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-red-100 text-red-800 border-red-300';
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBandLabel = (band, score) => {
    switch (band) {
      case 'high': return 'Excellent';
      case 'medium': return 'Good';
      case 'low': return 'Needs Improvement';
      case 'none': return 'No Data';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PNG Transparency Leaderboard
          </h1>
          <p className="text-lg text-gray-600">
            Ranking government, SOE, statutory authorities, and public companies on hiring transparency
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Overall Compliance</div>
              <div className="text-3xl font-bold text-gray-900">{stats.overall.complianceRate}%</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.overall.employersWithData} of {stats.overall.totalRequiredEmployers} submitting data
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Average Score</div>
              <div className="text-3xl font-bold text-gray-900">{stats.overall.avgScoreAll}/100</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.overall.avgScoreNonZero}/100 among those with data
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Salary Disclosure</div>
              <div className="text-3xl font-bold text-gray-900">{stats.overall.salaryDisclosureRate}%</div>
              <div className="text-sm text-gray-600 mt-1">
                Jobs with salary bands disclosed
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500">Transparent Jobs</div>
              <div className="text-3xl font-bold text-gray-900">{stats.overall.transparentJobs}</div>
              <div className="text-sm text-gray-600 mt-1">
                of {stats.overall.totalJobs} total jobs posted
              </div>
            </div>
          </div>
        )}

        {/* Distribution Badges */}
        {stats && stats.distribution && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <span className="text-3xl mr-2">✅</span>
                <div>
                  <div className="font-semibold text-gray-900">{stats.distribution.high}</div>
                  <div className="text-sm text-gray-600">High (80-100)</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl mr-2">🟡</span>
                <div>
                  <div className="font-semibold text-gray-900">{stats.distribution.medium}</div>
                  <div className="text-sm text-gray-600">Medium (50-79)</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl mr-2">🔴</span>
                <div>
                  <div className="font-semibold text-gray-900">{stats.distribution.low}</div>
                  <div className="text-sm text-gray-600">Low (1-49)</div>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl mr-2">⚫</span>
                <div>
                  <div className="font-semibold text-gray-900">{stats.distribution.no_data}</div>
                  <div className="text-sm text-gray-600">No Data (0)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'government', 'soe', 'statutory', 'private'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            No employers found in this category.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jobs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salary Disclosure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((employer, index) => (
                  <tr key={employer.employerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/transparency/employer/${employer.employerId}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {employer.companyName}
                      </Link>
                      {employer.location && (
                        <div className="text-xs text-gray-500">{employer.location}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employer.employerType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{employer.emoji}</span>
                        <span className="text-lg font-bold text-gray-900">{employer.score}</span>
                        <span className="text-sm text-gray-500">/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employer.transparentJobs} / {employer.jobsPosted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {employer.salaryDisclosureRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBandColor(employer.band)}`}>
                        {getBandLabel(employer.band, employer.score)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hall of Fame / Needs Improvement */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* Hall of Fame */}
            {stats.bestPerformers && stats.bestPerformers.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center">
                  <span className="text-3xl mr-2">🏆</span>
                  Hall of Fame
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  Top performers leading the way in hiring transparency
                </p>
                <ul className="space-y-2">
                  {stats.bestPerformers.map((employer, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">
                        {i + 1}. {employer.company_name}
                      </span>
                      <span className="text-sm font-bold text-green-700">
                        {employer.transparency_score}/100
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Needs Improvement */}
            {stats.noDataEmployers && stats.noDataEmployers.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-3xl mr-2">⚫</span>
                  Needs Improvement
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Employers with no transparency data submitted
                </p>
                <ul className="space-y-2">
                  {stats.noDataEmployers.slice(0, 10).map((employer, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {employer.company_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {employer.employer_type}
                      </span>
                    </li>
                  ))}
                </ul>
                {stats.distribution.no_data > 10 && (
                  <p className="text-xs text-gray-600 mt-4">
                    ...and {stats.distribution.no_data - 10} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            About This Leaderboard
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            This leaderboard ranks employers on their commitment to hiring transparency. 
            Scores are calculated based on: salary disclosure (+15), selection criteria (+20), 
            status updates (+15), hiring timeline (+15), outcome publication (+15), 
            re-advertisement transparency (+10), and panel diversity (+10).
          </p>
          <p className="text-sm text-blue-800">
            Transparency helps jobseekers make informed decisions and improves hiring standards across PNG and the Pacific.
            Updated daily.
          </p>
        </div>
      </div>
    </div>
  );
}
