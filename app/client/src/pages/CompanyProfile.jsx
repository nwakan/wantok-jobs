import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building2, MapPin, Globe, Users, CheckCircle2, Briefcase, Mail, Phone,
  Star, ThumbsUp, ThumbsDown, TrendingUp, Award, Calendar, Image as ImageIcon,
  Gift, MessageSquare, ChevronDown, Filter, Eye
} from 'lucide-react';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/SkeletonLoader';
import api from '../api';
import OptimizedImage from '../components/OptimizedImage';

export default function CompanyProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [interviewStats, setInterviewStats] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [benefits, setBenefits] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewSort, setReviewSort] = useState('newest');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimEvidence, setClaimEvidence] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    else if (activeTab === 'interviews') fetchInterviews();
    else if (activeTab === 'photos') fetchPhotos();
    else if (activeTab === 'benefits') fetchBenefits();
  }, [activeTab, reviewSort]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const [companyRes, jobsRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/jobs?companyId=${id}`),
      ]);
      setCompany(companyRes.data.company || companyRes.data);
      setJobs(jobsRes.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch company data:', error);
      alert('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/companies/${id}/reviews?sort=${reviewSort}`);
      setReviews(res.data.reviews || []);
      setReviewStats(res.data.stats || null);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchInterviews = async () => {
    try {
      const res = await api.get(`/reviews/companies/${id}/interviews`);
      setInterviews(res.data.interviews || []);
      setInterviewStats(res.data.stats || null);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const res = await api.get(`/reviews/companies/${id}/photos`);
      setPhotos(res.data.photos || []);
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  };

  const fetchBenefits = async () => {
    try {
      const res = await api.get(`/reviews/companies/${id}/benefits`);
      setBenefits(res.data.benefits || {});
    } catch (error) {
      console.error('Failed to fetch benefits:', error);
    }
  };

  const handleHelpful = async (reviewId, helpful) => {
    try {
      await api.post(`/reviews/reviews/${reviewId}/helpful`, { helpful });
      alert('Thank you for your feedback!');
      fetchReviews(); // Refresh to show updated counts
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to record vote');
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
        title={company.name || company.company_display_name}
        description={`${company.name || company.company_display_name} - ${company.industry} company hiring in ${company.location}. View jobs, reviews, and company profile on WantokJobs.`}
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
                    <OptimizedImage src={company.logo} alt={company.name} width={80} height={80} className="w-20 h-20 object-contain" eager />
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
                      <h1 className="text-3xl font-bold text-gray-900">{company.name || company.company_display_name}</h1>
                      {!!company.verified && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Verified
                        </div>
                      )}
                      {!!company.is_agency_managed && company.managed_by_agency && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          <Users className="w-4 h-4" />
                          Managed by {company.managed_by_agency}
                        </div>
                      )}
                    </div>
                    <p className="text-lg text-gray-600 mb-2">{company.industry}</p>
                    
                    {/* Claim button for agency-managed profiles */}
                    {!!company.is_agency_managed && (
                      <button
                        onClick={() => setShowClaimModal(true)}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-800 underline"
                      >
                        Is this your company? Claim it →
                      </button>
                    )}
                    
                    {/* Rating Summary */}
                    {reviewStats && reviewStats.total_reviews > 0 && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-2xl font-bold text-gray-900">
                            {reviewStats.average_rating?.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-gray-600">
                          {reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                    )}
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
                    <span>{company.size || company.company_size || 'Not specified'} employees</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Briefcase className="w-5 h-5" />
                    <span className="font-semibold text-primary-600">{jobs.length} active jobs</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
                  >
                    Write a Review
                  </button>
                  <button
                    onClick={() => setShowInterviewModal(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Share Interview Experience
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {['overview', 'reviews', 'interviews', 'benefits', 'photos', 'jobs'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === tab
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {activeTab === 'overview' && <OverviewTab company={company} reviewStats={reviewStats} />}
              {activeTab === 'reviews' && (
                <ReviewsTab 
                  reviews={reviews} 
                  reviewStats={reviewStats} 
                  reviewSort={reviewSort}
                  setReviewSort={setReviewSort}
                  handleHelpful={handleHelpful}
                />
              )}
              {activeTab === 'interviews' && (
                <InterviewsTab interviews={interviews} interviewStats={interviewStats} />
              )}
              {activeTab === 'benefits' && <BenefitsTab benefits={benefits} />}
              {activeTab === 'photos' && <PhotosTab photos={photos} />}
              {activeTab === 'jobs' && <JobsTab jobs={jobs} company={company} />}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* CEO Approval & Recommend Stats */}
              {reviewStats && reviewStats.total_reviews > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Ratings Breakdown</h3>
                  
                  {/* CEO Approval */}
                  {reviewStats.ceo_approval?.total_responses > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">CEO Approval</span>
                        <span className="text-lg font-bold text-gray-900">
                          {Math.round((reviewStats.ceo_approval.approve_count / reviewStats.ceo_approval.total_responses) * 100)}%
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-600">
                        <span className="text-green-600">
                          ✓ {reviewStats.ceo_approval.approve_count} Approve
                        </span>
                        <span className="text-red-600">
                          ✗ {reviewStats.ceo_approval.disapprove_count} Disapprove
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recommend to Friend */}
                  {reviewStats.recommend_to_friend?.total_responses > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Recommend to Friend</span>
                        <span className="text-lg font-bold text-gray-900">
                          {Math.round((reviewStats.recommend_to_friend.recommend_count / reviewStats.recommend_to_friend.total_responses) * 100)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {reviewStats.recommend_to_friend.recommend_count} out of {reviewStats.recommend_to_friend.total_responses} would recommend
                      </div>
                    </div>
                  )}

                  {/* Category Ratings */}
                  {reviewStats.avg_work_life_balance > 0 && (
                    <div className="space-y-2 mt-4">
                      <CategoryRating label="Work-Life Balance" rating={reviewStats.avg_work_life_balance} />
                      <CategoryRating label="Culture & Values" rating={reviewStats.avg_culture_values} />
                      <CategoryRating label="Career Opportunities" rating={reviewStats.avg_career_opportunities} />
                      <CategoryRating label="Compensation & Benefits" rating={reviewStats.avg_compensation_benefits} />
                      <CategoryRating label="Senior Management" rating={reviewStats.avg_senior_management} />
                    </div>
                  )}
                </div>
              )}

              {/* Quick Apply CTA */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-3">Interested in Working Here?</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Create a job alert to be notified when {company.name || company.company_display_name} posts new opportunities.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white text-primary-600 py-2 px-4 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Create Job Alert
                </button>
              </div>

              {/* Share */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Share This Company</h3>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Copy link to share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal (placeholder) */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Write a Review</h2>
            <p className="text-gray-600 mb-4">Review submission form coming soon!</p>
            <button
              onClick={() => setShowReviewModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Interview Modal (placeholder) */}
      {showInterviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Share Interview Experience</h2>
            <p className="text-gray-600 mb-4">Interview submission form coming soon!</p>
            <button
              onClick={() => setShowInterviewModal(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Claim Company Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Claim This Company</h2>
            <p className="text-sm text-gray-600 mb-4">
              If you own or represent <strong>{company?.company_name || company?.name}</strong>, submit a claim and our team will verify your ownership.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Evidence / Notes</label>
              <textarea
                rows={4}
                value={claimEvidence}
                onChange={e => setClaimEvidence(e.target.value)}
                placeholder="Describe your relationship to this company. Attach business registration details, company email, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">You must be logged in as an employer to submit a claim.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowClaimModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                disabled={claimSubmitting}
                onClick={async () => {
                  setClaimSubmitting(true);
                  try {
                    const token = localStorage.getItem('token');
                    if (!token) { alert('Please log in first'); return; }
                    const res = await fetch((import.meta.env.PROD ? '' : 'http://localhost:3001') + '/api/claims', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ client_profile_id: Number(id), evidence: claimEvidence }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    alert('Claim submitted! Our team will review it and get back to you.');
                    setShowClaimModal(false);
                    setClaimEvidence('');
                  } catch (e) { alert(e.message || 'Failed to submit claim'); }
                  finally { setClaimSubmitting(false); }
                }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {claimSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Category Rating Component (Glassdoor-style)
function CategoryRating({ label, rating }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{rating.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary-600 h-2 rounded-full" 
          style={{ width: `${(rating / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ company, reviewStats }) {
  return (
    <div className="space-y-6">
      {/* About Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About {company.name || company.company_display_name}</h2>
        <div className="prose prose-sm max-w-none text-gray-600">
          {company.description || company.bio ? (
            <p>{company.description || company.bio}</p>
          ) : (
            <p>
              {company.name || company.company_display_name} is a leading {company.industry?.toLowerCase()} company based in {company.location}. 
              We are committed to excellence and are always looking for talented individuals to join our team.
            </p>
          )}
        </div>
      </div>

      {/* Rating Snapshot */}
      {reviewStats && reviewStats.total_reviews > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rating Snapshot</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  <span className="text-4xl font-bold text-gray-900">
                    {reviewStats.average_rating?.toFixed(1)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{reviewStats.total_reviews} reviews</div>
                  <Link to="#" onClick={() => {}} className="text-sm text-primary-600 hover:text-primary-700">
                    Read reviews
                  </Link>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(stars => {
                const count = reviewStats[`${['one', 'two', 'three', 'four', 'five'][stars - 1]}_star`] || 0;
                const percent = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-12">{stars} stars</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-yellow-400 h-3 rounded-full" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reviews Tab
function ReviewsTab({ reviews, reviewStats, reviewSort, setReviewSort, handleHelpful }) {
  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
          </div>
          <select
            value={reviewSort}
            onChange={(e) => setReviewSort(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} handleHelpful={handleHelpful} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No reviews yet. Be the first to review this company!</p>
        </div>
      )}
    </div>
  );
}

// Review Card Component (Glassdoor-style)
function ReviewCard({ review, handleHelpful }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            {review.verified_employee === 1 && (
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                Verified Employee
              </span>
            )}
          </div>
          <h3 className="font-bold text-gray-900">{review.title || 'Review'}</h3>
          <div className="text-sm text-gray-500 mt-1">
            {review.job_title && <span className="font-medium">{review.job_title}</span>}
            {review.job_title && review.work_location && <span> • </span>}
            {review.work_location && <span>{review.work_location}</span>}
            {review.years_worked && (
              <span className="ml-2 text-gray-400">({review.years_worked})</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(review.created_at).toLocaleDateString()} • 
            {review.is_current_employee ? ' Current Employee' : ' Former Employee'}
          </div>
        </div>
      </div>

      {/* Category Ratings */}
      {review.work_life_balance > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
          {review.work_life_balance > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-600">Work-Life:</span>
              <span className="font-semibold">{review.work_life_balance}</span>
            </div>
          )}
          {review.culture_values > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-600">Culture:</span>
              <span className="font-semibold">{review.culture_values}</span>
            </div>
          )}
          {review.career_opportunities > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-600">Career:</span>
              <span className="font-semibold">{review.career_opportunities}</span>
            </div>
          )}
        </div>
      )}

      {/* Pros/Cons */}
      <div className="space-y-3 mb-4">
        {review.pros && (
          <div>
            <span className="text-sm font-semibold text-green-700">Pros:</span>
            <p className="text-gray-700 mt-1">{review.pros}</p>
          </div>
        )}
        {review.cons && (
          <div>
            <span className="text-sm font-semibold text-red-700">Cons:</span>
            <p className="text-gray-700 mt-1">{review.cons}</p>
          </div>
        )}
        {review.advice && (
          <div>
            <span className="text-sm font-semibold text-blue-700">Advice to Management:</span>
            <p className="text-gray-700 mt-1">{review.advice}</p>
          </div>
        )}
      </div>

      {/* Helpfulness */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">Was this review helpful?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleHelpful(review.id, 1)}
            className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{review.helpful_count || 0}</span>
          </button>
          <button
            onClick={() => handleHelpful(review.id, -1)}
            className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>{review.not_helpful_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Interviews Tab
function InterviewsTab({ interviews, interviewStats }) {
  return (
    <div className="space-y-6">
      {/* Interview Stats Summary */}
      {interviewStats && interviewStats.total_interviews > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Interview Statistics</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {interviewStats.avg_difficulty?.toFixed(1)}/5
              </div>
              <div className="text-sm text-gray-600">Average Difficulty</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((interviewStats.positive_count / interviewStats.total_interviews) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Positive Experience</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((interviewStats.got_offer_count / interviewStats.total_interviews) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Got Offer</div>
            </div>
          </div>
        </div>
      )}

      {/* Interviews List */}
      {interviews.length > 0 ? (
        <div className="space-y-4">
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{interview.job_title || 'Interview Experience'}</h4>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  interview.interview_experience === 'positive' ? 'bg-green-100 text-green-700' :
                  interview.interview_experience === 'negative' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {interview.interview_experience}
                </span>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Difficulty:</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${i < interview.interview_difficulty ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                {interview.got_offer === 1 && (
                  <div className="text-sm text-green-600 font-medium">✓ Received Job Offer</div>
                )}
              </div>

              {interview.interview_process && (
                <div className="mb-3">
                  <span className="text-sm font-semibold text-gray-700">Interview Process:</span>
                  <p className="text-gray-600 mt-1 text-sm">{interview.interview_process}</p>
                </div>
              )}

              {interview.interview_questions && (
                <div>
                  <span className="text-sm font-semibold text-gray-700">Interview Questions:</span>
                  <p className="text-gray-600 mt-1 text-sm">{interview.interview_questions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No interview experiences yet. Share yours to help others!</p>
        </div>
      )}
    </div>
  );
}

// Benefits Tab
function BenefitsTab({ benefits }) {
  const benefitCategories = Object.keys(benefits);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefits & Perks</h2>
      
      {benefitCategories.length > 0 ? (
        <div className="space-y-6">
          {benefitCategories.map((category) => (
            <div key={category}>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary-600" />
                {category}
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {benefits[category].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p>No benefits information available yet.</p>
        </div>
      )}
    </div>
  );
}

// Photos Tab
function PhotosTab({ photos }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Photos</h2>
      
      {photos.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <OptimizedImage 
                src={photo.photo_url} 
                alt={photo.caption || 'Company photo'} 
                width={400} height={192}
                className="w-full h-48 object-cover rounded-lg"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                  <p className="text-white text-sm">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p>No photos available yet.</p>
        </div>
      )}
    </div>
  );
}

// Jobs Tab
function JobsTab({ jobs, company }) {
  return (
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
  );
}
