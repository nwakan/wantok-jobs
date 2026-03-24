import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import api from '../../api';

const AdminPricing = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    try {
      const res = await api.get('/api/admin/pricing');
      setConfigs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (form.id) {
        await api.put(`/api/admin/pricing/${form.id}`, form);
      } else {
        await api.post('/api/admin/pricing', form);
      }
      await loadConfigs();
      setEditing(null);
      setForm({});
    } catch (err) {
      alert('Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    try {
      await api.delete(`/api/admin/pricing/${id}`);
      await loadConfigs();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-blue-600" />
          Dynamic Pricing
        </h1>
        <button
          onClick={() => { setEditing('new'); setForm({ feature_type: '', tier: '', price_pgk: 0, price_usd: 0, credits_included: 0, discount_percent: 0, is_active: true }); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Pricing
        </button>
      </div>

      {editing && (
        <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">{form.id ? 'Edit' : 'Add'} Pricing</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.feature_type || ''} onChange={(e) => setForm({...form, feature_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select...</option>
                <option value="job_credit">Job Credit</option>
                <option value="subscription">Subscription</option>
                <option value="addon">Addon</option>
                <option value="notification_credit">Notification Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tier</label>
              <input value={form.tier || ''} onChange={(e) => setForm({...form, tier: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (PGK)</label>
              <input type="number" step="0.01" value={form.price_pgk || 0} onChange={(e) => setForm({...form, price_pgk: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (USD)</label>
              <input type="number" step="0.01" value={form.price_usd || 0} onChange={(e) => setForm({...form, price_usd: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Credits</label>
              <input type="number" value={form.credits_included || 0} onChange={(e) => setForm({...form, credits_included: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount %</label>
              <input type="number" step="0.01" value={form.discount_percent || 0} onChange={(e) => setForm({...form, discount_percent: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active || false} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="w-4 h-4" />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
            <button onClick={() => { setEditing(null); setForm({}); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PGK</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">USD</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {configs.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{c.feature_type}</span></td>
                <td className="px-6 py-4 text-sm">{c.tier || '-'}</td>
                <td className="px-6 py-4 text-sm font-semibold">K{c.price_pgk}</td>
                <td className="px-6 py-4 text-sm">${c.price_usd}</td>
                <td className="px-6 py-4 text-sm">{c.credits_included || 0}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(c.id); setForm(c); }} className="text-blue-600 hover:text-blue-800"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPricing;
