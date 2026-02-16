import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import PageHead from '../components/PageHead';
import { CompanyCardSkeleton } from '../components/SkeletonLoader';
import api from '../api';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    industry: '',
    location: '',
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.location) params.append('location', filters.location);
      
      const response = await api.get(`/companies?${params.toString()}`);
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      // Fallback to mock data if API fails
      setCompanies(getMockCompanies());
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCompanies();
  };

  return (
    <>
      <PageHead
        title="Company Directory"
        description="Browse companies hiring in Papua New Guinea. Discover top employers and find your next career opportunity."
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Company Directory</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover 330+ verified employers hiring across Papua New Guinea and the Pacific region.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search companies..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <select
                  name="industry"
                  value={filters.industry}
                  onChange={handleFilterChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Industries</option>
                  <option value="mining">Mining & Resources</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="it">Information Technology</option>
                  <option value="finance">Banking & Finance</option>
                  <option value="construction">Construction</option>
                  <option value="retail">Retail</option>
                  <option value="hospitality">Hospitality</option>
                </select>
                <select
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Locations</option>
                  <option value="port-moresby">Port Moresby, NCD</option>
                  <option value="lae">Lae, Morobe</option>
                  <option value="mt-hagen">Mt Hagen, Western Highlands</option>
                  <option value="kokopo">Kokopo, East New Britain</option>
                  <option value="madang">Madang</option>
                  <option value="goroka">Goroka, Eastern Highlands</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full md:w-auto bg-primary-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Search Companies
              </button>
            </form>
          </div>

          {/* Companies Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, idx) => (
                <CompanyCardSkeleton key={idx} />
              ))}
            </div>
          ) : (
            <>
              {companies.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => navigate(`/companies/${company.id}`)}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
                    >
                      <div className="flex flex-col items-center text-center">
                        {/* Logo */}
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-50 transition">
                          {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-16 h-16 object-contain" />
                          ) : (
                            <Building2 className="w-10 h-10 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Company Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition">
                            {company.name}
                          </h3>
                          {company.verified && (
                            <CheckCircle2 className="w-5 h-5 text-primary-600" title="Verified Employer" />
                          )}
                        </div>
                        
                        {/* Industry */}
                        <p className="text-sm text-gray-600 mb-2">{company.industry}</p>
                        
                        {/* Location */}
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                          <MapPin className="w-4 h-4" />
                          <span>{company.location}</span>
                        </div>
                        
                        {/* Job Count */}
                        <div className="w-full pt-4 border-t border-gray-100">
                          <span className="text-primary-600 font-semibold">
                            {company.activeJobs} active {company.activeJobs === 1 ? 'job' : 'jobs'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No companies found</h3>
                  <p className="text-gray-600">Try adjusting your filters or search terms.</p>
                </div>
              )}
            </>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Is Your Company Listed?</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Join 330+ employers finding great talent on WantokJobs. Post jobs, build your employer brand, and connect with qualified candidates.
            </p>
            <button
              onClick={() => navigate('/register?type=employer')}
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Register as Employer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Mock data fallback
function getMockCompanies() {
  return [
    { id: 1, name: 'PNG Mining Corp', industry: 'Mining & Resources', location: 'Port Moresby, NCD', activeJobs: 12, verified: true },
    { id: 2, name: 'Pacific Healthcare', industry: 'Healthcare', location: 'Lae, Morobe', activeJobs: 8, verified: true },
    { id: 3, name: 'National Bank PNG', industry: 'Banking & Finance', location: 'Port Moresby, NCD', activeJobs: 5, verified: true },
    { id: 4, name: 'TechSolutions PNG', industry: 'Information Technology', location: 'Port Moresby, NCD', activeJobs: 6, verified: false },
    { id: 5, name: 'Build PNG Construction', industry: 'Construction', location: 'Mt Hagen, WHP', activeJobs: 15, verified: true },
    { id: 6, name: 'Paradise Hotels', industry: 'Hospitality & Tourism', location: 'Kokopo, ENBP', activeJobs: 7, verified: true },
  ];
}
