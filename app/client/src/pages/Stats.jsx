import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import PageHead from '../components/PageHead';

export default function Stats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats/public');
      setStats(res);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <PageHead title="WantokJobs Statistics" description="Platform statistics" />
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Statistics</h2>
        <p className="text-gray-600 mb-6">We're having trouble fetching the latest data. Please try again.</p>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <PageHead
        title="WantokJobs Statistics"
        description="Connecting the Pacific's workforce with opportunities"
      />

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Building the Pacific's Future
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Join thousands of professionals and employers across PNG and the Pacific using WantokJobs to build careers and grow businesses.
        </p>
      </div>

      {/* Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center shadow-lg">
          <div className="text-5xl font-bold mb-2">{stats.activeJobs?.toLocaleString() || 0}</div>
          <div className="text-blue-100 text-lg">Active Jobs</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white text-center shadow-lg">
          <div className="text-5xl font-bold mb-2">{stats.totalEmployers?.toLocaleString() || 0}</div>
          <div className="text-green-100 text-lg">Employers</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white text-center shadow-lg">
          <div className="text-5xl font-bold mb-2">{stats.totalJobseekers?.toLocaleString() || 0}</div>
          <div className="text-purple-100 text-lg">Job Seekers</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white text-center shadow-lg">
          <div className="text-5xl font-bold mb-2">{stats.totalApplications?.toLocaleString() || 0}</div>
          <div className="text-orange-100 text-lg">Applications Sent</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">This Week</div>
                <div className="text-sm text-gray-600">New jobs posted</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {stats.jobsThisWeek || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">This Month</div>
                <div className="text-sm text-gray-600">New opportunities</div>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {stats.jobsThisMonth || 0}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Average</div>
                <div className="text-sm text-gray-600">Jobs per employer</div>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {stats.avgJobsPerEmployer || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Top Categories</h2>
          <div className="space-y-3">
            {stats.topCategories && stats.topCategories.length > 0 ? (
              stats.topCategories.map((category, index) => (
                <Link
                  key={category.slug}
                  to={`/jobs?category=${category.slug}`}
                  className="block group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-600 rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-900 font-medium group-hover:text-primary-600 transition">
                          {category.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {category.job_count} jobs
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all group-hover:bg-primary-700"
                          style={{
                            width: `${Math.min(
                              (category.job_count / stats.activeJobs) * 100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Locations */}
      {stats.topLocations && stats.topLocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-8 mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Top Locations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.topLocations.map((location) => (
              <Link
                key={location.location}
                to={`/jobs?location=${encodeURIComponent(location.location)}`}
                className="p-4 bg-gray-50 rounded-lg hover:bg-primary-50 hover:border-primary-300 border-2 border-transparent transition text-center group"
              >
                <div className="text-2xl mb-1">📍</div>
                <div className="font-medium text-gray-900 group-hover:text-primary-600">
                  {location.location}
                </div>
                <div className="text-sm text-gray-600">
                  {location.job_count} jobs
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-12 text-center text-white shadow-xl">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Join WantokJobs?
        </h2>
        <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          Whether you're looking for talent or your next opportunity, WantokJobs connects you with the Pacific's best.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register?role=jobseeker"
            className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition"
          >
            Find a Job
          </Link>
          <Link
            to="/register?role=employer"
            className="px-8 py-3 bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-900 transition"
          >
            Post a Job
          </Link>
        </div>
      </div>
    </div>
  );
}
