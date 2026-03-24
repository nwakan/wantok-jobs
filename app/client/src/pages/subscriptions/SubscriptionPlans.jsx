import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState([]);
  const [tierType, setTierType] = useState('jobseeker');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    fetchTiers();
    fetchCurrentSubscription();
  }, [tierType]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subscriptions/tiers?tier_type=${tierType}`);
      const data = await response.json();
      if (data.success) {
        setTiers(data.tiers);
      } else {
        setError('Failed to load subscription plans');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching tiers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/subscriptions/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.subscription) {
        setCurrentSubscription(data.subscription);
      }
    } catch (err) {
      console.error('Error fetching current subscription:', err);
    }
  };

  const handleSubscribe = (tierId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: '/subscriptions', tierId } });
      return;
    }
    navigate('/subscriptions/checkout', { state: { tierId } });
  };

  const getBillingPeriodText = (period) => {
    switch(period) {
      case 'monthly': return '/month';
      case 'annual': return '/year';
      case 'per_job': return '/job';
      default: return '';
    }
  };

  const isCurrentTier = (tierId) => {
    return currentSubscription && currentSubscription.tier_id === tierId;
  };

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchTiers}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock premium features and accelerate your job search or recruitment
          </p>
          
          {/* Toggle between Jobseeker/Employer */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => setTierType('jobseeker')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                tierType === 'jobseeker'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Jobseekers
            </button>
            <button
              onClick={() => setTierType('employer')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                tierType === 'employer'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Employers
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier, index) => (
            <div
              key={tier.tier_id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                index === 1 ? 'ring-4 ring-blue-600 scale-105' : ''
              } ${isCurrentTier(tier.tier_id) ? 'ring-4 ring-green-500' : ''}`}
            >
              {/* Popular Badge */}
              {index === 1 && (
                <div className="bg-blue-600 text-white text-center py-2 px-4 text-sm font-semibold">
                  <Sparkles className="inline h-4 w-4 mr-1" />
                  MOST POPULAR
                </div>
              )}
              
              {/* Current Subscription Badge */}
              {isCurrentTier(tier.tier_id) && (
                <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-semibold">
                  ✓ CURRENT PLAN
                </div>
              )}

              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      {tier.price_pgk}
                    </span>
                    <span className="text-2xl font-semibold text-gray-600 ml-2">
                      PGK
                    </span>
                    <span className="text-gray-500 ml-2">
                      {getBillingPeriodText(tier.billing_period)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    USD ${tier.price_usd.toFixed(2)}{getBillingPeriodText(tier.billing_period)}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(tier.tier_id)}
                  disabled={isCurrentTier(tier.tier_id)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    isCurrentTier(tier.tier_id)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : index === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isCurrentTier(tier.tier_id) ? 'Current Plan' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-gray-600">
          <p className="mb-2">All plans include our standard features and support</p>
          <p>Need help choosing? <a href="/contact" className="text-blue-600 hover:underline">Contact us</a></p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
