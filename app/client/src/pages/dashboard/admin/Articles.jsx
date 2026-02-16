import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';
import { articles as articlesAPI } from '../../../api';

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
    tags: '',
    featured_image: '',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const response = await articlesAPI.getAll();
      setArticles(response.articles || []);
    } catch (error) {
      showToast(error.message || 'Failed to load articles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await articlesAPI.update(editingArticle.id, formData);
        showToast('Article updated successfully', 'success');
      } else {
        await articlesAPI.create(formData);
        showToast('Article created successfully', 'success');
      }
      loadArticles();
      resetForm();
    } catch (error) {
      showToast(error.message || 'Failed to save article', 'error');
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content || '',
      excerpt: article.excerpt || '',
      category: article.category || 'news',
      status: article.status || 'draft',
      tags: article.tags || '',
      featured_image: article.featured_image || '',
    });
    setShowForm(true);
  };

  const togglePublish = async (article) => {
    try {
      const newStatus = article.status === 'published' ? 'draft' : 'published';
      await articlesAPI.update(article.id, { status: newStatus });
      showToast('Article status updated', 'success');
      loadArticles();
    } catch (error) {
      showToast(error.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await articlesAPI.delete(id);
      showToast('Article deleted successfully', 'success');
      loadArticles();
    } catch (error) {
      showToast(error.message || 'Failed to delete article', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: 'news',
      status: 'draft',
      tags: '',
      featured_image: '',
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="2"
                placeholder="Brief summary of the article..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content (Markdown supported)</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="12"
                placeholder="Write your article content here..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Featured Image URL</label>
              <input
                type="url"
                value={formData.featured_image}
                onChange={e => setFormData({ ...formData, featured_image: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="news">News</option>
                  <option value="career-advice">Career Advice</option>
                  <option value="industry-trends">Industry Trends</option>
                  <option value="company-news">Company News</option>
                  <option value="tips">Tips & Guides</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="job search, cv tips, interview"
              />
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
        {articles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No articles yet. Create your first article!</p>
          </div>
        ) : (
          articles.map(article => (
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
                    <span>{article.views || 0} views</span>
                    <span>•</span>
                    <span>By {article.author_name || 'Admin'}</span>
                  </div>
                </div>

                <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-4 ${
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => togglePublish(article)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  {article.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
