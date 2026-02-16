import { useState, useEffect } from 'react';
import { analytics, jobs } from '../../../api';
import StatsCard from '../../../components/StatsCard';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [jobStats, setJobStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await analytics.employerOverview();
      setStats(data);

      const jobsData = await jobs.getMy();
      // Add mock stats to each job
      const jobsWithStats = jobsData.map(job => ({
        ...job,
        views: Math.floor(Math.random() * 500) + 50,
        applications: Math.floor(Math.random() * 50) + 5,
      }));
      setJobStats(jobsWithStats);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Placeholder data
      setStats({
        total_views: 2543,
        total_applications: 127,
        conversion_rate: 5.0,
        active_jobs: 8,
      });

      setJobStats([
        { id: 1, title: 'Senior Software Engineer', views: 456, applications: 23 },
        { id: 2, title: 'Marketing Manager', views: 312, applications: 18 },
        { id: 3, title: 'Data Analyst', views: 289, applications: 15 },
      ]);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Total Views" 
          value={stats?.total_views || 0} 
          icon="👁️" 
          color="blue" 
        />
        <StatsCard 
          title="Total Applications" 
          value={stats?.total_applications || 0} 
          icon="📝" 
          color="green" 
        />
        <StatsCard 
          title="Conversion Rate" 
          value={`${stats?.conversion_rate || 0}%`} 
          icon="📊" 
          color="purple" 
        />
        <StatsCard 
          title="Active Jobs" 
          value={stats?.active_jobs || 0} 
          icon="💼" 
          color="orange" 
        />
      </div>

      {/* Chart - Simple bar representation */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Performance Overview (Last 30 Days)
        </h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Views</span>
              <span>{stats?.total_views || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '75%' }}
              >
                <span className="text-white text-xs font-semibold">75%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Applications</span>
              <span>{stats?.total_applications || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '60%' }}
              >
                <span className="text-white text-xs font-semibold">60%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Shortlisted</span>
              <span>{Math.floor((stats?.total_applications || 0) * 0.3)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-6">
              <div
                className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: '40%' }}
              >
                <span className="text-white text-xs font-semibold">40%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Job Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Job Performance</h2>
        
        {jobStats.length === 0 ? (
          <p className="text-gray-600 text-center py-6">No jobs posted yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Conversion %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobStats.map(job => {
                  const conversion = job.views > 0 
                    ? ((job.applications / job.views) * 100).toFixed(2)
                    : 0;
                  
                  return (
                    <tr key={job.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {job.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.applications}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full font-semibold ${
                          conversion >= 5 
                            ? 'bg-green-100 text-green-800'
                            : conversion >= 2
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {conversion}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
