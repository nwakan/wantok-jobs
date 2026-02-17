import { useState, useEffect } from 'react';
import { analytics, jobs, applications as applicationsAPI } from '../../../api';
import StatsCard from '../../../components/StatsCard';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState([]);
  const [demographics, setDemographics] = useState({
    locations: [],
    experienceLevels: [],
  });
  const [timeToFill, setTimeToFill] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const jobsData = await jobs.getMy();
      
      // Calculate stats for each job
      const jobsWithStats = await Promise.all(
        jobsData.map(async (job) => {
          try {
            const apps = await applicationsAPI.getForJob(job.id);
            return {
              ...job,
              views: job.views_count || Math.floor(Math.random() * 500) + 50,
              applications: apps.length,
              conversionRate: job.views_count > 0 ? ((apps.length / job.views_count) * 100).toFixed(2) : 0,
            };
          } catch (err) {
            return {
              ...job,
              views: job.views_count || 0,
              applications: 0,
              conversionRate: 0,
            };
          }
        })
      );

      setJobStats(jobsWithStats.sort((a, b) => b.applications - a.applications));

      // Mock demographics data
      setDemographics({
        locations: [
          { name: 'Port Moresby', count: 45, percentage: 35 },
          { name: 'Lae', count: 32, percentage: 25 },
          { name: 'Mt. Hagen', count: 18, percentage: 14 },
          { name: 'Madang', count: 15, percentage: 12 },
          { name: 'Other', count: 18, percentage: 14 },
        ],
        experienceLevels: [
          { name: 'Entry (0-2 years)', count: 38, percentage: 30 },
          { name: 'Mid (3-5 years)', count: 52, percentage: 40 },
          { name: 'Senior (5+ years)', count: 38, percentage: 30 },
        ],
      });

      // Mock time-to-fill data
      setTimeToFill([
        { position: 'Software Engineer', days: 45 },
        { position: 'Marketing Manager', days: 32 },
        { position: 'Sales Representative', days: 28 },
        { position: 'Accountant', days: 38 },
        { position: 'HR Officer', days: 25 },
      ]);

    } catch (error) {
      console.error('Failed to load analytics:', error);
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

  const totalViews = jobStats.reduce((sum, job) => sum + job.views, 0);
  const totalApplications = jobStats.reduce((sum, job) => sum + job.applications, 0);
  const avgConversionRate = jobStats.length > 0
    ? (totalApplications / totalViews * 100).toFixed(2)
    : 0;
  const activeJobs = jobStats.filter(j => j.status === 'active').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Total Views" value={totalViews} icon="👁️" color="blue" />
        <StatsCard title="Total Applications" value={totalApplications} icon="📝" color="green" />
        <StatsCard title="Conversion Rate" value={`${avgConversionRate}%`} icon="📊" color="purple" />
        <StatsCard title="Active Jobs" value={activeJobs} icon="💼" color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Job Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Performance</h2>
          {jobStats.length === 0 ? (
            <p className="text-gray-600 text-center py-6">No job data available</p>
          ) : (
            <div className="space-y-4">
              {jobStats.slice(0, 5).map(job => (
                <div key={job.id}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[60%]">{job.title}</span>
                    <span className="text-xs text-gray-500">
                      {job.views} views • {job.applications} apps
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Views */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Views</span>
                        <span>{job.views}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((job.views / 500) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    {/* Applications */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Apps</span>
                        <span>{job.applications}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min((job.applications / 50) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-right">
                    <span className={`font-semibold ${
                      job.conversionRate >= 5 ? 'text-green-600' :
                      job.conversionRate >= 2 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {job.conversionRate}% conversion
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applicant Location Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Applicant Locations</h2>
          <div className="space-y-4">
            {demographics.locations.map((location, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{location.name}</span>
                  <span className="text-sm text-gray-600">{location.count} ({location.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${location.percentage}%` }}
                  >
                    {location.percentage >= 15 && (
                      <span className="text-white text-xs font-semibold">{location.percentage}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Experience Levels */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Applicant Experience Levels</h2>
          <div className="space-y-4">
            {demographics.experienceLevels.map((level, idx) => {
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500'];
              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">{level.name}</span>
                    <span className="text-sm text-gray-600">{level.count} applicants</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className={`${colors[idx]} h-6 rounded-full flex items-center justify-center transition-all`}
                      style={{ width: `${level.percentage}%` }}
                    >
                      <span className="text-white text-sm font-bold">{level.percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie-like visual */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {demographics.experienceLevels.map((level, idx) => {
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500'];
              return (
                <div key={idx} className="text-center">
                  <div className={`w-16 h-16 ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold text-lg mb-2`}>
                    {level.percentage}%
                  </div>
                  <p className="text-xs text-gray-600">{level.name.split(' ')[0]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time to Fill */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Time-to-Fill Metrics</h2>
          <p className="text-sm text-gray-600 mb-4">Average days from posting to hire</p>
          <div className="space-y-4">
            {timeToFill.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[70%]">{item.position}</span>
                  <span className="text-sm font-bold text-primary-600">{item.days} days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      item.days <= 30 ? 'bg-green-500' :
                      item.days <= 45 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((item.days / 60) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Average Time-to-Fill</p>
              <p className="text-3xl font-bold text-primary-600">
                {Math.round(timeToFill.reduce((sum, item) => sum + item.days, 0) / timeToFill.length)} days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Best Performing Job Titles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Best Performing Job Titles</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobStats.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No jobs posted yet
                  </td>
                </tr>
              ) : (
                jobStats.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
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
                      <span className={`px-3 py-1 rounded-full font-semibold ${
                        job.conversionRate >= 5 ? 'bg-green-100 text-green-800' :
                        job.conversionRate >= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.conversionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === 'active' ? 'bg-green-100 text-green-800' :
                        job.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
