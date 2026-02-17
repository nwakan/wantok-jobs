import { useState, useEffect } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';
import {
  Building2, MapPin, Globe, Users, CheckCircle2, Image, Plus, X,
  Eye, EyeOff, TrendingUp, Briefcase, Phone, Mail, Facebook, Linkedin,
  Award, Star, Camera, FileText, Shield, Heart, Sparkles, ExternalLink
} from 'lucide-react';
import OptimizedImage from '../../../components/OptimizedImage';

const PNG_INDUSTRIES = [
  'Agriculture & Fisheries',
  'Aviation & Transport',
  'Banking & Finance',
  'Construction & Engineering',
  'Consulting & Professional Services',
  'Education & Training',
  'Energy & Utilities',
  'Government & Public Sector',
  'Healthcare & Medical',
  'Hospitality & Tourism',
  'Information Technology',
  'Insurance',
  'Legal',
  'Logging & Forestry',
  'Manufacturing',
  'Media & Communications',
  'Mining & Resources',
  'NGO & Development',
  'Oil & Gas',
  'Real Estate & Property',
  'Retail & Wholesale',
  'Security',
  'Shipping & Logistics',
  'Telecommunications',
  'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const COUNTRIES = ['Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga', 'Australia', 'New Zealand'];

const SUGGESTED_BENEFITS = [
  'Health Insurance', 'Housing Allowance', 'Transport Allowance', 'School Fees Support',
  'Annual Leave', 'Sick Leave', 'Maternity/Paternity Leave', 'Training & Development',
  'Performance Bonus', 'Superannuation/Pension', 'Remote Work Options', 'Gym/Fitness',
  'Company Vehicle', 'Phone Allowance', 'Relocation Package', 'Meal Allowance',
];

export default function CompanyProfile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    company_size: '',
    location: '',
    country: 'Papua New Guinea',
    website: '',
    logo_url: '',
    description: '',
    culture: '',
    founded_year: '',
    phone: '',
    benefits: [],
    photos: [],
    social_links: { facebook: '', linkedin: '', twitter: '' },
    verified: 0,
  });
  const [newBenefit, setNewBenefit] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  useEffect(() => { loadProfile(); }, []);

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
          culture: data.profile.culture || '',
          founded_year: data.profile.founded_year || '',
          phone: data.profile.phone || '',
          benefits: data.profile.benefits ? JSON.parse(data.profile.benefits) : [],
          photos: data.profile.photos ? JSON.parse(data.profile.photos) : [],
          social_links: data.profile.social_links ? JSON.parse(data.profile.social_links) : { facebook: '', linkedin: '', twitter: '' },
          verified: data.profile.verified || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompleteness = () => {
    let score = 0;
    const total = 12;
    if (formData.company_name) score++;
    if (formData.industry) score++;
    if (formData.company_size) score++;
    if (formData.location) score++;
    if (formData.logo_url) score++;
    if (formData.description && formData.description.length > 50) score++;
    if (formData.website) score++;
    if (formData.phone) score++;
    if (formData.benefits.length >= 3) score++;
    if (formData.culture && formData.culture.length > 30) score++;
    if (formData.social_links.facebook || formData.social_links.linkedin) score++;
    if (formData.photos.length >= 1) score++;
    return Math.round((score / total) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        benefits: JSON.stringify(formData.benefits),
        photos: JSON.stringify(formData.photos),
        social_links: JSON.stringify(formData.social_links),
      };
      await profileAPI.update(dataToSave);
      showToast('Company profile updated! 🎉', 'success');
    } catch (error) {
      showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = (benefit) => {
    const b = (benefit || newBenefit).trim();
    if (b && !formData.benefits.includes(b)) {
      setFormData({ ...formData, benefits: [...formData.benefits, b] });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setFormData({ ...formData, benefits: formData.benefits.filter((_, i) => i !== index) });
  };

  const addPhoto = () => {
    if (newPhoto.trim()) {
      setFormData({ ...formData, photos: [...formData.photos, newPhoto.trim()] });
      setNewPhoto('');
    }
  };

  const removePhoto = (index) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const completenessColor = completeness >= 80 ? 'green' : completeness >= 50 ? 'blue' : 'amber';

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-4">
            {formData.logo_url ? (
              <OptimizedImage src={formData.logo_url} alt="Logo" width={64} height={64} className="w-16 h-16 object-contain border rounded-lg p-1" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{formData.company_name || 'Company Profile'}</h1>
                {formData.verified === 1 && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">{formData.industry || 'Set your industry'} • {formData.location || 'Set location'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2 text-sm"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>

        {/* Profile Completeness */}
        <div className={`bg-${completenessColor}-50 rounded-lg p-4 mb-4`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-900">Profile Completeness: {completeness}%</span>
            </div>
            {completeness < 80 && (
              <span className="text-sm text-gray-600">Complete your profile to attract more candidates</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full bg-${completenessColor}-500 transition-all duration-500`}
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-t pt-4">
          {[
            { id: 'info', label: 'Company Info', icon: Building2 },
            { id: 'culture', label: 'Culture & Benefits', icon: Heart },
            { id: 'media', label: 'Media & Links', icon: Camera },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setShowPreview(false); setActiveTab(tab.id); }}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors ${
                activeTab === tab.id && !showPreview
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {showPreview ? (
        /* ============ PREVIEW MODE ============ */
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-40 bg-gradient-to-r from-primary-600 to-blue-600 relative">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/30 to-transparent h-20" />
          </div>
          <div className="px-8 pb-8">
            <div className="flex items-start gap-6 -mt-12 relative mb-6">
              {formData.logo_url ? (
                <OptimizedImage src={formData.logo_url} alt={formData.company_name} width={96} height={96} className="w-24 h-24 object-contain border-4 border-white rounded-lg bg-white shadow-lg p-2" />
              ) : (
                <div className="w-24 h-24 bg-white border-4 border-white rounded-lg shadow-lg flex items-center justify-center text-gray-400 text-3xl">🏢</div>
              )}
              <div className="flex-1 mt-12">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">{formData.company_name || 'Company Name'}</h1>
                  {formData.verified === 1 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Verified Employer
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-lg">{formData.industry || 'Industry'} • {formData.company_size ? `${formData.company_size} employees` : ''}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                  {formData.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {formData.location}, {formData.country}</span>}
                  {formData.website && <a href={formData.website} className="flex items-center gap-1 text-primary-600 hover:underline"><Globe className="w-4 h-4" /> {formData.website.replace(/^https?:\/\//, '')}</a>}
                  {formData.founded_year && <span className="flex items-center gap-1"><Award className="w-4 h-4" /> Est. {formData.founded_year}</span>}
                </div>
              </div>
            </div>

            {/* About */}
            {formData.description && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About Us</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{formData.description}</p>
              </div>
            )}

            {/* Culture */}
            {formData.culture && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Our Culture</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{formData.culture}</p>
              </div>
            )}

            {/* Benefits */}
            {formData.benefits.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Benefits & Perks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {formData.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photos */}
            {formData.photos.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Our Workplace</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.photos.map((p, i) => (
                    <OptimizedImage key={i} src={p} alt={`Photo ${i+1}`} width={400} height={192} className="w-full h-48 object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}

            {/* Social & Contact */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Contact</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-gray-700">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {user?.email}</p>
                {formData.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {formData.phone}</p>}
                {formData.social_links?.facebook && (
                  <a href={formData.social_links.facebook} className="flex items-center gap-2 text-blue-600 hover:underline">
                    <Facebook className="w-4 h-4" /> Facebook
                  </a>
                )}
                {formData.social_links?.linkedin && (
                  <a href={formData.social_links.linkedin} className="flex items-center gap-2 text-blue-700 hover:underline">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============ EDIT MODE ============ */
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeTab === 'info' && (
            <>
              {/* Company Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. PNG Power Ltd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select industry</option>
                      {PNG_INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <select
                      value={formData.company_size}
                      onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select size</option>
                      {COMPANY_SIZES.map(size => (
                        <option key={size} value={size}>{size} employees</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                    <input
                      type="number"
                      value={formData.founded_year}
                      onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. 2005"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City / Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Port Moresby"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="+675 XXX XXXX"
                    />
                  </div>
                </div>

                {/* Logo */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo URL</label>
                  <div className="flex gap-4 items-start">
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="https://example.com/logo.png"
                    />
                    {formData.logo_url && (
                      <OptimizedImage src={formData.logo_url} alt="Logo" height={48} className="h-12 w-auto border rounded" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload to an image host and paste the URL. Recommended: square, 200×200px+</p>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Company Description
                </h2>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Tell job seekers about your company — what you do, your mission, what makes you a great employer in PNG..."
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length} chars • Tip: 200+ words helps you rank higher in search results</p>
              </div>
            </>
          )}

          {activeTab === 'culture' && (
            <>
              {/* Culture */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Company Culture
                </h2>
                <textarea
                  value={formData.culture}
                  onChange={(e) => setFormData({ ...formData, culture: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your work culture, values, and what it's like to work at your company..."
                />
                <p className="text-xs text-gray-500 mt-1">Companies with culture descriptions get 40% more applications</p>
              </div>

              {/* Benefits */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Benefits & Perks
                </h2>

                {/* Quick add suggestions */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_BENEFITS.filter(b => !formData.benefits.includes(b)).slice(0, 8).map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => addBenefit(b)}
                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded-full text-sm hover:bg-primary-50 hover:border-primary-300 transition"
                      >
                        + {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="Or type a custom benefit..."
                  />
                  <button
                    type="button"
                    onClick={() => addBenefit()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      ✓ {benefit}
                      <button type="button" onClick={() => removeBenefit(idx)} className="ml-1 text-green-600 hover:text-green-900 font-bold">×</button>
                    </span>
                  ))}
                  {formData.benefits.length === 0 && (
                    <p className="text-sm text-gray-500">No benefits added yet — add some to attract top talent!</p>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <>
              {/* Social Links */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Social Media Links
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <input
                      type="url"
                      value={formData.social_links.facebook || ''}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, facebook: e.target.value } })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="https://facebook.com/yourcompany"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-blue-700 flex-shrink-0" />
                    <input
                      type="url"
                      value={formData.social_links.linkedin || ''}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, linkedin: e.target.value } })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>
                </div>
              </div>

              {/* Company Photos */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Workplace Photos
                </h2>
                <div className="flex gap-2 mb-4">
                  <input
                    type="url"
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhoto())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <button type="button" onClick={addPhoto} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                    Add Photo
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <OptimizedImage src={photo} alt={`Photo ${idx+1}`} width={300} height={128} className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                  {formData.photos.length === 0 && (
                    <div className="col-span-full text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Add photos of your office, team, and workplace</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Save Button - always visible */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Preview
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
