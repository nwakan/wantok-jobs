export default function SearchFilters({ filters, setFilters, onSearch }) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Filters</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <select
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
          <select
            value={filters.job_type || ''}
            onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Types</option>
            {jobTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
          <select
            value={filters.experience || ''}
            onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Levels</option>
            {experienceLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary</label>
          <input
            type="number"
            value={filters.salary_min || ''}
            onChange={(e) => setFilters({ ...filters, salary_min: e.target.value })}
            placeholder="e.g. 30000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <button
          onClick={onSearch}
          className="w-full bg-primary-600 text-white py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          Apply Filters
        </button>

        <button
          onClick={() => {
            setFilters({});
            onSearch();
          }}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
