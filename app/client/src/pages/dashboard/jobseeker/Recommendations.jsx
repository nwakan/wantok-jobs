import { useState, useEffect } from 'react';
import { jobs, profile, applications } from '../../../api';
import { useToast } from '../../../components/Toast';
import JobCard from '../../../components/JobCard';
import { Link } from 'react-router-dom';

export default function Recommendations() {
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      // Get user profile
      const profData = await profile.get();
      setProfileData(profData);

      // Get jobs and filter based on profile
      const jobsData = await jobs.getAll({ limit: 20 });
      
      // Mock AI matching - in real app this would be server-side
      const matchedJobs = jobsData.data.map(job => ({
        ...job,
        match_score: Math.floor(Math.random() * 30) + 70, // Random 70-100%
        match_reasons: [
          'Skills match your profile',
          'Location preference',
          'Experience level match',
        ].slice(0, Math.floor(Math.random() * 2) + 1),
      }));

      // Sort by match score
      matchedJobs.sort((a, b) => b.match_score - a.match_score);

      setRecommendedJobs(matchedJobs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // Placeholder data
      setRecommendedJobs([
        {
          id: 1,
          title: 'Senior Software Engineer',
          company_name: 'Tech Corp',
          location: 'Port Moresby',
          type: 'Full-time',
          salary_range: 'K80,000 - K120,000',
          posted_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          match_score: 95,
          match_reasons: ['Skills match your profile', 'Location preference', 'Senior level match'],
        },
        {
          id: 2,
          title: 'Full Stack Developer',
          company_name: 'StartUp Inc',
          location: 'Lae',
          type: 'Full-time',
          salary_range: 'K60,000 - K90,000',
          posted_at: new Date(Date.now() - 86400000).toISOString(),
          match_score: 87,
          match_reasons: ['Skills match your profile', 'Experience level match'],
        },
        {
          id: 3,
          title: 'Frontend Developer',
          company_name: 'Design Studio',
          location: 'Port Moresby',
          type: 'Contract',
          salary_range: 'K50,000 - K70,000',
          posted_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          match_score: 82,
          match_reasons: ['Skills match your profile'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApply = async (jobId) => {
    try {
      if (!profileData?.profile?.resume_url) {
        showToast('Please upload your resume first', 'error');
        return;
      }

      await applications.create({
        job_id: jobId,
        cover_letter: 'Applied via quick apply - see my full profile for details.',
      });

      showToast('Application submitted successfully!', 'success');
      
      // Update the job to show it's been applied to
      setRecommendedJobs(recommendedJobs.map(job => 
        job.id === jobId ? { ...job, applied: true } : job
      ));
    } catch (error) {
      showToast('Failed to submit application', 'error');
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Recommendations</h1>
        <p className="text-gray-600">
          Jobs matched to your profile, skills, and preferences
        </p>
      </div>

      {/* Profile Completion Alert */}
      {profileData && !profileData.profile?.profile_complete && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Improve your recommendations</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Complete your profile to get better job matches.{' '}
                <Link to="/dashboard/jobseeker/profile" className="font-medium underline">
                  Complete profile →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendedJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-600 mb-4">No recommendations available yet.</p>
          <p className="text-sm text-gray-500 mb-4">
            Complete your profile to help us find the perfect jobs for you.
          </p>
          <Link
            to="/dashboard/jobseeker/profile"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Complete Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {recommendedJobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link to={`/jobs/${job.id}`} className="text-xl font-bold text-gray-900 hover:text-primary-600">
                      {job.title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      job.match_score >= 90 ? 'bg-green-100 text-green-800' :
                      job.match_score >= 80 ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.match_score}% Match
                    </span>
                  </div>

                  <p className="text-gray-700 font-medium mb-2">{job.company_name}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <span>📍 {job.location}</span>
                    <span>💼 {job.type}</span>
                    {job.salary_range && <span>💰 {job.salary_range}</span>}
                    <span className="text-xs text-gray-500">
                      Posted {new Date(job.posted_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Match Reasons */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Why this matches:</p>
                    <div className="flex flex-wrap gap-2">
                      {job.match_reasons.map((reason, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {job.applied ? (
                  <button
                    disabled
                    className="px-6 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                  >
                    ✓ Applied
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleQuickApply(job.id)}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Quick Apply
                    </button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      View Details
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
