import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin as adminAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function ManageJobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    loadJobs();
  }, [filter, pagination.page]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter, page: pagination.page } : { page: pagination.page };
      const data = await adminAPI.getJobs(params);
      setJobs(data.data);
      setPagination({ page: data.page, totalPages: data.totalPages });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await adminAPI.deleteJob(jobId);
      loadJobs();
    } catch (error) {
      showToast('Failed to delete job: ' + error.message, 'error');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Jobs</h1>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All Jobs
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg ${filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg ${filter === 'closed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Closed
        </button>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow-sm divide-y">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No jobs found</div>
        ) : (
          jobs.map(job => (
            <div key={job.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Link to={`/jobs/${job.id}`} className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {job.title}
                  </Link>
                  <p className="text-gray-600 mt-1">
                    {job.company_name} • {job.location}, {job.country}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status === 'active' ? 'bg-green-100 text-green-800' :
                  job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Employer:</span>
                  <p className="font-medium">{job.employer_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Job Type:</span>
                  <p className="font-medium">{job.job_type}</p>
                </div>
                <div>
                  <span className="text-gray-600">Views:</span>
                  <p className="font-medium">{job.views_count || 0}</p>
                </div>
                <div>
                  <span className="text-gray-600">Posted:</span>
                  <p className="font-medium">{new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Salary:</span>
                  <p className="font-medium">
                    {job.salary_min && job.salary_max 
                      ? `${job.salary_currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/jobs/${job.id}`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  View Job
                </Link>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
