import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, MapPin, Globe, Users, CheckCircle2, Briefcase, Phone, 
  Star, TrendingUp, Calendar, Share2, ExternalLink, Shield, ChevronRight,
  Copy, MessageCircle, Award, Clock, DollarSign, Home
} from 'lucide-react';
import PageHead from '../components/PageHead';
import { getFlag } from '../utils/countryFlags';
import JobCard from '../components/JobCard';
import OptimizedImage from '../components/OptimizedImage';
import api from '../api';

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  // JSON-LD structured data for Google
  useEffect(() => {
    if (!data?.company) return;
    
    const company = data.company;
    const avgRating = data.average_rating || 0;
    const reviewCount = data.review_count || 0;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": ["Organization", "LocalBusiness"],
      "name": company.company_name || company.name,
      "url": window.location.href,
      ...(company.description && { "description": company.description }),
      ...(company.logo_url && { "logo": company.logo_url, "image": company.logo_url }),
      ...(company.website && { "sameAs": company.website }),
      ...(company.phone && { "telephone": company.phone }),
      ...(company.email && { "email": company.email }),
      ...(company.founded_year && { "foundingDate": company.founded_year.toString() }),
      "address": {
        "@type": "PostalAddress",
        "addressLocality": company.location || 'Papua New Guinea',
        "addressCountry": company.country || "PG"
      },
      ...(avgRating > 0 && {
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": avgRating.toFixed(1),
          "reviewCount": reviewCount
        }
      })
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    script.id = 'company-structured-data';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('company-structured-data');
      if (existing) existing.remove();
    };
  }, [data]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/companies/${id}`);
      setData(response);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const company = data.company;
    const text = `Check out ${company.company_name || company.name} on WantokJobs: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getGoogleMapsDirectionsUrl = () => {
    const company = data.company;
    const query = encodeURIComponent([company.location, company.country].filter(Boolean).join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6 animate-pulse">
            <div className="h-24 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Company Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The company you're looking for doesn't exist or has been removed.</p>
          <Link to="/companies" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            ← Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  const { company, jobs = [], stats = {}, reviews = [], average_rating = 0, review_count = 0, related_companies = [] } = data;
  const companyName = company.company_name || company.name;

  return (
    <>
      <PageHead
        title={`${companyName} - Company Profile | WantokJobs`}
        description={`${companyName} - ${company.industry || 'Employer'} in ${company.location || 'Papua New Guinea'}. ${stats.active_jobs || 0} active jobs. View company profile, jobs, and reviews.`}
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/companies" className="hover:text-primary-600 dark:hover:text-primary-400">Companies</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">{companyName}</span>
          </nav>

          {/* Hero Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Company Logo */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  {company.logo_url ? (
                    <OptimizedImage 
                      src={company.logo_url} 
                      alt={companyName} 
                      width={128} 
                      height={128} 
                      className="w-full h-full object-contain rounded-xl" 
                      eager 
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{companyName}</h1>
                      {!!company.verified && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified
                        </span>
                      )}
                    </div>
                    
                    {company.industry && (
                      <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{company.industry}</p>
                    )}

                    {/* Rating */}
                    {review_count > 0 && (
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {average_rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {review_count} {review_count === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    )}

                    {/* Transparency Badge */}
                    {company.transparency_required && company.transparency_score > 0 && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Transparency Score: {company.transparency_score}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      title="Copy link"
                    >
                      {copySuccess ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={handleWhatsAppShare}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      title="Share on WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => navigate(`/share?url=${encodeURIComponent(window.location.href)}`)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                      title="More share options"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quick Info Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {company.location && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <span className="flex-shrink-0">{getFlag(company)}</span>
                      <span className="text-sm truncate">{company.location}{company.country && `, ${company.country}`}</span>
                    </div>
                  )}
                  {company.company_size && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Users className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm">{company.company_size} employees</span>
                    </div>
                  )}
                  {company.founded_year && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm">Founded {company.founded_year}</span>
                    </div>
                  )}
                  {company.employer_type && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Award className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm capitalize">{company.employer_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Globe className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline truncate"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <a href={`tel:${company.phone}`} className="text-sm hover:text-primary-600 dark:hover:text-primary-400">
                        {company.phone}
                      </a>
                    </div>
                  )}
                  {stats.active_jobs > 0 && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <Briefcase className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {stats.active_jobs} active {stats.active_jobs === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Claim Profile Button */}
                {!company.claimed && (
                  <button
                    onClick={() => navigate(`/employers/${id}/claim`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-200 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition text-sm font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    Is this your company? Claim this profile
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">About {companyName}</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                  {company.description || company.bio ? (
                    <p>{company.description || company.bio}</p>
                  ) : (
                    <p>
                      {companyName} is a {company.industry?.toLowerCase() || 'leading'} company based in {company.location || 'Papua New Guinea'}. 
                      We are committed to excellence and are always looking for talented individuals to join our team.
                    </p>
                  )}
                </div>
              </div>

              {/* Google Maps Section */}
              {company.map_embed_url && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Location</h2>
                    <a
                      href={getGoogleMapsDirectionsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Get Directions
                    </a>
                  </div>
                  <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <iframe
                      src={company.map_embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map showing ${companyName} location`}
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Active Jobs */}
              {jobs.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Active Jobs</h2>
                    <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium">
                      {jobs.length} {jobs.length === 1 ? 'opening' : 'openings'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {jobs.slice(0, 5).map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                  {jobs.length > 5 && (
                    <Link
                      to={`/jobs?company=${id}`}
                      className="mt-4 block text-center text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      View all {jobs.length} jobs →
                    </Link>
                  )}
                </div>
              )}

              {/* Reviews Section */}
              {reviews.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Employee Reviews</h2>
                  <div className="space-y-6">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                  />
                                ))}
                              </div>
                              {review.verified_employee === 1 && (
                                <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{review.title || 'Review'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {review.job_title} • {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {review.review_text && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{review.review_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {reviews.length > 3 && (
                    <button className="mt-4 text-primary-600 dark:text-primary-400 hover:underline font-medium">
                      View all {review_count} reviews →
                    </button>
                  )}
                </div>
              )}

              {/* Related Companies */}
              {related_companies.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Similar Companies</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Other companies in {company.industry}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {related_companies.map((relatedCompany) => (
                      <button
                        key={relatedCompany.id}
                        onClick={() => navigate(`/companies/${relatedCompany.id}`)}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            {relatedCompany.logo_url ? (
                              <OptimizedImage 
                                src={relatedCompany.logo_url} 
                                alt={relatedCompany.company_name} 
                                width={48} 
                                height={48} 
                                className="w-10 h-10 object-contain rounded" 
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition truncate">
                                {relatedCompany.company_name}
                              </h3>
                              {!!relatedCompany.verified && (
                                <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{relatedCompany.location}</p>
                            {relatedCompany.active_jobs_count > 0 && (
                              <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                {relatedCompany.active_jobs_count} active {relatedCompany.active_jobs_count === 1 ? 'job' : 'jobs'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Company Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Company Statistics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Jobs</span>
                      <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.active_jobs || 0}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${Math.min(100, (stats.active_jobs || 0) * 10)}%` }}></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Total Jobs Posted</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.total_jobs || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Applications</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.total_applications || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA - Job Alert */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">Interested in Working Here?</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Get notified when {companyName} posts new job openings.
                </p>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full bg-white text-primary-600 py-2.5 px-4 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Create Job Alert
                </button>
              </div>

              {/* Quick Links */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                  {(company.location || company.country) && (
                    <a
                      href={getGoogleMapsDirectionsUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      <MapPin className="w-4 h-4" />
                      Get Directions
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/jobs?company=${id}`)}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition w-full text-left"
                  >
                    <Briefcase className="w-4 h-4" />
                    View All Jobs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
