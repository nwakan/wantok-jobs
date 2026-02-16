import { useState, useEffect } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function JobseekerProfile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    country: 'Papua New Guinea',
    bio: '',
    skills: [],
    work_history: [],
    education: [],
    cv_url: '',
    desired_job_type: '',
    desired_salary_min: '',
    desired_salary_max: '',
    availability: 'Immediate',
  });
  const [newSkill, setNewSkill] = useState('');

  const countries = [
    'Papua New Guinea',
    'Fiji',
    'Solomon Islands',
    'Vanuatu',
    'Samoa',
    'Tonga',
    'Kiribati',
    'Tuvalu',
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileAPI.get();
      setUser(data.user);
      if (data.profile) {
        setFormData({
          phone: data.profile.phone || '',
          location: data.profile.location || '',
          country: data.profile.country || 'Papua New Guinea',
          bio: data.profile.bio || '',
          skills: data.profile.skills ? JSON.parse(data.profile.skills) : [],
          work_history: data.profile.work_history ? JSON.parse(data.profile.work_history) : [],
          education: data.profile.education ? JSON.parse(data.profile.education) : [],
          cv_url: data.profile.cv_url || '',
          desired_job_type: data.profile.desired_job_type || '',
          desired_salary_min: data.profile.desired_salary_min || '',
          desired_salary_max: data.profile.desired_salary_max || '',
          availability: data.profile.availability || 'Immediate',
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
      // Prepare data with JSON stringified fields
      const submitData = {
        ...formData,
        skills: JSON.stringify(formData.skills),
        work_history: JSON.stringify(formData.work_history),
        education: JSON.stringify(formData.education)
      };
      await profileAPI.update(submitData);
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="+675 XXXX XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location (City) *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Port Moresby"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio *</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Tell employers about yourself..."
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Skills *</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add a skill"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="ml-2 text-primary-900 hover:text-primary-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* CV */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CV/Resume URL *</label>
          <input
            type="url"
            value={formData.cv_url}
            onChange={(e) => setFormData({ ...formData, cv_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://example.com/my-cv.pdf"
          />
          <p className="text-sm text-gray-500 mt-1">Upload your CV to Google Drive, Dropbox, or similar and paste the link here</p>
        </div>

        {/* Job Preferences */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Job Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Desired Job Type</label>
              <select
                value={formData.desired_job_type}
                onChange={(e) => setFormData({ ...formData, desired_job_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Immediate">Immediate</option>
                <option value="2 weeks">2 weeks notice</option>
                <option value="1 month">1 month notice</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary (PGK)</label>
              <input
                type="number"
                value={formData.desired_salary_min}
                onChange={(e) => setFormData({ ...formData, desired_salary_min: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. 30000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary (PGK)</label>
              <input
                type="number"
                value={formData.desired_salary_max}
                onChange={(e) => setFormData({ ...formData, desired_salary_max: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. 50000"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
