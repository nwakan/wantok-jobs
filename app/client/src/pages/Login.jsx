import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [oauthProviders, setOauthProviders] = useState([]);
  
  // Check for session expired flag
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
      setError('Your session has expired. Please log in again.');
    }
  }, [searchParams]);
  
  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail, rememberMe: true }));
    }
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
  
  // Rate limit countdown
  useEffect(() => {
    if (rateLimitTime > 0) {
      const timer = setTimeout(() => {
        setRateLimitTime(prev => prev - 1);
        if (rateLimitTime === 1) setRateLimited(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rateLimitTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await auth.login({ email: formData.email, password: formData.password });
      
      // Handle force password reset for legacy users
      if (response.forceReset) {
        setForceReset(true);
        setError(response.message || 'Your account needs a password reset.');
        setLoading(false);
        return;
      }
      
      // Handle remember me
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      login(response.token, response.user);
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/dashboard/admin');
      } else if (response.user.role === 'employer') {
        navigate('/dashboard/employer');
      } else {
        navigate('/dashboard/jobseeker');
      }
    } catch (error) {
      const errorMsg = error.message || 'Login failed';
      setError(errorMsg);
      
      // Check for rate limiting (429 Too Many Requests)
      if (error.status === 429 || errorMsg.toLowerCase().includes('too many') || errorMsg.toLowerCase().includes('rate limit')) {
        setRateLimited(true);
        setRateLimitTime(60); // 60 second countdown
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = () => {
    setError('');
    setOauthLoading(true);
    
    const googleProvider = oauthProviders.find(p => p.name === 'google');
    if (!googleProvider) {
      setError('Google login not configured');
      setOauthLoading(false);
      return;
    }
    
    window.google.accounts.id.initialize({
      client_id: googleProvider.clientId,
      callback: async (response) => {
        try {
          const res = await fetch('/api/auth/oauth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: response.credential })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'Google login failed');
          }
          
          login(data.token, data.user);
          
          // Redirect based on role
          if (data.user.role === 'admin') {
            navigate('/dashboard/admin');
          } else if (data.user.role === 'employer') {
            navigate('/dashboard/employer');
          } else {
            navigate('/dashboard/jobseeker');
          }
        } catch (err) {
          console.error('Google OAuth error:', err);
          setError(err.message || 'Google login failed');
        } finally {
          setOauthLoading(false);
        }
      }
    });
    
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setOauthLoading(false);
      }
    });
  };
  
  const handleFacebookLogin = () => {
    setError('');
    setOauthLoading(true);
    
    if (!window.FB) {
      setError('Facebook SDK not loaded');
      setOauthLoading(false);
      return;
    }
    
    window.FB.login(async (response) => {
      if (response.authResponse) {
        try {
          const res = await fetch('/api/auth/oauth/facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.authResponse.accessToken })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.error || 'Facebook login failed');
          }
          
          login(data.token, data.user);
          
          // Redirect based on role
          if (data.user.role === 'admin') {
            navigate('/dashboard/admin');
          } else if (data.user.role === 'employer') {
            navigate('/dashboard/employer');
          } else {
            navigate('/dashboard/jobseeker');
          }
        } catch (err) {
          console.error('Facebook OAuth error:', err);
          setError(err.message || 'Facebook login failed');
        } finally {
          setOauthLoading(false);
        }
      } else {
        setOauthLoading(false);
      }
    }, { scope: 'public_profile,email' });
  };

  const hasGoogleAuth = oauthProviders.some(p => p.name === 'google');
  const hasFacebookAuth = oauthProviders.some(p => p.name === 'facebook');
  const hasOAuth = hasGoogleAuth || hasFacebookAuth;

  return (
    <div className="min-h-[calc(100vh-300px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              create a new account
            </Link>
          </p>
        </div>
        
        {/* OAuth Buttons */}
        {hasOAuth && (
          <div className="space-y-3">
            {hasGoogleAuth && (
              <button
                type="button"
                onClick={handleGoogleLogin}
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
                onClick={handleFacebookLogin}
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
                <span className="px-2 bg-white text-gray-500">or sign in with email</span>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {forceReset && (
            <div className="border px-4 py-3 rounded bg-amber-50 border-amber-400 text-amber-800">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              <strong>Password Reset Required</strong>
              <p className="mt-2 text-sm">
                Your account was imported from our previous system and needs a password reset for security.
              </p>
              <Link
                to="/forgot-password"
                className="mt-3 inline-block w-full text-center py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium text-sm"
              >
                Reset Your Password
              </Link>
            </div>
          )}
          
          {error && !forceReset && (
            <div className={`border px-4 py-3 rounded flex items-start gap-2 ${
              sessionExpired ? 'bg-blue-100 border-blue-400 text-blue-700' :
              rateLimited ? 'bg-orange-100 border-orange-400 text-orange-700' : 
              'bg-red-100 border-red-400 text-red-700'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {rateLimited && rateLimitTime > 0 && (
                  <p className="text-sm mt-1">
                    Please wait <strong>{rateLimitTime}</strong> seconds before trying again.
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm space-y-4">
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
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
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
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || rateLimited || oauthLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : rateLimited ? `Wait ${rateLimitTime}s` : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
