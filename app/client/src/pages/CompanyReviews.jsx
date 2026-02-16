import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, Lightbulb, Building2, CheckCircle } from 'lucide-react';
import { reviews as reviewsAPI, companies } from '../api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import PageHead from '../components/PageHead';

export default function CompanyReviews() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [company, setCompany] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    pros: '',
    cons: '',
    advice: '',
    is_current_employee: false,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [companyData, reviewsData] = await Promise.all([
        companies.get(id),
        reviewsAPI.getForCompany(id),
      ]);
      setCompany(companyData);
      setReviews(reviewsData.reviews || []);
      setStats(reviewsData.stats || {});
    } catch (error) {
      showToast(error.message || 'Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please login to submit a review', 'error');
      return;
    }
    try {
      await reviewsAPI.create({
        company_id: parseInt(id),
        ...formData,
      });
      showToast('Review submitted successfully! It will be visible after approval.', 'success');
      setShowForm(false);
      setFormData({
        rating: 5,
        title: '',
        pros: '',
        cons: '',
        advice: '',
        is_current_employee: false,
      });
      // Don't reload immediately since review needs approval
    } catch (error) {
      showToast(error.message || 'Failed to submit review', 'error');
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const renderStarPercentage = (count) => {
    const total = stats?.total_reviews || 1;
    const percentage = ((count || 0) / total) * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-600 w-12 text-right">{count || 0}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Not Found</h2>
        <p className="text-gray-600 mb-6">The company you're looking for doesn't exist.</p>
        <Link to="/companies" className="text-primary-600 hover:text-primary-700 font-semibold">
          Browse Companies
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title={`${company.name} Reviews - WantokJobs`}
        description={`Read employee reviews and ratings for ${company.name}. Learn about company culture, benefits, pros and cons from current and former employees.`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-20 h-20 object-contain rounded border border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
              <Link to={`/companies/${id}`} className="text-primary-600 hover:text-primary-700">
                View Company Profile →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Employee Reviews ({stats?.total_reviews || 0})
                </h2>
                {user && (
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {showForm ? 'Cancel' : 'Write Review'}
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="text-lg font-bold mb-4">Share Your Experience</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Rating *
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating })}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              rating <= formData.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Great place to work"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pros (What you liked) *
                    </label>
                    <textarea
                      value={formData.pros}
                      onChange={(e) => setFormData({ ...formData, pros: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cons (What could be improved) *
                    </label>
                    <textarea
                      value={formData.cons}
                      onChange={(e) => setFormData({ ...formData, cons: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advice to Management
                    </label>
                    <textarea
                      value={formData.advice}
                      onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      rows="2"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="current_employee"
                      checked={formData.is_current_employee}
                      onChange={(e) =>
                        setFormData({ ...formData, is_current_employee: e.target.checked })
                      }
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <label htmlFor="current_employee" className="ml-2 text-sm text-gray-700">
                      I am a current employee
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Submit Review
                  </button>
                </form>
              )}

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                  <p className="text-gray-600 mb-4">Be the first to review {company.name}!</p>
                  {user && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Write a Review
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex gap-1 mb-2">{renderStars(review.rating)}</div>
                          {review.title && (
                            <h3 className="font-semibold text-gray-900 mb-1">{review.title}</h3>
                          )}
                          <div className="text-sm text-gray-600">
                            {review.reviewer_name || 'Anonymous'} •{' '}
                            {review.is_current_employee ? 'Current' : 'Former'} Employee •{' '}
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {review.pros && (
                        <div className="mb-3">
                          <div className="flex items-start gap-2 text-sm">
                            <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">Pros: </span>
                              <span className="text-gray-700">{review.pros}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {review.cons && (
                        <div className="mb-3">
                          <div className="flex items-start gap-2 text-sm">
                            <ThumbsDown className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">Cons: </span>
                              <span className="text-gray-700">{review.cons}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {review.advice && (
                        <div>
                          <div className="flex items-start gap-2 text-sm">
                            <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">Advice to Management: </span>
                              <span className="text-gray-700">{review.advice}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Overall Rating</h3>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  {stats?.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                </div>
                <div className="flex justify-center gap-1 mb-2">
                  {renderStars(Math.round(stats?.average_rating || 0))}
                </div>
                <div className="text-sm text-gray-600">
                  Based on {stats?.total_reviews || 0} review{stats?.total_reviews !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-16">5 stars</span>
                  {renderStarPercentage(stats?.five_star)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-16">4 stars</span>
                  {renderStarPercentage(stats?.four_star)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-16">3 stars</span>
                  {renderStarPercentage(stats?.three_star)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-16">2 stars</span>
                  {renderStarPercentage(stats?.two_star)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 w-16">1 star</span>
                  {renderStarPercentage(stats?.one_star)}
                </div>
              </div>
            </div>

            <div className="bg-primary-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Have you worked here?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Share your experience to help others make informed career decisions.
              </p>
              {user ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Write a Review
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center"
                >
                  Login to Review
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
