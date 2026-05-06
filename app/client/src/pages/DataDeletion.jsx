import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../api';

const DataDeletion = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const code = searchParams.get('code');
  const reason = searchParams.get('reason');
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code) {
      fetchDeletionStatus(code);
    }
  }, [code]);

  const fetchDeletionStatus = async (confirmationCode) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/facebook/data-deletion/status/${confirmationCode}`);
      const data = await response.json();
      setDeletionStatus(data);
    } catch (error) {
      console.error('Failed to fetch deletion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (status === 'success' || deletionStatus?.status === 'completed') {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    } else if (status === 'error') {
      return <XCircle className="w-16 h-16 text-red-500" />;
    } else if (status === 'pending' || deletionStatus?.status === 'pending') {
      return <Clock className="w-16 h-16 text-yellow-500" />;
    }
    return <Shield className="w-16 h-16 text-blue-500" />;
  };

  const getStatusMessage = () => {
    if (status === 'success') {
      if (reason === 'user_not_found') {
        return {
          title: 'No Data Found',
          message: 'We did not find any data associated with your Facebook account in our system. No action is needed.',
          color: 'text-green-600'
        };
      }
      return {
        title: 'Data Deletion Completed',
        message: 'Your data has been successfully deleted from our system.',
        color: 'text-green-600'
      };
    } else if (status === 'error') {
      return {
        title: 'Request Error',
        message: `There was an issue processing your request: ${reason || 'Unknown error'}. Please try again or contact support.`,
        color: 'text-red-600'
      };
    } else if (status === 'pending' || deletionStatus?.status === 'pending') {
      return {
        title: 'Request Received',
        message: 'Your data deletion request has been received and will be processed within 30 days as required by Facebook policies.',
        color: 'text-yellow-600'
      };
    } else if (deletionStatus?.status === 'completed') {
      return {
        title: 'Data Deletion Completed',
        message: 'Your data has been successfully deleted from our system.',
        color: 'text-green-600'
      };
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Deletion Request</h1>
          <p className="text-gray-600">WantokJobs - Facebook Platform Policy Compliance</p>
        </div>

        {/* Status Card */}
        {statusMessage && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h2 className={`text-2xl font-semibold mb-2 ${statusMessage.color}`}>
              {statusMessage.title}
            </h2>
            <p className="text-gray-700">
              {statusMessage.message}
            </p>
            {code && (
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <p className="text-sm text-gray-600">Confirmation Code:</p>
                <p className="font-mono text-sm">{code}</p>
              </div>
            )}
            {deletionStatus?.requested_at && (
              <div className="mt-3 text-sm text-gray-600">
                <p>Requested: {new Date(deletionStatus.requested_at).toLocaleDateString()}</p>
                {deletionStatus.completed_at && (
                  <p>Completed: {new Date(deletionStatus.completed_at).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Information Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Deletion Policy
          </h2>

          <div className="space-y-6">
            {/* What data we delete */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">What data is deleted?</h3>
              <p className="text-gray-700 mb-2">
                When you request data deletion through Facebook, we remove all data associated with your Facebook account from our system, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Your WantokJobs account and profile information</li>
                <li>Job applications and saved jobs</li>
                <li>Job alerts and saved searches</li>
                <li>Messages and notifications</li>
                <li>Activity logs and session data</li>
                <li>Any uploaded files (CV, profile pictures)</li>
              </ul>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Deletion Timeline</h3>
              <p className="text-gray-700">
                In accordance with Facebook Platform Policy, we will complete your data deletion request within <strong>30 days</strong> of receiving it. In most cases, deletion is completed immediately.
              </p>
            </div>

            {/* How to request */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">How to request data deletion</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                <li>Log in to Facebook</li>
                <li>Go to Settings & Privacy → Settings</li>
                <li>Click on "Apps and Websites"</li>
                <li>Find "WantokJobs" in your active apps</li>
                <li>Click "Remove" to revoke permissions</li>
                <li>Facebook will automatically send us a deletion request</li>
              </ol>
            </div>

            {/* Alternative method */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Alternative Method
              </h3>
              <p className="text-gray-700">
                You can also delete your account directly from WantokJobs:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4 mt-2">
                <li>Log in to your WantokJobs account</li>
                <li>Go to Account Settings</li>
                <li>Click "Delete Account"</li>
                <li>Confirm deletion</li>
              </ol>
              <p className="text-gray-700 mt-2">
                This will delete all your data immediately, regardless of how you signed up.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Questions or Concerns?</h3>
              <p className="text-gray-700">
                If you have questions about data deletion or our privacy practices, please contact us at:
              </p>
              <ul className="list-none space-y-1 text-gray-700 ml-4 mt-2">
                <li><strong>Email:</strong> privacy@wantokjobs.com</li>
                <li><strong>Support:</strong> support@wantokjobs.com</li>
              </ul>
            </div>

            {/* Privacy Policy Link */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                For more information about how we handle your data, please review our{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
                {' '}and{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;
