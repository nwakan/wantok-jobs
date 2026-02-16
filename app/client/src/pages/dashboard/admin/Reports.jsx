import { useState, useEffect } from 'react';
import { adminAPI } from '../../../api';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        
        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Jobseekers</p>
          <p className="text-2xl font-bold text-primary-600">{totals.jobseekers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Employers</p>
          <p className="text-2xl font-bold text-primary-600">{totals.employers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-primary-600">{totals.jobs}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Applications</p>
          <p className="text-2xl font-bold text-primary-600">{totals.applications}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">${totals.revenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  <tr key={index}>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
