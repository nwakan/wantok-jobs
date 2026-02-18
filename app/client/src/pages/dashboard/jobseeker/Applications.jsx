/**
 * Application Tracker Dashboard (Part 2.4)
 * Visual timeline of all applications with status tracking
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const statusColors = {
  applied: 'bg-blue-100 text-blue-800',
  screening: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-purple-100 text-purple-800',
  interview: 'bg-indigo-100 text-indigo-800',
  offered: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800'
};

const statusSteps = ['applied', 'screening', 'shortlisted', 'interview', 'offered'];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, underReview: 0, interviews: 0, offers: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/applications/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || data.data || []);
        calculateStats(data.applications || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (apps) => {
    setStats({
      total: apps.length,
      underReview: apps.filter(a => ['applied', 'screening'].includes(a.status)).length,
      interviews: apps.filter(a => a.status === 'interview').length,
      offers: apps.filter(a => a.status === 'offered').length
    });
  };

  const getDaysSince = (dateString) => {
    const days = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getExpectedResponse = (status, appliedDate) => {
    const days = Math.floor((new Date() - new Date(appliedDate)) / (1000 * 60 * 60 * 24));
    if (status === 'applied') {
      return days < 7 ? 'Within 7 days' : 'Overdue';
    }
    if (status === 'screening') {
      return days < 14 ? 'Within 2 weeks' : 'Overdue';
    }
    return 'No timeline set';
  };

  const getProgressPercentage = (status) => {
    const index = statusSteps.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / statusSteps.length) * 100;
  };

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-1">Track all your job applications in one place</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total Applications</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-yellow-600">{stats.underReview}</div>
          <div className="text-sm text-gray-600 mt-1">Under Review</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-indigo-600">{stats.interviews}</div>
          <div className="text-sm text-gray-600 mt-1">Interviews</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-green-600">{stats.offers}</div>
          <div className="text-sm text-gray-600 mt-1">Offers</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {['all', 'applied', 'screening', 'shortlisted', 'interview', 'offered', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors capitalize ${
              filter === status
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No applications found</p>
          <Link 
            to="/jobs" 
            className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
          >
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map(app => (
            <div key={app.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              {/* Job Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Link 
                    to={`/jobs/${app.job_id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {app.job_title || 'Job Title'}
                  </Link>
                  <p className="text-gray-600 text-sm mt-1">
                    {app.company_name} • {app.location || 'Location not specified'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Applied {getDaysSince(app.applied_at)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[app.status]}`}>
                  {app.status}
                </span>
              </div>

              {/* Progress Timeline */}
              <div className="relative pt-1 mb-4">
                <div className="flex mb-2 items-center justify-between">
                  {statusSteps.map((step, index) => (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          statusSteps.indexOf(app.status) >= index
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-xs text-gray-600 mt-1 capitalize">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div 
                    style={{ width: `${getProgressPercentage(app.status)}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-600 transition-all duration-500"
                  ></div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Expected response: <span className="font-medium">{getExpectedResponse(app.status, app.applied_at)}</span>
                </div>
                {app.match_score && (
                  <div className="text-primary-600 font-medium">
                    {app.match_score}% Match
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Link
                  to={`/dashboard/applications/${app.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View Details →
                </Link>
                {app.status === 'applied' && (
                  <button
                    className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to withdraw this application?')) {
                        // Handle withdrawal
                      }
                    }}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
