import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs as jobsAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

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
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await jobsAPI.delete(jobId);
      setMyJobs(myJobs.filter(job => job.id !== jobId));
    } catch (error) {
      showToast('Failed to delete job: ' + error.message, 'error');
    }
  };

  const filteredJobs = filter === 'all' 
    ? myJobs 
    : myJobs.filter(job => job.status === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <Link
          to="/dashboard/employer/post-job"
          className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
        >
          Post New Job
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({myJobs.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg ${filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('draft')}
          className={`px-4 py-2 rounded-lg ${filter === 'draft' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Draft
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded-lg ${filter === 'closed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Closed
        </button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-4">No jobs found</p>
          <Link to="/dashboard/employer/post-job" className="text-primary-600 hover:text-primary-700 font-medium">
            Post your first job →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {filteredJobs.map(job => (
            <div key={job.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Link to={`/jobs/${job.id}`} className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {job.title}
                  </Link>
                  <p className="text-gray-600 mt-1">{job.location}, {job.country}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status === 'active' ? 'bg-green-100 text-green-800' :
                  job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                  to={`/dashboard/employer/applicants/${job.id}`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  View Applicants
                </Link>
                <Link
                  to={`/dashboard/employer/edit-job/${job.id}`}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
