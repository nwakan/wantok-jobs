import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api';
import PageHead from '../../../components/PageHead';
import StatsCard from '../../../components/StatsCard';

export default function AnalyticsNew() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/employer/analytics?period=${period}`);
      setAnalytics(res.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center py-12">Failed to load analytics</div>;
  }

  const { overview, jobMetrics, topPerformingJobs, applicationsByStatus } = analytics;

  return (
    <div className="space-y-6">
      <PageHead
        title="Analytics"
        description="Track your job posting performance"
      />

      {/* Period Selector */}
      <div className="flex justify-end">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Views"
          value={overview.totalViews || 0}
          subtitle={`${overview.recentViews || 0} in last ${period} days`}
          icon="📊"
        />
        <StatsCard
          title="Total Applications"
          value={overview.totalApplications || 0}
          subtitle={`${overview.recentApplications || 0} in last ${period} days`}
          icon="📝"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${overview.conversionRate || 0}%`}
          subtitle="Applications / Views"
          icon="📈"
        />
        <StatsCard
          title="Active Jobs"
          value={overview.totalJobs || 0}
          subtitle="Currently posted"
          icon="💼"
        />
      </div>

      {/* Top Performing Jobs */}
      {topPerformingJobs && topPerformingJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performing Jobs</h2>
          <div className="space-y-3">
            {topPerformingJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{job.title}</h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600">
                    👁️ {job.views_count} views
                  </span>
                  <span className="text-gray-600">
                    📝 {job.applications} applications
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Job Metrics Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Job Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recent Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applications
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobMetrics && jobMetrics.length > 0 ? (
                jobMetrics.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {job.title}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {job.total_views || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {job.recent_views || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {job.total_applications || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(job.conversion_rate || 0, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-gray-900 font-medium">
                          {job.conversion_rate || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No jobs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Status Breakdown */}
      {applicationsByStatus && applicationsByStatus.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Application Status</h2>
          <div className="space-y-3">
            {applicationsByStatus.map((status) => (
              <div key={status.status} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium capitalize text-gray-700">
                      {status.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {status.count} applications
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{
                        width: `${
                          (status.count / overview.totalApplications) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
