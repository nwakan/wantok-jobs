import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  const loadBanners = () => {
    // Placeholder data
    setBanners([
      {
        id: 1,
        title: 'Summer Job Fair 2024',
        image_url: 'https://via.placeholder.com/800x200',
        link_url: '/events/summer-fair',
        placement: 'homepage',
        impressions: 1543,
        clicks: 87,
        active: true,
        start_date: '2024-06-01',
        end_date: '2024-08-31',
      },
      {
        id: 2,
        title: 'Premium Plans 50% Off',
        image_url: 'https://via.placeholder.com/800x200',
        link_url: '/plans',
        placement: 'employer-dashboard',
        impressions: 892,
        clicks: 43,
        active: true,
        start_date: '2024-07-01',
        end_date: '2024-07-31',
      },
    ]);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showToast('Banner saved successfully', 'success');
    loadBanners();
    resetForm();
  };

  const toggleActive = (id) => {
    setBanners(banners.map(b => b.id === id ? { ...b, active: !b.active } : b));
    showToast('Banner status updated', 'success');
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    setBanners(banners.filter(b => b.id !== id));
    showToast('Banner deleted successfully', 'success');
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

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Add New Banner</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
              <input
                type="url"
                value={formData.link_url}
                onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Placement</label>
              <select
                value={formData.placement}
                onChange={e => setFormData({ ...formData, placement: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="homepage">Homepage</option>
                <option value="job-listing">Job Listing</option>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Create Banner
            </button>
          </form>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map(banner => (
          <div key={banner.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex gap-6">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-48 h-24 object-cover rounded-lg"
              />
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{banner.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    banner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {banner.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  <strong>Link:</strong> {banner.link_url}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Placement:</strong> {banner.placement}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Duration:</strong> {banner.start_date} to {banner.end_date}
                </p>

                <div className="flex gap-4 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Impressions:</span>
                    <span className="font-semibold ml-1">{banner.impressions}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Clicks:</span>
                    <span className="font-semibold ml-1">{banner.clicks}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">CTR:</span>
                    <span className="font-semibold ml-1">
                      {((banner.clicks / banner.impressions) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(banner.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {banner.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
