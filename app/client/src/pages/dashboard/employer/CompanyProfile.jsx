import { useState, useEffect } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function CompanyProfile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    company_size: '',
    location: '',
    country: 'Papua New Guinea',
    website: '',
    logo_url: '',
    description: '',
    benefits: [],
    photos: [],
  });
  const [newBenefit, setNewBenefit] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  const countries = ['Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga'];
  const companySizes = ['1-10', '11-50', '51-200', '201-500', '500-1000', '1000+'];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileAPI.get();
      setUser(data.user);
      if (data.profile) {
        setFormData({
          company_name: data.profile.company_name || '',
          industry: data.profile.industry || '',
          company_size: data.profile.company_size || '',
          location: data.profile.location || '',
          country: data.profile.country || 'Papua New Guinea',
          website: data.profile.website || '',
          logo_url: data.profile.logo_url || '',
          description: data.profile.description || '',
          benefits: data.profile.benefits ? JSON.parse(data.profile.benefits) : [],
          photos: data.profile.photos ? JSON.parse(data.profile.photos) : [],
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        benefits: JSON.stringify(formData.benefits),
        photos: JSON.stringify(formData.photos),
      };
      await profileAPI.update(dataToSave);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()]
      });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index)
    });
  };

  const addPhoto = () => {
    if (newPhoto.trim()) {
      setFormData({
        ...formData,
        photos: [...formData.photos, newPhoto.trim()]
      });
      setNewPhoto('');
    }
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      photos: formData.photos.filter((_, i) => i !== index)
    });
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
        <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
        >
          {showPreview ? '✏️ Edit' : '👁️ Preview'}
        </button>
      </div>

      {!showPreview ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry *</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Technology, Banking"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                <select
                  value={formData.company_size}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select size</option>
                  {companySizes.map(size => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location (City)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Port Moresby"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo URL</label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-gray-500 mt-1">Upload your logo to an image hosting service and paste the URL here</p>
              {formData.logo_url && (
                <div className="mt-3">
                  <img src={formData.logo_url} alt="Logo preview" className="h-16 w-auto border rounded" />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Company Description</h2>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              placeholder="Tell job seekers about your company, culture, and what makes you a great place to work..."
            />
          </div>

          {/* Benefits & Perks */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Benefits & Perks</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Health insurance, Remote work, Gym membership"
              />
              <button
                type="button"
                onClick={addBenefit}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                  <span>✓ {benefit}</span>
                  <button
                    type="button"
                    onClick={() => removeBenefit(idx)}
                    className="text-green-600 hover:text-green-900 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.benefits.length === 0 && (
                <p className="text-gray-500 text-sm">No benefits added yet</p>
              )}
            </div>
          </div>

          {/* Company Photos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Company Photos Gallery</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="url"
                value={newPhoto}
                onChange={(e) => setNewPhoto(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhoto())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/photo.jpg"
              />
              <button
                type="button"
                onClick={addPhoto}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Add Photo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={photo}
                    alt={`Company photo ${idx + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {formData.photos.length === 0 && (
                <div className="col-span-full text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No photos added yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add photos to showcase your workplace</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Preview
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : (
        /* Preview Mode */
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-4">This is how your profile looks to job seekers</p>
            </div>

            {/* Header */}
            <div className="flex items-start gap-6 mb-8 pb-8 border-b">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt={formData.company_name}
                  className="w-24 h-24 object-contain border rounded-lg p-2"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-3xl">
                  🏢
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {formData.company_name || 'Company Name'}
                </h1>
                <p className="text-gray-600 mb-2">
                  {formData.industry || 'Industry'} • {formData.company_size ? `${formData.company_size} employees` : 'Company size not specified'}
                </p>
                <p className="text-gray-600 mb-2">
                  📍 {formData.location || 'Location'}, {formData.country}
                </p>
                {formData.website && (
                  <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                    🌐 {formData.website}
                  </a>
                )}
              </div>
            </div>

            {/* About */}
            {formData.description && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About Us</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{formData.description}</p>
              </div>
            )}

            {/* Benefits */}
            {formData.benefits.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Benefits & Perks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600">✓</span>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {formData.photos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Our Workplace</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Workplace ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <p>📧 {user?.email}</p>
                <p>👤 {user?.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
