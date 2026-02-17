import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { CheckCircle, Circle, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';

export default function OnboardingChecklist({ applicationId }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', category: 'general', due_date: '', notes: '' });

  useEffect(() => {
    loadChecklist();
  }, [applicationId]);

  const loadChecklist = async () => {
    try {
      const response = await fetch(`/api/onboarding/${applicationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else {
        showToast('Failed to load onboarding checklist', 'error');
      }
    } catch (error) {
      showToast('Failed to load onboarding checklist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId) => {
    try {
      const response = await fetch(`/api/onboarding/${applicationId}/item/${itemId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        await loadChecklist();
        showToast('Checklist updated', 'success');
      }
    } catch (error) {
      showToast('Failed to update checklist', 'error');
    }
  };

  const addCustomItem = async () => {
    if (!newItem.item.trim()) {
      showToast('Item text is required', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/onboarding/${applicationId}/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newItem)
      });

      if (response.ok) {
        await loadChecklist();
        setNewItem({ item: '', category: 'general', due_date: '', notes: '' });
        setShowAddItem(false);
        showToast('Item added', 'success');
      }
    } catch (error) {
      showToast('Failed to add item', 'error');
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Remove this checklist item?')) return;

    try {
      const response = await fetch(`/api/onboarding/${applicationId}/item/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        await loadChecklist();
        showToast('Item removed', 'success');
      }
    } catch (error) {
      showToast('Failed to remove item', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!data || !data.items) {
    return <div className="text-center py-8 text-gray-500">No checklist available</div>;
  }

  const { items, progress } = data;

  // Group items by category
  const categories = {
    documentation: items.filter(i => i.category === 'documentation'),
    IT: items.filter(i => i.category === 'IT'),
    orientation: items.filter(i => i.category === 'orientation'),
    training: items.filter(i => i.category === 'training'),
    general: items.filter(i => i.category === 'general' || !i.category)
  };

  const categoryLabels = {
    documentation: 'Documentation',
    IT: 'IT Setup',
    orientation: 'Orientation',
    training: 'Training',
    general: 'General'
  };

  const categoryColors = {
    documentation: 'bg-blue-50 border-blue-200',
    IT: 'bg-purple-50 border-purple-200',
    orientation: 'bg-green-50 border-green-200',
    training: 'bg-amber-50 border-amber-200',
    general: 'bg-gray-50 border-gray-200'
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Onboarding Progress</h3>
          <span className="text-2xl font-bold text-primary-600">{progress.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-primary-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {progress.completed} of {progress.total} items completed
        </p>
      </div>

      {/* Checklist by Category */}
      {Object.entries(categories).map(([category, categoryItems]) => {
        if (categoryItems.length === 0) return null;

        return (
          <div key={category} className={`rounded-lg border p-4 ${categoryColors[category]}`}>
            <h4 className="font-bold text-gray-900 mb-3 text-lg">{categoryLabels[category]}</h4>
            <div className="space-y-2">
              {categoryItems.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-3 flex items-start gap-3 hover:shadow-sm transition-shadow"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {item.is_completed ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 hover:text-primary-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {item.item}
                    </p>

                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}

                    {item.due_date && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        Due: {new Date(item.due_date).toLocaleDateString()}
                        {new Date(item.due_date) < new Date() && !item.is_completed && (
                          <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                        )}
                      </div>
                    )}

                    {item.completed_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Completed on {new Date(item.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Custom Item */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {!showAddItem ? (
          <button
            onClick={() => setShowAddItem(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Custom Item
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
              <input
                type="text"
                value={newItem.item}
                onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Complete background check"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="general">General</option>
                  <option value="documentation">Documentation</option>
                  <option value="IT">IT Setup</option>
                  <option value="orientation">Orientation</option>
                  <option value="training">Training</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={newItem.due_date}
                  onChange={(e) => setNewItem({ ...newItem, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                rows="2"
                placeholder="Additional details..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addCustomItem}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Add Item
              </button>
              <button
                onClick={() => setShowAddItem(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
