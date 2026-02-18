import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Globe, Mail, Phone, Check, Shield, AlertCircle } from 'lucide-react';
import api from '../api';
import PageHead from '../components/PageHead';
import OptimizedImage from '../components/OptimizedImage';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function ClaimEmployer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login } = useAuth();
  
  const [employer, setEmployer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: intro, 2: method, 3: verify, 4: success
  const [method, setMethod] = useState(null); // 'email' or 'phone'
  const [verificationValue, setVerificationValue] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [claimId, setClaimId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  useEffect(() => {
    fetchEmployerData();
  }, [id]);

  const fetchEmployerData = async () => {
    setLoading(true);
    try {
      const [profileRes, statusRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get(`/employers/${id}/claim-status`)
      ]);
      
      const companyData = profileRes.company || profileRes;
      setEmployer(companyData);
      
      const statusData = statusRes.data;
      if (statusData.claimed) {
        setClaimed(true);
        showToast('This profile has already been claimed', 'info');
      }
    } catch (error) {
      console.error('Failed to fetch employer data:', error);
      showToast('Failed to load employer profile', 'error');
      navigate('/companies');
    } finally {
      setLoading(false);
    }
  };

  const handleStartClaim = async () => {
    if (!verificationValue.trim()) {
      showToast(`Please enter your ${method === 'email' ? 'email address' : 'phone number'}`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/employers/${id}/claim/start`, {
        method,
        value: verificationValue
      });

      if (res.success) {
        setClaimId(res.claimId);
        
        // For development, auto-fill the code if provided
        if (res.code) {
          setVerificationCode(res.code);
        }
        
        if (res.needsAdminReview) {
          setNeedsApproval(true);
        }
        
        setStep(3);
        showToast(res.message, 'success');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to start claim process';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyClaim = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/employers/${id}/claim/verify`, {
        code: verificationCode,
        claimId
      });

      if (res.success) {
        if (res.needsApproval) {
          setNeedsApproval(true);
          setStep(4);
        } else {
          // Claim verified - log the user in
          if (res.token) {
            localStorage.setItem('token', res.token);
            login(res.user);
          }
          setStep(4);
        }
        showToast(res.message, 'success');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to verify code';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Employer not found</h2>
          <button 
            onClick={() => navigate('/companies')}
            className="text-primary-600 hover:text-primary-700"
          >
            Browse all companies
          </button>
        </div>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <PageHead 
          title={`${employer.company_name || employer.name} - Already Claimed`}
          description={`This employer profile has already been claimed.`}
        />
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Already Claimed</h2>
            <p className="text-gray-600 mb-6">
              This employer profile has already been claimed and verified.
            </p>
            <button 
              onClick={() => navigate('/companies')}
              className="btn-primary"
            >
              Browse Companies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <PageHead 
        title={`Claim ${employer.company_name || employer.name} - WantokJobs`}
        description={`Claim and verify your employer profile for ${employer.company_name || employer.name}`}
      />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Company Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {employer.logo_url ? (
                <OptimizedImage 
                  src={employer.logo_url}
                  alt={employer.company_name || employer.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {employer.company_name || employer.name}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {employer.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {employer.industry}
                  </span>
                )}
                {employer.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {employer.location}
                  </span>
                )}
                {employer.website && (
                  <a 
                    href={employer.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Claim Process */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Progress Steps */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { num: 1, label: 'Verify' },
                { num: 2, label: 'Method' },
                { num: 3, label: 'Code' },
                { num: 4, label: 'Complete' }
              ].map(({ num, label }, idx) => (
                <div key={num} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                    step >= num 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > num ? <Check className="w-5 h-5" /> : num}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step >= num ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                  {idx < 3 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      step > num ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Introduction */}
            {step === 1 && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Claim Ownership of Your Company Profile
                  </h2>
                  <p className="text-gray-600">
                    Prove you represent {employer.company_name || employer.name} and take control of your profile
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">How claiming works:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Prove ownership by verifying your official company email or phone</li>
                        <li>No need to verify the company itself (already verified)</li>
                        <li>Get immediate access to manage your profile and post jobs</li>
                        <li>Takes about 5 minutes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="font-semibold text-gray-900">What you get after claiming:</h3>
                  <div className="grid gap-3">
                    {[
                      'Full control of your company profile',
                      'Post and manage unlimited job openings',
                      'Review and respond to applicants',
                      'Update company details and branding',
                      'Access employer analytics and insights'
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  className="btn-primary w-full"
                >
                  Start Verification
                </button>
              </div>
            )}

            {/* Step 2: Choose Method */}
            {step === 2 && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                  Choose Verification Method
                </h2>
                <p className="text-gray-600 mb-8 text-center">
                  Select how you'd like to verify your identity
                </p>

                <div className="grid gap-4 mb-6">
                  {/* Email Option */}
                  <button
                    onClick={() => setMethod('email')}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${
                      method === 'email'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        method === 'email' ? 'bg-primary-100' : 'bg-gray-100'
                      }`}>
                        <Mail className={`w-6 h-6 ${
                          method === 'email' ? 'text-primary-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Official Company Email
                        </h3>
                        <p className="text-sm text-gray-600">
                          Use your company email address (e.g., you@{employer.website?.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]})
                        </p>
                      </div>
                      {method === 'email' && (
                        <Check className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                  </button>

                  {/* Phone Option */}
                  <button
                    onClick={() => setMethod('phone')}
                    className={`p-6 border-2 rounded-lg text-left transition-all ${
                      method === 'phone'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        method === 'phone' ? 'bg-primary-100' : 'bg-gray-100'
                      }`}>
                        <Phone className={`w-6 h-6 ${
                          method === 'phone' ? 'text-primary-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          Company Phone Number
                        </h3>
                        <p className="text-sm text-gray-600">
                          Use your official company phone number listed publicly
                        </p>
                      </div>
                      {method === 'phone' && (
                        <Check className="w-6 h-6 text-primary-600" />
                      )}
                    </div>
                  </button>
                </div>

                {method && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {method === 'email' ? 'Your Company Email Address' : 'Company Phone Number'}
                      </label>
                      <input
                        type={method === 'email' ? 'email' : 'tel'}
                        value={verificationValue}
                        onChange={(e) => setVerificationValue(e.target.value)}
                        placeholder={method === 'email' ? 'you@company.com' : '+675 XXX XXXXX'}
                        className="input w-full"
                        disabled={submitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {method === 'email' 
                          ? 'Must be your official company email, not a personal email address'
                          : 'Must match the official phone number on your company website or public records'
                        }
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(1)}
                        className="btn-secondary flex-1"
                        disabled={submitting}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleStartClaim}
                        className="btn-primary flex-1"
                        disabled={submitting}
                      >
                        {submitting ? 'Sending...' : 'Send Verification Code'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Enter Code */}
            {step === 3 && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                  Enter Verification Code
                </h2>
                <p className="text-gray-600 mb-8 text-center">
                  We sent a 6-digit code to {verificationValue}
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="input w-full text-center text-2xl tracking-widest"
                      maxLength={6}
                      disabled={submitting}
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Code expires in 10 minutes
                    </p>
                  </div>

                  {needsApproval && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <div className="text-sm text-yellow-900">
                          <p className="font-semibold mb-1">Admin Review Required</p>
                          <p>
                            Your verification will be reviewed by our team. We'll notify you within 1-2 business days.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStep(2);
                        setVerificationCode('');
                      }}
                      className="btn-secondary flex-1"
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyClaim}
                      className="btn-primary flex-1"
                      disabled={submitting || verificationCode.length !== 6}
                    >
                      {submitting ? 'Verifying...' : 'Verify & Claim'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setStep(2);
                      setVerificationCode('');
                      setClaimId(null);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 w-full text-center"
                  >
                    Didn't receive code? Try again
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto text-center">
                <div className={`w-16 h-16 ${needsApproval ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {needsApproval ? (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <Check className="w-8 h-8 text-green-600" />
                  )}
                </div>
                
                {needsApproval ? (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Verification Pending
                    </h2>
                    <p className="text-gray-600 mb-8">
                      Your claim for {employer.company_name || employer.name} is pending admin review. 
                      We'll email you at {verificationValue} when it's approved.
                    </p>
                    <button 
                      onClick={() => navigate('/companies')}
                      className="btn-primary"
                    >
                      Back to Companies
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Profile Claimed Successfully! 🎉
                    </h2>
                    <p className="text-gray-600 mb-8">
                      You now own and manage <span className="font-semibold">{employer.company_name || employer.name}</span> on WantokJobs. 
                      Your employer profile is verified and ready to use.
                    </p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => navigate('/dashboard/employer')}
                        className="btn-primary w-full"
                      >
                        Go to Employer Dashboard
                      </button>
                      <button 
                        onClick={() => navigate(`/dashboard/employer/company-profile`)}
                        className="btn-secondary w-full"
                      >
                        Edit Company Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
