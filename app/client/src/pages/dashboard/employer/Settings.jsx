import { useState, useEffect } from 'react';
import { notificationPreferences } from '../../../api';
import { useToast } from '../../../components/Toast';

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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    email_new_application: true,
    email_status_change: true,
    email_new_message: true,
    email_job_alert: true,
    email_newsletter: true,
    push_enabled: false,
    sms_enabled: false,
  });

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const data = await notificationPreferences.get();
      setPrefs({
        email_new_application: !!data.email_new_application,
        email_status_change: !!data.email_status_change,
        email_new_message: !!data.email_new_message,
        email_job_alert: !!data.email_job_alert,
        email_newsletter: !!data.email_newsletter,
        push_enabled: !!data.push_enabled,
        sms_enabled: !!data.sms_enabled,
      });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationPreferences.update(prefs);
      showToast('Notification preferences saved', 'success');
    } catch (error) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
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
    { key: 'email_new_application', label: 'New Applications', desc: 'Get notified when candidates apply to your jobs' },
    { key: 'email_status_change', label: 'Status Updates', desc: 'Updates when application statuses change' },
    { key: 'email_new_message', label: 'New Messages', desc: 'Get notified when you receive new messages from candidates' },
    { key: 'email_job_alert', label: 'Job Insights', desc: 'Market insights and recommendations for your job listings' },
    { key: 'email_newsletter', label: 'Newsletter', desc: 'Hiring tips, platform updates, and industry news' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h1>

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
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
