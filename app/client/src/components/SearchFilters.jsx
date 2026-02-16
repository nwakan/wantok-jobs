export default function SearchFilters({ filters, setFilters, onSearch, onClear }) {
  const jobTypes = ['full-time', 'part-time', 'contract', 'casual', 'internship'];
  const experienceLevels = ['Entry Level', 'Mid Level', 'Senior', 'Executive'];
  const countries = [
    'Papua New Guinea',
    'Fiji',
    'Solomon Islands',
    'Vanuatu',
    'Samoa',
    'Tonga',
    'Kiribati',
    'Tuvalu',
  ];
  const pngCities = [
    'Port Moresby',
    'Lae',
    'Mount Hagen',
    'Goroka',
    'Madang',
    'Wewak',
  ];
  const industries = [
    'Technology',
    'Banking & Finance',
    'Healthcare',
    'Education',
    'Mining & Resources',
    'Construction',
    'Retail',
    'Hospitality & Tourism',
    'Government',
    'Agriculture',
    'Telecommunications',
    'Manufacturing',
  ];

  const datePosted = [
    { label: 'Last 24 hours', value: '1' },
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Filters</h3>
        {onClear && (
          <button
            onClick={onClear}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="space-y-6">
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
            <optgroup label="Papua New Guinea Cities">
              {pngCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </optgroup>
            <optgroup label="Countries">
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🏢 Industry
          </label>
          <select
            value={filters.industry || ''}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Industries</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
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
