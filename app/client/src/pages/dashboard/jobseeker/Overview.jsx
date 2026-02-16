import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications, jobs, profile, savedJobs, jobAlerts } from '../../../api';
import StatsCard from '../../../components/StatsCard';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';

export default function JobseekerOverview() {
  const [myApplications, setMyApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, jobsData, profData, savedData, alertsData] = await Promise.all([
        applications.getMy().catch(() => []),
        jobs.getAll({ limit: 5 }).catch(() => ({ data: [] })),
        profile.get().catch(() => null),
        savedJobs.getAll().catch(() => []),
        jobAlerts.getAll().catch(() => []),
      ]);
      
      setMyApplications(Array.isArray(appsData) ? appsData : []);
      
      // Mock AI matching for recommendations
      const matchedJobs = (jobsData.data || []).map(job => ({
        ...job,
        match_score: Math.floor(Math.random() * 30) + 70,
      })).sort((a, b) => b.match_score - a.match_score);
      
      setRecommendedJobs(matchedJobs);
      setProfileData(profData);
      setSavedJobsCount(Array.isArray(savedData) ? savedData.length : 0);
      setAlertsCount(Array.isArray(alertsData) ? alertsData.filter(a => a.active).length : 0);
      
      if (profData?.user?.name) {
        setUserName(profData.user.name.split(' ')[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = () => {
    if (!profileData?.profile) return 0;
    
    const prof = profileData.profile;
    let completed = 0;
    let total = 11;
    
    if (prof.phone) completed++;
    if (prof.location) completed++;
    if (prof.headline) completed++;
    if (prof.bio) completed++;
    if (prof.profile_photo_url) completed++;
    if (prof.cv_url) completed++;
    
    try {
      if (prof.skills && JSON.parse(prof.skills).length > 0) completed++;
      if (prof.work_history && JSON.parse(prof.work_history).length > 0) completed++;
      if (prof.education && JSON.parse(prof.education).length > 0) completed++;
      if (prof.languages && JSON.parse(prof.languages).length > 0) completed++;
      if (prof.certifications && JSON.parse(prof.certifications).length > 0) completed++;
    } catch (e) {
      // Parse errors, skip
    }
    
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = {
    totalApplications: myApplications.length,
    pending: myApplications.filter(a => ['applied', 'screening'].includes(a.status)).length,
    interview: myApplications.filter(a => a.status === 'interview').length,
    savedJobs: savedJobsCount,
  };

  const completeness = calculateProfileCompleteness();

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-green-500 rounded-lg shadow-sm p-8 mb-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          {greeting}, {userName || 'there'}! 👋
        </h1>
        <p className="text-lg opacity-90">
          {myApplications.length === 0 
            ? "Ready to start your job search? Complete your profile and explore opportunities below."
            : `You have ${stats.pending} pending application${stats.pending !== 1 ? 's' : ''} and ${stats.interview} interview${stats.interview !== 1 ? 's' : ''}.`
          }
        </p>
      </div>

      {/* Profile Completeness Alert */}
      {completeness < 100 && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-5">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-yellow-800">Complete your profile to stand out</h3>
                <span className="text-sm font-bold text-yellow-800">{completeness}%</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="text-sm text-yellow-700">
                A complete profile gets 3x more views from employers.{' '}
                <Link to="/dashboard/jobseeker/profile" className="font-semibold underline hover:text-yellow-900">
                  Complete now →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Total Applications" 
          value={stats.totalApplications} 
          icon="📝" 
          color="blue" 
        />
        <StatsCard 
          title="Pending Review" 
          value={stats.pending} 
          icon="⏳" 
          color="orange" 
        />
        <StatsCard 
          title="Interviews" 
          value={stats.interview} 
          icon="🎯" 
          color="purple" 
        />
        <StatsCard 
          title="Saved Jobs" 
          value={stats.savedJobs} 
          icon="💾" 
          color="green" 
        />
      </div>

      {/* Job Alerts Summary */}
      {alertsCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🔔</div>
              <div>
                <h3 className="font-semibold text-blue-900">
                  You have {alertsCount} active job alert{alertsCount !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-blue-700">
                  We'll notify you when matching jobs are posted
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/jobseeker/job-alerts"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Manage Alerts
            </Link>
          </div>
        </div>
      )}

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
          <Link to="/dashboard/jobseeker/applications" className="text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>
        
        {myApplications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-600 mb-3">No applications yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Start applying to jobs that match your skills and experience
            </p>
            <Link 
              to="/jobs" 
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myApplications.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-gray-50 p-3 rounded-lg transition">
                <div className="flex-1">
                  <Link to={`/jobs/${app.job_id}`} className="font-semibold text-gray-900 hover:text-primary-600 text-lg">
                    {app.job_title}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">{app.company_name}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>📍 {app.location}</span>
                    <span>•</span>
                    <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ApplicationStatusBadge status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
            <p className="text-sm text-gray-600 mt-1">Jobs matched to your profile and preferences</p>
          </div>
          <Link to="/dashboard/jobseeker/recommendations" className="text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>
        
        {recommendedJobs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-gray-600 mb-3">No recommendations yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Complete your profile to get personalized job recommendations
            </p>
            <Link 
              to="/dashboard/jobseeker/profile" 
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Complete Profile
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendedJobs.slice(0, 5).map(job => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/jobs/${job.id}`} className="text-lg font-bold text-gray-900 hover:text-primary-600">
                        {job.title}
                      </Link>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        job.match_score >= 90 ? 'bg-green-100 text-green-800' :
                        job.match_score >= 80 ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.match_score}% Match
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium mb-2">{job.company_name}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span>📍 {job.location}</span>
                      <span>💼 {job.type}</span>
                      {job.salary_min && job.salary_max && (
                        <span>💰 K{job.salary_min.toLocaleString()} - K{job.salary_max.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/jobs/${job.id}#apply`}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                  >
                    Quick Apply
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
