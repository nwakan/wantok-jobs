import { useState } from 'react';
import { Shield, ShieldCheck, QrCode, Key, AlertTriangle, Copy, Check } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function TwoFactorSetup() {
  const { user } = useAuth();
  const [step, setStep] = useState('status'); // status | setup | backup | done
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Load 2FA status on mount
  useState(() => {
    api.get('/2fa/status').then(r => {
      setIs2FAEnabled(r.data.enabled);
      if (!r.data.enabled) setStep('status');
      else setStep('enabled');
    }).catch(() => {});
  }, []);

  const handleSetup = async () => {
    setLoading(true); setError('');
    try {
      const r = await api.post('/2fa/setup');
      setQrCode(r.data.qrCode);
      setSecret(r.data.secret);
      setStep('scan');
    } catch(e) {
      setError(e.response?.data?.error || 'Setup failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!code.trim()) return setError('Enter the 6-digit code from your authenticator app');
    setLoading(true); setError('');
    try {
      const r = await api.post('/2fa/verify', { code });
      setBackupCodes(r.data.backupCodes);
      setIs2FAEnabled(true);
      setStep('backup');
    } catch(e) {
      setError(e.response?.data?.error || 'Invalid code');
    } finally { setLoading(false); }
  };

  const handleDisable = async () => {
    if (!disablePassword) return setError('Enter your password to disable 2FA');
    if (!window.confirm('Are you sure you want to disable 2FA? This reduces your account security.')) return;
    setLoading(true); setError('');
    try {
      await api.post('/2fa/disable', { password: disablePassword });
      setIs2FAEnabled(false);
      setStep('status');
      setDisablePassword('');
    } catch(e) {
      setError(e.response?.data?.error || 'Disable failed');
    } finally { setLoading(false); }
  };

  const handleRegenerateBackup = async () => {
    if (!window.confirm('This will invalidate your existing backup codes. Continue?')) return;
    setLoading(true);
    try {
      const r = await api.post('/2fa/backup/regenerate');
      setBackupCodes(r.data.backupCodes);
      setStep('backup');
    } catch(e) {
      setError(e.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500">Add extra security to your account</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Status: Not enabled */}
      {step === 'status' && (
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900">2FA is not enabled</p>
              <p className="text-sm text-gray-500">Your account has basic password protection only</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Enable two-factor authentication to require a one-time code from your phone when signing in.
            This protects your account even if your password is compromised.
          </p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {/* Step: Scan QR */}
      {step === 'scan' && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Step 1: Scan QR Code
          </h2>
          <p className="text-sm text-gray-600">
            Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
          </p>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border rounded-lg" />
            </div>
          )}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
            <code className="text-sm font-mono text-gray-800 break-all">{secret}</code>
          </div>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5" /> Step 2: Enter verification code
          </h2>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full px-4 py-3 text-center text-2xl font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none tracking-widest"
          />
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
          </button>
        </div>
      )}

      {/* Step: Backup codes */}
      {step === 'backup' && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="font-semibold">2FA Enabled Successfully!</h2>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Save these backup codes</p>
            <p className="text-xs text-yellow-700">Use these if you lose access to your authenticator app. Each code can only be used once.</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 grid grid-cols-2 gap-1">
            {backupCodes.map((code, i) => <span key={i}>{code}</span>)}
          </div>
          <button onClick={copyBackupCodes}
            className="w-full py-2 border rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-gray-50">
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy all codes</>}
          </button>
          <button onClick={() => setStep('enabled')} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium">
            Done
          </button>
        </div>
      )}

      {/* Enabled state */}
      {step === 'enabled' && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">2FA is active</p>
              <p className="text-sm text-gray-500">Your account is protected with two-factor authentication</p>
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <button onClick={handleRegenerateBackup} disabled={loading}
              className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Regenerate Backup Codes
            </button>
            <div className="border-t pt-3">
              <p className="text-sm text-gray-600 mb-2">Disable 2FA (enter password to confirm):</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Your password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500"
                />
                <button onClick={handleDisable} disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                  {loading ? '...' : 'Disable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}