import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowUp, ArrowDown, Mail, AlertCircle } from 'lucide-react';

const SubscriptionUpgrade = () => {
  const navigate = useNavigate();
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { state: { from: '/subscriptions/upgrade' } });
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [subscriptionRes, tiersRes] = await Promise.all([
        fetch('/api/subscriptions/current', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subscriptions/tiers')
      ]);

      const [subscriptionData, tiersData] = await Promise.all([
        subscriptionRes.json(),
        tiersRes.json()
      ]);

      if (!subscriptionData.success || !subscriptionData.subscription) {
        navigate('/subscriptions');
        return;
      }

      setCurrentSubscription(subscriptionData.subscription);

      if (tiersData.success) {
        const filteredTiers = tiersData.tiers.filter(
          tier => tier.tier_type === subscriptionData.subscription.tier_type
        );
        setTiers(filteredTiers);
      }
    } catch (err) {
      setError('Failed to load subscription options');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUpgradeTiers = () => {
    if (!currentSubscription) return [];
    return tiers.filter(tier => tier.price_pgk > currentSubscription.price_pgk);
  };

  const getDowngradeTiers = () => {
    if (!currentSubscription) return [];
    return tiers.filter(tier => tier.price_pgk < currentSubscription.price_pgk);
  };

  const getPriceDifference = (tierPrice) => {
    if (!currentSubscription) return 0;
    return Math.abs(tierPrice - currentSubscription.price_pgk);
  };

  const handleContactUs = (tier, action) => {
    const subject = encodeURIComponent(`${action} to ${tier.name}`);
    const body = encodeURIComponent(
      `Hi,\n\nI would like to ${action.toLowerCase()} my subscription from ${currentSubscription.tier_name} to ${tier.name}.\n\nCurrent Plan: ${currentSubscription.tier_name} (${currentSubscription.price_pgk} PGK/month)\nDesired Plan: ${tier.name} (${tier.price_pgk} PGK/month)\n\nThank you!`
    );
    window.location.href = `mailto:support@wantokjobs.com?subject=${subject}&body=${body}`;
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
          <button
            onClick={() => navigate('/subscriptions')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
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
 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                  >
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
