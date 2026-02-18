import { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const f = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' }).then(r => r.json());

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function PostPreview({ post, onEdit, onPublish, onDelete }) {
  const platformIcons = {
    facebook: '📘',
    twitter: '🐦',
    linkedin: '💼',
    whatsapp: '💬',
  };
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    published: 'bg-blue-100 text-blue-800',
  };
  
  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{platformIcons[post.platform]}</span>
          <div>
            <p className="font-semibold text-gray-900 capitalize">{post.platform}</p>
            <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[post.status]}`}>
          {post.status}
        </span>
      </div>
      
      <div className="text-sm text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
        {post.content}
      </div>
      
      {post.report_type && (
        <div className="text-xs text-gray-500 mb-2">
          📊 {post.report_type.replace(/_/g, ' ')}
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(post)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          ✏️ Edit
        </button>
        {post.status !== 'published' && (
          <button
            onClick={() => onPublish(post.id)}
            className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
          >
            ✅ Publish
          </button>
        )}
        <button
          onClick={() => onDelete(post.id)}
          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

function EditModal({ post, onClose, onSave }) {
  const [content, setContent] = useState(post?.content || '');
  const [status, setStatus] = useState(post?.status || 'pending');
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(post.id, { content, status });
      onClose();
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
    setSaving(false);
  };
  
  if (!post) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Platform</label>
            <p className="text-gray-600 capitalize">{post.platform}</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="published">Published</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              rows={12}
            />
            <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketing() {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingPost, setEditingPost] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, postsRes] = await Promise.all([
        f(`${API_BASE}/api/marketing/stats`),
        f(`${API_BASE}/api/marketing/posts?limit=50`),
      ]);
      setStats(statsRes.stats);
      setPosts(postsRes.posts);
    } catch (error) {
      console.error('Failed to fetch marketing data:', error);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleEdit = (post) => {
    setEditingPost(post);
  };
  
  const handleSave = async (id, updates) => {
    await f(`${API_BASE}/api/marketing/posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    fetchData();
  };
  
  const handlePublish = async (id) => {
    if (confirm('Publish this post?')) {
      await f(`${API_BASE}/api/marketing/posts/${id}/publish`, { method: 'POST' });
      fetchData();
    }
  };
  
  const handleDelete = async (id) => {
    if (confirm('Delete this post?')) {
      await f(`${API_BASE}/api/marketing/posts/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };
  
  const handleRunAgent = async (agent) => {
    if (confirm(`Run ${agent} agent now? This will generate new content.`)) {
      try {
        await f(`${API_BASE}/api/marketing/run/${agent}`, { method: 'POST' });
        alert(`${agent} agent started! Refresh in a moment to see new posts.`);
        setTimeout(fetchData, 3000);
      } catch (error) {
        alert('Failed to run agent: ' + error.message);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  const filteredPosts = posts.filter(p => {
    if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📢 Marketing Dashboard</h1>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>
      
      {/* Stats Overview */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">This Week</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Posts Generated" value={stats?.posts_this_week || 0} icon="📝" color="blue" />
          <StatCard title="Whispers Sent" value={stats?.whispers_sent || 0} icon="💬" color="green" />
          <StatCard title="Whispers Pending" value={stats?.whispers_pending || 0} icon="⏳" color="orange" />
          <StatCard title="Stories Collected" value={stats?.stories_collected || 0} icon="🎉" color="purple" />
        </div>
      </div>
      
      {/* Posts by Platform */}
      {stats?.posts_by_platform && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Posts by Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['facebook', 'twitter', 'linkedin', 'whatsapp'].map(platform => {
              const count = stats.posts_by_platform
                .filter(p => p.platform === platform)
                .reduce((sum, p) => sum + p.count, 0);
              return (
                <div key={platform} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 capitalize mb-1">{platform}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Run Agents */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🚀 Marketing Agents</h2>
        <p className="text-sm text-gray-600 mb-4">
          Manually trigger marketing agents to generate new content. These normally run on schedule.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => handleRunAgent('insider')}
            className="px-4 py-3 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-center text-sm"
          >
            📢 The Insider<br/><span className="text-xs font-normal">(Job Posts)</span>
          </button>
          <button
            onClick={() => handleRunAgent('market-reporter')}
            className="px-4 py-3 bg-green-50 text-green-700 font-semibold rounded-lg hover:bg-green-100 transition-colors text-center text-sm"
          >
            📊 Market Reporter<br/><span className="text-xs font-normal">(Weekly Stats)</span>
          </button>
          <button
            onClick={() => handleRunAgent('whisper')}
            className="px-4 py-3 bg-purple-50 text-purple-700 font-semibold rounded-lg hover:bg-purple-100 transition-colors text-center text-sm"
          >
            🤫 Whisper<br/><span className="text-xs font-normal">(Job Alerts)</span>
          </button>
          <button
            onClick={() => handleRunAgent('success-stories')}
            className="px-4 py-3 bg-orange-50 text-orange-700 font-semibold rounded-lg hover:bg-orange-100 transition-colors text-center text-sm"
          >
            📻 Success Stories<br/><span className="text-xs font-normal">(Collect Stories)</span>
          </button>
          <button
            onClick={() => handleRunAgent('scorecard')}
            className="px-4 py-3 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition-colors text-center text-sm"
          >
            🏛️ Scorecard<br/><span className="text-xs font-normal">(Gov Transparency)</span>
          </button>
        </div>
      </div>
      
      {/* Posts List */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">📝 Marketing Posts</h2>
          <div className="flex gap-2">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="border rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">Twitter</option>
              <option value="linkedin">LinkedIn</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        
        {filteredPosts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No posts found. Try running one of the marketing agents above!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map(post => (
              <PostPreview
                key={post.id}
                post={post}
                onEdit={handleEdit}
                onPublish={handlePublish}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      {editingPost && (
        <EditModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
