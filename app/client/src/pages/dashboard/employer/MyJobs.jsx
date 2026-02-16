import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs as jobsAPI } from '../../../api';
import { useToast } from '../../../components/Toast';
import { timeAgo } from '../../../utils/helpers';

export default function MyJobs() {
  const { showToast } = useToast();
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await jobsAPI.getMy();
      setMyJobs(data.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return;

    try {
      await jobsAPI.delete(jobId);
      setMyJobs(myJobs.filter(job => job.id !== jobId));
      showToast('Job deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete job: ' + error.message, 'error');
    }
  };

  const handleClone = async (job) => {
    // For now, just redirect to post job (future: pre-fill form)
    showToast('Clone feature coming soon - redirecting to post job', 'info');
    // navigate('/dashboard/employer/post-job', { state: { cloneFrom: job } });
  };

  const filteredJobs = filter === 'all' 
    ? myJobs 
    : myJobs.filter(job => job.status === filter);

  // Calculate stats
  const stats = {
    active: myJobs.filter(j => j.status === 'active').length,
    draft: myJobs.filter(j => j.status === 'draft').length,
    closed: myJobs.filter(j => j.status === 'closed').length,
    totalViews: myJobs.reduce((sum, j) => sum + (j.views_count || 0), 0),
    totalApplications: myJobs.reduce((sum, j) => sum + (j.applications_count || 0), 0),
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <p className="text-gray-600 mt-1">Manage your job listings and applications</p>
        </div>
        <Link
          to="/dashboard/employer/post-job"
          className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 shadow-sm"
        >
          + Post New Job
        </Link>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Jobs</span>
            <span className="text-2xl">✓</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.active}</div>
          <p className="text-xs text-gray-500 mt-1">Currently published</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Drafts</span>
            <span className="text-2xl">📝</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.draft}</div>
          <p className="text-xs text-gray-500 mt-1">Not yet published</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Closed</span>
            <span className="text-2xl">🔒</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.closed}</div>
          <p className="text-xs text-gray-500 mt-1">No longer accepting</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Views</span>
            <span className="text-2xl">👁️</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalViews}</div>
          <p className="text-xs text-gray-500 mt-1">Across all jobs</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Applications</span>
            <span className="text-2xl">📄</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalApplications}</div>
          <p className="text-xs text-gray-500 mt-1">Total received</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All ({myJobs.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Active ({stats.active})
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'draft' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Drafts ({stats.draft})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'closed' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Closed ({stats.closed})
        </button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Get started by posting your first job listing' 
              : `You don't have any ${filter} jobs at the moment`
            }
          </p>
          {filter === 'all' && (
            <Link 
              to="/dashboard/employer/post-job" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              + Post your first job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link 
                        to={`/jobs/${job.id}`} 
                        className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {job.title}
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        job.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' :
                        job.status === 'draft' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        📍 {job.location || 'Remote'}, {job.country}
                      </span>
                      <span className="flex items-center gap-1">
                        💼 {job.job_type}
                      </span>
                      <span className="flex items-center gap-1">
                        🕒 Posted {timeAgo(job.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 px-4 bg-gray-50 rounded-lg mb-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Views</div>
                    <div className="text-xl font-bold text-gray-900">
                      {job.views_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Applications</div>
                    <div className="text-xl font-bold text-gray-900">
                      {job.applications_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Salary Range</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {job.salary_min && job.salary_max 
                        ? `${job.salary_currency} ${job.salary_min.toLocaleString()}-${job.salary_max.toLocaleString()}`
                        : 'Not specified'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Deadline</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {job.application_deadline 
                        ? new Date(job.application_deadline).toLocaleDateString()
                        : 'Open'
                      }
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/dashboard/employer/applicants/${job.id}`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm"
                  >
                    View Applicants {job.applications_count > 0 && `(${job.applications_count})`}
                  </Link>
                  <Link
                    to={`/dashboard/employer/edit-job/${job.id}`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    ✏️ Edit
                  </Link>
                  <Link
                    to={`/jobs/${job.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    👁️ Preview
                  </Link>
                  <button
                    onClick={() => handleClone(job)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    📋 Clone
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium border border-red-200"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
