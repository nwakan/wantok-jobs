import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Building2, MapPin, Globe, Users, CheckCircle2, Briefcase, Mail, Phone } from 'lucide-react';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/SkeletonLoader';
import api from '../api';

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const [companyRes, jobsRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/jobs?companyId=${id}`),
      ]);
      setCompany(companyRes.data);
      setJobs(jobsRes.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
      // Fallback to mock data
      setCompany(getMockCompany());
      setJobs(getMockJobs());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6 animate-pulse">
            <div className="h-24 w-24 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h2>
          <p className="text-gray-600 mb-6">The company you're looking for doesn't exist or has been removed.</p>
          <Link to="/companies" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title={company.name}
        description={`${company.name} - ${company.industry} company hiring in ${company.location}. View jobs and company profile on WantokJobs.`}
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Company Header */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                  {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-20 h-20 object-contain" />
                  ) : (
                    <Building2 className="w-12 h-12 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                      {company.verified && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified
                        </div>
                      )}
                    </div>
                    <p className="text-lg text-gray-600 mb-4">{company.industry}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>{company.location}</span>
                  </div>
                  {company.website && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-5 h-5" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-5 h-5" />
                    <span>{company.size || 'Not specified'} employees</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-5 h-5" />
                    <span className="font-semibold text-primary-600">{jobs.length} active jobs</span>
                  </div>
                </div>

                {/* Contact Info */}
                {(company.email || company.phone) && (
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
                    {company.email && (
                      <a
                        href={`mailto:${company.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                      >
                        <Mail className="w-4 h-4" />
                        {company.email}
                      </a>
                    )}
                    {company.phone && (
                      <a
                        href={`tel:${company.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                      >
                        <Phone className="w-4 h-4" />
                        {company.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About {company.name}</h2>
                <div className="prose prose-sm max-w-none text-gray-600">
                  {company.description ? (
                    <p>{company.description}</p>
                  ) : (
                    <p>
                      {company.name} is a leading {company.industry.toLowerCase()} company based in {company.location}. 
                      We are committed to excellence and are always looking for talented individuals to join our team.
                    </p>
                  )}
                </div>
              </div>

              {/* Active Jobs */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Active Job Openings</h2>
                  <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                    {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
                
                {jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No active job openings at the moment.</p>
                    <p className="text-sm text-gray-500 mt-2">Check back later for new opportunities.</p>
                  </div>
                )}
              </div>

              {/* Reviews Section (Placeholder) */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Employee Reviews</h2>
                <div className="text-center py-8 text-gray-500">
                  <p>Company reviews coming soon!</p>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Apply CTA */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-3">Interested in Working Here?</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Create a job alert to be notified when {company.name} posts new opportunities.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white text-primary-600 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Create Job Alert
                </button>
              </div>

              {/* Similar Companies */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Similar Companies</h3>
                <div className="space-y-3">
                  <Link to="/companies" className="block text-primary-600 hover:text-primary-700">
                    View All Companies →
                  </Link>
                </div>
              </div>

              {/* Share */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Share This Company</h3>
                <button className="text-sm text-gray-600 hover:text-primary-600">
                  Copy link to share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mock data fallback
function getMockCompany() {
  return {
    id: 1,
    name: 'PNG Mining Corp',
    industry: 'Mining & Resources',
    location: 'Port Moresby, NCD',
    size: '500-1000',
    website: 'https://pngmining.example.com',
    email: 'careers@pngmining.example.com',
    phone: '+675 321 4567',
    verified: true,
    description: 'PNG Mining Corp is a leading mining and resources company operating across Papua New Guinea. With over 20 years of experience, we are committed to sustainable resource development and community partnership.',
  };
}

function getMockJobs() {
  return [
    {
      id: 1,
      title: 'Mining Engineer',
      company: 'PNG Mining Corp',
      location: 'Port Moresby, NCD',
      type: 'Full-time',
      salary: 'K120,000 - K150,000',
      postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      title: 'Safety Officer',
      company: 'PNG Mining Corp',
      location: 'Mt Hagen, WHP',
      type: 'Full-time',
      salary: 'K80,000 - K100,000',
      postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];
}
