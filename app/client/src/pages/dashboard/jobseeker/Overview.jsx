import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications, jobs, profile } from '../../../api';
import StatsCard from '../../../components/StatsCard';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import JobCard from '../../../components/JobCard';

export default function JobseekerOverview() {
  const [myApplications, setMyApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, jobsData, profData] = await Promise.all([
        applications.getMy(),
        jobs.getAll({ limit: 3 }),
        profile.get(),
      ]);
      
      setMyApplications(appsData);
      setRecommendedJobs(jobsData.data);
      setProfileData(profData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
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
    pending: myApplications.filter(a => a.status === 'applied').length,
    interview: myApplications.filter(a => a.status === 'interview').length,
  };

  const profileComplete = profileData?.profile?.profile_complete;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

      {/* Profile Alert */}
      {!profileComplete && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Complete your profile</h3>
              <p className="mt-1 text-sm text-yellow-700">
                A complete profile helps employers find you. 
                <Link to="/dashboard/jobseeker/profile" className="font-medium underline ml-1">
                  Complete now →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Total Applications" value={stats.totalApplications} icon="📝" color="blue" />
        <StatsCard title="Pending Review" value={stats.pending} icon="⏳" color="orange" />
        <StatsCard title="Interviews" value={stats.interview} icon="🎯" color="green" />
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
          <Link to="/dashboard/jobseeker/applications" className="text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        
        {myApplications.length === 0 ? (
          <p className="text-gray-600">No applications yet. <Link to="/jobs" className="text-primary-600">Browse jobs</Link></p>
        ) : (
          <div className="space-y-4">
            {myApplications.slice(0, 5).map(app => (
              <div key={app.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="flex-1">
                  <Link to={`/jobs/${app.job_id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                    {app.job_title}
                  </Link>
                  <p className="text-sm text-gray-600">{app.company_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <ApplicationStatusBadge status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recommended Jobs</h2>
          <Link to="/jobs" className="text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {recommendedJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}
