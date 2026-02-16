import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin } from '../../../api';
import StatsCard from '../../../components/StatsCard';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await admin.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Users" value={stats?.totalUsers || 0} icon="👥" color="blue" />
        <StatsCard title="Active Jobs" value={stats?.activeJobs || 0} icon="💼" color="green" />
        <StatsCard title="Applications" value={stats?.totalApplications || 0} icon="📝" color="purple" />
        <StatsCard title="Total Jobs" value={stats?.totalJobs || 0} icon="📊" color="orange" />
      </div>

      {/* User Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-600 mb-2">Job Seekers</p>
            <p className="text-3xl font-bold text-primary-600">{stats?.totalJobseekers || 0}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Employers</p>
            <p className="text-3xl font-bold text-primary-600">{stats?.totalEmployers || 0}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Recent Sign-ups (7 days)</p>
            <p className="text-3xl font-bold text-primary-600">{stats?.recentUsers || 0}</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600 mb-2">Jobs Posted (7 days)</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.recentJobs || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Link
            to="/dashboard/admin/users"
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700"
          >
            Manage Users
          </Link>
          <Link
            to="/dashboard/admin/jobs"
            className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
          >
            Manage Jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
