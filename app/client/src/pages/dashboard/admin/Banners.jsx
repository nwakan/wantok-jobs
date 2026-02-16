import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';
import { banners as bannersAPI } from '../../../api';

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link_url: '',
    placement: 'homepage',
    start_date: '',
    end_date: '',
    active: true,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await bannersAPI.getAll();
      setBanners(response.banners || []);
    } catch (error) {
      showToast(error.message || 'Failed to load banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await bannersAPI.update(editingBanner.id, formData);
        showToast('Banner updated successfully', 'success');
      } else {
        await bannersAPI.create(formData);
        showToast('Banner created successfully', 'success');
      }
      loadBanners();
      resetForm();
    } catch (error) {
      showToast(error.message || 'Failed to save banner', 'error');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      placement: banner.placement || 'homepage',
      start_date: banner.start_date || '',
      end_date: banner.end_date || '',
      active: banner.active === 1,
    });
    setShowForm(true);
  };

  const toggleActive = async (banner) => {
    try {
      await bannersAPI.update(banner.id, { active: banner.active === 1 ? 0 : 1 });
      showToast('Banner status updated', 'success');
      loadBanners();
    } catch (error) {
      showToast(error.message || 'Failed to update banner', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await bannersAPI.delete(id);
      showToast('Banner deleted successfully', 'success');
      loadBanners();
    } catch (error) {
      showToast(error.message || 'Failed to delete banner', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      link_url: '',
      placement: 'homepage',
      start_date: '',
      end_date: '',
      active: true,
    });
    setEditingBanner(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : 'Add New Banner'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingBanner ? 'Edit Banner' : 'Add New Banner'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Banner title (for internal reference)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com/banner.jpg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x300px</p>
            </div>

            {formData.image_url && (
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img
                  src={formData.image_url}
                  alt="Banner preview"
                  className="w-full h-auto rounded max-h-48 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
              <input
                type="url"
                value={formData.link_url}
                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com or /local-page"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Placement</label>
              <select
                value={formData.placement}
                onChange={e => setFormData({ ...formData, placement: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="homepage">Homepage (Hero)</option>
                <option value="homepage-sidebar">Homepage (Sidebar)</option>
                <option value="job-listing">Job Listing Page</option>
                <option value="employer-dashboard">Employer Dashboard</option>
                <option value="jobseeker-dashboard">Jobseeker Dashboard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                Active (show banner immediately)
              </label>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {editingBanner ? 'Update' : 'Create'} Banner
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No banners yet. Create your first banner!</p>
          </div>
        ) : (
          banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex gap-6">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-48 h-24 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                  }}
                />
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{banner.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-4 ${
                      banner.active === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {banner.active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Link:</strong> {banner.link_url}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Placement:</strong> {banner.placement}
                  </p>
                  {banner.start_date && banner.end_date && (
                    <p className="text-sm text-gray-600 mb-3">
                      <strong>Duration:</strong> {banner.start_date} to {banner.end_date}
                    </p>
                  )}

                  {(banner.impressions || banner.clicks) && (
                    <div className="flex gap-4 mb-3">
                      <div className="text-sm">
                        <span className="text-gray-600">Impressions:</span>
                        <span className="font-semibold ml-1">{banner.impressions || 0}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Clicks:</span>
                        <span className="font-semibold ml-1">{banner.clicks || 0}</span>
                      </div>
                      {banner.impressions > 0 && (
                        <div className="text-sm">
                          <span className="text-gray-600">CTR:</span>
                          <span className="font-semibold ml-1">
                            {(((banner.clicks || 0) / banner.impressions) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(banner)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(banner)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      {banner.active === 1 ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
