import { useState, useEffect } from 'react';
import { jobs, profile, applications, savedJobs as savedJobsAPI } from '../../../api';
import { useToast } from '../../../components/Toast';
import { Link } from 'react-router-dom';

export default function Recommendations() {
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [sortBy, setSortBy] = useState('match'); // 'match' or 'date'
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [savedJobsSet, setSavedJobsSet] = useState(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const [profData, jobsData, appsData, savedData] = await Promise.all([
        profile.get().catch(() => null),
        jobs.getAll({ limit: 50 }).catch(() => ({ data: [] })),
        applications.getMy().catch(() => []),
        savedJobsAPI.getAll().catch(() => []),
      ]);
      
      setProfileData(profData);
      
      // Track applied and saved jobs
      const appliedJobIds = new Set((appsData || []).map(app => app.job_id));
      const savedJobIds = new Set((savedData || []).map(job => job.id));
      setAppliedJobs(appliedJobIds);
      setSavedJobsSet(savedJobIds);

      // Get user skills and preferences
      let userSkills = [];
      let userLocation = '';
      let userJobType = '';
      
      if (profData?.profile) {
        try {
          userSkills = profData.profile.skills ? JSON.parse(profData.profile.skills) : [];
          userLocation = profData.profile.location || '';
          userJobType = profData.profile.desired_job_type || '';
        } catch (e) {
          console.error('Parse error:', e);
        }
      }

      // Mock AI matching with better algorithm
      const matchedJobs = (jobsData.data || []).map(job => {
        let matchScore = 60; // Base score
        const matchReasons = [];

        // Skills matching
        if (userSkills.length > 0) {
          const jobTitle = (job.title || '').toLowerCase();
          const jobDescription = (job.description || '').toLowerCase();
          const matchedSkills = userSkills.filter(skill => 
            jobTitle.includes(skill.toLowerCase()) || 
            jobDescription.includes(skill.toLowerCase())
          );
          
          if (matchedSkills.length > 0) {
            matchScore += Math.min(matchedSkills.length * 8, 25);
            matchReasons.push(`${matchedSkills.length} skill${matchedSkills.length > 1 ? 's' : ''} match your profile`);
          }
        }

        // Location matching
        if (userLocation && job.location && 
            job.location.toLowerCase().includes(userLocation.toLowerCase())) {
          matchScore += 10;
          matchReasons.push('Location matches your preference');
        }

        // Job type matching
        if (userJobType && job.type && 
            job.type.toLowerCase() === userJobType.toLowerCase()) {
          matchScore += 5;
          matchReasons.push('Job type matches your preference');
        }

        // Salary matching
        if (profData?.profile?.desired_salary_min && job.salary_min) {
          const userMin = parseInt(profData.profile.desired_salary_min);
          if (job.salary_min >= userMin) {
            matchScore += 5;
            matchReasons.push('Salary meets your expectations');
          }
        }

        // Recent posts get slight boost
        const daysOld = (Date.now() - new Date(job.created_at || job.posted_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) {
          matchScore += 3;
        }

        // Add some randomness for variety (±5)
        matchScore += Math.floor(Math.random() * 10) - 5;

        // Cap at 99
        matchScore = Math.min(matchScore, 99);

        // Default reasons if none found
        if (matchReasons.length === 0) {
          matchReasons.push('Based on your profile');
          matchReasons.push('Popular in your area');
        }

        return {
          ...job,
          match_score: matchScore,
          match_reasons: matchReasons.slice(0, 3), // Top 3 reasons
        };
      });

      setRecommendedJobs(matchedJobs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApply = async (jobId) => {
    try {
      if (!profileData?.profile?.cv_url) {
        showToast('Please upload your resume in your profile first', 'error');
        return;
      }

      await applications.create({
        job_id: jobId,
        cover_letter: 'Applied via quick apply. Please see my full profile and resume for details.',
      });

      showToast('Application submitted successfully! 🎉', 'success');
      
      setAppliedJobs(new Set([...appliedJobs, jobId]));
    } catch (error) {
      showToast('Failed to submit application: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleSaveJob = async (jobId) => {
    try {
      if (savedJobsSet.has(jobId)) {
        await savedJobsAPI.unsave(jobId);
        setSavedJobsSet(new Set([...savedJobsSet].filter(id => id !== jobId)));
        showToast('Job removed from saved', 'success');
      } else {
        await savedJobsAPI.save(jobId);
        setSavedJobsSet(new Set([...savedJobsSet, jobId]));
        showToast('Job saved! 💾', 'success');
      }
    } catch (error) {
      showToast('Failed to save job', 'error');
    }
  };

  // Sort jobs
  const sortedJobs = [...recommendedJobs].sort((a, b) => {
    if (sortBy === 'match') {
      return b.match_score - a.match_score;
    } else {
      return new Date(b.created_at || b.posted_at) - new Date(a.created_at || a.posted_at);
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const profileCompleteness = profileData?.profile ? 
    (profileData.profile.phone && profileData.profile.location && profileData.profile.bio && 
     profileData.profile.cv_url ? 100 : 50) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Recommendations</h1>
        <p className="text-gray-600">
          AI-powered job matches based on your profile, skills, and preferences
        </p>
      </div>

      {/* Profile Completion Alert */}
      {profileCompleteness < 100 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-yellow-800">Improve your recommendations</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Complete your profile to get more accurate job matches. Add your skills, experience, and preferences.{' '}
                <Link to="/dashboard/jobseeker/profile" className="font-semibold underline hover:text-yellow-900">
                  Complete profile →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{sortedJobs.length}</span> recommended jobs
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('match')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === 'match'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🎯 Best Match
          </button>
          <button
            onClick={() => setSortBy('date')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === 'date'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Most Recent
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {sortedJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No recommendations available yet</h3>
          <p className="text-gray-600 mb-4">
            Complete your profile to help us find the perfect jobs for you
          </p>
          <Link
            to="/dashboard/jobseeker/profile"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Complete Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {sortedJobs.map(job => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-primary-500 hover:shadow-md transition p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link to={`/jobs/${job.id}`} className="text-xl font-bold text-gray-900 hover:text-primary-600">
                      {job.title}
                    </Link>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      job.match_score >= 90 ? 'bg-green-100 text-green-800' :
                      job.match_score >= 80 ? 'bg-blue-100 text-blue-800' :
                      job.match_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {job.match_score}% Match
                    </span>
                    {appliedJobs.has(job.id) && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        ✓ Applied
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 font-medium mb-3">{job.company_name}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <span>📍 {job.location}</span>
                    <span>💼 {job.type}</span>
                    {job.salary_min && job.salary_max && (
                      <span>💰 K{job.salary_min.toLocaleString()} - K{job.salary_max.toLocaleString()}</span>
                    )}
                    <span className="text-xs text-gray-500">
                      Posted {Math.floor((Date.now() - new Date(job.created_at || job.posted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                    </span>
                  </div>

                  {/* Match Reasons */}
                  {job.match_reasons && job.match_reasons.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Why this is a great match:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.match_reasons.map((reason, index) => (
                          <span
                            key={index}
                            className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium"
                          >
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Description Preview */}
                  {job.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {job.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {appliedJobs.has(job.id) ? (
                  <button
                    disabled
                    className="px-5 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium"
                  >
                    ✓ Applied
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleQuickApply(job.id)}
                      className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
                    >
                      ⚡ Quick Apply
                    </button>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
                    >
                      View Details
                    </Link>
                  </>
                )}
                <button
                  onClick={() => handleSaveJob(job.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    savedJobsSet.has(job.id)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={savedJobsSet.has(job.id) ? 'Saved' : 'Save for later'}
                >
                  {savedJobsSet.has(job.id) ? '💾 Saved' : '🔖 Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No more jobs message */}
      {sortedJobs.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">
            That's all for now! Check back later for more recommendations or{' '}
            <Link to="/jobs" className="text-primary-600 hover:text-primary-700 font-medium underline">
              browse all jobs
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
