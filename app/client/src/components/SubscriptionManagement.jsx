import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState(null);
  const [tier, setTier] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const subResponse = await api.get('/api/subscriptions/current');
      setSubscription(subResponse.data.subscription || null);
      setTier(subResponse.data.tier || null);
      const historyResponse = await api.get('/api/subscriptions/history');
      setHistory(historyResponse.data.history || []);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      setCancelling(true);
      await api.put('/api/subscriptions/manage', { action: 'cancel' });
      await loadSubscriptionData();
      alert('Subscription cancelled successfully.');
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert('Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setCancelling(true);
      await api.put('/api/subscriptions/manage', { action: 'reactivate' });
      await loadSubscriptionData();
      alert('Subscription reactivated!');
    } catch (error) {
      console.error('Failed to reactivate:', error);
      alert('Failed to reactivate.');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!subscription || !tier) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">Upgrade to unlock premium features!</p>
            <button onClick={() => navigate('/subscriptions')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysUntilRenewal = subscription.next_billing_date
    ? Math.ceil((new Date(subscription.next_billing_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and billing</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{tier.tier_name} Plan</h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(subscription.status)}`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">PGK {tier.price_pgk.toFixed(2)}</div>
              <div className="text-sm text-gray-500">(USD ${tier.price_usd.toFixed(2)})</div>
              <div className="text-sm text-gray-600 mt-1">per {tier.billing_period}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Job Credits</div>
              <div className="text-2xl font-bold text-blue-600">
                {subscription.credits_remaining === -1 ? 'Unlimited' : subscription.credits_remaining}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Started On</div>
              <div className="text-lg font-semibold text-green-600">{formatDate(subscription.start_date)}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">
                {subscription.status === 'cancelled' ? 'Expires On' : 'Renews On'}
              </div>
              <div className="text-lg font-semibold text-purple-600">{formatDate(subscription.next_billing_date)}</div>
              {subscription.status === 'active' && daysUntilRenewal > 0 && (
                <div className="text-sm text-gray-600 mt-1">{daysUntilRenewal} days</div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigate('/subscriptions')}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
              Upgrade Plan
            </button>
            {subscription.status === 'active' ? (
              <button onClick={handleCancelSubscription} disabled={cancelling}
                className="flex-1 bg-red-100 text-red-700 px-6 py-3 rounded-lg font-semibold hover:bg-red-200 disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            ) : subscription.status === 'cancelled' ? (
              <button onClick={handleReactivateSubscription} disabled={cancelling}
                className="flex-1 bg-green-100 text-green-700 px-6 py-3 rounded-lg font-semibold hover:bg-green-200 disabled:opacity-50">
                {cancelling ? 'Reactivating...' : 'Reactivate'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No billing history</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Plan</th>
                    <th className="text-left py-3 px-4 font-semibold">Event</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(item.event_date)}</td>
                      <td className="py-3 px-4 font-medium">{item.tier_name}</td>
                      <td className="py-3 px-4">
                        {item.event_type.replace('_', ' ').replace(/\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        PGK {(item.amount_pgk || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
