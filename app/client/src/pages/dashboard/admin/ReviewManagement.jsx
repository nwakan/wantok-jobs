import { useState, useEffect } from 'react';
import { Star, CheckCircle, XCircle, Clock } from 'lucide-react';
import { admin as adminAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function ReviewManagement() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReviews(); }, [filter]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getReviews({ status: filter });
      setReviews(data.reviews || []);
      setCounts(data.counts || {});
    } catch (error) {
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await adminAPI.updateReview(id, action);
      showToast(`Review ${action}d successfully`, 'success');
      fetchReviews();
    } catch (error) {
      showToast(`Failed to ${action} review`, 'error');
    }
  };

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
      ))}
    </div>
  );

  const tabs = [
    { key: 'pending', label: 'Pending', count: counts.pending, icon: Clock },
    { key: 'approved', label: 'Approved', count: counts.approved, icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', count: counts.rejected, icon: XCircle },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Review Management</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label} ({count || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No {filter} reviews found.</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && (
                    <h3 className="font-semibold text-gray-900">{review.title}</h3>
                  )}
                  <div className="text-sm text-gray-600">
                    By {review.reviewer_name || 'Unknown'} → {review.company_name || 'Unknown Company'}
                    {review.job_title && ` • ${review.job_title}`}
                    {review.is_current_employee ? ' • Current Employee' : ' • Former Employee'}
                  </div>
                </div>
                {filter === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAction(review.id, 'approve')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(review.id, 'reject')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>

              {review.pros && (
                <div className="text-sm mb-2">
                  <span className="font-medium text-green-700">Pros:</span>{' '}
                  <span className="text-gray-700">{review.pros}</span>
                </div>
              )}
              {review.cons && (
                <div className="text-sm mb-2">
                  <span className="font-medium text-red-700">Cons:</span>{' '}
                  <span className="text-gray-700">{review.cons}</span>
                </div>
              )}
              {review.advice && (
                <div className="text-sm">
                  <span className="font-medium text-blue-700">Advice:</span>{' '}
                  <span className="text-gray-700">{review.advice}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
