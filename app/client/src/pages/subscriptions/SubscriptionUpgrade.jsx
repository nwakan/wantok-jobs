import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Check, Mail, AlertCircle } from 'lucide-react';

const SubscriptionUpgrade = () => {
  const navigate = useNavigate();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [allTiers, setAllTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [currentRes, tiersRes] = await Promise.all([
        fetch('/api/subscriptions/current', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/subscriptions/tiers', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (currentRes.ok && tiersRes.ok) {
        const current = await currentRes.json();
        const tiers = await tiersRes.json();
        setCurrentSubscription(current);
        setAllTiers(tiers.filter(t => t.tier_type === current.tier_type));
      } else {
        setError('Failed to load subscription data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUpgradeTiers = () => {
    if (!currentSubscription || !allTiers.length) return [];
    return allTiers.filter(t => t.price_pgk > currentSubscription.price_pgk);
  };

  const getDowngradeTiers = () => {
    if (!currentSubscription || !allTiers.length) return [];
    return allTiers.filter(t => t.price_pgk < currentSubscription.price_pgk);
  };

  const getPriceDifference = (newPrice) => {
    return Math.abs(newPrice - currentSubscription.price_pgk);
  };

  const handleContactUs = (tier, action) => {
    const subject = `${action} Request: ${tier.name}`;
    const body = `Hi WantokJobs Team,\n\nI would like to ${action.toLowerCase()} my subscription from ${currentSubscription.tier_name} to ${tier.name}.\n\nCurrent Plan: ${currentSubscription.tier_name} (${currentSubscription.price_pgk} PGK / $${currentSubscription.price_usd} USD)\nNew Plan: ${tier.name} (${tier.price_pgk} PGK / $${tier.price_usd} USD)\n\nPlease contact me to process this request.\n\nThank you!`;
    window.location.href = `mailto:support@wantokjobs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSubscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'No active subscription found'}</p>
          <button onClick={() => navigate('/subscriptions')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const upgradeTiers = getUpgradeTiers();
  const downgradeTiers = getDowngradeTiers();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upgrade or Downgrade</h1>
          <p className="text-gray-600">Change your subscription plan</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">{currentSubscription.tier_name}</p>
              <p className="text-gray-600">{currentSubscription.price_pgk} PGK / ${currentSubscription.price_usd.toFixed(2)} USD per {currentSubscription.billing_period}</p>
            </div>
            <button onClick={() => navigate('/subscriptions/manage')} className="text-blue-600 hover:underline">
              Manage Subscription →
            </button>
          </div>
        </div>

        {upgradeTiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUp className="h-6 w-6 text-green-600" />
              Upgrade Options
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upgradeTiers.map((tier) => (
                <div key={tier.tier_id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200 hover:border-green-400 transition">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">{tier.price_pgk} PGK</p>
                  <p className="text-gray-600 mb-4">${tier.price_usd.toFixed(2)} USD per {tier.billing_period}</p>
                  <p className="text-sm text-gray-500 mb-4">+{getPriceDifference(tier.price_pgk)} PGK difference</p>
                  <ul className="mb-6 space-y-2">
                    {tier.features && JSON.parse(tier.features).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleContactUs(tier, 'Upgrade')} className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Us to Upgrade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {downgradeTiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowDown className="h-6 w-6 text-orange-600" />
              Downgrade Options
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {downgradeTiers.map((tier) => (
                <div key={tier.tier_id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-orange-200 hover:border-orange-400 transition">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <p className="text-3xl font-bold text-orange-600 mb-2">{tier.price_pgk} PGK</p>
                  <p className="text-gray-600 mb-4">${tier.price_usd.toFixed(2)} USD per {tier.billing_period}</p>
                  <p className="text-sm text-gray-500 mb-4">-{getPriceDifference(tier.price_pgk)} PGK difference</p>
                  <ul className="mb-6 space-y-2">
                    {tier.features && JSON.parse(tier.features).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleContactUs(tier, 'Downgrade')} className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Us to Downgrade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionUpgrade;
