import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobs, applications, savedJobs } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { timeAgo, containsHTML, sanitizeHTML, copyToClipboard } from '../utils/helpers';
import JobCard from '../components/JobCard';
import PageHead from '../components/PageHead';
import { JobDetailSkeleton } from '../components/SkeletonLoader';
import { Star, Users, Eye, Flag, Building2, Briefcase, Calendar, TrendingUp, CheckCircle2, ArrowRight, ArrowLeft, FileText, Mail, Phone, MapPin, Upload, AlertCircle, X, Share2, Facebook, Linkedin, Copy, CheckCheck } from 'lucide-react';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationStep, setApplicationStep] = useState(1); // 1: Profile Check, 2: Contact Info, 3: Screening, 4: Review
  const [applicationSuccess, setApplicationSuccess] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState([]);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningQuestions, setScreeningQuestions] = useState([]);
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '', location: '' });
  const [cvUrl, setCvUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [companyReviews, setCompanyReviews] = useState({ rating: 0, count: 0 });
  const [matchedSkills, setMatchedSkills] = useState([]);
  const [jobsByCompany, setJobsByCompany] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [activeJobsTab, setActiveJobsTab] = useState('similar');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  useEffect(() => {
    if (job) {
      loadSimilarJobs();
      loadCompanyInfo();
      loadCompanyReviews();
      loadJobsByCompany();
      if (user) {
        loadSkillsMatch();
      }
    }
  }, [job, user]);

  // Add structured data for SEO
  useEffect(() => {
    if (!job) return;

    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description || job.excerpt || '',
      "identifier": {
        "@type": "PropertyValue",
        "name": "WantokJobs",
        "value": job.id
      },
      "datePosted": job.created_at,
      "validThrough": job.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "employmentType": job.job_type?.toUpperCase() || "FULL_TIME",
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company_name,
        "logo": job.logo_url || undefined
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": job.location,
          "addressCountry": job.country || "PG"
        }
      }
    };

    if (job.salary_min && job.salary_max) {
      structuredData.baseSalary = {
        "@type": "MonetaryAmount",
        "currency": job.currency || "PGK",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": job.salary_min,
          "maxValue": job.salary_max,
          "unitText": job.salary_period === 'yearly' ? 'YEAR' : 'MONTH'
        }
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    script.id = 'job-structured-data';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('job-structured-data');
      if (existing) existing.remove();
    };
  }, [job]);

  const loadJob = async () => {
    try {
      const data = await jobs.getById(id);
      setJob(data);
      
      // Check if job is saved
      if (user) {
        // Note: We'd need an API endpoint to check this, for now assume not saved
        setSaved(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load job:', error);
      setLoading(false);
    }
  };

  const loadSimilarJobs = async () => {
    try {
      // Task 2: Use the new similar jobs endpoint
      const response = await fetch(`/api/jobs/${id}/similar`);
      if (response.ok) {
        const data = await response.json();
        setSimilarJobs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load similar jobs:', error);
    }
  };

  const loadCompanyInfo = async () => {
    if (!job.employer_id) return;
    try {
      const response = await fetch(`/api/companies/${job.employer_id}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data.company);
      }
    } catch (error) {
      console.error('Failed to load company info:', error);
    }
  };

  const loadCompanyReviews = async () => {
    if (!job.employer_id) return;
    try {
      const response = await fetch(`/api/reviews/company/${job.employer_id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setCompanyReviews(data);
      }
    } catch (error) {
      console.error('Failed to load company reviews:', error);
    }
  };

  const loadJobsByCompany = async () => {
    if (!job.employer_id) return;
    try {
      const response = await jobs.getAll({ employer_id: job.employer_id, limit: 5 });
      setJobsByCompany(response.data.filter(j => j.id !== job.id).slice(0, 4));
    } catch (error) {
      console.error('Failed to load jobs by company:', error);
    }
  };

  const loadSkillsMatch = async () => {
    if (!user || user.role !== 'jobseeker') return;
    try {
      const response = await fetch(`/api/jobs/${id}/skills-match`);
      if (response.ok) {
        const data = await response.json();
        setMatchedSkills(data);
      }
    } catch (error) {
      console.error('Failed to load skills match:', error);
    }
  };

  // Profile completeness check
  const checkProfileCompleteness = async () => {
    if (!user || user.role !== 'jobseeker') return [];
    
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) return ['profile'];
      
      const profile = await response.json();
      const missing = [];
      
      if (!profile.phone && !profile.profile_phone) missing.push('phone');
      if (!profile.location && !profile.profile_location) missing.push('location');
      if (!profile.cv_url && !profile.profile_cv_url) missing.push('resume');
      if (!profile.headline) missing.push('headline');
      if (!profile.skills || (typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills).length === 0) missing.push('skills');
      
      // Load contact info and CV for form
      setContactInfo({
        name: user.name || '',
        email: user.email || '',
        phone: profile.phone || profile.profile_phone || '',
        location: profile.location || profile.profile_location || ''
      });
      setCvUrl(profile.cv_url || profile.profile_cv_url || '');
      
      return missing;
    } catch (error) {
      console.error('Failed to check profile:', error);
      return ['profile'];
    }
  };

  // Load screening questions for the job
  const loadScreeningQuestions = async () => {
    if (!job.screening_questions) return;
    
    try {
      const questions = typeof job.screening_questions === 'string' 
        ? JSON.parse(job.screening_questions) 
        : job.screening_questions;
      
      setScreeningQuestions(questions || []);
      
      // Initialize answers object
      const answers = {};
      (questions || []).forEach((q, idx) => {
        answers[idx] = '';
      });
      setScreeningAnswers(answers);
    } catch (error) {
      console.error('Failed to load screening questions:', error);
      setScreeningQuestions([]);
    }
  };

  // Handle opening apply modal
  const handleApplyClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (job.application_method === 'external' && job.application_url) {
      window.open(job.application_url, '_blank');
      showToast('Opening external application page...', 'info');
      return;
    }

    if (job.application_method === 'email' && job.application_email) {
      window.location.href = `mailto:${job.application_email}?subject=Application for ${job.title}`;
      showToast('Opening email client...', 'info');
      return;
    }

    // Check profile completeness
    const missing = await checkProfileCompleteness();
    setProfileIncomplete(missing);
    
    // Load screening questions
    await loadScreeningQuestions();
    
    // Load draft from localStorage
    const draftKey = `application-draft-${id}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setCoverLetter(parsed.coverLetter || '');
        setScreeningAnswers(parsed.screeningAnswers || {});
      } catch (e) {}
    }
    
    // Determine starting step
    if (missing.length > 0) {
      setApplicationStep(1); // Start at profile check
    } else {
      setApplicationStep(2); // Skip to contact info
    }
    
    setShowApplyModal(true);
  };

  // Save draft to localStorage
  const saveDraft = () => {
    const draftKey = `application-draft-${id}`;
    localStorage.setItem(draftKey, JSON.stringify({
      coverLetter,
      screeningAnswers,
      timestamp: Date.now()
    }));
  };

  // Handle step navigation
  const handleNextStep = () => {
    saveDraft();
    
    // Validate current step
    if (applicationStep === 2) {
      if (!contactInfo.phone || !contactInfo.location) {
        showToast('Please fill in all required contact information', 'error');
        return;
      }
    }
    
    if (applicationStep === 3 && screeningQuestions.length > 0) {
      const unanswered = screeningQuestions.find((q, idx) => !screeningAnswers[idx] || screeningAnswers[idx].trim() === '');
      if (unanswered) {
        showToast('Please answer all screening questions', 'error');
        return;
      }
    }
    
    // Skip step 3 if no screening questions
    if (applicationStep === 2 && screeningQuestions.length === 0) {
      setApplicationStep(4);
    } else {
      setApplicationStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    saveDraft();
    
    // Skip step 3 if no screening questions when going back
    if (applicationStep === 4 && screeningQuestions.length === 0) {
      setApplicationStep(2);
    } else {
      setApplicationStep(prev => prev - 1);
    }
  };

  // Submit application
  const handleApply = async (e) => {
    e.preventDefault();
    
    setApplying(true);
    try {
      const payload = {
        job_id: parseInt(id),
        cover_letter: coverLetter,
        cv_url: cvUrl,
        phone: contactInfo.phone,
        location: contactInfo.location,
      };
      
      // Add screening answers if any
      if (screeningQuestions.length > 0) {
        payload.screening_answers = Object.keys(screeningAnswers).map(key => ({
          question: screeningQuestions[parseInt(key)],
          answer: screeningAnswers[key]
        }));
      }
      
      await applications.create(payload);
      
      // Clear draft
      const draftKey = `application-draft-${id}`;
      localStorage.removeItem(draftKey);
      
      // Show success state
      setApplicationSuccess(true);
      
      // Track activity
      try {
        await fetch('/api/activity/track-apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: parseInt(id) })
        });
      } catch (e) {}
      
    } catch (error) {
      showToast(error.message || 'Failed to submit application', 'error');
    } finally {
      setApplying(false);
    }
  };

  // Close modal and reset
  const closeApplyModal = () => {
    setShowApplyModal(false);
    setApplicationSuccess(false);
    setApplicationStep(1);
    setCoverLetter('');
    setScreeningAnswers({});
    setProfileIncomplete([]);
  };

  const handleSaveJob = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (saved) {
        await savedJobs.unsave(id);
        setSaved(false);
        showToast('Job removed from saved', 'success');
      } else {
        await savedJobs.save(id);
        setSaved(true);
        showToast('Job saved!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Failed to save job', 'error');
    }
  };

  // Task 1: Enhanced social sharing functions
  const handleNativeShare = async () => {
    const shareData = {
      title: `${job.title} at ${job.company_name}`,
      text: `Check out this job opportunity: ${job.title} at ${job.company_name}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully!', 'success');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out this job: ${job.title} at ${job.company_name} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Job: ${job.title}`);
    const body = encodeURIComponent(`Check out this job at ${job.company_name}: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await copyToClipboard(url);
      setLinkCopied(true);
      showToast('Link copied to clipboard!', 'success');
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  // Task 4: Updated report handler with new API
  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    try {
      const response = await fetch('/api/jobs/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: parseInt(id),
          reason: reportReason,
          details: reportDetails || null,
        }),
      });

      if (response.ok) {
        showToast('Report submitted. Thank you for helping keep WantokJobs safe.', 'success');
        setShowReportModal(false);
        setReportReason('');
        setReportDetails('');
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      showToast(error.message || 'Failed to submit report', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PageHead title="Loading job..." description="Loading job details on WantokJobs" />
        <JobDetailSkeleton />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <PageHead title="Job Not Found — WantokJobs" description="This job listing could not be found." />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Job Not Found</h1>
          <p className="text-gray-600 mb-8">
            This job may have been filled, removed, or the link might be incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/jobs" className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors">
              Browse All Jobs
            </Link>
            <Link to="/" className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let requirements = [];
  try {
    requirements = job.requirements ? JSON.parse(job.requirements) : [];
  } catch (error) {
    console.error('Failed to parse requirements:', error);
    requirements = [];
  }

  const hasHTML = containsHTML(job.description);

  return (
    <div className="bg-gray-50 min-h-screen">
      {job && (
        <PageHead
          title={`${job.title}${job.company_name ? ` at ${job.company_name}` : ''} — ${job.location || 'PNG'}`}
          description={`Apply for ${job.title}${job.company_name ? ` at ${job.company_name}` : ''} in ${job.location || 'Papua New Guinea'}. ${job.job_type || 'Full-time'}${job.salary_min ? ` • ${job.salary_currency || 'PGK'} ${job.salary_min.toLocaleString()}${job.salary_max ? `-${job.salary_max.toLocaleString()}` : ''}` : ''}`}
          type="article"
          image={job.logo_url}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1 font-medium">
          ← Back to jobs
        </Link>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (65%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-start gap-4 mb-6">
                {job.logo_url && (
                  <img src={job.logo_url} alt={job.company_name} className="w-16 h-16 rounded-lg object-cover border-2 border-gray-100" />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {job.title}
                        {/* Task 3: Featured badge */}
                        {(!!job.is_featured && (!job.featured_until || new Date(job.featured_until) > new Date())) ? (
                          <span className="ml-3 inline-flex items-center px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-semibold rounded-full shadow-sm">
                            ⭐ Featured
                          </span>
                        ) : null}
                      </h1>
                      {job.company_name && job.company_name !== 'Various Employers' && (
                        <p className="text-lg text-gray-700 font-medium flex items-center gap-2">
                          {job.company_name}
                          {/* Task 5: Verification badge */}
                          {(job.employer_verified || job.company_verified) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Proof Bar */}
              {(job.applications_count > 0 || job.views_count > 0) ? (
                <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
                  {job.applications_count > 0 ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-medium">
                        {job.applications_count} {job.applications_count === 1 ? 'applicant' : 'applicants'}
                      </span>
                    </div>
                  ) : null}
                  {job.views_count > 0 ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{job.views_count} views</span>
                    </div>
                  ) : null}
                  {companyReviews.count > 0 ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">
                        {companyReviews.rating.toFixed(1)} ({companyReviews.count} reviews)
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Key Info Bar */}
              <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-gray-100">
                {job.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">📍</span>
                    <span className="font-medium">{job.location}, {job.country}</span>
                  </div>
                )}
                {job.job_type && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">💼</span>
                    <span className="font-medium capitalize">{job.job_type}</span>
                  </div>
                )}
                {job.salary_min && job.salary_max && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">💰</span>
                    <span className="font-medium">
                      {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                    </span>
                  </div>
                )}
                {job.created_at && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">🕒</span>
                    <span className="font-medium">Posted {timeAgo(job.created_at)}</span>
                  </div>
                )}
                {job.application_deadline && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-lg">⏰</span>
                    <span className="font-medium">
                      Closes {new Date(job.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Apply Button (Mobile) */}
              <div className="lg:hidden">
                {user?.role === 'jobseeker' && (
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Apply Now
                  </button>
                )}
                {!user && (
                  <Link
                    to="/login"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Login to Apply
                  </Link>
                )}
              </div>
            </div>

            {/* Skills Match (LinkedIn-style) */}
            {matchedSkills.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  How you match
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Skills match</span>
                    <span className="text-lg font-bold text-blue-600">
                      {matchedSkills.filter(s => s.matched).length}/{matchedSkills.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          skill.matched
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {skill.matched && '✓ '}
                        {skill.name}
                      </span>
                    ))}
                  </div>
                  {matchedSkills.filter(s => !s.matched).length > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      💡 Add missing skills to your profile to increase your match score
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Job Highlights */}
            {(job.salary_min || job.experience_level || job.job_type) && (
              <div className="bg-gradient-to-br from-primary-50 to-green-50 rounded-xl p-6 border border-primary-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">✨ Job Highlights</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {job.salary_min && job.salary_max && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💰</span>
                      <div>
                        <div className="font-semibold text-gray-900">Competitive Salary</div>
                        <div className="text-sm text-gray-700">
                          {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                  {job.job_type && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💼</span>
                      <div>
                        <div className="font-semibold text-gray-900">Job Type</div>
                        <div className="text-sm text-gray-700 capitalize">{job.job_type}</div>
                      </div>
                    </div>
                  )}
                  {job.experience_level && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📈</span>
                      <div>
                        <div className="font-semibold text-gray-900">Experience Level</div>
                        <div className="text-sm text-gray-700">{job.experience_level}</div>
                      </div>
                    </div>
                  )}
                  {job.industry && (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🏢</span>
                      <div>
                        <div className="font-semibold text-gray-900">Industry</div>
                        <div className="text-sm text-gray-700">{job.industry}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* About the Role */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About the Role</h2>
              {hasHTML ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(job.description) }}
                />
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </div>
              )}
            </div>

            {/* Requirements */}
            {requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Key Requirements</h2>
                <ul className="space-y-3">
                  {requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="text-primary-600 mt-1">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Enhanced Company Info (Glassdoor-style) */}
            {(companyInfo || job.company_description || job.website) && job.company_name !== 'Various Employers' && !job.company_description?.includes('System account for imported') && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">About {job.company_name}</h2>
                  {companyInfo?.verified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ✓ Verified
                    </span>
                  )}
                </div>

                {/* Company Stats */}
                {companyInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {companyInfo.company_size && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Company Size</div>
                        <div className="font-semibold text-gray-900">{companyInfo.company_size}</div>
                      </div>
                    )}
                    {companyInfo.industry && (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Industry</div>
                        <div className="font-semibold text-gray-900">{companyInfo.industry}</div>
                      </div>
                    )}
                    {companyReviews.count > 0 ? (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Rating</div>
                        <div className="font-semibold text-gray-900 flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {companyReviews.rating.toFixed(1)}
                        </div>
                      </div>
                    ) : null}
                    {companyInfo.total_jobs_posted > 0 ? (
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Jobs Posted</div>
                        <div className="font-semibold text-gray-900">{companyInfo.total_jobs_posted}</div>
                      </div>
                    ) : null}
                  </div>
                )}

                {(job.company_description || companyInfo?.description) && (
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {companyInfo?.description || job.company_description}
                  </p>
                )}

                {/* Company Actions */}
                <div className="flex flex-wrap gap-3">
                  {(job.website || companyInfo?.website) && (
                    <a
                      href={companyInfo?.website || job.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      🌐 Visit Website
                    </a>
                  )}
                  {jobsByCompany.length > 0 && (
                    <Link
                      to={`/jobs?employer_id=${job.employer_id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors font-medium"
                    >
                      <Briefcase className="w-4 h-4" />
                      See {jobsByCompany.length}+ more jobs
                    </Link>
                  )}
                  {companyReviews.count > 0 ? (
                    <Link
                      to={`/company/${job.employer_id}/reviews`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                    >
                      <Star className="w-4 h-4" />
                      Read {companyReviews.count} reviews
                    </Link>
                  ) : null}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                  <span className="font-medium">Job ID:</span> #{job.id}
                </div>
                <div>
                  <span className="font-medium">Views:</span> {job.views_count || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column (35%) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Apply Card - Sticky */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-6">
              <div className="space-y-3">
                {user?.role === 'jobseeker' && (
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Apply Now
                  </button>
                )}
                {!user && (
                  <Link
                    to="/login"
                    className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Login to Apply
                  </Link>
                )}
                
                {user && (
                  <button
                    onClick={handleSaveJob}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {saved ? '❤️ Saved' : '🤍 Save Job'}
                  </button>
                )}
                
                {/* Task 1: Social Sharing Buttons */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Share this job</p>
                  <div className="grid grid-cols-5 gap-2">
                    {/* WhatsApp - PRIORITY #1 */}
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex items-center justify-center px-3 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#20BA5A] transition-colors shadow-sm"
                      title="Share on WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>

                    {/* Facebook */}
                    <button
                      onClick={handleFacebookShare}
                      className="flex items-center justify-center px-3 py-3 bg-[#1877F2] text-white rounded-lg hover:bg-[#0C63D4] transition-colors shadow-sm"
                      title="Share on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </button>

                    {/* LinkedIn */}
                    <button
                      onClick={handleLinkedInShare}
                      className="flex items-center justify-center px-3 py-3 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors shadow-sm"
                      title="Share on LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </button>

                    {/* Email */}
                    <button
                      onClick={handleEmailShare}
                      className="flex items-center justify-center px-3 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                      title="Share via Email"
                    >
                      <Mail className="w-5 h-5" />
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center px-3 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shadow-sm"
                      title="Copy Link"
                    >
                      {linkCopied ? <CheckCheck className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Native Share (Mobile) */}
                  {navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      More sharing options
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  Report this job
                </button>
              </div>
            </div>

            {/* Company Snapshot */}
            {(job.location || job.company_name) ? (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Company Snapshot</h3>
                <div className="space-y-3 text-sm">
                  {job.company_name ? (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🏢</span>
                      <div>
                        <div className="text-gray-600">Company</div>
                        {job.company_name !== 'Various Employers' && job.employer_id ? (
                          <Link to={`/companies/${job.employer_id}`} className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
                            {job.company_name}
                          </Link>
                        ) : (
                          <div className="font-medium text-gray-900">{job.source ? 'Imported Job' : job.company_name}</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {job.location && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">📍</span>
                      <div>
                        <div className="text-gray-600">Location</div>
                        <div className="font-medium text-gray-900">{job.location}, {job.country}</div>
                      </div>
                    </div>
                  )}
                  {job.industry && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🏭</span>
                      <div>
                        <div className="text-gray-600">Industry</div>
                        <div className="font-medium text-gray-900">{job.industry}</div>
                      </div>
                    </div>
                  )}
                  {job.website && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[24px]">🌐</span>
                      <div>
                        <a 
                          href={job.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Visit Website →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Similar Jobs + Jobs from Company */}
            {(similarJobs.length > 0 || jobsByCompany.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                {jobsByCompany.length > 0 && similarJobs.length > 0 ? (
                  <>
                    <div className="flex gap-4 mb-4 border-b border-gray-200">
                      <button
                        onClick={() => setActiveJobsTab('similar')}
                        className={`pb-2 px-1 font-semibold text-sm transition-colors ${
                          activeJobsTab === 'similar'
                            ? 'border-b-2 border-primary-600 text-primary-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Similar Jobs
                      </button>
                      <button
                        onClick={() => setActiveJobsTab('company')}
                        className={`pb-2 px-1 font-semibold text-sm transition-colors ${
                          activeJobsTab === 'company'
                            ? 'border-b-2 border-primary-600 text-primary-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        More from {job.company_name}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {activeJobsTab === 'similar' &&
                        similarJobs.map(similarJob => (
                          <JobCard key={similarJob.id} job={similarJob} compact />
                        ))}
                      {activeJobsTab === 'company' &&
                        jobsByCompany.map(companyJob => (
                          <JobCard key={companyJob.id} job={companyJob} compact />
                        ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-gray-900 mb-4">
                      {jobsByCompany.length > 0 ? `More from ${job.company_name}` : 'Similar Jobs'}
                    </h3>
                    <div className="space-y-3">
                      {(jobsByCompany.length > 0 ? jobsByCompany : similarJobs).map(relatedJob => (
                        <JobCard key={relatedJob.id} job={relatedJob} compact />
                      ))}
                    </div>
                  </>
                )}
                <Link
                  to={jobsByCompany.length > 0 && activeJobsTab === 'company' 
                    ? `/jobs?employer_id=${job.employer_id}`
                    : '/jobs'}
                  className="block text-center mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View all jobs →
                </Link>
              </div>
            )}

            {/* Job Alert */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-bold text-gray-900 mb-2">Get Similar Jobs</h3>
              <p className="text-sm text-gray-700 mb-4">
                Receive email notifications when similar jobs are posted
              </p>
              <Link
                to="/job-alerts"
                className="block text-center w-full px-4 py-2 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-primary-200"
              >
                Create Job Alert
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Multi-Step Apply Modal (LinkedIn/Indeed-style) */}
      {showApplyModal && !applicationSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 md:flex md:items-center md:justify-center z-50 md:p-4 overflow-y-auto">
          <div className="bg-white md:rounded-xl md:max-w-3xl w-full h-full md:h-auto md:max-h-[90vh] md:shadow-2xl md:my-8 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Apply to {job.company_name}</h2>
                <p className="text-gray-600 mt-1">{job.title}</p>
              </div>
              <button
                onClick={closeApplyModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="px-6 pt-6">
              <div className="flex items-center justify-between mb-2">
                {[
                  { step: 1, label: 'Profile' },
                  { step: 2, label: 'Contact' },
                  ...(screeningQuestions.length > 0 ? [{ step: 3, label: 'Questions' }] : []),
                  { step: screeningQuestions.length > 0 ? 4 : 3, label: 'Review' }
                ].map((item, idx, arr) => (
                  <div key={item.step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        applicationStep >= item.step
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {applicationStep > item.step ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          item.step
                        )}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${
                        applicationStep >= item.step ? 'text-primary-600' : 'text-gray-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 -mt-8 transition-all ${
                        applicationStep > item.step ? 'bg-primary-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Profile Completeness Check */}
              {applicationStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Profile</h3>
                    <p className="text-gray-600">Make sure your profile is complete before applying</p>
                  </div>

                  {profileIncomplete.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900 mb-2">Profile Incomplete</h4>
                          <p className="text-sm text-amber-800 mb-3">
                            Complete your profile to improve your application success rate by 40%
                          </p>
                          <ul className="space-y-2 text-sm">
                            {profileIncomplete.includes('phone') && (
                              <li className="flex items-center gap-2 text-amber-900">
                                <Phone className="w-4 h-4" />
                                Phone number is required
                              </li>
                            )}
                            {profileIncomplete.includes('location') && (
                              <li className="flex items-center gap-2 text-amber-900">
                                <MapPin className="w-4 h-4" />
                                Location is required
                              </li>
                            )}
                            {profileIncomplete.includes('resume') && (
                              <li className="flex items-center gap-2 text-amber-900">
                                <FileText className="w-4 h-4" />
                                Resume/CV is required
                              </li>
                            )}
                            {profileIncomplete.includes('headline') && (
                              <li className="flex items-center gap-2 text-amber-900">
                                <Briefcase className="w-4 h-4" />
                                Professional headline is recommended
                              </li>
                            )}
                            {profileIncomplete.includes('skills') && (
                              <li className="flex items-center gap-2 text-amber-900">
                                <Star className="w-4 h-4" />
                                Add at least 3 skills
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Link
                          to="/dashboard/profile"
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors"
                        >
                          Complete Profile
                        </Link>
                        <button
                          onClick={handleNextStep}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                        >
                          Continue Anyway
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-900 mb-2">Profile Complete!</h4>
                          <p className="text-sm text-green-800">
                            Your profile looks great. You're ready to apply.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match Score Display */}
                  {matchedSkills.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h4 className="font-semibold text-blue-900 mb-2">Your Match Score</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl font-bold text-blue-600">
                          {Math.round((matchedSkills.filter(s => s.matched).length / matchedSkills.length) * 100)}%
                        </div>
                        <div className="text-sm text-blue-800">
                          {matchedSkills.filter(s => s.matched).length} of {matchedSkills.length} skills match
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.slice(0, 5).map((skill, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              skill.matched
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {skill.matched && '✓ '}
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Contact Information */}
              {applicationStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Information</h3>
                    <p className="text-gray-600">Verify your contact details</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={contactInfo.name}
                        onChange={(e) => setContactInfo({...contactInfo, name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={contactInfo.email}
                          onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
                          disabled
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="+675 ..."
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={contactInfo.location}
                          onChange={(e) => setContactInfo({...contactInfo, location: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Port Moresby, PNG"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resume/CV *
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={cvUrl}
                        onChange={(e) => setCvUrl(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="https://..."
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      URL to your CV (Dropbox, Google Drive, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter (Optional)
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Tell us why you're a great fit for this role..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        Optional, but recommended — applications with cover letters receive 40% more responses
                      </p>
                      <span className="text-xs text-gray-500">{coverLetter.length} chars</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Screening Questions */}
              {applicationStep === 3 && screeningQuestions.length > 0 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Screening Questions</h3>
                    <p className="text-gray-600">The employer has {screeningQuestions.length} additional questions</p>
                  </div>

                  {screeningQuestions.map((question, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        {idx + 1}. {question}
                      </label>
                      <textarea
                        value={screeningAnswers[idx] || ''}
                        onChange={(e) => setScreeningAnswers({...screeningAnswers, [idx]: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        placeholder="Your answer..."
                        required
                      />
                      <p className="text-xs text-gray-500 mt-2">{(screeningAnswers[idx] || '').length} characters</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {applicationStep === (screeningQuestions.length > 0 ? 4 : 3) && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Review Your Application</h3>
                    <p className="text-gray-600">Check everything before submitting</p>
                  </div>

                  {/* Contact Info Review */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 text-gray-900 font-medium">{contactInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 text-gray-900 font-medium">{contactInfo.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <span className="ml-2 text-gray-900 font-medium">{contactInfo.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Location:</span>
                        <span className="ml-2 text-gray-900 font-medium">{contactInfo.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resume */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 mb-2">Resume/CV</h4>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 underline flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Resume
                    </a>
                  </div>

                  {/* Cover Letter */}
                  {coverLetter.trim() && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <h4 className="font-semibold text-gray-900 mb-2">Cover Letter</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {coverLetter}
                      </p>
                    </div>
                  )}

                  {/* Screening Answers */}
                  {screeningQuestions.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <h4 className="font-semibold text-gray-900 mb-3">Screening Answers</h4>
                      <div className="space-y-4">
                        {screeningQuestions.map((question, idx) => (
                          <div key={idx}>
                            <p className="text-sm font-medium text-gray-900 mb-1">{idx + 1}. {question}</p>
                            <p className="text-sm text-gray-700 pl-4">{screeningAnswers[idx]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Before you submit:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                          <li>Double-check all information is correct</li>
                          <li>Your application cannot be edited after submission</li>
                          <li>You'll receive a confirmation email shortly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div>
                {applicationStep > 1 && (
                  <button
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeApplyModal}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Save Draft & Close
                </button>
                {applicationStep < (screeningQuestions.length > 0 ? 4 : 3) ? (
                  <button
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {applying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Application
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Success Modal */}
      {showApplyModal && applicationSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 md:flex md:items-center md:justify-center z-50 md:p-4 overflow-y-auto">
          <div className="bg-white md:rounded-xl md:max-w-2xl w-full h-full md:h-auto p-6 md:p-8 md:shadow-2xl overflow-y-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
              <p className="text-gray-600 mb-2">
                Your application for <span className="font-semibold">{job.title}</span> at{' '}
                <span className="font-semibold">{job.company_name}</span> has been submitted.
              </p>
              <p className="text-gray-600 mb-8">
                You'll receive a confirmation email at <span className="font-semibold">{contactInfo.email}</span>
              </p>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  What happens next?
                </h3>
                <ol className="space-y-2 text-sm text-blue-900">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">1.</span>
                    <span>The employer will review your application</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">2.</span>
                    <span>You'll be notified if they want to schedule an interview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold">3.</span>
                    <span>Track your application status in your dashboard</span>
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/dashboard/applications"
                  className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  View My Applications
                </Link>
                <Link
                  to="/jobs"
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Browse More Jobs
                </Link>
                <button
                  onClick={closeApplyModal}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Similar Jobs Suggestion */}
              {similarJobs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Apply to similar jobs</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {similarJobs.slice(0, 2).map((similarJob) => (
                      <Link
                        key={similarJob.id}
                        to={`/jobs/${similarJob.id}`}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                      >
                        <div className="text-left">
                          <p className="font-semibold text-gray-900 group-hover:text-primary-600">{similarJob.title}</p>
                          <p className="text-sm text-gray-600">{similarJob.company_name} • {similarJob.location}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task 4: Updated Report Job Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Flag className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold">Report this job</h2>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportDetails('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Help us keep WantokJobs safe. Tell us why this job should be reviewed.
            </p>
            <form onSubmit={handleReport}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="scam">Scam or fraudulent</option>
                  <option value="misleading">Misleading information</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="duplicate">Duplicate posting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Provide more context about your report..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Reports are confidential and reviewed within 24-48 hours
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                    setReportDetails('');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Apply Button - Mobile Only (44px+ touch target) */}
      {job && user?.role === 'jobseeker' && !applicationSuccess && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 shadow-lg safe-area-bottom">
          <button 
            onClick={handleApplyClick}
            className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold shadow-md active:bg-primary-700 min-h-[48px] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Apply for this job
          </button>
        </div>
      )}
      {job && !user && !applicationSuccess && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 shadow-lg safe-area-bottom">
          <Link
            to="/login"
            className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold shadow-md active:bg-primary-700 min-h-[48px] flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            Login to Apply
          </Link>
        </div>
      )}
    </div>
  );
}
