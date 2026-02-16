import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jobs as jobsAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function PostJob() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { showToast } = useToast();
  const descriptionRef = useRef(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
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
  const pngCities = ['Port Moresby', 'Lae', 'Mount Hagen', 'Goroka', 'Madang', 'Wewak'];
  const industries = [
    'Technology',
    'Banking & Finance',
    'Healthcare',
    'Education',
    'Mining & Resources',
    'Construction',
    'Retail',
    'Hospitality & Tourism',
    'Government',
    'Agriculture',
    'Telecommunications',
    'Manufacturing',
  ];

  const steps = [
    { number: 1, title: 'Basic Info', icon: '📝' },
    { number: 2, title: 'Job Details', icon: '📄' },
    { number: 3, title: 'Compensation', icon: '💰' },
    { number: 4, title: 'Review & Publish', icon: '✓' },
  ];

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
    e?.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      showToast('Job title is required', 'error');
      setCurrentStep(1);
      return;
    }
    if (!formData.description.trim()) {
      showToast('Job description is required', 'error');
      setCurrentStep(2);
      return;
    }

    setSaving(true);
    try {
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

  // Rich text formatting
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    if (descriptionRef.current) {
      setFormData({ ...formData, description: descriptionRef.current.innerHTML });
    }
  };

  const handleDescriptionChange = () => {
    if (descriptionRef.current) {
      setFormData({ ...formData, description: descriptionRef.current.innerHTML });
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isEdit ? 'Edit Job' : 'Post New Job'}
      </h1>
      <p className="text-gray-600 mb-8">
        Fill in the details to create a compelling job listing
      </p>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    currentStep >= step.number
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.icon}
                </button>
                <span className={`mt-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-4 rounded ${
                  currentStep > step.number ? 'bg-primary-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Senior Software Developer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Make it clear and specific to attract the right candidates
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  City/Location
                </label>
                <input
                  type="text"
                  list="cities"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Port Moresby"
                />
                <datalist id="cities">
                  {pngCities.map(city => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="casual">Casual</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Experience Level
                </label>
                <select
                  value={formData.experience_level}
                  onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Industry
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select an industry</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Job Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Job Details</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Job Description <span className="text-red-500">*</span>
              </label>
              
              {/* Rich Text Toolbar */}
              <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => formatText('bold')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => formatText('italic')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => formatText('underline')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 underline"
                  title="Underline"
                >
                  U
                </button>
                <div className="w-px bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => formatText('insertUnorderedList')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => formatText('insertOrderedList')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                  title="Numbered List"
                >
                  1. List
                </button>
                <div className="w-px bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => formatText('formatBlock', 'h3')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
                  title="Heading"
                >
                  H
                </button>
                <button
                  type="button"
                  onClick={() => formatText('formatBlock', 'p')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
                  title="Paragraph"
                >
                  P
                </button>
              </div>
              
              {/* Editable Content */}
              <div
                ref={descriptionRef}
                contentEditable
                onInput={handleDescriptionChange}
                dangerouslySetInnerHTML={{ __html: formData.description }}
                className="w-full min-h-[300px] px-4 py-3 border border-t-0 border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-primary-500 prose prose-sm max-w-none"
                style={{ outline: 'none' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe the role, responsibilities, and what makes this opportunity great
              </p>
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Key Requirements
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add a requirement (e.g. 5+ years experience in...)"
                />
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Add
                </button>
              </div>
              <ul className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <span className="text-primary-600 mt-0.5">✓</span>
                    <span className="flex-1 text-gray-700">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Compensation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Compensation & Benefits</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Currency
                </label>
                <select
                  value={formData.salary_currency}
                  onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="PGK">PGK</option>
                  <option value="FJD">FJD</option>
                  <option value="USD">USD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. 30000"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Maximum Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              💡 Tip: Jobs with visible salaries receive 3x more applications
            </p>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Job Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="draft">Draft (not visible to job seekers)</option>
                <option value="active">Active (publicly visible)</option>
                <option value="closed">Closed (no longer accepting applications)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Publish</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{formData.title}</h3>
                <p className="text-sm text-gray-600">
                  {formData.location ? `${formData.location}, ` : ''}{formData.country}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Job Type:</span>
                  <p className="font-medium capitalize">{formData.job_type}</p>
                </div>
                <div>
                  <span className="text-gray-600">Experience:</span>
                  <p className="font-medium">{formData.experience_level}</p>
                </div>
                <div>
                  <span className="text-gray-600">Industry:</span>
                  <p className="font-medium">{formData.industry || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Salary:</span>
                  <p className="font-medium">
                    {formData.salary_min && formData.salary_max
                      ? `${formData.salary_currency} ${parseInt(formData.salary_min).toLocaleString()} - ${parseInt(formData.salary_max).toLocaleString()}`
                      : 'Not specified'
                    }
                  </p>
                </div>
              </div>

              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                  formData.status === 'active' ? 'bg-green-100 text-green-800' :
                  formData.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {formData.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                {showPreview ? 'Hide' : 'Show'} full preview
              </button>

              {showPreview && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-bold text-gray-900 mb-2">Description:</h4>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700 mb-4"
                    dangerouslySetInnerHTML={{ __html: formData.description }}
                  />
                  {formData.requirements.length > 0 && (
                    <>
                      <h4 className="font-bold text-gray-900 mb-2">Requirements:</h4>
                      <ul className="space-y-1">
                        {formData.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-700">✓ {req}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Ready to publish?</span> Your job will be visible to thousands of job seekers across the Pacific.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                ← Previous
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/employer/jobs')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Publishing...' : isEdit ? 'Update Job' : 'Publish Job'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
