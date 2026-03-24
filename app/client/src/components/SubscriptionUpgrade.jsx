import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const SubscriptionUpgrade = () => {
  const [searchParams] = useSearchParams();
  const [selectedTier, setSelectedTier] = useState(null);
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const tierName = searchParams.get('tier');
      const tiersRes = await api.get('/api/subscriptions/tiers');
      const tiers = tiersRes.data.tiers || [];
      setSelectedTier(tiers.find(t => t.tier_name === tierName));

      const subRes = await api.get('/api/subscriptions/current');
      setCurrentTier(subRes.data.tier || null);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTier) return;
    try {
      setProcessing(true);
      await api.post('/api/subscriptions/subscribe', { tier_id: selectedTier.id });
      alert('Subscription updated successfully!');
      navigate('/subscriptions/manage');
    } catch (error) {
      alert('Failed to update subscription.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedTier) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Invalid Plan</h2>
          <button onClick={() => navigate('/subscriptions')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            View All Plans
          </button>
        </div>
      </div>
    );
  }

  const isUpgrade = currentTier && selectedTier.price_pgk > currentTier.price_pgk;
  const isCurrent = currentTier && selectedTier.id === currentTier.id;

  if (isCurrent) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4">Already Subscribed</h2>
          <button onClick={() => navigate('/subscriptions/manage')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Manage Subscription
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isUpgrade ? 'Upgrade to' : 'Subscribe to'} {selectedTier.tier_name}
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Plan Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {currentTier && (
              <div className="border-2 border-gray-300 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-2">Current Plan</div>
                <h3 className="text-xl font-bold mb-4">{currentTier.tier_name}</h3>
                <div className="text-2xl font-bold mb-2">PGK {currentTier.price_pgk.toFixed(2)}</div>
                <div className="text-sm text-gray-500">(USD ${currentTier.price_usd.toFixed(2)})</div>
              </div>
            )}

            <div className="border-2 border-blue-600 rounded-lg p-6 bg-blue-50">
              <div className="text-sm text-blue-600 mb-2 font-semibold">New Plan</div>
              <h3 className="text-xl font-bold mb-4">{selectedTier.tier_name}</h3>
              <div className="text-2xl font-bold mb-2">PGK {selectedTier.price_pgk.toFixed(2)}</div>
              <div className="text-sm text-gray-500">(USD ${selectedTier.price_usd.toFixed(2)})</div>
            </div>
          </div>

          {currentTier && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between">
                <span>Price Difference:</span>
                <span className="text-xl font-bold">
                  {isUpgrade ? '+' : ''}PGK {(selectedTier.price_pgk - currentTier.price_pgk).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Features:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>{selectedTier.job_credits === -1 ? 'Unlimited' : selectedTier.job_credits} job credits</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>All premium features</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigate('/subscriptions')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300">
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={processing}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {processing ? 'Processing...' : 'Confirm Subscription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionUpgrade;
