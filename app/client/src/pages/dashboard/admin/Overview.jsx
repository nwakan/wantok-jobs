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

  // Mock growth data
  const growthData = {
    users: [
      { month: 'Jan', value: 45 },
      { month: 'Feb', value: 62 },
      { month: 'Mar', value: 78 },
      { month: 'Apr', value: 95 },
      { month: 'May', value: 120 },
      { month: 'Jun', value: 145 },
    ],
    jobs: [
      { month: 'Jan', value: 23 },
      { month: 'Feb', value: 34 },
      { month: 'Mar', value: 42 },
      { month: 'Apr', value: 58 },
      { month: 'May', value: 71 },
      { month: 'Jun', value: 89 },
    ],
  };

  // Mock recent activity
  const recentActivity = [
    { id: 1, type: 'user_registered', user: 'John Doe', detail: 'registered as Jobseeker', time: '5 minutes ago', icon: '👤', color: 'text-blue-600' },
    { id: 2, type: 'job_posted', user: 'Acme Corp', detail: 'posted Software Engineer position', time: '12 minutes ago', icon: '💼', color: 'text-green-600' },
    { id: 3, type: 'application', user: 'Sarah Wilson', detail: 'applied for Marketing Manager', time: '28 minutes ago', icon: '📝', color: 'text-purple-600' },
    { id: 4, type: 'user_registered', user: 'Tech Solutions Ltd', detail: 'registered as Employer', time: '1 hour ago', icon: '🏢', color: 'text-orange-600' },
    { id: 5, type: 'job_closed', user: 'Global Bank', detail: 'closed Accountant position', time: '2 hours ago', icon: '✓', color: 'text-gray-600' },
    { id: 6, type: 'application', user: 'Mike Chen', detail: 'applied for Data Analyst', time: '3 hours ago', icon: '📝', color: 'text-purple-600' },
  ];

  // System health indicators
  const systemHealth = [
    { name: 'API Response Time', value: '124ms', status: 'good', color: 'bg-green-500' },
    { name: 'Database Load', value: '45%', status: 'good', color: 'bg-green-500' },
    { name: 'Active Sessions', value: '387', status: 'normal', color: 'bg-yellow-500' },
    { name: 'Error Rate', value: '0.2%', status: 'good', color: 'bg-green-500' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const maxUsers = Math.max(...growthData.users.map(d => d.value));
  const maxJobs = Math.max(...growthData.jobs.map(d => d.value));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Platform KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Users" value={stats?.totalUsers || 0} icon="👥" color="blue" />
        <StatsCard title="Active Jobs" value={stats?.activeJobs || 0} icon="💼" color="green" />
        <StatsCard title="Applications (7d)" value={stats?.recentApplications || 0} icon="📝" color="purple" />
        <StatsCard title="Revenue (MTD)" value={`$${stats?.revenue || '0'}`} icon="💰" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Growth Chart - Users */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Growth (Last 6 Months)</h2>
          <div className="flex items-end justify-between gap-2 h-64">
            {growthData.users.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col justify-end h-full">
                  <div
                    className="bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 cursor-pointer relative group"
                    style={{ height: `${(data.value / maxUsers) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      {data.value} users
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2 font-medium">{data.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Chart - Jobs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Postings (Last 6 Months)</h2>
          <div className="flex items-end justify-between gap-2 h-64">
            {growthData.jobs.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col justify-end h-full">
                  <div
                    className="bg-green-500 rounded-t-lg transition-all hover:bg-green-600 cursor-pointer relative group"
                    style={{ height: `${(data.value / maxJobs) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      {data.value} jobs
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-2 font-medium">{data.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className={`text-2xl ${activity.color}`}>{activity.icon}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{activity.user}</span> {activity.detail}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Health Indicators</h2>
          <div className="space-y-4">
            {systemHealth.map((indicator, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{indicator.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{indicator.value}</span>
                    <div className={`w-3 h-3 rounded-full ${indicator.color}`}></div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${indicator.color} h-2 rounded-full transition-all`}
                    style={{ 
                      width: indicator.name === 'Database Load' ? indicator.value : 
                             indicator.name === 'Error Rate' ? '20%' : '80%' 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-green-900">All Systems Operational</p>
                <p className="text-sm text-green-700">Last checked: Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">User Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <p className="text-gray-600 mb-2">Job Seekers</p>
            <p className="text-4xl font-bold text-blue-600">{stats?.totalJobseekers || 0}</p>
            <p className="text-sm text-gray-500 mt-2">
              +{stats?.recentJobseekers || 0} this week
            </p>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <p className="text-gray-600 mb-2">Employers</p>
            <p className="text-4xl font-bold text-green-600">{stats?.totalEmployers || 0}</p>
            <p className="text-sm text-gray-500 mt-2">
              +{stats?.recentEmployers || 0} this week
            </p>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <p className="text-gray-600 mb-2">Recent Sign-ups (7 days)</p>
            <p className="text-4xl font-bold text-purple-600">{stats?.recentUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-2">
              {stats?.growthRate || '0'}% growth
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/dashboard/admin/users"
            className="px-6 py-4 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition-colors text-center"
          >
            👥 Manage Users
          </Link>
          <Link
            to="/dashboard/admin/jobs"
            className="px-6 py-4 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition-colors text-center"
          >
            💼 Manage Jobs
          </Link>
          <Link
            to="/dashboard/admin/fraud-security"
            className="px-6 py-4 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors text-center"
          >
            🔒 Security
          </Link>
          <Link
            to="/dashboard/admin/reports"
            className="px-6 py-4 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors text-center"
          >
            📊 Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
