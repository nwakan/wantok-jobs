import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { savedJobs as savedJobsAPI } from '../../../api';
import JobCard from '../../../components/JobCard';
import { useToast } from '../../../components/Toast';

export default function SavedJobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    try {
      const data = await savedJobsAPI.getAll();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId) => {
    try {
      await savedJobsAPI.unsave(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (error) {
      showToast('Failed to unsave job', 'error');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Saved Jobs</h1>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-4">No saved jobs yet</p>
          <Link to="/jobs" className="text-primary-600 hover:text-primary-700 font-medium">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.id} className="relative">
              <JobCard job={job} />
              <button
                onClick={() => handleUnsave(job.id)}
                className="absolute top-4 right-4 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
