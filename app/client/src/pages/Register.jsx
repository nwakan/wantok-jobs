import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Check, X, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'jobseeker',
    captcha_answer: '',
  });
  const [captcha, setCaptcha] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [pendingOauthData, setPendingOauthData] = useState(null);
  
  // Fetch CAPTCHA
  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      setCaptcha(data);
      setFormData(prev => ({ ...prev, captcha_answer: '' }));
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // Fetch available OAuth providers
  useEffect(() => {
    fetch('/api/auth/oauth/providers')
      .then(res => res.json())
      .then(data => setOauthProviders(data.providers || []))
      .catch(err => console.error('Failed to load OAuth providers:', err));
  }, []);
  
  // Load Google Sign-In SDK
  useEffect(() => {
    const hasGoogle = oauthProviders.some(p => p.name === 'google');
    if (hasGoogle && !window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [oauthProviders]);
  
  // Load Facebook SDK
  useEffect(() => {
    const hasFacebook = oauthProviders.some(p => p.name === 'facebook');
    if (hasFacebook && !window.FB) {
      window.fbAsyncInit = function() {
        const fbProvider = oauthProviders.find(p => p.name === 'facebook');
        window.FB.init({
          appId: fbProvider?.appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      };
      
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [oauthProviders]);
  
  // Password strength calculator
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    
    score += checks.length ? 2 : 0;
    score += checks.uppercase ? 1 : 0;
    score += checks.lowercase ? 1 : 0;
    score += checks.number ? 1 : 0;
    score += checks.special ? 1 : 0;
    
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500', checks };
    if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500', checks };
    if (score <= 5) return { score, label: 'Good', color: 'bg-green-500', checks };
    return { score, label: 'Strong', color: 'bg-green-600', checks };
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await auth.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        captcha_id: captcha?.id,
        captcha_answer: formData.captcha_answer,
      });
      
      login(response.token, response.user);
      
      // Show welcome message
      showToast('Welcome to WantokJobs! Complete your profile to get started.', 'success');
      
      // Redirect based on role
      if (response.user.role === 'employer') {
        navigate('/dashboard/employer/profile');
      } else {
        navigate('/dashboard/jobseeker/profile');
      }
    } catch (error) {
      setError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleRegister = () => {
    setError('');
    setOauthLoading(true);
    
    const googleProvider = oauthProviders.find(p => p.name === 'google');
    if (!googleProvider) {
      setError('Google registration not configured');
      setOauthLoading(false);
      return;
    }
    
    window.google.accounts.id.initialize({
      client_id: googleProvider.clientId,
      callback: async (response) => {
        setPendingOauthData({ provider: 'google', idToken: response.credential });
        setShowRoleDialog(true);
        setOauthLoading(false);
      }
    });
    
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setOauthLoading(false);
      }
    });
  };
  
  const handleFacebookRegister = () => {
    setError('');
    setOauthLoading(true);
    
    if (!window.FB) {
      setError('Facebook SDK not loaded');
      setOauthLoading(false);
      return;
    }
    
    window.FB.login(async (response) => {
      if (response.authResponse) {
        setPendingOauthData({ provider: 'facebook', accessToken: response.authResponse.accessToken });
        setShowRoleDialog(true);
        setOauthLoading(false);
      } else {
        setOauthLoading(false);
      }
    }, { scope: 'public_profile,email' });
  };
  
  const completeOAuthRegistration = async (selectedRole) => {
    if (!pendingOauthData) return;
    
    setOauthLoading(true);
    try {
      const endpoint = pendingOauthData.provider === 'google' 
        ? '/api/auth/oauth/google' 
        : '/api/auth/oauth/facebook';
      
      const body = pendingOauthData.provider === 'google'
        ? { idToken: pendingOauthData.idToken, role: selectedRole }
        : { accessToken: pendingOauthData.accessToken, role: selectedRole };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      login(data.token, data.user);
      showToast('Welcome to WantokJobs!', 'success');
      
      // Redirect based on role
      if (data.user.role === 'employer') {
        navigate('/dashboard/employer/profile');
      } else {
        navigate('/dashboard/jobseeker/profile');
      }
    } catch (err) {
      console.error('OAuth registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setOauthLoading(false);
      setShowRoleDialog(false);
      setPendingOauthData(null);
    }
  };

  const hasGoogleAuth = oauthProviders.some(p => p.name === 'google');
  const hasFacebookAuth = oauthProviders.some(p => p.name === 'facebook');
  const hasOAuth = hasGoogleAuth || hasFacebookAuth;

  return (
    <>
      <div className="min-h-[calc(100vh-300px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                sign in to existing account
              </Link>
            </p>
          </div>
          
          {/* OAuth Buttons */}
          {hasOAuth && (
            <div className="space-y-3">
              {hasGoogleAuth && (
                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={oauthLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Continue with Google</span>
                </button>
              )}
              
              {hasFacebookAuth && (
                <button
                  type="button"
                  onClick={handleFacebookRegister}
                  disabled={oauthLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-transparent rounded-md shadow-sm bg-[#1877F2] hover:bg-[#166FE5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-sm font-medium text-white">Continue with Facebook</span>
                </button>
              )}
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or register with email</span>
                </div>
              </div>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  I am a
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="jobseeker">Job Seeker</option>
                  <option value="employer">Employer</option>
                </select>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-600' :
                        passwordStrength.score <= 4 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        8+ characters
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Lowercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        Number
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Confirm password"
                />
              </div>

              {/* CAPTCHA */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 mb-2">
                  Security Check
                </label>
                {captcha ? (
                  <div className="space-y-2">
                    <div className="text-lg font-medium text-gray-900">
                      {captcha.question}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="captcha"
                        name="captcha_answer"
                        type="text"
                        required
                        value={formData.captcha_answer}
                        onChange={(e) => setFormData({ ...formData, captcha_answer: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Your answer"
                      />
                      <button
                        type="button"
                        onClick={fetchCaptcha}
                        disabled={captchaLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-2">Loading...</div>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || oauthLoading || !captcha}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Role Selection Dialog for OAuth */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Select your role</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you looking for a job or hiring?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => completeOAuthRegistration('jobseeker')}
                disabled={oauthLoading}
                className="w-full px-4 py-3 border-2 border-primary-600 rounded-md hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                <div className="font-medium">Job Seeker</div>
                <div className="text-sm text-gray-600">I'm looking for work</div>
              </button>
              <button
                onClick={() => completeOAuthRegistration('employer')}
                disabled={oauthLoading}
                className="w-full px-4 py-3 border-2 border-primary-600 rounded-md hover:bg-primary-50 transition-colors disabled:opacity-50"
              >
                <div className="font-medium">Employer</div>
                <div className="text-sm text-gray-600">I'm hiring</div>
              </button>
            </div>
            {!oauthLoading && (
              <button
                onClick={() => {
                  setShowRoleDialog(false);
                  setPendingOauthData(null);
                }}
                className="w-full mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
