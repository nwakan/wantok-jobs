import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobs as jobsAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function PostJob() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { showToast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: [],
    location: '',
    country: 'Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    industry: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'PGK',
    application_deadline: '',
    status: 'active',
  });
  const [newRequirement, setNewRequirement] = useState('');

  const countries = ['Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga'];

  useEffect(() => {
    if (isEdit) {
      loadJob();
    }
  }, [id]);

  const loadJob = async () => {
    try {
      const job = await jobsAPI.getById(id);
      setFormData({
        title: job.title,
        description: job.description,
        requirements: job.requirements ? JSON.parse(job.requirements) : [],
        location: job.location || '',
        country: job.country || 'Papua New Guinea',
        job_type: job.job_type,
        experience_level: job.experience_level || 'Mid Level',
        industry: job.industry || '',
        salary_min: job.salary_min || '',
        salary_max: job.salary_max || '',
        salary_currency: job.salary_currency || 'PGK',
        application_deadline: job.application_deadline || '',
        status: job.status,
      });
    } catch (error) {
      showToast('Failed to load job: ' + error.message, 'error');
      navigate('/dashboard/employer/jobs');
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
        requirements: JSON.stringify(formData.requirements)
      };

      if (isEdit) {
        await jobsAPI.update(id, submitData);
        showToast('Job updated successfully!', 'success');
      } else {
        await jobsAPI.create(submitData);
        showToast('Job posted successfully!', 'success');
      }
      navigate('/dashboard/employer/jobs');
    } catch (error) {
      showToast('Failed to save job: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({ ...formData, requirements: [...formData.requirements, newRequirement.trim()] });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData({ ...formData, requirements: formData.requirements.filter((_, i) => i !== index) });
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Job' : 'Post New Job'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g. Senior Software Developer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
          />
        </div>

        {/* Requirements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Add a requirement"
            />
            <button
              type="button"
              onClick={addRequirement}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {formData.requirements.map((req, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <span>{req}</span>
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Location & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City/Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. Port Moresby"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Type *</label>
            <select
              value={formData.job_type}
              onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="casual">Casual</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
            <select
              value={formData.experience_level}
              onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Entry Level">Entry Level</option>
              <option value="Mid Level">Mid Level</option>
              <option value="Senior">Senior</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. Technology, Banking"
            />
          </div>
        </div>

        {/* Salary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salary Currency</label>
            <select
              value={formData.salary_currency}
              onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="PGK">PGK</option>
              <option value="FJD">FJD</option>
              <option value="USD">USD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Salary</label>
            <input
              type="number"
              value={formData.salary_min}
              onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. 30000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Salary</label>
            <input
              type="number"
              value={formData.salary_max}
              onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. 50000"
            />
          </div>
        </div>

        {/* Deadline & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Application Deadline</label>
            <input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/employer/jobs')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Update Job' : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
