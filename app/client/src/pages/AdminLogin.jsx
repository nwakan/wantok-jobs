import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState(0);

  // Redirect if already logged in as admin
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/dashboard/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

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
      const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if user is actually an admin
      if (data.user.role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate('/dashboard/admin', { replace: true });
    } catch (error) {
      const errorMsg = error.message || 'Login failed';
      setError(errorMsg);

      // Check for rate limiting
      if (error.status === 429 || errorMsg.toLowerCase().includes('too many') || 
          errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('locked')) {
        setRateLimited(true);
        // Extract time from error message if available, otherwise default to 60s
        const timeMatch = errorMsg.match(/(\d+)\s*minute/);
        const minutes = timeMatch ? parseInt(timeMatch[1]) : 1;
        setRateLimitTime(minutes * 60);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Admin Portal Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-600 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <img 
            src="/logo.svg" 
            alt="WantokJobs" 
            className="mx-auto h-12 w-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h2 className="text-3xl font-bold text-white">
            Administration Portal
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Secure access for WantokJobs administrators
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {error && (
            <div className={`mb-6 border px-4 py-3 rounded-lg flex items-start gap-2 ${
              rateLimited ? 'bg-orange-50 border-orange-400 text-orange-800' : 
              'bg-red-50 border-red-400 text-red-800'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {rateLimited && rateLimitTime > 0 && (
                  <p className="text-sm mt-1">
                    Please wait <strong>{Math.floor(rateLimitTime / 60)}:{String(rateLimitTime % 60).padStart(2, '0')}</strong> before trying again.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="admin@wantokjobs.com"
                disabled={loading || rateLimited}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  placeholder="Enter your password"
                  disabled={loading || rateLimited}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || rateLimited}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Authenticating...
                  </>
                ) : rateLimited ? (
                  `Locked (${Math.floor(rateLimitTime / 60)}:${String(rateLimitTime % 60).padStart(2, '0')})`
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                This is a secure area. All login attempts are monitored and logged. 
                Unauthorized access attempts will be reported.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Main Site */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to WantokJobs
          </a>
        </div>
      </div>
    </div>
  );
}
