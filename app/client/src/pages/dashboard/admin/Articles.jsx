import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'news',
    status: 'draft',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = () => {
    // Placeholder data
    setArticles([
      {
        id: 1,
        title: 'Top 10 Skills Employers Look For in 2024',
        excerpt: 'Discover the most in-demand skills...',
        category: 'career-advice',
        status: 'published',
        views: 2543,
        created_at: '2024-01-15',
        author: 'Admin',
      },
      {
        id: 2,
        title: 'How to Write a Resume That Gets Noticed',
        excerpt: 'Learn the secrets to crafting an effective resume...',
        category: 'career-advice',
        status: 'published',
        views: 1876,
        created_at: '2024-01-20',
        author: 'Admin',
      },
      {
        id: 3,
        title: 'Upcoming Job Fair - Registration Open',
        excerpt: 'Join us for the biggest job fair of the year...',
        category: 'news',
        status: 'draft',
        views: 0,
        created_at: '2024-02-01',
        author: 'Admin',
      },
    ]);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingArticle) {
      showToast('Article updated successfully', 'success');
    } else {
      showToast('Article created successfully', 'success');
    }
    loadArticles();
    resetForm();
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt,
      category: article.category,
      status: article.status,
    });
    setShowForm(true);
  };

  const togglePublish = (id) => {
    setArticles(articles.map(a => 
      a.id === id 
        ? { ...a, status: a.status === 'published' ? 'draft' : 'published' }
        : a
    ));
    showToast('Article status updated', 'success');
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    setArticles(articles.filter(a => a.id !== id));
    showToast('Article deleted successfully', 'success');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'news',
      status: 'draft',
    });
    setEditingArticle(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Article Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : 'New Article'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="news">News</option>
                  <option value="career-advice">Career Advice</option>
                  <option value="industry-trends">Industry Trends</option>
                  <option value="company-news">Company News</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {editingArticle ? 'Update' : 'Create'} Article
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        {articles.map(article => (
          <div key={article.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{article.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{article.excerpt}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="capitalize">{article.category}</span>
                  <span>•</span>
                  <span>{new Date(article.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{article.views} views</span>
                  <span>•</span>
                  <span>By {article.author}</span>
                </div>
              </div>

              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                article.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {article.status}
              </span>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleEdit(article)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => togglePublish(article.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {article.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button
                onClick={() => handleDelete(article.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
