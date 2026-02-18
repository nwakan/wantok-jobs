import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { profile as profileAPI } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import {
  Building2, MapPin, Users, Briefcase, FileText, Upload,
  ChevronRight, ChevronLeft, Check, SkipForward, Sparkles,
  Camera, Globe, Phone, X
} from 'lucide-react';

const STEPS = [
  { key: 'company-info', title: 'Company Information', icon: Building2 },
  { key: 'description', title: 'Description & Culture', icon: FileText },
  { key: 'logo', title: 'Upload Logo', icon: Camera },
  { key: 'first-job', title: 'Post Your First Job', icon: Briefcase },
];

const INDUSTRIES = [
  'Agriculture & Farming', 'Automotive', 'Aviation & Airlines',
  'Banking & Finance', 'Construction', 'Consulting',
  'Education', 'Energy & Mining', 'Engineering',
  'Forestry & Timber', 'Government', 'Healthcare',
  'Hospitality & Tourism', 'Insurance', 'IT & Technology',
  'Legal', 'Manufacturing', 'Media & Communications',
  'NGO & Development', 'Oil & Gas', 'Real Estate',
  'Retail & Trade', 'Security', 'Shipping & Logistics',
  'Telecommunications',
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '500+'
];

export default function EmployerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [form, setForm] = useState({
    company_name: '',
    industry: '',
    company_size: '',
    location: '',
    website: '',
    phone: '',
    description: '',
    culture: '',
    benefits: '[]',
    logo_url: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileAPI.get();
      if (data?.profile) {
        const p = data.profile;
        setForm(prev => ({
          ...prev,
          company_name: p.company_name || '',
          industry: p.industry || '',
          company_size: p.company_size || '',
          location: p.location || '',
          website: p.website || '',
          phone: p.phone || '',
          description: p.description || '',
          culture: p.culture || '',
          benefits: p.benefits || '[]',
          logo_url: p.logo_url || '',
        }));
        if (p.logo_url) setLogoPreview(p.logo_url);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (fields) => {
    setSaving(true);
    try {
      const payload = {};
      for (const key of fields) {
        payload[key] = form[key];
      }
      await profileAPI.update(payload);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      await saveProgress(['company_name', 'industry', 'company_size', 'location', 'website', 'phone']);
    } else if (currentStep === 1) {
      await saveProgress(['description', 'culture', 'benefits']);
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/dashboard/employer');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/profile/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, logo_url: data.logo_url || data.url }));
      }
    } catch (err) {
      console.error('Logo upload failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const completeness = (() => {
    let s = 0, t = 8;
    if (form.company_name) s++;
    if (form.industry) s++;
    if (form.company_size) s++;
    if (form.location) s++;
    if (form.logo_url) s++;
    if (form.description && form.description.length > 50) s++;
    if (form.website) s++;
    if (form.phone) s++;
    return Math.round((s / t) * 100);
  })();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Welcome to WantokJobs!
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your company profile</h1>
        <p className="text-gray-600">Complete these steps to start attracting top candidates across PNG and the Pacific</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Profile {completeness}% complete</span>
          <span className="text-sm text-gray-500">Step {currentStep + 1} of {STEPS.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${Math.max(5, ((currentStep + 1) / STEPS.length) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <button
                key={step.key}
                onClick={() => setCurrentStep(i)}
                className={`flex flex-col items-center gap-1 text-xs transition ${
                  active ? 'text-primary-700 font-semibold' : done ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  active ? 'bg-primary-100 ring-2 ring-primary-500' : done ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="hidden sm:block">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8 mb-6">
        {currentStep === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              Company Information
            </h2>
            <p className="text-sm text-gray-600">Tell us about your company so candidates know who you are.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={e => handleChange('company_name', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. Pacific Industries Ltd"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                <select
                  value={form.industry}
                  onChange={e => handleChange('industry', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                <select
                  value={form.company_size}
                  onChange={e => handleChange('company_size', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select size</option>
                  {COMPANY_SIZES.map(size => <option key={size} value={size}>{size} employees</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={e => handleChange('location', e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Port Moresby, NCD"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={form.website}
                    onChange={e => handleChange('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+675 ..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Company Description & Culture
            </h2>
            <p className="text-sm text-gray-600">Help candidates understand what it's like to work at your company.</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About Your Company *</label>
              <textarea
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Tell candidates about your company — what you do, your mission, and what makes you unique..."
              />
              <p className="text-xs text-gray-500 mt-1">{form.description.length}/1000 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Culture</label>
              <textarea
                value={form.culture}
                onChange={e => handleChange('culture', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe your work environment, team values, and what employees love about working here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Benefits</label>
              <div className="grid grid-cols-2 gap-2">
                {['Health Insurance', 'Housing Allowance', 'Transport', 'Training & Development',
                  'Paid Leave', 'Flexible Hours', 'Remote Work', 'Performance Bonus',
                  'Meals Provided', 'Relocation Support'].map(benefit => {
                  let benefitsArr = [];
                  try { benefitsArr = JSON.parse(form.benefits); } catch {}
                  const selected = benefitsArr.includes(benefit);
                  return (
                    <button
                      key={benefit}
                      type="button"
                      onClick={() => {
                        const updated = selected
                          ? benefitsArr.filter(b => b !== benefit)
                          : [...benefitsArr, benefit];
                        handleChange('benefits', JSON.stringify(updated));
                      }}
                      className={`text-left px-3 py-2 rounded-lg text-sm border transition ${
                        selected
                          ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {selected ? '✓ ' : ''}{benefit}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-600" />
              Company Logo
            </h2>
            <p className="text-sm text-gray-600">A logo helps your company stand out and builds trust with candidates.</p>

            <div className="flex flex-col items-center gap-4 py-6">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="w-32 h-32 rounded-xl object-contain border-2 border-gray-200 bg-white p-2"
                  />
                  <button
                    onClick={() => { setLogoPreview(null); handleChange('logo_url', ''); }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-500">Click to upload</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              <p className="text-xs text-gray-500">PNG, JPG or SVG. Max 2MB. Square recommended.</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5 text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-2">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">You're all set! 🎉</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your company profile is {completeness}% complete. Now post your first job to start receiving applications from candidates across PNG and the Pacific Islands.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                to="/dashboard/employer/post-job"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition"
              >
                <Briefcase className="w-5 h-5" />
                Post Your First Job
              </Link>
              <Link
                to="/dashboard/employer"
                className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 3 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-1 px-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition"
            >
              <SkipForward className="w-4 h-4" /> Skip for now
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="inline-flex items-center gap-1 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold text-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
