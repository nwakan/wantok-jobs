import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobs as jobsAPI } from '../api';
import JobCard from '../components/JobCard';
import SearchFilters from '../components/SearchFilters';

export default function JobSearch() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    searchJobs();
  }, []);

  const searchJobs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: 20 };
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Find Jobs</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <SearchFilters
            filters={filters}
            setFilters={setFilters}
            onSearch={() => searchJobs(1)}
          />
        </div>

        {/* Results */}
        <div className="flex-1">
          {/* Search Input */}
          <div className="mb-6">
            <input
              type="text"
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && searchJobs(1)}
              placeholder="Search by job title or keyword..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Results Count */}
          <div className="mb-6 text-gray-600">
            {loading ? 'Searching...' : `${pagination.total} jobs found`}
          </div>

          {/* Job Listings */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No jobs found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const { page, totalPages } = pagination;
                      const pages = new Set([1, totalPages, page - 1, page, page + 1]);
                      const visible = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
                      const items = [];
                      let last = 0;
                      for (const p of visible) {
                        if (p - last > 1) items.push(<span key={`e${p}`} className="px-2 py-2 text-gray-400">…</span>);
                        items.push(
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`px-4 py-2 border rounded-md ${
                              page === p
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'border-gray-300 hover:bg-gray-50'
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
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
