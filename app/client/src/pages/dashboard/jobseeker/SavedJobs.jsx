import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { savedJobs as savedJobsAPI, applications } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function SavedJobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    try {
      const [savedData, appsData] = await Promise.all([
        savedJobsAPI.getAll().catch(() => []),
        applications.getMy().catch(() => []),
      ]);
      
      setJobs(Array.isArray(savedData) ? savedData : []);
      
      const appliedJobIds = new Set((appsData || []).map(app => app.job_id));
      setAppliedJobs(appliedJobIds);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (jobId) => {
    try {
      await savedJobsAPI.unsave(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
      showToast('Job removed from saved 🗑️', 'success');
    } catch (error) {
      showToast('Failed to unsave job', 'error');
    }
  };

  const handleQuickApply = async (jobId) => {
    try {
      await applications.create({
        job_id: jobId,
        cover_letter: 'Applied from saved jobs. Please see my full profile for details.',
      });

      showToast('Application submitted successfully! 🎉', 'success');
      setAppliedJobs(new Set([...appliedJobs, jobId]));
    } catch (error) {
      showToast('Failed to submit application: ' + (error.message || 'Unknown error'), 'error');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Saved Jobs</h1>
        <p className="text-gray-600">
          Jobs you've bookmarked for later • {jobs.length} saved
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🔖</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved jobs yet</h3>
          <p className="text-gray-600 mb-6">
            Save jobs you're interested in to review and apply later
          </p>
          <Link 
            to="/jobs" 
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => {
            const isApplied = appliedJobs.has(job.id);
            
            return (
              <div 
                key={job.id} 
                className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-primary-500 hover:shadow-lg transition overflow-hidden flex flex-col"
              >
                {/* Applied Badge */}
                {isApplied && (
                  <div className="bg-green-500 text-white text-center py-1 text-xs font-semibold">
                    ✓ ALREADY APPLIED
                  </div>
                )}
                
                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="mb-4">
                    <Link 
                      to={`/jobs/${job.id}`} 
                      className="text-lg font-bold text-gray-900 hover:text-primary-600 transition line-clamp-2"
                    >
                      {job.title}
                    </Link>
                    <p className="text-gray-700 font-medium mt-2">{job.company_name}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💼</span>
                      <span className="capitalize">{job.type}</span>
                    </div>
                    {job.salary_min && job.salary_max && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <span>K{job.salary_min.toLocaleString()} - K{job.salary_max.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                      <span>🕒</span>
                      <span>
                        Posted {Math.floor((Date.now() - new Date(job.created_at || job.posted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  {job.description && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                      {job.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 mt-auto">
                    {isApplied ? (
                      <Link
                        to="/dashboard/jobseeker/applications"
                        className="block w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-center font-medium"
                      >
                        View Application
                      </Link>
                    ) : (
                      <>
                        <button
                          onClick={() => handleQuickApply(job.id)}
                          className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
                        >
                          ⚡ Quick Apply
                        </button>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center font-medium transition"
                        >
                          View Details
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => handleUnsave(job.id)}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      {jobs.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Review saved jobs regularly as positions may close</li>
            <li>• Use Quick Apply for faster applications</li>
            <li>• Tailor your cover letter for each position for better results</li>
            <li>• Set up job alerts to get notified about similar positions</li>
          </ul>
        </div>
      )}
    </div>
  );
}
