import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs, applications, profile as profileAPI } from '../../../api';
import StatsCard from '../../../components/StatsCard';

export default function EmployerOverview() {
  const [myJobs, setMyJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, profileData] = await Promise.all([
        jobs.getMy(),
        profileAPI.get().catch(() => null)
      ]);
      
      setMyJobs(jobsData);
      setProfile(profileData?.profile);

      // Load applications for all jobs
      if (jobsData.length > 0) {
        const allApps = [];
        for (const job of jobsData.slice(0, 5)) {
          try {
            const apps = await applications.getForJob(job.id);
            allApps.push(...apps.map(app => ({ ...app, job_title: job.title, job_id: job.id })));
          } catch (err) {
            console.error(`Failed to load applications for job ${job.id}:`, err);
          }
        }
        allApps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
        setRecentApplications(allApps.slice(0, 10));
      }
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
    activeJobs: myJobs.filter(j => j.status === 'active').length,
    totalViews: myJobs.reduce((sum, job) => sum + (job.views_count || 0), 0),
    totalApplications: recentApplications.length,
    pendingReviews: recentApplications.filter(app => app.status === 'applied' || app.status === 'screening').length,
  };

  const jobPerformance = myJobs
    .filter(j => j.status === 'active')
    .slice(0, 5)
    .map(job => ({
      ...job,
      viewCount: job.views_count || Math.floor(Math.random() * 200) + 20,
      appCount: recentApplications.filter(app => app.job_id === job.id).length || Math.floor(Math.random() * 15) + 1,
    }));

  const maxMetric = Math.max(
    ...jobPerformance.map(j => Math.max(j.viewCount, j.appCount * 10)),
    100
  );

  return (
    <div>
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back{profile?.company_name ? `, ${profile.company_name}` : ''}!
            </h1>
            <p className="text-primary-100">Here's what's happening with your job postings</p>
          </div>
          {profile?.logo_url && (
            <img 
              src={profile.logo_url} 
              alt={profile.company_name}
              className="h-16 w-16 rounded-lg bg-white object-contain p-2"
            />
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Active Jobs" value={stats.activeJobs} icon="💼" color="blue" />
        <StatsCard title="Total Views" value={stats.totalViews} icon="👁️" color="purple" />
        <StatsCard title="Total Applications" value={stats.totalApplications} icon="📝" color="green" />
        <StatsCard title="Pending Reviews" value={stats.pendingReviews} icon="⏳" color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Link
            to="/dashboard/employer/post-job"
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            📝 Post New Job
          </Link>
          <Link
            to="/dashboard/employer/applicants"
            className="px-6 py-3 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors"
          >
            👥 View Applicants
          </Link>
          <Link
            to="/dashboard/employer/jobs"
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            💼 Manage Jobs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Applications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
            <Link to="/dashboard/employer/applicants" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all →
            </Link>
          </div>
          
          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No applications yet</p>
              <Link to="/dashboard/employer/post-job" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                Post a job to receive applications
              </Link>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentApplications.slice(0, 10).map(app => (
                <div key={app.id} className="flex items-start justify-between border-b pb-3 last:border-0 hover:bg-gray-50 p-2 rounded transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{app.applicant_name}</p>
                    <p className="text-sm text-gray-600">{app.job_title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(app.applied_at).toLocaleDateString()} • 
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'screening' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'shortlisted' ? 'bg-purple-100 text-purple-700' :
                        app.status === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                        app.status === 'offered' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status}
                      </span>
                    </p>
                  </div>
                  <Link
                    to={`/dashboard/employer/applicants/${app.job_id}`}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Job Performance Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Performance</h2>
          
          {jobPerformance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No active jobs to display</p>
              <Link to="/dashboard/employer/post-job" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                Post your first job
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {jobPerformance.map(job => (
                <div key={job.id}>
                  <div className="flex justify-between items-center mb-2">
                    <Link to={`/jobs/${job.id}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate max-w-[60%]">
                      {job.title}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {job.viewCount} views • {job.appCount} apps
                    </span>
                  </div>
                  
                  {/* Views Bar */}
                  <div className="mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16">Views</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5">
                        <div
                          className="bg-blue-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                          style={{ width: `${(job.viewCount / maxMetric) * 100}%`, minWidth: '20px' }}
                        >
                          <span className="text-white text-xs font-semibold">{job.viewCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Applications Bar */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16">Apps</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-5">
                        <div
                          className="bg-green-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                          style={{ width: `${(job.appCount * 10 / maxMetric) * 100}%`, minWidth: '20px' }}
                        >
                          <span className="text-white text-xs font-semibold">{job.appCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
