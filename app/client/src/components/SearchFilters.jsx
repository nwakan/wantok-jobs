import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PNG_PROVINCES } from '../data/provinces';
import { useLanguage } from '../context/LanguageContext';

export default function SearchFilters({ filters, setFilters, onSearch, onClear }) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    location: true,
    province: true,
    jobType: true,
    experience: false,
    salary: false,
    date: false,
    companySize: false,
    other: false,
  });
  
  useEffect(() => {
    fetch('/api/stats/categories')
      .then(r => r.json())
      .then(data => setCategories((data.data || []).filter(c => c.job_count > 0)))
      .catch(() => {});
  }, []);

  const jobTypes = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'casual', label: 'Casual' },
    { value: 'internship', label: 'Internship' }
  ];
  
  const experienceLevels = ['Entry Level', 'Mid Level', 'Senior', 'Executive'];
  
  const pngLocations = [
    'Port Moresby', 'Lae', 'Mount Hagen', 'Goroka', 'Madang', 'Wewak',
    'Kokopo', 'Kimbe', 'Alotau', 'Popondetta', 'Kundiawa', 'Mendi',
    'National Capital District', 'Morobe', 'Eastern Highlands', 'Western Highlands',
    'East New Britain', 'Milne Bay', 'West New Britain', 'Simbu',
  ];
  
  const datePostedOptions = [
    { label: 'Last 24 hours', value: '1' },
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
  ];

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'keyword') return false; // Don't count keyword in sidebar count
    if (key === 'job_type' && typeof value === 'string') {
      return value.split(',').filter(Boolean).length > 0;
    }
    return value && value !== '';
  }).length;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleJobType = (type) => {
    const current = filters.job_type ? filters.job_type.split(',').filter(Boolean) : [];
    const index = current.indexOf(type);
    
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(type);
    }
    
    setFilters({ ...filters, job_type: current.join(',') });
  };

  const isJobTypeSelected = (type) => {
    const current = filters.job_type ? filters.job_type.split(',') : [];
    return current.includes(type);
  };

  const FilterSection = ({ title, section, children }) => (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 transition-colors"
      >
        <span>{title}</span>
        {expandedSections[section] ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {expandedSections[section] && (
        <div className="pb-4">{children}</div>
      )}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-semibold">
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
      </div>
      
      <div className="p-6 space-y-0">
        {/* Category */}
        <FilterSection title="📂 Category" section="category">
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name} ({cat.job_count})</option>
            ))}
          </select>
        </FilterSection>

        {/* Province Filter - PNG Specific */}
        <FilterSection title="🗺️ Province" section="province">
          <select
            value={filters.province || ''}
            onChange={(e) => setFilters({ ...filters, province: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">{t('search.allProvinces')}</option>
            {PNG_PROVINCES.map(province => (
              <option key={province.abbr} value={province.name}>
                {province.name} ({province.abbr})
              </option>
            ))}
          </select>
        </FilterSection>

        {/* Location (City/Town) */}
        <FilterSection title="📍 City/Town" section="location">
          <select
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-3"
          >
            <option value="">All Cities</option>
            {pngLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <input
              type="checkbox"
              checked={filters.remote === 'true'}
              onChange={(e) => setFilters({ ...filters, remote: e.target.checked ? 'true' : '' })}
              className="text-primary-600 focus:ring-primary-500 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">🌏 Remote only</span>
          </label>
        </FilterSection>

        {/* Job Type - Now with multiple selection */}
        <FilterSection title="💼 Job Type" section="jobType">
          <div className="space-y-2">
            {jobTypes.map(type => (
              <label key={type.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={isJobTypeSelected(type.value)}
                  onChange={() => toggleJobType(type.value)}
                  className="text-primary-600 focus:ring-primary-500 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{type.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Experience Level */}
        <FilterSection title="📈 Experience Level" section="experience">
          <select
            value={filters.experience || ''}
            onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Levels</option>
            {experienceLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </FilterSection>

        {/* Salary Range */}
        <FilterSection title="💰 Salary Range (PGK)" section="salary">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Minimum</label>
              <input
                type="number"
                value={filters.salary_min || ''}
                onChange={(e) => setFilters({ ...filters, salary_min: e.target.value })}
                placeholder="e.g. 30000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Maximum</label>
              <input
                type="number"
                value={filters.salary_max || ''}
                onChange={(e) => setFilters({ ...filters, salary_max: e.target.value })}
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </FilterSection>

        {/* Date Posted */}
        <FilterSection title="🕒 Date Posted" section="date">
          <select
            value={filters.date_posted || ''}
            onChange={(e) => setFilters({ ...filters, date_posted: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Any time</option>
            {datePostedOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterSection>

        {/* Company Size */}
        <FilterSection title="🏢 Company Size" section="companySize">
          <select
            value={filters.company_size || ''}
            onChange={(e) => setFilters({ ...filters, company_size: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Sizes</option>
            <option value="startup">Startup (1-10)</option>
            <option value="small">Small (11-50)</option>
            <option value="medium">Medium (51-200)</option>
            <option value="large">Large (201-1000)</option>
            <option value="enterprise">Enterprise (1000+)</option>
          </select>
        </FilterSection>

        {/* Company Name */}
        <FilterSection title="🔤 Company Name" section="other">
          <input
            type="text"
            value={filters.company || ''}
            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
            placeholder="Company name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </FilterSection>
      </div>

      {/* Apply Button - Always visible at bottom */}
      <div className="p-6 pt-0">
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
