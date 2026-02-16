import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications } from '../../../api';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';

export default function MyApplications() {
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await applications.getMy();
      setMyApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = filter === 'all' 
    ? myApplications 
    : myApplications.filter(app => app.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Applications</h1>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({myApplications.length})
        </button>
        <button
          onClick={() => setFilter('applied')}
          className={`px-4 py-2 rounded-lg ${filter === 'applied' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Applied
        </button>
        <button
          onClick={() => setFilter('screening')}
          className={`px-4 py-2 rounded-lg ${filter === 'screening' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Screening
        </button>
        <button
          onClick={() => setFilter('shortlisted')}
          className={`px-4 py-2 rounded-lg ${filter === 'shortlisted' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Shortlisted
        </button>
        <button
          onClick={() => setFilter('interview')}
          className={`px-4 py-2 rounded-lg ${filter === 'interview' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Interview
        </button>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-4">No applications found</p>
          <Link to="/jobs" className="text-primary-600 hover:text-primary-700 font-medium">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {filteredApplications.map(app => (
            <div key={app.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Link to={`/jobs/${app.job_id}`} className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {app.job_title}
                  </Link>
                  <p className="text-gray-600 mt-1">{app.company_name}</p>
                </div>
                <ApplicationStatusBadge status={app.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Location:</span>
                  <p className="font-medium">{app.location}</p>
                </div>
                <div>
                  <span className="text-gray-600">Job Type:</span>
                  <p className="font-medium">{app.job_type}</p>
                </div>
                <div>
                  <span className="text-gray-600">Applied:</span>
                  <p className="font-medium">{new Date(app.applied_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Salary:</span>
                  <p className="font-medium">
                    {app.salary_min && app.salary_max 
                      ? `${app.salary_currency} ${app.salary_min.toLocaleString()} - ${app.salary_max.toLocaleString()}`
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>

              {app.cover_letter && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Cover Letter:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{app.cover_letter}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
