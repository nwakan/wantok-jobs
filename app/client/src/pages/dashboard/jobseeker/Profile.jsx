import { useState, useEffect } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function JobseekerProfile() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    country: 'Papua New Guinea',
    headline: '',
    bio: '',
    skills: [],
    languages: [],
    certifications: [],
    work_history: [],
    education: [],
    cv_url: '',
    profile_photo_url: '',
    desired_job_type: '',
    desired_salary_min: '',
    desired_salary_max: '',
    availability: 'Immediate',
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Intermediate' });
  const [newCertification, setNewCertification] = useState({ name: '', issuer: '', year: '' });
  const [newWork, setNewWork] = useState({ company: '', title: '', start_date: '', end_date: '', current: false, description: '' });
  const [newEducation, setNewEducation] = useState({ institution: '', degree: '', field: '', start_date: '', end_date: '', current: false });

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
          languages: data.profile.languages ? JSON.parse(data.profile.languages) : [],
          certifications: data.profile.certifications ? JSON.parse(data.profile.certifications) : [],
          work_history: data.profile.work_history ? JSON.parse(data.profile.work_history) : [],
          education: data.profile.education ? JSON.parse(data.profile.education) : [],
          cv_url: data.profile.cv_url || '',
          profile_photo_url: data.profile.profile_photo_url || '',
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

  const calculateProfileCompleteness = () => {
    let completed = 0;
    let total = 11;
    
    if (formData.phone) completed++;
    if (formData.location) completed++;
    if (formData.headline) completed++;
    if (formData.bio) completed++;
    if (formData.skills.length > 0) completed++;
    if (formData.work_history.length > 0) completed++;
    if (formData.education.length > 0) completed++;
    if (formData.cv_url) completed++;
    if (formData.profile_photo_url) completed++;
    if (formData.languages.length > 0) completed++;
    if (formData.certifications.length > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const getProfileTips = () => {
    const tips = [];
    if (!formData.profile_photo_url) tips.push('Add a professional profile photo');
    if (!formData.headline) tips.push('Add a compelling headline');
    if (!formData.bio) tips.push('Write a professional summary');
    if (formData.skills.length === 0) tips.push('Add your skills');
    if (formData.work_history.length === 0) tips.push('Add work experience');
    if (formData.education.length === 0) tips.push('Add your education');
    if (!formData.cv_url) tips.push('Upload your CV/Resume');
    if (formData.languages.length === 0) tips.push('Add languages you speak');
    if (formData.certifications.length === 0) tips.push('Add certifications (if any)');
    return tips;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = {
        ...formData,
        skills: JSON.stringify(formData.skills),
        languages: JSON.stringify(formData.languages),
        certifications: JSON.stringify(formData.certifications),
        work_history: JSON.stringify(formData.work_history),
        education: JSON.stringify(formData.education)
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
    setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) });
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const completeness = calculateProfileCompleteness();
  const tips = getProfileTips();

  // Profile Preview Modal
  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg max-w-4xl w-full my-8">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold">Profile Preview - Employer View</h2>
            <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          <div className="p-8 overflow-y-auto max-h-[80vh]">
            {/* Preview Content */}
            <div className="flex items-start gap-6 mb-6">
              {formData.profile_photo_url ? (
                <img src={formData.profile_photo_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-primary-500" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl text-gray-400">
                  {user?.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-3xl font-bold text-gray-900">{user?.name}</h3>
                {formData.headline && <p className="text-xl text-gray-600 mt-1">{formData.headline}</p>}
                <div className="flex gap-4 mt-3 text-sm text-gray-600">
                  <span>📍 {formData.location}, {formData.country}</span>
                  <span>📞 {formData.phone}</span>
                  <span>✉️ {user?.email}</span>
                </div>
              </div>
            </div>

            {formData.bio && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-2">Professional Summary</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{formData.bio}</p>
              </div>
            )}

            {formData.work_history.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Work Experience</h4>
                {formData.work_history.map((work, i) => (
                  <div key={i} className="mb-4 border-l-2 border-primary-500 pl-4">
                    <h5 className="font-semibold text-gray-900">{work.title}</h5>
                    <p className="text-gray-700">{work.company}</p>
                    <p className="text-sm text-gray-600">
                      {work.start_date} - {work.current ? 'Present' : work.end_date}
                    </p>
                    {work.description && <p className="text-gray-700 mt-2 whitespace-pre-wrap">{work.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {formData.education.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Education</h4>
                {formData.education.map((edu, i) => (
                  <div key={i} className="mb-4 border-l-2 border-primary-500 pl-4">
                    <h5 className="font-semibold text-gray-900">{edu.degree} {edu.field && `in ${edu.field}`}</h5>
                    <p className="text-gray-700">{edu.institution}</p>
                    <p className="text-sm text-gray-600">
                      {edu.start_date} - {edu.current ? 'Present' : edu.end_date}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {formData.skills.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formData.languages.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Languages</h4>
                <div className="flex flex-wrap gap-3">
                  {formData.languages.map((lang, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm">
                      {lang.language} - {lang.proficiency}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formData.certifications.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Certifications</h4>
                {formData.certifications.map((cert, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-semibold text-gray-900">{cert.name}</p>
                    <p className="text-sm text-gray-600">{cert.issuer} {cert.year && `• ${cert.year}`}</p>
                  </div>
                ))}
              </div>
            )}

            {formData.cv_url && (
              <div>
                <h4 className="text-lg font-bold mb-2">Resume/CV</h4>
                <a href={formData.cv_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                  View Full CV/Resume →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          👁️ Preview Profile
        </button>
      </div>

      {/* Profile Completeness */}
      <div className="bg-gradient-to-r from-primary-50 to-green-50 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Profile Completeness</h2>
          <span className="text-2xl font-bold text-primary-600">{completeness}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
        {tips.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Complete your profile to stand out:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            {formData.profile_photo_url ? (
              <img src={formData.profile_photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-primary-500" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-400">
                {user?.name?.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo URL</label>
              <input
                type="url"
                value={formData.profile_photo_url}
                onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/photo.jpg"
              />
              <p className="text-sm text-gray-500 mt-1">Upload to Google Drive, Dropbox, or use a direct image URL</p>
            </div>
          </div>
        </div>

        {/* Basic Info & Headline */}
        <div className="bg-white rounded-lg shadow-sm p-6">
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Professional Headline *</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. Senior Software Engineer | Full Stack Developer | Tech Enthusiast"
                maxLength="120"
              />
              <p className="text-sm text-gray-500 mt-1">A one-line summary that appears at the top of your profile</p>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Professional Summary</h2>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Write a compelling summary about yourself, your experience, achievements, and career goals. This is your elevator pitch to employers..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Tip: Highlight your key achievements, years of experience, and what makes you unique
          </p>
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Work Experience</h2>
          
          {/* Existing Work History */}
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

          {/* Add New Work */}
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
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              + Add Experience
            </button>
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Education</h2>
          
          {/* Existing Education */}
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

          {/* Add New Education */}
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
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              + Add Education
            </button>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Skills</h2>
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
              </span>
            ))}
          </div>
          {formData.skills.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Add skills like "JavaScript", "Project Management", "Data Analysis"</p>
          )}
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

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Certifications</h2>
          
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
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* CV/Resume Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">CV/Resume</h2>
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
              className="inline-block mt-2 text-primary-600 hover:text-primary-700 text-sm underline"
            >
              Preview your CV →
            </a>
          )}
        </div>

        {/* Job Preferences */}
        <div className="bg-white rounded-lg shadow-sm p-6">
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
        <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
          >
            👁️ Preview
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
