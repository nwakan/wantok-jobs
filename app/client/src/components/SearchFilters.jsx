import { useState, useEffect } from 'react';

export default function SearchFilters({ filters, setFilters, onSearch, onClear }) {
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    fetch('/api/stats/categories')
      .then(r => r.json())
      .then(data => setCategories((data.data || []).filter(c => c.job_count > 0)))
      .catch(() => {});
  }, []);

  const jobTypes = ['full-time', 'part-time', 'contract', 'casual', 'internship'];
  const experienceLevels = ['Entry Level', 'Mid Level', 'Senior', 'Executive'];
  const pngLocations = [
    'Port Moresby', 'Lae', 'Mount Hagen', 'Goroka', 'Madang', 'Wewak',
    'Kokopo', 'Kimbe', 'Alotau', 'Popondetta', 'Kundiawa', 'Mendi',
    'National Capital District', 'Morobe', 'Eastern Highlands', 'Western Highlands',
    'East New Britain', 'Milne Bay', 'West New Britain', 'Simbu',
  ];
  const datePosted = [
    { label: 'Last 24 hours', value: '1' },
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
  ];

  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {onClear && activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            📂 Category
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name} ({cat.job_count})</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            📍 Location
          </label>
          <select
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Locations</option>
            {pngLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Job Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            💼 Job Type
          </label>
          <div className="space-y-2">
            {jobTypes.map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="job_type"
                  value={type}
                  checked={filters.job_type === type}
                  onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 capitalize">{type}</span>
              </label>
            ))}
            {filters.job_type && (
              <button
                onClick={() => setFilters({ ...filters, job_type: '' })}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Experience Level */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            📈 Experience Level
          </label>
          <select
            value={filters.experience || ''}
            onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Levels</option>
            {experienceLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        {/* Salary Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            💰 Minimum Salary (PGK)
          </label>
          <input
            type="number"
            value={filters.salary_min || ''}
            onChange={(e) => setFilters({ ...filters, salary_min: e.target.value })}
            placeholder="e.g. 30000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Date Posted */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🕒 Date Posted
          </label>
          <select
            value={filters.date_posted || ''}
            onChange={(e) => setFilters({ ...filters, date_posted: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Any time</option>
            {datePosted.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Apply Button */}
        <button
          onClick={onSearch}
          className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold shadow-sm"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
