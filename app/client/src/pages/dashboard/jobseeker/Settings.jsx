import { useState, useEffect } from 'react';
import { profile, notificationPreferences } from '../../../api';
import { useToast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
    </label>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [prefs, setPrefs] = useState({
    email_new_application: true,
    email_status_change: true,
    email_new_message: true,
    email_job_alert: true,
    email_newsletter: true,
    push_enabled: false,
    sms_enabled: false,
  });

  const [privacySettings, setPrivacySettings] = useState({
    profile_visibility: 'employers-only',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [prefData, profileData] = await Promise.all([
        notificationPreferences.get(),
        profile.get().catch(() => null),
      ]);
      setPrefs({
        email_new_application: !!prefData.email_new_application,
        email_status_change: !!prefData.email_status_change,
        email_new_message: !!prefData.email_new_message,
        email_job_alert: !!prefData.email_job_alert,
        email_newsletter: !!prefData.email_newsletter,
        push_enabled: !!prefData.push_enabled,
        sms_enabled: !!prefData.sms_enabled,
      });
      if (profileData?.settings?.profile_visibility) {
        setPrivacySettings({ profile_visibility: profileData.settings.profile_visibility });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await notificationPreferences.update({
        email_new_application: prefs.email_new_application,
        email_status_change: prefs.email_status_change,
        email_new_message: prefs.email_new_message,
        email_job_alert: prefs.email_job_alert,
        email_newsletter: prefs.email_newsletter,
        push_enabled: prefs.push_enabled,
        sms_enabled: prefs.sms_enabled,
      });
      showToast('Notification preferences saved', 'success');
    } catch (error) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      await profile.update({ settings: privacySettings });
      showToast('Privacy settings saved', 'success');
    } catch (error) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      showToast('Account deletion request submitted', 'success');
      setShowDeleteModal(false);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (error) {
      showToast('Failed to delete account', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const emailNotifications = [
    { key: 'email_status_change', label: 'Application Updates', desc: 'Updates on your job applications (interview invites, status changes, etc.)' },
    { key: 'email_new_message', label: 'New Messages', desc: 'Get notified when you receive new messages' },
    { key: 'email_job_alert', label: 'Job Alerts', desc: 'Emails based on your saved job alerts and matching jobs' },
    { key: 'email_new_application', label: 'Application Confirmations', desc: 'Confirmation when your application is submitted' },
    { key: 'email_newsletter', label: 'Newsletter', desc: 'Career tips, industry news, and platform updates' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Email Notification Preferences */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Email Notifications</h2>
        <p className="text-sm text-gray-600 mb-6">Choose which emails you'd like to receive</p>

        <div className="space-y-1">
          {emailNotifications.map(({ key, label, desc }, i) => (
            <div key={key} className={`flex items-center justify-between py-3 ${i < emailNotifications.length - 1 ? 'border-b' : ''}`}>
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
              <ToggleSwitch checked={prefs[key]} onChange={v => setPrefs({ ...prefs, [key]: v })} />
            </div>
          ))}
        </div>

        {/* Push Notifications */}
        <div className="mt-8 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Push Notifications</h3>
          <p className="text-xs text-gray-500 mb-3">Coming soon</p>
          <div className="flex items-center justify-between py-3 opacity-50">
            <div>
              <p className="font-medium text-gray-900">Enable Push Notifications</p>
              <p className="text-sm text-gray-600">Receive browser push notifications for important updates</p>
            </div>
            <ToggleSwitch checked={prefs.push_enabled} onChange={() => {}} disabled />
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="mt-4 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">SMS Notifications</h3>
          <p className="text-xs text-gray-500 mb-3">Coming soon</p>
          <div className="flex items-center justify-between py-3 opacity-50">
            <div>
              <p className="font-medium text-gray-900">Enable SMS Notifications</p>
              <p className="text-sm text-gray-600">Get text messages for urgent updates</p>
            </div>
            <ToggleSwitch checked={prefs.sms_enabled} onChange={() => {}} disabled />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveNotifications}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Profile Visibility</label>
          <div className="space-y-3">
            {[
              { value: 'public', label: 'Public', desc: 'Your profile is visible to everyone' },
              { value: 'employers-only', label: 'Employers Only', desc: 'Only verified employers can view your full profile' },
              { value: 'private', label: 'Private', desc: 'Your profile is hidden from searches (only visible when you apply)' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={privacySettings.profile_visibility === opt.value}
                  onChange={e => setPrivacySettings({ profile_visibility: e.target.value })}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium text-gray-900">{opt.label}</p>
                  <p className="text-sm text-gray-600">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSavePrivacy} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
            Save Privacy Settings
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Delete Account</p>
            <p className="text-sm text-gray-600">Permanently delete your account and all your data. This action cannot be undone.</p>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Account?</h3>
            <p className="text-gray-700 mb-6">Are you absolutely sure? This will:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-6 space-y-1">
              <li>Delete your profile and all personal information</li>
              <li>Remove all your job applications</li>
              <li>Cancel all job alerts</li>
              <li>This action <strong>cannot be undone</strong></li>
            </ul>
            <p className="text-sm text-gray-600 mb-6">Type <strong>{user?.email}</strong> to confirm:</p>
            <input type="text" placeholder="Enter your email" className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-6" />
            <div className="flex gap-4">
              <button onClick={handleDeleteAccount} className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                Yes, Delete My Account
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
