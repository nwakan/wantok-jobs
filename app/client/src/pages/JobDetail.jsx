import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobs, applications, savedJobs } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { timeAgo, containsHTML, sanitizeHTML, copyToClipboard } from '../utils/helpers';
import JobCard from '../components/JobCard';

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
  const [similarJobs, setSimilarJobs] = useState([]);

  useEffect(() => {
    loadJob();
  }, [id]);

  useEffect(() => {
    if (job) {
      loadSimilarJobs();
    }
  }, [job]);

  // Add structured data for SEO
  useEffect(() => {
    if (!job) return;

    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description || job.excerpt || '',
      "identifier": {
        "@type": "PropertyValue",
        "name": "WantokJobs",
        "value": job.id
      },
      "datePosted": job.created_at,
      "validThrough": job.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "employmentType": job.job_type?.toUpperCase() || "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company_name,
        "logo": job.logo_url || undefined
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": job.location,
          "addressCountry": job.country || "PG"
        }
      }
    };

    if (job.salary_min && job.salary_max) {
      structuredData.baseSalary = {
        "@type": "MonetaryAmount",
        "currency": job.currency || "PGK",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": job.salary_min,
          "maxValue": job.salary_max,
          "unitText": job.salary_period === 'yearly' ? 'YEAR' : 'MONTH'
        }
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    script.id = 'job-structured-data';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('job-structured-data');
      if (existing) existing.remove();
    };
  }, [job]);

  const loadJob = async () => {
    try {
      const data = await jobs.getById(id);
      setJob(data);
      
      // Check if job is saved
      if (user) {
        // Note: We'd need an API endpoint to check this, for now assume not saved
        setSaved(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load job:', error);
      setLoading(false);
    }
  };

  const loadSimilarJobs = async () => {
    try {
      const params = {
        industry: job.industry,
        location: job.location,
        limit: 3,
      };
      const response = await jobs.getAll(params);
      // Filter out current job
      setSimilarJobs(response.data.filter(j => j.id !== job.id).slice(0, 3));
    } catch (error) {
      console.error('Failed to load similar jobs:', error);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (job.external_url) {
      window.open(job.external_url, '_blank');
      showToast('Opening external application page...', 'info');
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
        showToast('Job removed from saved', 'success');
      } else {
        await savedJobs.save(id);
        setSaved(true);
        showToast('Job saved!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Failed to save job', 'error');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await copyToClipboard(url);
      showToast('Link copied to clipboard!', 'success');
    } catch (error) {
      showToast('Failed to copy link', 'error');
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

  const hasHTML = containsHTML(job.description);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1 font-medium">
          ← Back to jobs
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (65%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-start gap-4 mb-6">
                {job.logo_url && (
                  <img src={job.logo_url} alt={job.company_name} className="w-16 h-16 rounded-lg object-cover border-2 border-gray-100" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                      <p className="text-lg text-gray-700 font-medium flex items-center gap-2">
                        {job.company_name}
                        {job.source !== 'headhunter' && (
                          <span className="text-green-600 text-sm">✓ Verified</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Info Bar */}
              <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-100">
                {job.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">📍</span>
                    <span className="font-medium">{job.location}, {job.country}</span>
                  </div>
                )}
                {job.job_type && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">💼</span>
                    <span className="font-medium capitalize">{job.job_type}</span>
                  </div>
                )}
                {job.salary_min && job.salary_max && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">💰</span>
                    <span className="font-medium">
                      {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                    </span>
                  </div>
                )}
                {job.created_at && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">🕒</span>
                    <span className="font-medium">Posted {timeAgo(job.created_at)}</span>
                  </div>
                )}
                {job.application_deadline && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">⏰</span>
                    <span className="font-medium">
                      Closes {new Date(job.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Apply Button (Mobile) */}
              <div className="lg:hidden">
                {user?.role === 'jobseeker' && !job.external_url && (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply Now
                  </button>
                )}
                {job.external_url && (
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply on Company Website →
                  </a>
                )}
                {!user && (
                  <Link
                    to="/login"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Login to Apply
                  </Link>
                )}
              </div>
            </div>

            {/* Job Highlights */}
            {(job.salary_min || job.experience_level || job.job_type) && (
              <div className="bg-gradient-to-br from-primary-50 to-green-50 rounded-xl p-6 border border-primary-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">✨ Job Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {job.salary_min && job.salary_max && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <div className="font-semibold text-gray-900">Competitive Salary</div>
                        <div className="text-sm text-gray-700">
                          {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                  {job.job_type && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💼</span>
                      <div>
                        <div className="font-semibold text-gray-900">Job Type</div>
                        <div className="text-sm text-gray-700 capitalize">{job.job_type}</div>
                      </div>
                    </div>
                  )}
                  {job.experience_level && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📈</span>
                      <div>
                        <div className="font-semibold text-gray-900">Experience Level</div>
                        <div className="text-sm text-gray-700">{job.experience_level}</div>
                      </div>
                    </div>
                  )}
                  {job.industry && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🏢</span>
                      <div>
                        <div className="font-semibold text-gray-900">Industry</div>
                        <div className="text-sm text-gray-700">{job.industry}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About the Role */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About the Role</h2>
              {hasHTML ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }}
                />
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </div>
              )}
            </div>

            {/* Requirements */}
            {requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Requirements</h2>
                <ul className="space-y-3">
                  {requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="text-primary-600 mt-1">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Company Info */}
            {(job.company_description || job.website) && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About {job.company_name}</h2>
                {job.company_description && (
                  <p className="text-gray-700 mb-4 leading-relaxed">{job.company_description}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {job.website && (
                    <a
                      href={job.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      🌐 Visit Website
                    </a>
                  )}
                  {job.industry && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                      🏢 {job.industry}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* External Link Notice */}
            {job.external_url && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Note:</span> This job is hosted externally. 
                  Click "Apply on Company Website" to submit your application.
                </p>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <span className="font-medium">Job ID:</span> #{job.id}
                </div>
                <div>
                  <span className="font-medium">Views:</span> {job.views_count || 0}
                </div>
                {job.source === 'headhunter' && (
                  <div>
                    <span className="inline-flex items-center gap-1">
                      🤖 <span className="font-medium">Imported from external source</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column (35%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Apply Card - Sticky */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-6">
              <div className="space-y-3">
                {user?.role === 'jobseeker' && !job.external_url && (
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Apply Now
                  </button>
                )}
                {job.external_url && (
                  <a
                    href={job.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Apply on Company Website →
                  </a>
                )}
                {!user && (
                  <Link
                    to="/login"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Login to Apply
                  </Link>
                )}
                
                {user && (
                  <button
                    onClick={handleSaveJob}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {saved ? '❤️ Saved' : '🤍 Save Job'}
                  </button>
                )}
                
                <button
                  onClick={handleShare}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  🔗 Share Job
                </button>
              </div>
            </div>

            {/* Company Snapshot */}
            {(job.company_name || job.location) && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Company Snapshot</h3>
                <div className="space-y-3 text-sm">
                  {job.company_name && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🏢</span>
                      <div>
                        <div className="text-gray-600">Company</div>
                        <div className="font-medium text-gray-900">{job.company_name}</div>
                      </div>
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">📍</span>
                      <div>
                        <div className="text-gray-600">Location</div>
                        <div className="font-medium text-gray-900">{job.location}, {job.country}</div>
                      </div>
                    </div>
                  )}
                  {job.industry && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🏭</span>
                      <div>
                        <div className="text-gray-600">Industry</div>
                        <div className="font-medium text-gray-900">{job.industry}</div>
                      </div>
                    </div>
                  )}
                  {job.website && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🌐</span>
                      <div>
                        <a 
                          href={job.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Visit Website →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Similar Jobs */}
            {similarJobs.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Similar Jobs</h3>
                <div className="space-y-3">
                  {similarJobs.map(similarJob => (
                    <JobCard key={similarJob.id} job={similarJob} compact />
                  ))}
                </div>
                <Link
                  to="/jobs"
                  className="block text-center mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all jobs →
                </Link>
              </div>
            )}

            {/* Job Alert */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-bold text-gray-900 mb-2">Get Similar Jobs</h3>
              <p className="text-sm text-gray-700 mb-4">
                Receive email notifications when similar jobs are posted
              </p>
              <Link
                to="/job-alerts"
                className="block text-center w-full px-4 py-2 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-primary-200"
              >
                Create Job Alert
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Apply for {job.title}</h2>
            <form onSubmit={handleApply}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell us why you're a great fit for this role..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your profile and resume will be automatically attached
                </p>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
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
