import { useState, useEffect } from 'react';
import { orders, plans } from '../../../api';
import { Link } from 'react-router-dom';

export default function OrdersBilling() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ordersData, plansData] = await Promise.all([
        orders.getMy(),
        plans.getAll(),
      ]);

      setOrderHistory(ordersData || []);
      setAvailablePlans(plansData || []);

      // Mock current plan data
      setCurrentPlan({
        name: 'Basic Plan',
        expires_at: new Date(Date.now() + 15 * 86400000).toISOString(),
        jobs_remaining: 3,
        jobs_limit: 5,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      // Placeholder data
      setCurrentPlan({
        name: 'Basic Plan',
        expires_at: new Date(Date.now() + 15 * 86400000).toISOString(),
        jobs_remaining: 3,
        jobs_limit: 5,
      });

      setOrderHistory([
        {
          id: 1,
          invoice_number: 'INV-2024-001',
          plan_name: 'Basic Plan',
          amount: 49.99,
          status: 'completed',
          created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
      ]);

      setAvailablePlans([
        {
          id: 1,
          name: 'Basic',
          price: 49.99,
          duration: 30,
          job_limit: 5,
          features: 'Post up to 5 jobs, Basic support',
        },
        {
          id: 2,
          name: 'Premium',
          price: 199.99,
          duration: 30,
          job_limit: 20,
          features: 'Post up to 20 jobs, Priority support, Featured listings',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const daysRemaining = currentPlan 
    ? Math.ceil((new Date(currentPlan.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders & Billing</h1>

      {/* Current Plan */}
      {currentPlan && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Current Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan</p>
              <p className="text-xl font-bold text-gray-900">{currentPlan.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Jobs Remaining</p>
              <p className="text-xl font-bold text-gray-900">
                {currentPlan.jobs_remaining} / {currentPlan.jobs_limit}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expires</p>
              <p className="text-xl font-bold text-gray-900">
                {daysRemaining} days
              </p>
              <p className="text-xs text-gray-500">
                {new Date(currentPlan.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Job Posts Used</span>
              <span>{currentPlan.jobs_limit - currentPlan.jobs_remaining} / {currentPlan.jobs_limit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary-600 h-3 rounded-full"
                style={{
                  width: `${((currentPlan.jobs_limit - currentPlan.jobs_remaining) / currentPlan.jobs_limit) * 100}%`
                }}
              />
            </div>
          </div>

          {daysRemaining < 7 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Your plan expires in {daysRemaining} days. Upgrade or renew to continue posting jobs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upgrade Plans */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upgrade Your Plan</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePlans.map(plan => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold text-primary-600 mb-1">
                ${plan.price}
              </p>
              <p className="text-sm text-gray-600 mb-4">per {plan.duration} days</p>

              <div className="mb-6 space-y-2 text-sm text-gray-700">
                <p>✓ Post up to {plan.job_limit} jobs</p>
                {plan.features.split(',').map((feature, index) => (
                  <p key={index}>✓ {feature.trim()}</p>
                ))}
              </div>

              <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                Select Plan
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>
        
        {orderHistory.length === 0 ? (
          <p className="text-gray-600 text-center py-6">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orderHistory.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.plan_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${order.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-primary-600 hover:text-primary-700 font-medium">
                        Download Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
