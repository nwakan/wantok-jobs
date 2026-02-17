import { useState, useEffect } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';
import { 
  User, MapPin, Phone, Mail, Calendar, Globe, Linkedin, Github, 
  Twitter, Eye, EyeOff, Lock, Users, Award, Briefcase, GraduationCap,
  FileText, Star, Video, Image, ExternalLink, Plus, X, Check, 
  TrendingUp, Target, Heart, Sparkles, Shield
} from 'lucide-react';
import OptimizedImage from '../../../components/OptimizedImage';
import BadgeGrid from '../../../components/BadgeGrid';

export default function JobseekerProfile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('basic'); // basic, experience, showcase, settings
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    country: 'Papua New Guinea',
    headline: '',
    bio: '',
    skills: [],
    top_skills: [], // Pinned skills
    languages: [],
    certifications: [],
    work_history: [],
    education: [],
    volunteer: [],
    projects: [],
    awards: [],
    featured: [],
    cv_url: '',
    profile_photo_url: '',
    profile_banner_url: '',
    profile_video_url: '',
    desired_job_type: '',
    desired_salary_min: '',
    desired_salary_max: '',
    availability: 'Immediate',
    open_to_work: false,
    profile_visibility: 'public',
    profile_slug: '',
    social_links: { linkedin: '', github: '', twitter: '', website: '' },
    profile_views: 0
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Intermediate' });
  const [newCertification, setNewCertification] = useState({ name: '', issuer: '', year: '' });
  const [newWork, setNewWork] = useState({ company: '', title: '', start_date: '', end_date: '', current: false, description: '' });
  const [newEducation, setNewEducation] = useState({ institution: '', degree: '', field: '', start_date: '', end_date: '', current: false });
  const [newVolunteer, setNewVolunteer] = useState({ organization: '', role: '', start_date: '', end_date: '', current: false, description: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '', url: '', date: '' });
  const [newAward, setNewAward] = useState({ title: '', issuer: '', date: '', description: '' });
  const [newFeatured, setNewFeatured] = useState({ type: 'link', title: '', url: '', description: '' }); // type: link, media, document

  const countries = [
    'Papua New Guinea', 'Fiji', 'Solomon Islands', 'Vanuatu', 'Samoa', 'Tonga', 'Kiribati', 'Tuvalu',
  ];

  const proficiencyLevels = ['Basic', 'Intermediate', 'Fluent', 'Native'];

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
          headline: data.profile.headline || '',
          bio: data.profile.bio || '',
          skills: data.profile.skills ? JSON.parse(data.profile.skills) : [],
          top_skills: data.profile.top_skills ? JSON.parse(data.profile.top_skills) : [],
          languages: data.profile.languages ? JSON.parse(data.profile.languages) : [],
          certifications: data.profile.certifications ? JSON.parse(data.profile.certifications) : [],
          work_history: data.profile.work_history ? JSON.parse(data.profile.work_history) : [],
          education: data.profile.education ? JSON.parse(data.profile.education) : [],
          volunteer: data.profile.volunteer ? JSON.parse(data.profile.volunteer) : [],
          projects: data.profile.projects ? JSON.parse(data.profile.projects) : [],
          awards: data.profile.awards ? JSON.parse(data.profile.awards) : [],
          featured: data.profile.featured ? JSON.parse(data.profile.featured) : [],
          cv_url: data.profile.cv_url || '',
          profile_photo_url: data.profile.profile_photo_url || '',
          profile_banner_url: data.profile.profile_banner_url || '',
          profile_video_url: data.profile.profile_video_url || '',
          desired_job_type: data.profile.desired_job_type || '',
          desired_salary_min: data.profile.desired_salary_min || '',
          desired_salary_max: data.profile.desired_salary_max || '',
          availability: data.profile.availability || 'Immediate',
          open_to_work: data.profile.open_to_work === 1,
          profile_visibility: data.profile.profile_visibility || 'public',
          profile_slug: data.profile.profile_slug || '',
          social_links: data.profile.social_links ? JSON.parse(data.profile.social_links) : { linkedin: '', github: '', twitter: '', website: '' },
          profile_views: data.profile.profile_views || 0
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileStrength = () => {
    let score = 0;
    let total = 20;
    
    // Basic info (5 points)
    if (formData.phone) score++;
    if (formData.location) score++;
    if (formData.headline) score++;
    if (formData.bio && formData.bio.length > 100) score += 2;
    
    // Professional content (8 points)
    if (formData.skills.length >= 5) score += 2;
    if (formData.work_history.length >= 1) score += 2;
    if (formData.education.length >= 1) score += 2;
    if (formData.languages.length >= 1) score++;
    if (formData.certifications.length >= 1) score++;
    
    // Media (4 points)
    if (formData.profile_photo_url) score += 2;
    if (formData.cv_url) score += 2;
    
    // Showcase (3 points)
    if (formData.projects.length >= 1) score++;
    if (formData.volunteer.length >= 1) score++;
    if (formData.featured.length >= 1) score++;
    
    const percentage = Math.round((score / total) * 100);
    
    // Return level
    if (percentage >= 90) return { level: 'All-Star', percentage, color: 'purple', emoji: '⭐' };
    if (percentage >= 75) return { level: 'Expert', percentage, color: 'blue', emoji: '🎯' };
    if (percentage >= 50) return { level: 'Intermediate', percentage, color: 'green', emoji: '📈' };
    return { level: 'Beginner', percentage, color: 'amber', emoji: '🌱' };
  };

  const getProfileTips = () => {
    const tips = [];
    if (!formData.profile_photo_url) tips.push('Add a professional profile photo (+10% profile views)');
    if (!formData.headline || formData.headline.length < 30) tips.push('Write a detailed headline (30-120 chars)');
    if (!formData.bio || formData.bio.length < 100) tips.push('Write a compelling "About" section (150+ words)');
    if (formData.skills.length < 5) tips.push('Add at least 5 skills to increase match rates');
    if (formData.work_history.length === 0) tips.push('Add work experience to build credibility');
    if (formData.education.length === 0) tips.push('Add your education background');
    if (!formData.cv_url) tips.push('Upload your CV/Resume for easy applications');
    if (formData.languages.length === 0) tips.push('Add languages you speak');
    if (formData.top_skills.length === 0) tips.push('Pin your top 3-5 skills to highlight strengths');
    if (formData.projects.length === 0) tips.push('Showcase projects you\'ve worked on');
    if (!formData.profile_slug) tips.push('Create a custom profile URL');
    if (!formData.profile_banner_url) tips.push('Add a banner image for visual impact');
    return tips;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = {
        ...formData,
        skills: JSON.stringify(formData.skills),
        top_skills: JSON.stringify(formData.top_skills),
        languages: JSON.stringify(formData.languages),
        certifications: JSON.stringify(formData.certifications),
        work_history: JSON.stringify(formData.work_history),
        education: JSON.stringify(formData.education),
        volunteer: JSON.stringify(formData.volunteer),
        projects: JSON.stringify(formData.projects),
        awards: JSON.stringify(formData.awards),
        featured: JSON.stringify(formData.featured),
        social_links: JSON.stringify(formData.social_links),
        open_to_work: formData.open_to_work ? 1 : 0
      };
      await profileAPI.update(submitData);
      showToast('Profile updated successfully! 🎉', 'success');
    } catch (error) {
      showToast('Failed to update profile: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Skills
  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    const skillToRemove = formData.skills[index];
    setFormData({ 
      ...formData, 
      skills: formData.skills.filter((_, i) => i !== index),
      top_skills: formData.top_skills.filter(s => s !== skillToRemove)
    });
  };

  const toggleTopSkill = (skill) => {
    if (formData.top_skills.includes(skill)) {
      setFormData({ ...formData, top_skills: formData.top_skills.filter(s => s !== skill) });
    } else {
      if (formData.top_skills.length < 5) {
        setFormData({ ...formData, top_skills: [...formData.top_skills, skill] });
      } else {
        showToast('You can pin a maximum of 5 top skills', 'warning');
      }
    }
  };

  // Languages
  const addLanguage = () => {
    if (newLanguage.language.trim()) {
      setFormData({ ...formData, languages: [...formData.languages, newLanguage] });
      setNewLanguage({ language: '', proficiency: 'Intermediate' });
    }
  };

  const removeLanguage = (index) => {
    setFormData({ ...formData, languages: formData.languages.filter((_, i) => i !== index) });
  };

  // Certifications
  const addCertification = () => {
    if (newCertification.name.trim()) {
      setFormData({ ...formData, certifications: [...formData.certifications, newCertification] });
      setNewCertification({ name: '', issuer: '', year: '' });
    }
  };

  const removeCertification = (index) => {
    setFormData({ ...formData, certifications: formData.certifications.filter((_, i) => i !== index) });
  };

  // Work History
  const addWork = () => {
    if (newWork.company.trim() && newWork.title.trim()) {
      setFormData({ ...formData, work_history: [...formData.work_history, newWork] });
      setNewWork({ company: '', title: '', start_date: '', end_date: '', current: false, description: '' });
    }
  };

  const removeWork = (index) => {
    setFormData({ ...formData, work_history: formData.work_history.filter((_, i) => i !== index) });
  };

  // Education
  const addEducation = () => {
    if (newEducation.institution.trim() && newEducation.degree.trim()) {
      setFormData({ ...formData, education: [...formData.education, newEducation] });
      setNewEducation({ institution: '', degree: '', field: '', start_date: '', end_date: '', current: false });
    }
  };

  const removeEducation = (index) => {
    setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
  };

  // Volunteer
  const addVolunteer = () => {
    if (newVolunteer.organization.trim() && newVolunteer.role.trim()) {
      setFormData({ ...formData, volunteer: [...formData.volunteer, newVolunteer] });
      setNewVolunteer({ organization: '', role: '', start_date: '', end_date: '', current: false, description: '' });
    }
  };

  const removeVolunteer = (index) => {
    setFormData({ ...formData, volunteer: formData.volunteer.filter((_, i) => i !== index) });
  };

  // Projects
  const addProject = () => {
    if (newProject.name.trim()) {
      setFormData({ ...formData, projects: [...formData.projects, newProject] });
      setNewProject({ name: '', description: '', url: '', date: '' });
    }
  };

  const removeProject = (index) => {
    setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== index) });
  };

  // Awards
  const addAward = () => {
    if (newAward.title.trim()) {
      setFormData({ ...formData, awards: [...formData.awards, newAward] });
      setNewAward({ title: '', issuer: '', date: '', description: '' });
    }
  };

  const removeAward = (index) => {
    setFormData({ ...formData, awards: formData.awards.filter((_, i) => i !== index) });
  };

  // Featured
  const addFeatured = () => {
    if (newFeatured.title.trim()) {
      setFormData({ ...formData, featured: [...formData.featured, newFeatured] });
      setNewFeatured({ type: 'link', title: '', url: '', description: '' });
    }
  };

  const removeFeatured = (index) => {
    setFormData({ ...formData, featured: formData.featured.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const strength = calculateProfileStrength();
  const tips = getProfileTips();

  return (
    <div className="pb-12">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.open(`/profile/${formData.profile_slug || user?.id}`, '_blank')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Public Profile
            </button>
          </div>
        </div>

        {/* Profile Strength */}
        <div className={`bg-gradient-to-r from-${strength.color}-50 to-${strength.color}-100 rounded-lg p-4 mb-4`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{strength.emoji}</span>
              <div>
                <h3 className="font-semibold text-gray-900">Profile Strength: {strength.level}</h3>
                <p className="text-sm text-gray-600">{strength.percentage}% complete</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{formData.profile_views} views</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-gradient-to-r from-${strength.color}-500 to-${strength.color}-600 transition-all duration-500`}
              style={{ width: `${strength.percentage}%` }}
            />
          </div>
        </div>

        {/* Tips */}
        {tips.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Ways to improve your profile:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  {tips.slice(0, 3).map((tip, i) => (
                    <li key={i}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        <div className="mt-4">
          <BadgeGrid compact />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-t pt-4">
          {[
            { id: 'basic', label: 'Basic Info', icon: User },
            { id: 'experience', label: 'Experience', icon: Briefcase },
            { id: 'showcase', label: 'Showcase', icon: Star },
            { id: 'settings', label: 'Settings', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id 
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <>
            {/* Profile Banner & Photo */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="h-48 bg-gradient-to-r from-primary-500 to-blue-500 relative">
                {formData.profile_banner_url && (
                  <OptimizedImage src={formData.profile_banner_url} alt="Banner" className="w-full h-full object-cover" eager />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const url = prompt('Enter banner image URL:', formData.profile_banner_url);
                    if (url !== null) setFormData({ ...formData, profile_banner_url: url });
                  }}
                  className="absolute top-4 right-4 px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-100"
                >
                  <Image className="w-4 h-4" />
                  {formData.profile_banner_url ? 'Change' : 'Add'} Banner
                </button>
              </div>

              {/* Profile Photo + Header */}
              <div className="px-6 pb-6">
                <div className="flex items-start gap-6 -mt-16 relative">
                  <div className="relative">
                    {formData.profile_photo_url ? (
                      <OptimizedImage 
                        src={formData.profile_photo_url} 
                        alt="Profile" 
                        width={128} height={128}
                        className={`w-32 h-32 rounded-full object-cover border-4 ${formData.open_to_work ? 'border-green-500' : 'border-white'} shadow-lg`} 
                        eager
                      />
                    ) : (
                      <div className={`w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-400 border-4 ${formData.open_to_work ? 'border-green-500' : 'border-white'} shadow-lg`}>
                        {user?.name?.charAt(0)}
                      </div>
                    )}
                    {formData.open_to_work && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Open to work
                      </div>
                    )}
                  </div>
                  <div className="flex-1 mt-16">
                    <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                    {formData.headline && <p className="text-lg text-gray-600 mt-1">{formData.headline}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                      {formData.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {formData.location}, {formData.country}
                        </span>
                      )}
                      {formData.profile_views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {formData.profile_views} profile views
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter profile photo URL:', formData.profile_photo_url);
                      if (url !== null) setFormData({ ...formData, profile_photo_url: url });
                    }}
                    className="mt-16 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </h2>
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

            {/* Headline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Professional Headline</h2>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Senior Software Engineer | Full Stack Developer | Tech Enthusiast"
                maxLength="120"
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.headline.length}/120 chars • A one-line summary shown on search results
              </p>
            </div>

            {/* About */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                About
              </h2>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Write a compelling summary about yourself, your experience, achievements, and career goals. This is your elevator pitch to employers..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.bio.length} chars • Tip: Aim for 150+ words to tell your story effectively
              </p>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Skills</h2>
              
              {/* Top Skills */}
              {formData.top_skills.length > 0 && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    Top Skills (Pinned)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.top_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-primary-500 to-blue-500 text-white font-medium shadow-sm"
                      >
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {skill}
                        <button
                          type="button"
                          onClick={() => toggleTopSkill(skill)}
                          className="ml-2 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Type a skill and press Enter"
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
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="ml-2 text-primary-900 hover:text-primary-700 font-bold"
                    >
                      ×
                    </button>
                    {!formData.top_skills.includes(skill) && (
                      <button
                        type="button"
                        onClick={() => toggleTopSkill(skill)}
                        className="ml-1 text-yellow-500 hover:text-yellow-600"
                        title="Pin as top skill"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {formData.skills.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">Add skills like "JavaScript", "Project Management", "Data Analysis"</p>
              )}
              <p className="text-xs text-gray-500 mt-2">💡 Click the star icon to pin your top 3-5 skills</p>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Languages</h2>
              
              {formData.languages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.languages.map((lang, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-blue-100 text-blue-700 font-medium">
                      {lang.language} - {lang.proficiency}
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="ml-2 text-blue-900 hover:text-blue-700 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLanguage.language}
                  onChange={(e) => setNewLanguage({ ...newLanguage, language: e.target.value })}
                  placeholder="Language (e.g. English)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <select
                  value={newLanguage.proficiency}
                  onChange={(e) => setNewLanguage({ ...newLanguage, proficiency: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  {proficiencyLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* CV Upload */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                CV/Resume
              </h2>
              <input
                type="url"
                value={formData.cv_url}
                onChange={(e) => setFormData({ ...formData, cv_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/my-cv.pdf"
              />
              <p className="text-sm text-gray-500 mt-2">
                Upload your CV to Google Drive, Dropbox, or similar and paste the shareable link here
              </p>
              {formData.cv_url && (
                <a
                  href={formData.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-primary-600 hover:text-primary-700 text-sm underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview your CV
                </a>
              )}
            </div>

            {/* Job Preferences */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Job Preferences
              </h2>
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
          </>
        )}

        {/* Experience Tab */}
        {activeTab === 'experience' && (
          <>
            {/* Work Experience */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Experience
              </h2>
              
              {formData.work_history.length > 0 && (
                <div className="space-y-4 mb-6">
                  {formData.work_history.map((work, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeWork(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <h4 className="font-semibold text-gray-900">{work.title}</h4>
                      <p className="text-gray-700">{work.company}</p>
                      <p className="text-sm text-gray-600">
                        {work.start_date} - {work.current ? 'Present' : work.end_date}
                      </p>
                      {work.description && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{work.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Work Experience</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newWork.company}
                    onChange={(e) => setNewWork({ ...newWork, company: e.target.value })}
                    placeholder="Company Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newWork.title}
                    onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
                    placeholder="Job Title *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newWork.start_date}
                    onChange={(e) => setNewWork({ ...newWork, start_date: e.target.value })}
                    placeholder="Start Date (e.g. Jan 2020)"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newWork.end_date}
                    onChange={(e) => setNewWork({ ...newWork, end_date: e.target.value })}
                    placeholder="End Date (e.g. Dec 2022)"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    disabled={newWork.current}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="currentWork"
                      checked={newWork.current}
                      onChange={(e) => setNewWork({ ...newWork, current: e.target.checked, end_date: e.target.checked ? '' : newWork.end_date })}
                      className="mr-2"
                    />
                    <label htmlFor="currentWork" className="text-sm text-gray-700">I currently work here</label>
                  </div>
                </div>
                <textarea
                  value={newWork.description}
                  onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                  placeholder="Describe your responsibilities, achievements, and key contributions..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-3"
                />
                <button
                  type="button"
                  onClick={addWork}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education
              </h2>
              
              {formData.education.length > 0 && (
                <div className="space-y-4 mb-6">
                  {formData.education.map((edu, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <h4 className="font-semibold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h4>
                      <p className="text-gray-700">{edu.institution}</p>
                      <p className="text-sm text-gray-600">
                        {edu.start_date} - {edu.current ? 'Present' : edu.end_date}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Education</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newEducation.institution}
                    onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                    placeholder="Institution Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newEducation.degree}
                    onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
                    placeholder="Degree/Certificate *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newEducation.field}
                    onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                    placeholder="Field of Study"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newEducation.start_date}
                    onChange={(e) => setNewEducation({ ...newEducation, start_date: e.target.value })}
                    placeholder="Start Year (e.g. 2015)"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newEducation.end_date}
                    onChange={(e) => setNewEducation({ ...newEducation, end_date: e.target.value })}
                    placeholder="End Year (e.g. 2019)"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    disabled={newEducation.current}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="currentEdu"
                      checked={newEducation.current}
                      onChange={(e) => setNewEducation({ ...newEducation, current: e.target.checked, end_date: e.target.checked ? '' : newEducation.end_date })}
                      className="mr-2"
                    />
                    <label htmlFor="currentEdu" className="text-sm text-gray-700">Currently studying here</label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addEducation}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Education
                </button>
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Certifications
              </h2>
              
              {formData.certifications.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formData.certifications.map((cert, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 relative">
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <p className="font-semibold text-gray-900">{cert.name}</p>
                      <p className="text-sm text-gray-600">{cert.issuer} {cert.year && `• ${cert.year}`}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newCertification.name}
                  onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                  placeholder="Certificate Name"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="text"
                  value={newCertification.issuer}
                  onChange={(e) => setNewCertification({ ...newCertification, issuer: e.target.value })}
                  placeholder="Issuing Organization"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCertification.year}
                    onChange={(e) => setNewCertification({ ...newCertification, year: e.target.value })}
                    placeholder="Year"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addCertification}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Volunteer Experience */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Volunteer Experience
              </h2>
              
              {formData.volunteer.length > 0 && (
                <div className="space-y-4 mb-6">
                  {formData.volunteer.map((vol, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeVolunteer(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <h4 className="font-semibold text-gray-900">{vol.role}</h4>
                      <p className="text-gray-700">{vol.organization}</p>
                      <p className="text-sm text-gray-600">
                        {vol.start_date} - {vol.current ? 'Present' : vol.end_date}
                      </p>
                      {vol.description && (
                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{vol.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Volunteer Experience</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newVolunteer.organization}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, organization: e.target.value })}
                    placeholder="Organization Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newVolunteer.role}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, role: e.target.value })}
                    placeholder="Role *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newVolunteer.start_date}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, start_date: e.target.value })}
                    placeholder="Start Date"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newVolunteer.end_date}
                    onChange={(e) => setNewVolunteer({ ...newVolunteer, end_date: e.target.value })}
                    placeholder="End Date"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    disabled={newVolunteer.current}
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="currentVol"
                      checked={newVolunteer.current}
                      onChange={(e) => setNewVolunteer({ ...newVolunteer, current: e.target.checked, end_date: e.target.checked ? '' : newVolunteer.end_date })}
                      className="mr-2"
                    />
                    <label htmlFor="currentVol" className="text-sm text-gray-700">Currently volunteering</label>
                  </div>
                </div>
                <textarea
                  value={newVolunteer.description}
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, description: e.target.value })}
                  placeholder="Describe your volunteer work and impact..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-3"
                />
                <button
                  type="button"
                  onClick={addVolunteer}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Volunteer Experience
                </button>
              </div>
            </div>
          </>
        )}

        {/* Showcase Tab */}
        {activeTab === 'showcase' && (
          <>
            {/* Featured */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Featured
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Showcase your best work, articles, or media at the top of your profile
              </p>
              
              {formData.featured.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {formData.featured.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeFeatured(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary-100 rounded">
                          {item.type === 'link' && <ExternalLink className="w-5 h-5 text-primary-600" />}
                          {item.type === 'media' && <Image className="w-5 h-5 text-primary-600" />}
                          {item.type === 'document' && <FileText className="w-5 h-5 text-primary-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                          {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-700 mt-1 inline-block truncate">
                              {item.url}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Featured Item</h4>
                <div className="space-y-3">
                  <select
                    value={newFeatured.type}
                    onChange={(e) => setNewFeatured({ ...newFeatured, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="link">Link (Article, Website)</option>
                    <option value="media">Media (Image, Video)</option>
                    <option value="document">Document (PDF, Presentation)</option>
                  </select>
                  <input
                    type="text"
                    value={newFeatured.title}
                    onChange={(e) => setNewFeatured({ ...newFeatured, title: e.target.value })}
                    placeholder="Title *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="url"
                    value={newFeatured.url}
                    onChange={(e) => setNewFeatured({ ...newFeatured, url: e.target.value })}
                    placeholder="URL *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <textarea
                    value={newFeatured.description}
                    onChange={(e) => setNewFeatured({ ...newFeatured, description: e.target.value })}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <button
                  type="button"
                  onClick={addFeatured}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Featured Item
                </button>
              </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Projects
              </h2>
              
              {formData.projects.length > 0 && (
                <div className="space-y-4 mb-6">
                  {formData.projects.map((project, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeProject(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{project.name}</h4>
                          {project.date && <p className="text-sm text-gray-600">{project.date}</p>}
                        </div>
                        {project.url && (
                          <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-sm text-gray-700 mt-2">{project.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Project</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Project Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newProject.date}
                    onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                    placeholder="Date (e.g. Jan 2023)"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="url"
                    value={newProject.url}
                    onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                    placeholder="Project URL (optional)"
                    className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe the project, your role, and outcomes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-3"
                />
                <button
                  type="button"
                  onClick={addProject}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Project
                </button>
              </div>
            </div>

            {/* Awards */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Awards & Honors
              </h2>
              
              {formData.awards.length > 0 && (
                <div className="space-y-4 mb-6">
                  {formData.awards.map((award, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                      <button
                        type="button"
                        onClick={() => removeAward(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        ×
                      </button>
                      <h4 className="font-semibold text-gray-900">{award.title}</h4>
                      <p className="text-sm text-gray-700">{award.issuer} {award.date && `• ${award.date}`}</p>
                      {award.description && <p className="text-sm text-gray-600 mt-2">{award.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Award</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={newAward.title}
                    onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                    placeholder="Award Title *"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newAward.issuer}
                    onChange={(e) => setNewAward({ ...newAward, issuer: e.target.value })}
                    placeholder="Issuing Organization"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    value={newAward.date}
                    onChange={(e) => setNewAward({ ...newAward, date: e.target.value })}
                    placeholder="Date"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <textarea
                  value={newAward.description}
                  onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-3"
                />
                <button
                  type="button"
                  onClick={addAward}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Award
                </button>
              </div>
            </div>

            {/* Profile Video */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5" />
                Profile Video
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Add a short video introducing yourself (YouTube, Vimeo, or direct video link)
              </p>
              <input
                type="url"
                value={formData.profile_video_url}
                onChange={(e) => setFormData({ ...formData, profile_video_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            {/* Social Links */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Social Links
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.social_links.linkedin}
                    onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, linkedin: e.target.value }})}
                    placeholder="LinkedIn profile URL"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.social_links.github}
                    onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, github: e.target.value }})}
                    placeholder="GitHub profile URL"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Twitter className="w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.social_links.twitter}
                    onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, twitter: e.target.value }})}
                    placeholder="Twitter/X profile URL"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-500" />
                  <input
                    type="url"
                    value={formData.social_links.website}
                    onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, website: e.target.value }})}
                    placeholder="Personal website URL"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            {/* Open to Work */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Open to Work
              </h2>
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="openToWork"
                  checked={formData.open_to_work}
                  onChange={(e) => setFormData({ ...formData, open_to_work: e.target.checked })}
                  className="mt-1"
                />
                <label htmlFor="openToWork" className="flex-1">
                  <p className="font-medium text-gray-900">Show "Open to Work" badge on your profile</p>
                  <p className="text-sm text-gray-600 mt-1">
                    This adds a green ring to your profile photo and makes you more visible to recruiters
                  </p>
                </label>
              </div>
            </div>

            {/* Profile Visibility */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Profile Visibility
              </h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.profile_visibility === 'public'}
                    onChange={(e) => setFormData({ ...formData, profile_visibility: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Public</p>
                    <p className="text-sm text-gray-600">Anyone can view your profile, including search engines</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="visibility"
                    value="members"
                    checked={formData.profile_visibility === 'members'}
                    onChange={(e) => setFormData({ ...formData, profile_visibility: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Members Only</p>
                    <p className="text-sm text-gray-600">Only logged-in WantokJobs users can view your profile</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.profile_visibility === 'private'}
                    onChange={(e) => setFormData({ ...formData, profile_visibility: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Private</p>
                    <p className="text-sm text-gray-600">Only you can view your full profile</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom Profile URL */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Custom Profile URL</h2>
              <p className="text-sm text-gray-600 mb-3">
                Create a memorable URL for your profile (letters, numbers, hyphens only)
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">wantokjobs.com/profile/</span>
                <input
                  type="text"
                  value={formData.profile_slug}
                  onChange={(e) => setFormData({ ...formData, profile_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="john-smith"
                  maxLength="50"
                />
              </div>
              {formData.profile_slug && (
                <p className="text-sm text-primary-600 mt-2">
                  Your profile URL: wantokjobs.com/profile/{formData.profile_slug}
                </p>
              )}
            </div>
          </>
        )}

        {/* Submit Button (sticky) */}
        <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 rounded-lg shadow-lg border-t">
          <button
            type="button"
            onClick={() => window.open(`/profile/${formData.profile_slug || user?.id}`, '_blank')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium flex items-center gap-2"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
