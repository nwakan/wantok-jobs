import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CreditCard, Settings, AlertCircle, CheckCircle, TrendingUp, XCircle } from 'lucide-react';

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: '/subscriptions/manage' } });
      return;
    }
    fetchSubscription();
    fetchHistory();
  }, [navigate]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      } else {
        setError(data.message || 'Failed to load subscription');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
      return;
    }
    try {
      setCancelLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/manage', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel' })
      });
      const data = await response.json();
      if (data.success) {
        alert('Subscription cancelled successfully');
        fetchSubscription();
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      alert('Failed to connect to server');
      console.error('Error cancelling subscription:', err);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    try {
      setAutoRenewLoading(true);
      const token = localStorage.getItem('token');
      const newValue = !subscription.auto_renew;
      const response = await fetch('/api/subscriptions/manage', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_renewal',
          auto_renew: newValue
        })
      });
      const data = await response.json();
      if (data.success) {
        setSubscription({ ...subscription, auto_renew: newValue ? 1 : 0 });
        alert(`Auto-renewal ${newValue ? 'enabled' : 'disabled'} successfully`);
      } else {
        alert(data.error || 'Failed to update auto-renewal');
      }
    } catch (err) {
      alert('Failed to connect to server');
      console.error('Error toggling auto-renew:', err);
    } finally {
      setAutoRenewLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { class: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { class: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      expired: { class: 'bg-red-100 text-red-800', icon: XCircle },
      pending: { class: 'bg-blue-100 text-blue-800', icon: Settings }
    };
    return badges[status] || { class: 'bg-gray-100 text-gray-800', icon: Settings };
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Subscription</h2>
          <p className="text-gray-600 mb-6">
            You don't have an active subscription. Subscribe to unlock premium features.
          </p>
          <button
            onClick={() => navigate('/subscriptions')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(subscription.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Management</h1>
          <p className="text-gray-600">Manage your subscription and billing</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{subscription.tier_name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${statusBadge.class}`}>
                  <StatusIcon className="h-4 w-4" />
                  {subscription.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600">Tier: {subscription.tier_type}</p>
            </div>
            <button
              onClick={() => navigate('/subscriptions')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade Plan
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Valid Until</p>
                <p className="font-semibold text-gray-900">{formatDate(subscription.end_date)}</p>
                {subscription.days_remaining >= 0 && (
                  <p className="text-sm text-gray-600">{subscription.days_remaining} days remaining</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-semibold text-gray-900">{subscription.price_pgk} PGK</p>
                <p className="text-sm text-gray-600">${subscription.price_usd.toFixed(2)} USD</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Auto-Renewal</p>
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={autoRenewLoading || subscription.status === 'cancelled'}
                  className={`font-semibold ${subscription.auto_renew ? 'text-green-600' : 'text-gray-600'} disabled:opacity-50`}
                >
                  {autoRenewLoading ? 'Updating...' : subscription.auto_renew ? 'Enabled' : 'Disabled'}
                </button>
                <p className="text-sm text-gray-600">Click to toggle</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Included Features</h3>
            <ul className="grid md:grid-cols-2 gap-2">
              {subscription.features && JSON.parse(subscription.features).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </li>
              ))}
            </ul>
          </div>

          {subscription.status === 'active' && (
            <div className="border-t pt-6 mt-6">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                You will still have access until {formatDate(subscription.end_date)}
              </p>
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Billing History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((record) => (
                    <tr key={record.history_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(record.billing_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.tier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.amount_pgk} PGK / ${record.amount_usd.toFixed(2)} USD</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(record.payment_status)}`}>
                          {record.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;
