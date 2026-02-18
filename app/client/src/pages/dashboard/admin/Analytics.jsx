import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { TrendingUp, TrendingDown, Users, Briefcase, FileText, CheckCircle, Building2, Clock, Percent } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [employers, setEmployers] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load all analytics data in parallel
      const [overviewRes, trendsRes, employersRes] = await Promise.all([
        fetch('/api/admin/analytics/overview', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/admin/analytics/trends', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
        fetch('/api/admin/analytics/employers', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.data);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.data);
      }

      if (employersRes.ok) {
        const data = await employersRes.json();
        setEmployers(data.data);
      }
    } catch (error) {
      showToast('Failed to load analytics', 'error');
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const StatCard = ({ icon: Icon, title, value, change, color = 'blue' }) => {
    const isPositive = change >= 0;
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-gray-900">{formatNumber(value)}</h3>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </div>
    );
  };

  const SimpleBarChart = ({ data, dataKey, label, color = 'blue' }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map(d => d[dataKey] || 0));
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
    };

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{label}</h4>
        <div className="space-y-2">
          {data.slice(-14).map((item, idx) => {
            const percentage = max > 0 ? (item[dataKey] / max) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className="text-xs text-gray-500 w-20 text-right">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className={`${colorClasses[color]} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                    {item[dataKey]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive insights into platform performance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'trends'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('employers')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'employers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Employers
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Users}
              title="Total Jobseekers"
              value={overview.users.totalJobseekers}
              change={calculateChange(overview.users.newJobseekersWeek, overview.users.newJobseekersWeek * 0.8)}
              color="blue"
            />
            <StatCard
              icon={Building2}
              title="Total Employers"
              value={overview.users.totalEmployers}
              change={calculateChange(overview.users.newEmployersWeek, overview.users.newEmployersWeek * 0.8)}
              color="purple"
            />
            <StatCard
              icon={Briefcase}
              title="Active Jobs"
              value={overview.jobs.activeJobs}
              change={calculateChange(overview.jobs.newJobsWeek, overview.jobs.newJobsWeek * 0.8)}
              color="green"
            />
            <StatCard
              icon={FileText}
              title="Applications (Week)"
              value={overview.applications.applicationsWeek}
              change={calculateChange(overview.applications.applicationsWeek, overview.applications.applicationsWeek * 0.9)}
              color="orange"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="font-semibold text-gray-900">Profile Completion</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900">{overview.profiles.profileCompletionRate}%</div>
              <p className="text-sm text-gray-600 mt-1">
                {overview.profiles.completedProfiles} of {overview.profiles.totalJobseekers} profiles
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">New This Month</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Jobs</span>
                  <span className="font-semibold text-gray-900">{overview.jobs.newJobsMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Jobseekers</span>
                  <span className="font-semibold text-gray-900">{overview.users.newJobseekersMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Employers</span>
                  <span className="font-semibold text-gray-900">{overview.users.newEmployersMonth}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-6 w-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Applications</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold text-gray-900">{overview.applications.totalApplications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="font-semibold text-gray-900">{overview.applications.applicationsWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-semibold text-gray-900">{overview.applications.applicationsMonth}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Most Viewed Jobs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Most Popular Jobs</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-sm text-gray-600 border-b">
                  <tr>
                    <th className="pb-3 font-medium">Job Title</th>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium text-right">Applications</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {overview.mostViewedJobs.slice(0, 10).map((job) => (
                    <tr key={job.id} className="border-b last:border-0">
                      <td className="py-3">
                        <a href={`/jobs/${job.id}`} className="text-blue-600 hover:underline">
                          {job.title}
                        </a>
                      </td>
                      <td className="py-3 text-gray-700">{job.company_name}</td>
                      <td className="py-3 text-gray-600">{job.location}</td>
                      <td className="py-3 text-right font-medium">{job.applications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Search Keywords */}
          {overview.topKeywords && overview.topKeywords.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Top Search Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {overview.topKeywords.map((keyword, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {keyword.query} <span className="text-blue-500">({keyword.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SimpleBarChart data={trends.dailyJobs} dataKey="count" label="Daily Job Postings (Last 14 Days)" color="green" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SimpleBarChart data={trends.dailyApplications} dataKey="count" label="Daily Applications (Last 14 Days)" color="blue" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SimpleBarChart data={trends.dailySignups} dataKey="count" label="Daily Signups (Last 14 Days)" color="purple" />
          </div>
        </div>
      )}

      {/* Employers Tab */}
      {activeTab === 'employers' && employers && (
        <div className="space-y-6">
          {/* Active Employers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Most Active Employers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-sm text-gray-600 border-b">
                  <tr>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium text-right">Total Jobs</th>
                    <th className="pb-3 font-medium text-right">Active Jobs</th>
                    <th className="pb-3 font-medium text-right">Applications</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {employers.activeEmployers.slice(0, 10).map((employer) => (
                    <tr key={employer.id} className="border-b last:border-0">
                      <td className="py-3">
                        <a href={`/companies/${employer.id}`} className="text-blue-600 hover:underline">
                          {employer.company_name}
                        </a>
                      </td>
                      <td className="py-3 text-right">{employer.total_jobs}</td>
                      <td className="py-3 text-right font-medium text-green-600">{employer.active_jobs}</td>
                      <td className="py-3 text-right">{employer.total_applications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Response Rates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Employer Response Rates</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-sm text-gray-600 border-b">
                  <tr>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium text-right">Total Applications</th>
                    <th className="pb-3 font-medium text-right">Responded</th>
                    <th className="pb-3 font-medium text-right">Response Rate</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {employers.responseRates.slice(0, 10).map((employer) => (
                    <tr key={employer.id} className="border-b last:border-0">
                      <td className="py-3">{employer.company_name}</td>
                      <td className="py-3 text-right">{employer.total_applications}</td>
                      <td className="py-3 text-right">{employer.responded_applications}</td>
                      <td className="py-3 text-right">
                        <span className={`font-medium ${employer.response_rate >= 70 ? 'text-green-600' : employer.response_rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {employer.response_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Average Time to Hire */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Average Time to Hire</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left text-sm text-gray-600 border-b">
                  <tr>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium text-right">Hires</th>
                    <th className="pb-3 font-medium text-right">Avg Days</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {employers.avgTimeToHire.slice(0, 10).map((employer) => (
                    <tr key={employer.id} className="border-b last:border-0">
                      <td className="py-3">{employer.company_name}</td>
                      <td className="py-3 text-right">{employer.hired_count}</td>
                      <td className="py-3 text-right font-medium">
                        {employer.avg_days_to_hire ? Math.round(employer.avg_days_to_hire) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
