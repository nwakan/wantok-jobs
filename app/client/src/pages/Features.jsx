import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const statusColors = {
  submitted: 'bg-gray-100 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  planned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
};

const statusLabels = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined',
};

const categoryLabels = {
  general: 'General',
  jobs: 'Jobs',
  employers: 'Employers',
  jobseekers: 'Jobseekers',
  transparency: 'Transparency',
  mobile: 'Mobile',
  other: 'Other',
};

export default function Features() {
  const toast = useToast();
  const { user, token } = useAuth();
  const [features, setFeatures] = useState([]);
  const [stats, setStats] = useState({ total: 0, planned: 0, inProgress: 0, completed: 0, yourVotes: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('votes');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
  });

  useEffect(() => {
    loadFeatures();
    loadStats();
  }, [filter, categoryFilter, sortBy, token]);

  const loadFeatures = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('sort', sortBy);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/features?${params}`, { headers });
      if (!res.ok) throw new Error('Failed');
      setFeatures(await res.json());
    } catch (error) {
      console.error('Failed to load features:', error);
      toast.error('Failed to load feature requests');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/api/features/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleVote = async (featureId) => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/features/${featureId}/vote`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to vote');
      toast.success(data.message);
      loadFeatures();
      loadStats();
    } catch (error) {
      toast.error(error.message || 'Failed to vote');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a feature request');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/features`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to submit'); }
      toast.success('Feature request submitted!');
      setShowSubmitForm(false);
      setFormData({ title: '', description: '', category: 'general' });
      loadFeatures();
      loadStats();
    } catch (error) {
      toast.error(error.message || 'Failed to submit feature request');
    }
  };

  const loadComments = async (featureId) => {
    try {
      const res = await fetch(`${API_URL}/api/features/${featureId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/features/${selectedFeature.id}/comment`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to add comment'); }
      toast.success('Comment added!');
      setNewComment('');
      loadComments(selectedFeature.id);
      loadFeatures();
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    }
  };

  const openDetail = (feature) => {
    setSelectedFeature(feature);
    loadComments(feature.id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Feature Requests</h1>
        <p className="text-gray-600">
          Share your ideas and vote on features you'd like to see in WantokJobs!
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.planned}</div>
          <div className="text-sm text-gray-600">Planned</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        {user && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-primary-600">{stats.yourVotes}</div>
            <div className="text-sm text-gray-600">Your Votes</div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowSubmitForm(!showSubmitForm)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-semibold"
        >
          {showSubmitForm ? 'Cancel' : '+ Submit a Request'}
        </button>
      </div>

      {/* Submit Form */}
      {showSubmitForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Submit a Feature Request</h2>
          {!user ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">You need to be logged in to submit a request</p>
              <Link to="/login" className="text-primary-600 hover:underline">Log in</Link>
              {' or '}
              <Link to="/register" className="text-primary-600 hover:underline">Sign up</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Short, clear title for your request"
                  required
                  minLength={5}
                  maxLength={200}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your idea in detail..."
                  rows={5}
                  required
                  minLength={20}
                  maxLength={2000}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                Submit Request
              </button>
            </form>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('submitted')}
                className={`px-3 py-1 rounded-full text-sm ${filter === 'submitted' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Most Voted
              </button>
              <button
                onClick={() => setFilter('planned')}
                className={`px-3 py-1 rounded-full text-sm ${filter === 'planned' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Planned
              </button>
              <button
                onClick={() => setFilter('in_progress')}
                className={`px-3 py-1 rounded-full text-sm ${filter === 'in_progress' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                In Progress
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-full text-sm ${filter === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="votes">Most Voted</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feature List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : features.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No feature requests found with the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-6 cursor-pointer"
              onClick={() => openDetail(feature)}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Vote Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote(feature.id);
                  }}
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition ${
                    feature.user_voted
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  <span className="text-xs font-bold mt-1">{feature.vote_count}</span>
                </button>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {feature.title}
                    </h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[feature.status]}`}>
                        {statusLabels[feature.status]}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {categoryLabels[feature.category]}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{feature.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Submitted by {feature.submitter_name}</span>
                    <span>•</span>
                    <span>{new Date(feature.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{feature.comment_count} comments</span>
                  </div>
                  {feature.considered && (
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      🔥 Considered for implementation!
                    </div>
                  )}
                  {feature.admin_response && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs font-semibold text-blue-900 mb-1">Admin Response:</div>
                      <p className="text-sm text-blue-800">{feature.admin_response}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedFeature(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedFeature.title}</h2>
                <button onClick={() => setSelectedFeature(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[selectedFeature.status]}`}>
                  {statusLabels[selectedFeature.status]}
                </span>
                <span className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700">
                  {categoryLabels[selectedFeature.category]}
                </span>
              </div>

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{selectedFeature.description}</p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span>Submitted by {selectedFeature.submitter_name}</span>
                <span>•</span>
                <span>{new Date(selectedFeature.created_at).toLocaleDateString()}</span>
              </div>

              <button
                onClick={() => handleVote(selectedFeature.id)}
                className={`mb-6 px-6 py-2 rounded-lg transition flex items-center gap-2 ${
                  selectedFeature.user_voted
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                {selectedFeature.user_voted ? 'Unvote' : 'Vote'} ({selectedFeature.vote_count})
              </button>

              {selectedFeature.admin_response && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900 mb-2">Admin Response:</div>
                  <p className="text-blue-800">{selectedFeature.admin_response}</p>
                </div>
              )}

              {/* Comments */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Comments ({comments.length})</h3>

                {user && (
                  <form onSubmit={handleCommentSubmit} className="mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-2"
                      placeholder="Add a comment..."
                      rows={3}
                      required
                      minLength={3}
                      maxLength={1000}
                    />
                    <button
                      type="submit"
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                    >
                      Post Comment
                    </button>
                  </form>
                )}

                {!user && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                    <Link to="/login" className="text-primary-600 hover:underline">Log in</Link>
                    {' to comment'}
                  </div>
                )}

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <span className="font-semibold">{comment.commenter_name}</span>
                        <span>•</span>
                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No comments yet. Be the first!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
