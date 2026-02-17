import { useState } from 'react';
import { Mail, X, RefreshCw } from 'lucide-react';
import { auth } from '../api';

export default function EmailVerificationBanner({ user, onDismiss }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Don't show if email is verified or user dismissed
  if (user?.email_verified || dismissed) return null;

  const handleResend = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('✓ Verification email sent! Please check your inbox.');
      } else {
        setMessage('Failed to send email. Please try again later.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
      console.error('Resend verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-start">
        <Mail className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Please verify your email address
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              We sent a verification email to <strong>{user?.email}</strong>. 
              Click the link in the email to verify your account and unlock all features.
            </p>
            {message && (
              <p className={`mb-2 ${message.startsWith('✓') ? 'text-green-700 font-medium' : 'text-red-700'}`}>
                {message}
              </p>
            )}
            <button
              onClick={handleResend}
              disabled={loading}
              className="inline-flex items-center gap-1 text-yellow-800 hover:text-yellow-900 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
