import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { jobs as jobsAPI } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { 
  Sparkles, AlertCircle, Check, X, Plus, Info, 
  Globe, Mail, ExternalLink, HelpCircle 
} from 'lucide-react';

const CLIENT_API = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

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
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [newJobId, setNewJobId] = useState(null);
  
  // Credit status
  const [creditStatus, setCreditStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: [],
    location: '',
    country: 'Papua New Guinea',
    job_type: 'full-time',
    experience_level: 'Mid Level',
    industry: '',
    category_slug: '',
    skills: [],
    remote_work: false,
    salary_min: '',
    salary_max: '',
    salary_currency: 'PGK',
    application_deadline: '',
    application_method: 'internal', // internal, external_url, email
    application_url: '',
    application_email: '',
    screening_questions: [],
    status: 'active',
  });
  const [newRequirement, setNewRequirement] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  
  // Agency client selection
  const { user } = useAuth();
  const isAgency = user?.account_type === 'agency';
  const [agencyClients, setAgencyClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);

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
    { number: 4, title: 'Applications', icon: '📧' },
    { number: 5, title: 'Review & Publish', icon: '✓' },
  ];

  useEffect(() => {
    loadCreditStatus();
    loadCategories();
    if (isEdit) {
      loadJob();
    }
    if (isAgency) {
      fetch(`${CLIENT_API}/agency/clients`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        .then(r => r.json()).then(d => setAgencyClients(d.data || [])).catch(() => {});
    }
  }, [id]);

  const loadCreditStatus = async () => {
    try {
      const response = await fetch('/api/credits/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCreditStatus(data);
      }
    } catch (error) {
      console.error('Failed to load credit status:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

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
        category_slug: job.category_slug || '',
        skills: job.skills ? JSON.parse(job.skills) : [],
        remote_work: job.remote_work || false,
        salary_min: job.salary_min || '',
        salary_max: job.salary_max || '',
        salary_currency: job.salary_currency || 'PGK',
        application_deadline: job.application_deadline || '',
        application_method: job.application_method || 'internal',
        application_url: job.application_url || '',
        application_email: job.application_email || '',
        screening_questions: job.screening_questions ? JSON.parse(job.screening_questions) : [],
        status: job.status,
      });
    } catch (error) {
      showToast('Failed to load job: ' + error.message, 'error');
      navigate('/dashboard/employer/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, isDraft = false) => {
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
    if (!formData.category_slug) {
      showToast('Please select a job category', 'error');
      setCurrentStep(1);
      return;
    }

    // Show credit confirmation if posting (not editing, not draft)
    if (!isEdit && !isDraft && formData.status === 'active' && !showCreditConfirm) {
      setShowCreditConfirm(true);
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        status: isDraft ? 'draft' : formData.status,
        requirements: JSON.stringify(formData.requirements),
        skills: JSON.stringify(formData.skills),
        screening_questions: JSON.stringify(formData.screening_questions),
        ...(isAgency && selectedClientId ? { client_id: selectedClientId } : {}),
      };

      let result;
      if (isEdit) {
        result = await jobsAPI.update(id, submitData);
        showToast('Job updated successfully!', 'success');
        navigate('/dashboard/employer/jobs');
      } else {
        result = await jobsAPI.create(submitData);
        showToast('Job posted successfully!', 'success');
        setNewJobId(result.data?.id || result.id);
        setPostSuccess(true);
        loadCreditStatus(); // Refresh credit status
      }
    } catch (error) {
      showToast('Failed to save job: ' + error.message, 'error');
      setShowCreditConfirm(false);
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

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setFormData({ 
        ...formData, 
        screening_questions: [...formData.screening_questions, newQuestion.trim()] 
      });
      setNewQuestion('');
    }
  };

  const removeQuestion = (index) => {
    setFormData({ 
      ...formData, 
      screening_questions: formData.screening_questions.filter((_, i) => i !== index) 
    });
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
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const charCount = (text) => {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent.length;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Post-success page
  if (postSuccess && newJobId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Job Posted Successfully! 🎉</h1>
          <p className="text-lg text-gray-600 mb-8">
            Your job listing is now live and visible to thousands of job seekers across the Pacific.
          </p>
          
          {creditStatus && !creditStatus.trial?.active && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>1 job posting credit used.</strong> 
                {' '}You have {creditStatus.credits?.job_posting || 0} credits remaining.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={`/jobs/${newJobId}`}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              View Public Listing
            </Link>
            <Link
              to="/dashboard/employer/jobs"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Manage Jobs
            </Link>
            <button
              onClick={() => {
                setPostSuccess(false);
                setNewJobId(null);
                setFormData({
                  title: '',
                  description: '',
                  requirements: [],
                  location: '',
                  country: 'Papua New Guinea',
                  job_type: 'full-time',
                  experience_level: 'Mid Level',
                  industry: '',
                  category_slug: '',
                  skills: [],
                  remote_work: false,
                  salary_min: '',
                  salary_max: '',
                  salary_currency: 'PGK',
                  application_deadline: '',
                  application_method: 'internal',
                  application_url: '',
                  application_email: '',
                  screening_questions: [],
                  status: 'active',
                });
                setCurrentStep(1);
                loadCreditStatus();
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Post Another Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isEdit ? 'Edit Job' : 'Post New Job'}
      </h1>
      <p className="text-gray-600 mb-6">
        Fill in the details to create a compelling job listing
      </p>

      {/* Credit Status Banner */}
      {creditStatus && !isEdit && (
        <div className={`mb-6 rounded-lg border p-4 ${
          creditStatus.trial?.active
            ? 'bg-purple-50 border-purple-200'
            : creditStatus.credits?.job_posting > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <Sparkles className={`w-5 h-5 mt-0.5 ${
              creditStatus.trial?.active ? 'text-purple-600' :
              creditStatus.credits?.job_posting > 0 ? 'text-green-600' : 'text-amber-600'
            }`} />
            <div className="flex-1">
              {creditStatus.trial?.active ? (
                <>
                  <p className="font-semibold text-purple-900">
                    {creditStatus.trial.type === 'premium_indefinite' ? '✨ Premium Trial Active' : '🎉 Free Trial Active'}
                  </p>
                  <p className="text-sm text-purple-700 mt-1">
                    {creditStatus.trial.type === 'premium_indefinite'
                      ? 'Unlimited job postings — no credit cost'
                      : `Post jobs for free until ${new Date(creditStatus.trial.expiresAt).toLocaleDateString()}`
                    }
                  </p>
                </>
              ) : creditStatus.credits?.job_posting > 0 ? (
                <>
                  <p className="font-semibold text-green-900">
                    {creditStatus.credits.job_posting} Job Posting Credit{creditStatus.credits.job_posting !== 1 ? 's' : ''} Available
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Posting this job will use 1 credit
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-900">⚠️ No Job Posting Credits</p>
                  <p className="text-sm text-amber-700 mt-1">
                    You can save this as a draft, but you'll need credits to publish.{' '}
                    <Link to="/pricing" className="underline font-medium">Purchase credits</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max">
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
                <span className={`mt-2 text-xs sm:text-sm font-medium ${
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
            
            {/* Agency: Posting for dropdown */}
            {isAgency && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Posting For</label>
                <select
                  value={selectedClientId || ''}
                  onChange={e => setSelectedClientId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">My Company</option>
                  {agencyClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Select which company this job is for, or post under your own agency name.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Senior Software Developer"
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Be clear and specific to attract the right candidates
                </p>
                <span className="text-xs text-gray-400">{formData.title.length}/100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_slug}
                onChange={(e) => setFormData({ ...formData, category_slug: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Helps job seekers find your listing
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

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remote_work}
                  onChange={(e) => setFormData({ ...formData, remote_work: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <Globe className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">
                  Remote work available
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">
                Remote jobs get 3x more applications
              </p>
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
                <option value="">Select an industry...</option>
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
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => formatText('italic')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic text-sm"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => formatText('underline')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 underline text-sm"
                  title="Underline"
                >
                  U
                </button>
                <div className="w-px bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => formatText('insertUnorderedList')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => formatText('insertOrderedList')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                  title="Numbered List"
                >
                  1. List
                </button>
                <div className="w-px bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => formatText('formatBlock', 'h3')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
                  title="Heading"
                >
                  H
                </button>
                <button
                  type="button"
                  onClick={() => formatText('formatBlock', 'p')}
                  className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
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
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Describe responsibilities, team, growth opportunities
                </p>
                <span className="text-xs text-gray-400">{charCount(formData.description)} chars</span>
              </div>
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
                  placeholder="e.g. 5+ years experience in software development"
                />
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <ul className="space-y-2">
                {formData.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <span className="text-primary-600 mt-0.5">✓</span>
                    <span className="flex-1 text-gray-700 text-sm">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {formData.requirements.length === 0 && (
                <p className="text-xs text-gray-500 italic">No requirements added yet</p>
              )}
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Required Skills (for AI matching)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Python, Project Management, Excel"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {formData.skills.length === 0 && (
                <p className="text-xs text-gray-500 italic">No skills added yet</p>
              )}
              <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Skills help our AI match candidates and show compatibility scores</span>
              </p>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span><strong>Pro tip:</strong> Jobs with visible salaries receive 3x more applications and 5x more views</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Application Deadline
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Optional — job will auto-close after this date</p>
            </div>
          </div>
        )}

        {/* Step 4: Applications */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Application Method</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                How should candidates apply?
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <input
                    type="radio"
                    name="application_method"
                    value="internal"
                    checked={formData.application_method === 'internal'}
                    onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Internal Application (Recommended)</div>
                    <div className="text-sm text-gray-600">Candidates apply through WantokJobs — you manage applications in your dashboard</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <input
                    type="radio"
                    name="application_method"
                    value="external_url"
                    checked={formData.application_method === 'external_url'}
                    onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      External Website
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Redirect candidates to your company's careers page or ATS</div>
                    {formData.application_method === 'external_url' && (
                      <input
                        type="url"
                        value={formData.application_url}
                        onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
                        placeholder="https://yourcompany.com/careers/apply"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                  <input
                    type="radio"
                    name="application_method"
                    value="email"
                    checked={formData.application_method === 'email'}
                    onChange={(e) => setFormData({ ...formData, application_method: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Applications
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Candidates email their CV directly to you</div>
                    {formData.application_method === 'email' && (
                      <input
                        type="email"
                        value={formData.application_email}
                        onChange={(e) => setFormData({ ...formData, application_email: e.target.value })}
                        placeholder="hr@yourcompany.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Screening Questions */}
            {formData.application_method === 'internal' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  Screening Questions
                  <HelpCircle className="w-4 h-4 text-gray-400" title="Optional questions to filter candidates" />
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. Do you have a valid driver's license?"
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <ul className="space-y-2">
                  {formData.screening_questions.map((q, index) => (
                    <li key={index} className="flex items-start gap-3 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-600 mt-0.5">{index + 1}.</span>
                      <span className="flex-1 text-gray-700 text-sm">{q}</span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                {formData.screening_questions.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No screening questions added</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Candidates must answer these when applying — helps you filter applicants
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Publish</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">{formData.title}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  {formData.remote_work && <Globe className="w-4 h-4 text-green-600" />}
                  {formData.location ? `${formData.location}, ` : ''}{formData.country}
                  {formData.remote_work && <span className="text-green-600 font-medium">• Remote OK</span>}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                <div>
                  <span className="text-gray-600">Category:</span>
                  <p className="font-medium">
                    {categories.find(c => c.slug === formData.category_slug)?.name || 'Not selected'}
                  </p>
                </div>
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
              </div>

              {(formData.salary_min || formData.salary_max) && (
                <div className="border-t pt-4">
                  <span className="text-sm text-gray-600">Salary Range:</span>
                  <p className="font-semibold text-lg text-green-600">
                    {formData.salary_currency}{' '}
                    {formData.salary_min && parseInt(formData.salary_min).toLocaleString()}
                    {formData.salary_min && formData.salary_max && ' - '}
                    {formData.salary_max && parseInt(formData.salary_max).toLocaleString()}
                  </p>
                </div>
              )}

              {formData.skills.length > 0 && (
                <div className="border-t pt-4">
                  <span className="text-sm text-gray-600 block mb-2">Required Skills:</span>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-primary-100 text-primary-800 rounded text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.application_method !== 'internal' && (
                <div className="border-t pt-4">
                  <span className="text-sm text-gray-600">Application Method:</span>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {formData.application_method === 'external_url' && (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        External URL: <a href={formData.application_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{formData.application_url}</a>
                      </>
                    )}
                    {formData.application_method === 'email' && (
                      <>
                        <Mail className="w-4 h-4" />
                        Email: {formData.application_email}
                      </>
                    )}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                {showPreview ? 'Hide' : 'Show'} full preview
              </button>

              {showPreview && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Description:</h4>
                    <div 
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: formData.description }}
                    />
                  </div>
                  
                  {formData.requirements.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Requirements:</h4>
                      <ul className="space-y-1">
                        {formData.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-primary-600 mt-0.5">✓</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {formData.screening_questions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Screening Questions:</h4>
                      <ol className="space-y-1 list-decimal list-inside">
                        {formData.screening_questions.map((q, index) => (
                          <li key={index} className="text-sm text-gray-700">{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">Ready to publish?</span> Your job will be visible to thousands of job seekers across the Pacific and promoted through our AI matching system.
                </span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Publication Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="draft">Draft (not visible, no credit cost)</option>
                <option value="active">Active (publicly visible)</option>
                <option value="closed">Closed (no longer accepting applications)</option>
              </select>
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
            {!isEdit && currentStep === 5 && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Save as Draft
              </button>
            )}
            
            <button
              type="button"
              onClick={() => navigate('/dashboard/employer/jobs')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            
            {currentStep < 5 ? (
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
                disabled={saving || (!creditStatus?.trial?.active && !isEdit && formData.status === 'active' && (creditStatus?.credits?.job_posting || 0) === 0)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                title={!creditStatus?.trial?.active && !isEdit && formData.status === 'active' && (creditStatus?.credits?.job_posting || 0) === 0 ? 'Insufficient credits' : ''}
              >
                {saving ? 'Publishing...' : isEdit ? 'Update Job' : 'Publish Job'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Credit Confirmation Modal */}
      {showCreditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Job Posting</h3>
                <p className="text-sm text-gray-600">
                  Publishing this job will use <strong>1 job posting credit</strong>.
                </p>
                {creditStatus && (
                  <p className="text-sm text-gray-600 mt-2">
                    You will have <strong>{(creditStatus.credits?.job_posting || 1) - 1} credits</strong> remaining after this post.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreditConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  setShowCreditConfirm(false);
                  handleSubmit(e);
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
