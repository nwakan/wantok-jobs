import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { jobs as jobsAPI } from '../api';
import JobCard from '../components/JobCard';
import SearchFilters from '../components/SearchFilters';
import { Flame, Sparkles, Globe, Bell, Briefcase, SlidersHorizontal, X } from 'lucide-react';
import PageHead from '../components/PageHead';
import { JobSearchSkeleton } from '../components/SkeletonLoader';

export default function JobSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    category: searchParams.get('category') || '',
    job_type: searchParams.get('job_type') || '',
    experience: searchParams.get('experience') || '',
    industry: searchParams.get('industry') || '',
    salary_min: searchParams.get('salary_min') || '',
    salary_max: searchParams.get('salary_max') || '',
    date_posted: searchParams.get('date_posted') || '',
    remote: searchParams.get('remote') || '',
    company: searchParams.get('company') || '',
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    searchJobs();
  }, []);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/jobs/suggestions?q=${encodeURIComponent(query)}&type=keyword`);
      const data = await response.json();
      setSuggestions(data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Suggestions failed:', error);
      setSuggestions([]);
    }
  };

  const handleKeywordChange = (value) => {
    setFilters({ ...filters, keyword: value });
    fetchSuggestions(value);
  };

  const handleSuggestionClick = (suggestion) => {
    setFilters({ ...filters, keyword: suggestion });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handlePageChange = (newPage) => {
    searchJobs(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadMore = async () => {
    if (pagination.page >= pagination.totalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const params = { ...filters, page: nextPage, limit: 20 };
      if (sortBy === 'date') { params.sort = 'created_at'; params.order = 'desc'; }
      else if (sortBy === 'salary') { params.sort = 'salary_max'; params.order = 'desc'; }
      Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
      const response = await jobsAPI.getAll(params);
      setJobs(prev => [...prev, ...response.data]);
      setPagination({ page: response.page, totalPages: response.totalPages, total: response.total });
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setLoadingMore(false);
    }
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
    const clearedFilters = {
      keyword: '',
      location: '',
      category: '',
      job_type: '',
      experience: '',
      industry: '',
      salary_min: '',
      salary_max: '',
      date_posted: '',
      remote: '',
      company: '',
    };
    setFilters(clearedFilters);
    setSearchParams(new URLSearchParams());
    searchJobs(1, clearedFilters);
  };

  const applyQuickFilter = (filterType) => {
    let newFilters = { ...filters };
    
    if (filterType === 'hot') {
      newFilters.date_posted = '1'; // Last 24 hours
    } else if (filterType === 'new') {
      newFilters.date_posted = '7'; // Last 7 days
    } else if (filterType === 'remote') {
      newFilters.remote = newFilters.remote === 'true' ? '' : 'true';
    }
    
    setFilters(newFilters);
    searchJobs(1, newFilters);
  };

  const removeFilter = (key) => {
    const newFilters = { ...filters, [key]: '' };
    setFilters(newFilters);
    searchJobs(1, newFilters);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHead
        title={filters.keyword ? `${filters.keyword} Jobs in PNG` : 'Search Jobs in Papua New Guinea'}
        description={`Browse ${pagination.total || ''}+ job opportunities in Papua New Guinea. Filter by category, location, salary, and more.`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Next Opportunity</h1>
          <p className="text-gray-600">Discover jobs across Papua New Guinea and the Pacific</p>
        </div>
        
        {/* Search Bar with Autocomplete */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex gap-3">
            <div className="flex-1 relative" ref={suggestionsRef}>
              <input
                type="text"
                value={filters.keyword || ''}
                onChange={(e) => handleKeywordChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFiltersApply()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="🔍 Search by job title, keyword, or company..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                aria-label="Search by job title, keyword, or company"
                role="combobox"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-autocomplete="list"
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700 border-b border-gray-100 last:border-0"
                    >
                      🔍 {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleFiltersApply}
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => applyQuickFilter('hot')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              filters.date_posted === '1'
                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-red-300 hover:bg-red-50'
            }`}
          >
            <Flame className="w-4 h-4" />
            Hot Jobs
          </button>
          
          <button
            onClick={() => applyQuickFilter('new')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              filters.date_posted === '7'
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            New This Week
          </button>
          
          <button
            onClick={() => applyQuickFilter('remote')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all ${
              filters.remote === 'true'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-green-300 hover:bg-green-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            Remote Only
          </button>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            {Object.values(filters).filter(v => v).length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar — hidden on mobile unless toggled */}
          <div className={`lg:w-72 flex-shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-6">
              <SearchFilters
                filters={filters}
                setFilters={setFilters}
                onSearch={() => { handleFiltersApply(); setShowMobileFilters(false); }}
                onClear={() => { handleClearFilters(); setShowMobileFilters(false); }}
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
              {Object.entries(filters).some(([k, v]) => k !== 'keyword' && v) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    
                    {filters.location && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        📍 {filters.location}
                        <button onClick={() => removeFilter('location')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.category && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        📂 {filters.category}
                        <button onClick={() => removeFilter('category')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.job_type && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        💼 {filters.job_type.split(',').join(', ')}
                        <button onClick={() => removeFilter('job_type')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.experience && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        📈 {filters.experience}
                        <button onClick={() => removeFilter('experience')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.company && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        🏢 {filters.company}
                        <button onClick={() => removeFilter('company')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {(filters.salary_min || filters.salary_max) && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        💰 {filters.salary_min && `Min ${filters.salary_min}`}{filters.salary_min && filters.salary_max && ' - '}{filters.salary_max && `Max ${filters.salary_max}`}
                        <button onClick={() => {
                          const newFilters = { ...filters, salary_min: '', salary_max: '' };
                          setFilters(newFilters);
                          searchJobs(1, newFilters);
                        }} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.date_posted && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        🕒 Last {filters.date_posted === '1' ? '24h' : filters.date_posted === '7' ? '7 days' : '30 days'}
                        <button onClick={() => removeFilter('date_posted')} className="ml-1 hover:text-primary-900">×</button>
                      </span>
                    )}
                    
                    {filters.remote === 'true' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm border border-primary-200">
                        🌏 Remote
                        <button onClick={() => removeFilter('remote')} className="ml-1 hover:text-primary-900">×</button>
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
              <JobSearchSkeleton />
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100" role="status" aria-label="No results found">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs match your search</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filters.keyword
                    ? `We couldn't find jobs matching "${filters.keyword}". Try different keywords or broader filters.`
                    : 'Try adjusting your filters or broadening your search criteria.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                    aria-label="Clear all search filters"
                  >
                    Clear All Filters
                  </button>
                  <a
                    href="/dashboard"
                    className="px-6 py-2 bg-white text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 font-medium inline-flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Create Job Alert
                  </a>
                </div>
                {filters.keyword && (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-3">Popular searches:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Mining', 'IT', 'Nursing', 'Accounting', 'Teaching', 'Engineering'].map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setFilters({ ...filters, keyword: term });
                            searchJobs(1, { ...filters, keyword: term });
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-primary-50 hover:text-primary-600 transition"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
