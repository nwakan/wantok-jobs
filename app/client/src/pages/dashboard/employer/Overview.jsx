import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobs, applications } from '../../../api';
import StatsCard from '../../../components/StatsCard';

export default function EmployerOverview() {
  const [myJobs, setMyJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const jobsData = await jobs.getAll({ limit: 100 });
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      // Filter to only current employer's jobs
      const employerJobs = jobsData.data.filter(job => job.employer_id === user?.id);
      setMyJobs(employerJobs);

      // Load applications for active jobs
      if (employerJobs.length > 0) {
        const allApps = [];
        for (const job of employerJobs.slice(0, 3)) {
          try {
            const apps = await applications.getForJob(job.id);
            allApps.push(...apps.map(app => ({ ...app, job_title: job.title })));
          } catch (err) {
            console.error(`Failed to load applications for job ${job.id}:`, err);
          }
        }
        allApps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
        setRecentApplications(allApps.slice(0, 5));
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
    totalApplications: recentApplications.length,
    totalViews: myJobs.reduce((sum, job) => sum + (job.views_count || 0), 0),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Employer Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Active Jobs" value={stats.activeJobs} icon="💼" color="blue" />
        <StatsCard title="Total Applications" value={stats.totalApplications} icon="📝" color="green" />
        <StatsCard title="Total Views" value={stats.totalViews} icon="👁️" color="purple" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            to="/dashboard/employer/post-job"
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
          >
            Post New Job
          </Link>
          <Link
            to="/dashboard/employer/jobs"
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            Manage Jobs
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Applications</h2>
        </div>
        
        {recentApplications.length === 0 ? (
          <p className="text-gray-600">No applications yet</p>
        ) : (
          <div className="space-y-4">
            {recentApplications.map(app => (
              <div key={app.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div>
                  <p className="font-semibold text-gray-900">{app.applicant_name}</p>
                  <p className="text-sm text-gray-600">{app.job_title}</p>
                  <p className="text-xs text-gray-500">
                    Applied {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/dashboard/employer/applicants/${app.job_id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Jobs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Active Jobs</h2>
          <Link to="/dashboard/employer/jobs" className="text-primary-600 hover:text-primary-700">
            View all →
          </Link>
        </div>
        
        {myJobs.filter(j => j.status === 'active').length === 0 ? (
          <p className="text-gray-600">No active jobs</p>
        ) : (
          <div className="space-y-4">
            {myJobs.filter(j => j.status === 'active').slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div>
                  <Link to={`/jobs/${job.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                    {job.title}
                  </Link>
                  <p className="text-sm text-gray-600">{job.location}</p>
                  <p className="text-xs text-gray-500">{job.views_count || 0} views</p>
                </div>
                <Link
                  to={`/dashboard/employer/edit-job/${job.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
