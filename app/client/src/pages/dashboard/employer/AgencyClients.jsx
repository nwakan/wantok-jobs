import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../components/Toast';
import { Plus, Pencil, Trash2, X, Building2, Briefcase } from 'lucide-react';
import DashboardLayout from '../../../components/DashboardLayout';
import OptimizedImage from '../../../components/OptimizedImage';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const emptyClient = {
  company_name: '', logo_url: '', industry: '', location: '',
  website: '', contact_name: '', contact_email: '', contact_phone: '', description: '',
};

export default function AgencyClients() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyClient });
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/agency/clients`, { headers: getHeaders() });
      const data = await res.json();
      setClients(data.data || []);
    } catch { showToast('Failed to load clients', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const openAdd = () => { setEditing(null); setForm({ ...emptyClient }); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.company_name.trim()) { showToast('Company name required', 'error'); return; }
    setSaving(true);
    try {
      const url = editing ? `${API_URL}/agency/clients/${editing.id}` : `${API_URL}/agency/clients`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(editing ? 'Client updated' : 'Client created', 'success');
      setShowModal(false);
      fetchClients();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try {
      const res = await fetch(`${API_URL}/agency/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      showToast('Client deleted', 'success');
      fetchClients();
    } catch { showToast('Failed to delete', 'error'); }
  };

  if (user?.account_type !== 'agency') {
    return (
      <DashboardLayout role="employer">
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Agency Feature</h2>
          <p className="text-gray-500">This feature is available for recruitment agency accounts only.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="employer">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Companies</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No client companies yet</p>
          <button onClick={openAdd} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">
            Add Your First Client
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Industry</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Location</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Active Jobs</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <OptimizedImage src={c.logo_url} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{c.company_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.industry || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.location || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-sm">
                      <Briefcase className="w-3 h-3" /> {c.active_jobs_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {[
                ['company_name', 'Company Name *', 'text'],
                ['industry', 'Industry', 'text'],
                ['location', 'Location', 'text'],
                ['website', 'Website', 'url'],
                ['contact_name', 'Contact Name', 'text'],
                ['contact_email', 'Contact Email', 'email'],
                ['contact_phone', 'Contact Phone', 'text'],
                ['logo_url', 'Logo URL', 'url'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type} value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3} value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
