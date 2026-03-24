import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const SubscriptionPlans = () => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTiers();
    if (isAuthenticated) {
      loadCurrentSubscription();
    }
  }, [isAuthenticated]);

  const loadTiers = async () => {
    try {
      const response = await api.get('/api/subscriptions/tiers');
      setTiers(response.data.tiers || []);
    } catch (error) {
      console.error('Failed to load subscription tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSubscription = async () => {
    try {
      const response = await api.get('/api/subscriptions/current');
      setCurrentTier(response.data.tier?.tier_name || null);
    } catch (error) {
      console.error('Failed to load current subscription:', error);
    }
  };

  const handleSelectPlan = (tier) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/subscriptions');
      return;
    }
    navigate(`/subscriptions/upgrade?tier=${tier.tier_name}`);
  };

  const getPriceDisplay = (tier) => {
    const price = tier.price_pgk || 0;
    const priceUsd = tier.price_usd || 0;
    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">
          PGK {price.toFixed(2)}
        </div>
        <div className="text-sm text-gray-500">
          (USD ${priceUsd.toFixed(2)})
        </div>
        <div className="text-sm text-gray-600 mt-1">
          /{tier.billing_period}
        </div>
      </div>
    );
  };

  const isCurrentTier = (tierName) => currentTier === tierName;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock premium features to accelerate your hiring or job search
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => {
            const isCurrent = isCurrentTier(tier.tier_name);
            const isPopular = tier.tier_name === 'Professional';
            
            return (
              <div
                key={tier.id}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  isPopular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                
                {isCurrent && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white px-4 py-1 text-sm font-semibold rounded-br-lg">
                    Current Plan
                  </div>
                )}

                <div className="p-8">
                  {/* Tier Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {tier.tier_name}
                  </h3>

                  {/* Price */}
                  <div className="mb-6">
                    {getPriceDisplay(tier)}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 min-h-[3rem]">
                    {tier.description}
                  </p>

                  {/* Credits */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Job Credits</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {tier.job_credits === -1 ? 'Unlimited' : tier.job_credits}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(tier)}
                    disabled={isCurrent}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-800 text-white hover:bg-gray-900'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  {tiers.map((tier) => (
                    <th key={tier.id} className="text-center py-4 px-4 font-semibold text-gray-900">
                      {tier.tier_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">Job Credits</td>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="text-center py-4 px-4 text-gray-900 font-semibold">
                      {tier.job_credits === -1 ? 'Unlimited' : tier.job_credits}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">Featured Jobs</td>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="text-center py-4 px-4">
                      {tier.tier_name === 'Free' ? '❌' : '✅'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">AI Candidate Matching</td>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="text-center py-4 px-4">
                      {tier.tier_name === 'Free' || tier.tier_name === 'Basic' ? '❌' : '✅'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">Priority Support</td>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="text-center py-4 px-4">
                      {['Enterprise', 'Agency'].includes(tier.tier_name) ? '✅' : '❌'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700">Dedicated Account Manager</td>
                  {tiers.map((tier) => (
                    <td key={tier.id} className="text-center py-4 px-4">
                      {tier.tier_name === 'Enterprise' ? '✅' : '❌'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
