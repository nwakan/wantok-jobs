import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Building2, CheckCircle2, Shield, Filter, ChevronLeft, ChevronRight, Globe, Users, Briefcase, X, SlidersHorizontal } from 'lucide-react';
import PageHead from '../components/PageHead';
import { CompanyCardSkeleton } from '../components/SkeletonLoader';
import api from '../api';
import OptimizedImage from '../components/OptimizedImage';

const COUNTRIES = [
  { value: '', label: '🌏 All Countries' },
  { value: 'Papua New Guinea', label: '🇵🇬 Papua New Guinea' },
  { value: 'Fiji', label: '🇫🇯 Fiji' },
  { value: 'Solomon Islands', label: '🇸🇧 Solomon Islands' },
  { value: 'Vanuatu', label: '🇻🇺 Vanuatu' },
  { value: 'Samoa', label: '🇼🇸 Samoa' },
  { value: 'Tonga', label: '🇹🇴 Tonga' },
  { value: 'Tuvalu', label: '🇹🇻 Tuvalu' },
  { value: 'Palau', label: '🇵🇼 Palau' },
  { value: 'Kiribati', label: '🇰🇮 Kiribati' },
  { value: 'Nauru', label: '🇳🇷 Nauru' },
  { value: 'Marshall Islands', label: '🇲🇭 Marshall Islands' },
  { value: 'Federated States of Micronesia', label: '🇫🇲 Micronesia' },
  { value: 'Cook Islands', label: '🇨🇰 Cook Islands' },
  { value: 'Niue', label: '🇳🇺 Niue' },
  { value: 'New Caledonia', label: '🇳🇨 New Caledonia' },
];

const INDUSTRIES = [
  { value: '', label: 'All Industries' },
  { value: 'Government', label: 'Government' },
  { value: 'Government & Public Sector', label: 'Government & Public Sector' },
  { value: 'Banking & Finance', label: 'Banking & Finance' },
  { value: 'Education & Training', label: 'Education & Training' },
  { value: 'Hospitality & Tourism', label: 'Hospitality & Tourism' },
  { value: 'Construction & Engineering', label: 'Construction & Engineering' },
  { value: 'Mining & Resources', label: 'Mining & Resources' },
  { value: 'Oil & Gas', label: 'Oil & Gas' },
  { value: 'Healthcare & Medical', label: 'Healthcare & Medical' },
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'NGO & Development', label: 'NGO & Development' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Retail & Wholesale', label: 'Retail & Wholesale' },
  { value: 'Agriculture & Fisheries', label: 'Agriculture & Fisheries' },
  { value: 'Consulting & Professional Services', label: 'Professional Services' },
  { value: 'Security', label: 'Security' },
  { value: 'Energy & Utilities', label: 'Energy & Utilities' },
  { value: 'Shipping & Logistics', label: 'Shipping & Logistics' },
  { value: 'Aviation', label: 'Aviation' },
];

const EMPLOYER_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'government', label: '🏛️ Government' },
  { value: 'soe', label: '🏢 State-Owned Enterprise' },
  { value: 'statutory', label: '⚖️ Statutory Authority' },
  { value: 'ngo', label: '🤝 NGO' },
  { value: 'listed', label: '📈 Publicly Listed' },
  { value: 'private', label: '🏪 Private Company' },
];

const LOCATIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Port Moresby', label: 'Port Moresby, NCD' },
  { value: 'Lae', label: 'Lae, Morobe' },
  { value: 'Mt Hagen', label: 'Mt Hagen, WHP' },
  { value: 'Kokopo', label: 'Kokopo, ENBP' },
  { value: 'Madang', label: 'Madang' },
  { value: 'Goroka', label: 'Goroka, EHP' },
  { value: 'Wewak', label: 'Wewak, ESP' },
  { value: 'Kimbe', label: 'Kimbe, WNB' },
  { value: 'Suva', label: 'Suva, Fiji' },
  { value: 'Honiara', label: 'Honiara, Solomon Islands' },
];

const PER_PAGE = 24;

// Country emoji map
const COUNTRY_EMOJI_MAP = {
  'Papua New Guinea': '🇵🇬',
  'Fiji': '🇫🇯',
  'Solomon Islands': '🇸🇧',
  'Vanuatu': '🇻🇺',
  'Samoa': '🇼🇸',
  'Tonga': '🇹🇴',
  'Tuvalu': '🇹🇻',
  'Palau': '🇵🇼',
  'Kiribati': '🇰🇮',
  'Nauru': '🇳🇷',
  'Marshall Islands': '🇲🇭',
  'Federated States of Micronesia': '🇫🇲',
  'Cook Islands': '🇨🇰',
  'Niue': '🇳🇺',
  'New Caledonia': '🇳🇨',
};

// Browse by Country Component
function BrowseByCountry({ onCountryClick }) {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get('/companies/countries');
        const data = Array.isArray(response) ? response : (response.data || []);
        setCountries(data);
      } catch (error) {
        console.error('Failed to fetch country stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCountries();
  }, []);

  if (loading || countries.length === 0) return null;

  return (
    <div className="mt-12 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Browse Companies by Country
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Discover employers across the Pacific region
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {countries.map((country) => (
          <button
            key={country.country}
            onClick={() => onCountryClick(country.country)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all group text-center"
          >
            <div className="text-4xl mb-3">{COUNTRY_EMOJI_MAP[country.country] || '🌏'}</div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition mb-1 text-sm">
              {country.country}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {country.count.toLocaleString()} {country.count === 1 ? 'company' : 'companies'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Companies() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    industry: searchParams.get('industry') || '',
    location: searchParams.get('location') || '',
    country: searchParams.get('country') || '',
    employerType: searchParams.get('type') || '',
    transparencyOnly: searchParams.get('transparent') === 'true',
    hasJobs: searchParams.get('hasJobs') === 'true',
  });

  const activeFilterCount = [filters.industry, filters.location, filters.country, filters.employerType, filters.transparencyOnly, filters.hasJobs].filter(Boolean).length;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.location) params.append('location', filters.location);
      if (filters.country) params.append('country', filters.country);
      if (filters.employerType) params.append('employer_type', filters.employerType);
      if (filters.transparencyOnly) params.append('transparency_only', 'true');
      params.append('limit', PER_PAGE);
      params.append('offset', (page - 1) * PER_PAGE);

      const response = await api.get(`/companies?${params.toString()}`);
      let list = Array.isArray(response) ? response : (response.data || response.companies || []);
      if (!Array.isArray(list)) list = [];
      
      // Client-side filter for "has active jobs"
      if (filters.hasJobs) {
        list = list.filter(c => (c.active_jobs_count || c.activeJobs || 0) > 0);
      }

      setCompanies(list);
      setTotal(response.total || list.length);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStats(d.data || d)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCompanies();
    // Sync filters to URL
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.industry) params.set('industry', filters.industry);
    if (filters.location) params.set('location', filters.location);
    if (filters.country) params.set('country', filters.country);
    if (filters.employerType) params.set('type', filters.employerType);
    if (filters.transparencyOnly) params.set('transparent', 'true');
    if (filters.hasJobs) params.set('hasJobs', 'true');
    if (page > 1) params.set('page', page);
    setSearchParams(params, { replace: true });
  }, [filters, page]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', industry: '', location: '', country: '', employerType: '', transparencyOnly: false, hasJobs: false });
    setPage(1);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  const getTransparencyBadge = (score, required) => {
    if (score >= 80) return { emoji: '🟢', label: 'Excellent', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' };
    if (score >= 50) return { emoji: '🟡', label: 'Improving', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' };
    if (score >= 1) return { emoji: '🔴', label: 'Low', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' };
    if (required) return { emoji: '⚫', label: 'No Data', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' };
    return null;
  };

  const getEmployerTypeLabel = (type) => {
    const map = { government: '🏛️ Govt', soe: '🏢 SOE', statutory: '⚖️ Statutory', ngo: '🤝 NGO', listed: '📈 Listed', private: '🏪 Private' };
    return map[type] || type;
  };

  return (
    <>
      <PageHead
        title="Company Directory — PNG & Pacific Employers | WantokJobs"
        description={`Browse ${stats?.totalEmployers?.toLocaleString() || '2,500'}+ verified employers hiring across Papua New Guinea and the Pacific Islands. Filter by country, industry, and transparency.`}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Company Directory</h1>
            <p className="text-primary-100 text-lg max-w-2xl mb-6">
              Discover verified employers hiring across Papua New Guinea and the Pacific Islands
            </p>

            {/* Stats chips */}
            {stats && (
              <div className="flex flex-wrap gap-3">
                <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> {stats.totalEmployers?.toLocaleString()}+ Employers
                </span>
                <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> {stats.transparentEmployers} Transparent
                </span>
                <span className="bg-white/15 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" /> {stats.activeJobs} Active Jobs
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Search bar + filter toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCompanies()}
                  placeholder="Search companies by name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-lg border font-medium flex items-center gap-2 transition ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Expandable filter panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Country filter */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Country</label>
                    <select
                      value={filters.country}
                      onChange={(e) => handleFilterChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Industry filter */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Industry</label>
                    <select
                      value={filters.industry}
                      onChange={(e) => handleFilterChange('industry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                  </div>

                  {/* Employer type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Type</label>
                    <select
                      value={filters.employerType}
                      onChange={(e) => handleFilterChange('employerType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      {EMPLOYER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* Location filter */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">City</label>
                    <select
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500"
                    >
                      {LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Toggle filters */}
                <div className="flex flex-wrap gap-4 mt-3 items-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.transparencyOnly}
                      onChange={(e) => handleFilterChange('transparencyOnly', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Transparent only</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.hasJobs}
                      onChange={(e) => handleFilterChange('hasJobs', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Currently hiring</span>
                  </label>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && !showFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.country && (
                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> {filters.country}
                  <button onClick={() => handleFilterChange('country', '')} className="ml-1 hover:text-primary-900"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {filters.industry && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {filters.industry}
                  <button onClick={() => handleFilterChange('industry', '')} className="ml-1"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {filters.employerType && (
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {EMPLOYER_TYPES.find(t => t.value === filters.employerType)?.label || filters.employerType}
                  <button onClick={() => handleFilterChange('employerType', '')} className="ml-1"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {filters.location && (
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {filters.location}
                  <button onClick={() => handleFilterChange('location', '')} className="ml-1"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {filters.transparencyOnly && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Transparent
                  <button onClick={() => handleFilterChange('transparencyOnly', false)} className="ml-1"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
              {filters.hasJobs && (
                <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" /> Hiring
                  <button onClick={() => handleFilterChange('hasJobs', false)} className="ml-1"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? 'Loading...' : `Showing ${companies.length} of ${total.toLocaleString()} companies`}
              {filters.country && ` in ${filters.country}`}
            </p>
          </div>

          {/* Companies Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, idx) => (
                <CompanyCardSkeleton key={idx} />
              ))}
            </div>
          ) : companies.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {companies.map((company) => {
                  const name = company.company_name || company.name || 'Unknown Company';
                  const jobs = company.active_jobs_count ?? company.activeJobs ?? 0;
                  const score = company.transparency_score;
                  const required = company.transparency_required;
                  const badge = getTransparencyBadge(score, required);

                  return (
                    <button
                      key={company.id}
                      onClick={() => navigate(company.is_agency_managed ? `/companies/agency-client/${company.id}` : `/companies/${company.id}`)}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all text-left group relative"
                    >
                      {/* Top badges row */}
                      <div className="flex items-start justify-between mb-3">
                        {/* Logo */}
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition">
                          {company.logo_url ? (
                            <OptimizedImage src={company.logo_url} alt={name} width={48} height={48} className="w-12 h-12 object-contain rounded" />
                          ) : (
                            <Building2 className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1">
                          {!!company.verified && (
                            <span className="text-primary-600 dark:text-primary-400" title="Verified">
                              <CheckCircle2 className="w-5 h-5" />
                            </span>
                          )}
                          {badge && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`} title={`Transparency: ${score}/100`}>
                              {badge.emoji} {score > 0 ? score : badge.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition mb-1 line-clamp-2 text-sm">
                        {name}
                      </h3>

                      {/* Type + Industry */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {company.employer_type && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                            {getEmployerTypeLabel(company.employer_type)}
                          </span>
                        )}
                        {company.industry && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {company.industry}
                          </span>
                        )}
                      </div>

                      {/* Location + Country */}
                      {(company.location || company.country) && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{[company.location, company.country].filter(Boolean).join(', ')}</span>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                        {jobs > 0 ? (
                          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            {jobs} active {jobs === 1 ? 'job' : 'jobs'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No active jobs</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                            page === pageNum
                              ? 'bg-primary-600 text-white'
                              : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No companies found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your filters or search terms.</p>
              <button onClick={clearFilters} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          {/* Browse by Country Section */}
          <BrowseByCountry onCountryClick={(country) => {
            setFilters(prev => ({ ...prev, country }));
            setPage(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />

          {/* CTA Section */}
          <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-8 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Is Your Company Listed?</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Join {stats ? `${stats.totalEmployers?.toLocaleString()}+` : ''} employers finding great talent on WantokJobs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/register?type=employer')}
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Register as Employer
              </button>
              <button
                onClick={() => navigate('/claim-employer')}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Claim Your Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
