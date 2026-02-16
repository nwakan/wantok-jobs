import { useState, useEffect } from 'react';
import { plans } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function Plans() {
  const [planList, setPlanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: 30,
    job_limit: 5,
    features: '',
    active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await plans.getAll();
      setPlanList(data || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
      // Placeholder data
      setPlanList([
        {
          id: 1,
          name: 'Basic',
          price: 49.99,
          duration: 30,
          job_limit: 5,
          features: 'Post up to 5 jobs, Basic support',
          active: true,
        },
        {
          id: 2,
          name: 'Premium',
          price: 199.99,
          duration: 30,
          job_limit: 20,
          features: 'Post up to 20 jobs, Priority support, Featured listings',
          active: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await plans.update(editingPlan.id, formData);
        showToast('Plan updated successfully', 'success');
      } else {
        await plans.create(formData);
        showToast('Plan created successfully', 'success');
      }
      loadPlans();
      resetForm();
    } catch (error) {
      showToast('Failed to save plan', 'error');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      job_limit: plan.job_limit,
      features: plan.features,
      active: plan.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await plans.delete(id);
      showToast('Plan deleted successfully', 'success');
      loadPlans();
    } catch (error) {
      showToast('Failed to delete plan', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: 30,
      job_limit: 5,
      features: '',
      active: true,
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {showForm ? 'Cancel' : 'Add New Plan'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingPlan ? 'Edit Plan' : 'Add New Plan'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Limit</label>
                <input
                  type="number"
                  value={formData.job_limit}
                  onChange={e => setFormData({ ...formData, job_limit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
              <textarea
                value={formData.features}
                onChange={e => setFormData({ ...formData, features: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows="3"
                placeholder="Comma-separated features"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Active</label>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                {editingPlan ? 'Update' : 'Create'} Plan
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {planList.map(plan => (
          <div key={plan.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-bold text-primary-600 mt-2">${plan.price}</p>
                <p className="text-sm text-gray-600">per {plan.duration} days</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                plan.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {plan.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Job Limit:</strong> {plan.job_limit}
              </p>
              <p className="text-sm text-gray-700">{plan.features}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(plan)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
