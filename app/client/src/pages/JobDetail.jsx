import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobs, applications, savedJobs } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await jobs.getById(id);
      setJob(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load job:', error);
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setApplying(true);
    try {
      await applications.create({
        job_id: parseInt(id),
        cover_letter: coverLetter,
      });
      showToast('Application submitted successfully!', 'success');
      setShowApplyModal(false);
      setCoverLetter('');
    } catch (error) {
      showToast(error.message || 'Failed to submit application', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleSaveJob = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (saved) {
        await savedJobs.unsave(id);
        setSaved(false);
      } else {
        await savedJobs.save(id);
        setSaved(true);
      }
    } catch (error) {
      showToast(error.message || 'Failed to save job', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Job not found</h1>
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to jobs
        </Link>
      </div>
    );
  }

  let requirements = [];
  try {
    requirements = job.requirements ? JSON.parse(job.requirements) : [];
  } catch (error) {
    console.error('Failed to parse requirements:', error);
    requirements = [];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to jobs
      </Link>

      <div className="bg-white rounded-lg shadow-sm p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <p className="text-xl text-gray-600">{job.company_name}</p>
            {job.source === 'headhunter' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200 mt-2">
                🤖 Imported
              </span>
            )}
          </div>
          {job.logo_url && (
            <img src={job.logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
          )}
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 mb-6">
          {job.location && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-700">
              📍 {job.location}, {job.country}
            </span>
          )}
          {job.job_type && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-blue-100 text-blue-700">
              {job.job_type}
            </span>
          )}
          {job.experience_level && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-purple-100 text-purple-700">
              {job.experience_level}
            </span>
          )}
          {job.salary_min && job.salary_max && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-green-100 text-green-700">
              {job.salary_currency} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          {user?.role === 'jobseeker' && (
            <>
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
              >
                Apply Now
              </button>
              <button
                onClick={handleSaveJob}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
              >
                {saved ? 'Unsave Job' : 'Save Job'}
              </button>
            </>
          )}
          {!user && (
            <Link
              to="/login"
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
            >
              Login to Apply
            </Link>
          )}
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>

        {/* Requirements */}
        {requirements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
            <ul className="list-disc list-inside space-y-2">
              {requirements.map((req, index) => (
                <li key={index} className="text-gray-700">{req}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Company Info */}
        {job.company_description && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About the Company</h2>
            <p className="text-gray-700">{job.company_description}</p>
            {job.website && (
              <a
                href={job.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 mt-2 inline-block"
              >
                Visit Website →
              </a>
            )}
          </div>
        )}

        {/* External Link */}
        {job.external_url && (
          <div className="mb-8">
            <a
              href={job.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              View original listing →
            </a>
          </div>
        )}

        {/* Additional Info */}
        <div className="border-t pt-6 text-sm text-gray-600">
          <p>Posted: {new Date(job.created_at).toLocaleDateString()}</p>
          {job.application_deadline && (
            <p>Deadline: {new Date(job.application_deadline).toLocaleDateString()}</p>
          )}
          <p>Views: {job.views_count}</p>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold mb-4">Apply for {job.title}</h2>
            <form onSubmit={handleApply}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell us why you're a great fit for this role..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
