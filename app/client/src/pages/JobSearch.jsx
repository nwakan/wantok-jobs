import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobs as jobsAPI } from '../api';
import JobCard from '../components/JobCard';
import SearchFilters from '../components/SearchFilters';

export default function JobSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    location: searchParams.get('location') || '',
    job_type: searchParams.get('job_type') || '',
    experience: searchParams.get('experience') || '',
    industry: searchParams.get('industry') || '',
    salary_min: searchParams.get('salary_min') || '',
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    searchJobs();
  }, []);

  const searchJobs = async (page = 1, newFilters = filters, newSort = sortBy) => {
    setLoading(true);
    try {
      const params = { ...newFilters, page, limit: 20 };
      
      // Add sorting
      if (newSort === 'date') {
        params.sort = 'created_at';
        params.order = 'desc';
      } else if (newSort === 'salary') {
        params.sort = 'salary_max';
        params.order = 'desc';
      }
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const response = await jobsAPI.getAll(params);
      setJobs(response.data);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    searchJobs(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    searchJobs(1, filters, newSort);
  };

  const handleFiltersApply = () => {
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params);
    searchJobs(1);
  };

  const handleClearFilters = () => {
    setFilters({
      keyword: '',
      location: '',
      job_type: '',
      experience: '',
      industry: '',
      salary_min: '',
    });
    setSearchParams(new URLSearchParams());
    searchJobs(1, {
      keyword: '',
      location: '',
      job_type: '',
      experience: '',
      industry: '',
      salary_min: '',
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Next Opportunity</h1>
          <p className="text-gray-600">Discover jobs across Papua New Guinea and the Pacific</p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={filters.keyword || ''}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleFiltersApply()}
                placeholder="🔍 Search by job title, keyword, or company..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={handleFiltersApply}
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <SearchFilters
                filters={filters}
                setFilters={setFilters}
                onSearch={handleFiltersApply}
                onClear={handleClearFilters}
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-gray-700">
                  {loading ? (
                    <span>Searching...</span>
                  ) : (
                    <span>
                      <span className="font-bold text-gray-900">{pagination.total}</span> jobs found
                      {filters.keyword && (
                        <span className="text-gray-600"> for "{filters.keyword}"</span>
                      )}
                    </span>
                  )}
                </div>
                
                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date Posted</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {(filters.location || filters.job_type || filters.experience || filters.industry || filters.salary_min) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {filters.location && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        📍 {filters.location}
                        <button
                          onClick={() => setFilters({ ...filters, location: '' })}
                          className="ml-1 hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.job_type && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        💼 {filters.job_type}
                        <button
                          onClick={() => setFilters({ ...filters, job_type: '' })}
                          className="ml-1 hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.experience && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        📈 {filters.experience}
                        <button
                          onClick={() => setFilters({ ...filters, experience: '' })}
                          className="ml-1 hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.industry && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        🏢 {filters.industry}
                        <button
                          onClick={() => setFilters({ ...filters, industry: '' })}
                          className="ml-1 hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.salary_min && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        💰 Min {filters.salary_min}
                        <button
                          onClick={() => setFilters({ ...filters, salary_min: '' })}
                          className="ml-1 hover:text-primary-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      onClick={handleClearFilters}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Job Listings */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading jobs...</p>
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={handleClearFilters}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {/* Job Cards */}
                <div className="space-y-4 mb-8">
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-600">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                        >
                          ← Previous
                        </button>
                        
                        <div className="hidden sm:flex items-center gap-1">
                          {(() => {
                            const { page, totalPages } = pagination;
                            const pages = new Set([1, totalPages, page - 1, page, page + 1]);
                            const visible = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
                            const items = [];
                            let last = 0;
                            for (const p of visible) {
                              if (p - last > 1) items.push(
                                <span key={`e${p}`} className="px-2 py-2 text-gray-400">…</span>
                              );
                              items.push(
                                <button
                                  key={p}
                                  onClick={() => handlePageChange(p)}
                                  className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                                    page === p
                                      ? 'bg-primary-600 text-white border-primary-600'
                                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              );
                              last = p;
                            }
                            return items;
                          })()}
                        </div>

                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors font-medium"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
