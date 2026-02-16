import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admin as adminAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function ManageJobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    loadJobs();
  }, [filter, pagination.page]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter, page: pagination.page } : { page: pagination.page };
      const data = await adminAPI.getJobs(params);
      setJobs(data.data || []);
      setPagination({ page: data.page || 1, totalPages: data.totalPages || 1 });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await adminAPI.deleteJob(jobId);
      showToast('Job deleted successfully', 'success');
      loadJobs();
    } catch (error) {
      showToast('Failed to delete job: ' + error.message, 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedJobs.length === 0) {
      showToast('Please select jobs first', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedJobs.length} job(s)?`)) return;

    try {
      // Mock bulk action - in real app, call API
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast(`Bulk action "${action}" completed for ${selectedJobs.length} job(s)`, 'success');
      setSelectedJobs([]);
      loadJobs();
    } catch (error) {
      showToast('Bulk action failed: ' + error.message, 'error');
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedJobs(prev =>
      prev.length === jobs.length ? [] : jobs.map(j => j.id)
    );
  };

  const toggleFlag = async (jobId, currentlyFlagged) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast(currentlyFlagged ? 'Job unflagged' : 'Job flagged', 'success');
      loadJobs();
    } catch (error) {
      showToast('Failed to update flag', 'error');
    }
  };

  const handleQuickStatusChange = async (jobId, newStatus) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      showToast('Status updated successfully', 'success');
      loadJobs();
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const filteredJobs = jobs.filter(job =>
    !searchTerm ||
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.employer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Jobs</h1>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by job title, company, or employer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'closed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Closed
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'draft' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Draft
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedJobs.length} job(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('close expired')}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
              >
                Close Expired
              </button>
              <button
                onClick={() => handleBulkAction('feature')}
                className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium"
              >
                Feature Jobs
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedJobs([])}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No jobs found</div>
        ) : (
          <>
            {/* Select All */}
            <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedJobs.length === filteredJobs.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Select All</span>
            </div>

            {/* Job Items */}
            <div className="divide-y">
              {filteredJobs.map(job => (
                <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.id)}
                      onChange={() => toggleJobSelection(job.id)}
                      className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />

                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                            >
                              {job.title}
                            </Link>
                            {job.is_flagged && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                🚩 Flagged
                              </span>
                            )}
                            {job.is_featured && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600">
                            {job.company_name} • {job.location}, {job.country}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            job.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : job.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-600">Employer:</span>
                          <p className="font-medium">{job.employer_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <p className="font-medium">{job.job_type}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Views:</span>
                          <p className="font-medium">{job.views_count || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Posted:</span>
                          <p className="font-medium">
                            {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Expires:</span>
                          <p className="font-medium">
                            {job.expires_at
                              ? new Date(job.expires_at).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Source:</span>
                          <p className="font-medium">{job.source || 'Direct'}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                        >
                          View Job
                        </Link>

                        {/* Quick Status Change */}
                        <select
                          value={job.status}
                          onChange={(e) => handleQuickStatusChange(job.id, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                        >
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                          <option value="draft">Draft</option>
                        </select>

                        <button
                          onClick={() => toggleFlag(job.id, job.is_flagged)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            job.is_flagged
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {job.is_flagged ? '🚩 Unflag' : '🏳️ Flag'}
                        </button>

                        <button
                          onClick={() => handleDelete(job.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
