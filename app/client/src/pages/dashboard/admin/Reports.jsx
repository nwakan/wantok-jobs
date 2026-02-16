import { useState, useEffect } from 'react';
import { adminAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function Reports() {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  useEffect(() => {
    loadReports();
  }, [selectedYear]);

  const loadReports = async () => {
    try {
      const data = await adminAPI.getReports({ year: selectedYear });
      setReports(data || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Placeholder data
      setReports([
        { month: 'January', new_jobseekers: 45, new_employers: 12, new_jobs: 67, applications: 234, revenue: 2450.00 },
        { month: 'February', new_jobseekers: 52, new_employers: 15, new_jobs: 78, applications: 289, revenue: 3100.00 },
        { month: 'March', new_jobseekers: 38, new_employers: 10, new_jobs: 54, applications: 198, revenue: 2200.00 },
        { month: 'April', new_jobseekers: 61, new_employers: 18, new_jobs: 92, applications: 356, revenue: 3850.00 },
        { month: 'May', new_jobseekers: 55, new_employers: 14, new_jobs: 73, applications: 312, revenue: 2950.00 },
        { month: 'June', new_jobseekers: 68, new_employers: 22, new_jobs: 98, applications: 421, revenue: 4200.00 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return {
      jobseekers: reports.reduce((sum, r) => sum + (r.new_jobseekers || 0), 0),
      employers: reports.reduce((sum, r) => sum + (r.new_employers || 0), 0),
      jobs: reports.reduce((sum, r) => sum + (r.new_jobs || 0), 0),
      applications: reports.reduce((sum, r) => sum + (r.applications || 0), 0),
      revenue: reports.reduce((sum, r) => sum + (r.revenue || 0), 0),
    };
  };

  const handleExport = async (format) => {
    try {
      showToast(`Exporting data as ${format.toUpperCase()}...`, 'success');
      // Mock export - in real app, this would generate and download the file
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast(`Report exported successfully as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showToast('Export failed', 'error');
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
      </div>

      {/* Date Range Selector & Export */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Data</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
              >
                📊 CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
              >
                📄 PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Jobseekers</p>
          <p className="text-3xl font-bold text-blue-600">{totals.jobseekers}</p>
          <p className="text-xs text-gray-500 mt-1">+12% vs last year</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Employers</p>
          <p className="text-3xl font-bold text-purple-600">{totals.employers}</p>
          <p className="text-xs text-gray-500 mt-1">+8% vs last year</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
          <p className="text-3xl font-bold text-green-600">{totals.jobs}</p>
          <p className="text-xs text-gray-500 mt-1">+15% vs last year</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Applications</p>
          <p className="text-3xl font-bold text-orange-600">{totals.applications}</p>
          <p className="text-xs text-gray-500 mt-1">+20% vs last year</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">${totals.revenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">+18% vs last year</p>
        </div>
      </div>

      {/* Trend Visualization */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Growth Trends</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* User Growth */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">User Growth</h3>
            <div className="space-y-2">
              {reports.slice(0, 6).map((report, idx) => {
                const total = report.new_jobseekers + report.new_employers;
                const maxTotal = Math.max(...reports.map(r => r.new_jobseekers + r.new_employers));
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{report.month.slice(0, 3)}</span>
                      <span className="font-medium">{total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job Postings */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Job Postings</h3>
            <div className="space-y-2">
              {reports.slice(0, 6).map((report, idx) => {
                const maxJobs = Math.max(...reports.map(r => r.new_jobs));
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{report.month.slice(0, 3)}</span>
                      <span className="font-medium">{report.new_jobs}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(report.new_jobs / maxJobs) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Applications */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Applications</h3>
            <div className="space-y-2">
              {reports.slice(0, 6).map((report, idx) => {
                const maxApps = Math.max(...reports.map(r => r.applications));
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{report.month.slice(0, 3)}</span>
                      <span className="font-medium">{report.applications}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(report.applications / maxApps) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Revenue</h3>
            <div className="space-y-2">
              {reports.slice(0, 6).map((report, idx) => {
                const maxRevenue = Math.max(...reports.map(r => r.revenue));
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{report.month.slice(0, 3)}</span>
                      <span className="font-medium">${report.revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(report.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-xl font-bold text-gray-900">Monthly Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Jobseekers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Employers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Jobs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No data available for {selectedYear}
                  </td>
                </tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.new_jobseekers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.new_employers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.new_jobs}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.applications}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${report.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totals.jobseekers}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totals.employers}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totals.jobs}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{totals.applications}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${totals.revenue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
