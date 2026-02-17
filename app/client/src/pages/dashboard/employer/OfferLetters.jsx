import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../components/Toast';
import { FileText, Send, Edit, Eye, CheckCircle, XCircle, Clock, DollarSign, Calendar, Briefcase } from 'lucide-react';

export default function OfferLetters() {
  const { id } = useParams(); // offer id (for viewing specific offer)
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [offers, setOffers] = useState([]);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (id) {
      loadOffer(id);
    } else {
      loadOffers();
    }
  }, [id]);

  const loadOffers = async () => {
    try {
      // This would need a new endpoint to list all offers for employer
      // For now, we'll just show the interface
      setLoading(false);
    } catch (error) {
      console.error('Failed to load offers:', error);
      setLoading(false);
    }
  };

  const loadOffer = async (offerId) => {
    try {
      const response = await fetch(`/api/offer-letters/${offerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to load offer');
      const data = await response.json();
      setCurrentOffer(data);
      setFormData(data);
    } catch (error) {
      showToast('Failed to load offer', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/offer-letters/${currentOffer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to update offer');
      showToast('Offer updated successfully', 'success');
      setEditMode(false);
      loadOffer(currentOffer.id);
    } catch (error) {
      showToast('Failed to update offer: ' + error.message, 'error');
    }
  };

  const handleSend = async () => {
    if (!confirm('Send this offer to the candidate? They will receive an email with the offer details.')) return;

    try {
      const response = await fetch(`/api/offer-letters/${currentOffer.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ expires_in_days: 7 })
      });
      if (!response.ok) throw new Error('Failed to send offer');
      showToast('Offer sent successfully!', 'success');
      loadOffer(currentOffer.id);
    } catch (error) {
      showToast('Failed to send offer: ' + error.message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Edit, label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send, label: 'Sent' },
      accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Declined' },
      expired: { color: 'bg-orange-100 text-orange-800', icon: Clock, label: 'Expired' }
    };
    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentOffer) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offer Letter</h1>
            <p className="text-gray-600 mt-1">{currentOffer.candidate_name} - {currentOffer.job_title}</p>
          </div>
          {getStatusBadge(currentOffer.status)}
        </div>

        {/* Offer Letter Preview */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-6">
          {editMode ? (
            // Edit Form
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={formData.salary_currency || 'PGK'}
                    onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PGK">PGK</option>
                    <option value="USD">USD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                  <select
                    value={formData.salary_period || 'annual'}
                    onChange={(e) => setFormData({ ...formData, salary_period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                  <select
                    value={formData.employment_type || ''}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Probation (months)</label>
                  <input
                    type="number"
                    value={formData.probation_months || 3}
                    onChange={(e) => setFormData({ ...formData, probation_months: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
                <textarea
                  value={formData.benefits || ''}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="List benefits (e.g., health insurance, paid leave, etc.)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Terms</label>
                <textarea
                  value={formData.additional_terms || ''}
                  onChange={(e) => setFormData({ ...formData, additional_terms: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional terms and conditions"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setFormData(currentOffer);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Preview Mode
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Offer Letter</h2>
                <p className="text-gray-600">{currentOffer.company_name}</p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">Dear {currentOffer.candidate_name},</p>
                <p className="text-gray-700">
                  We are pleased to offer you the position of <strong>{currentOffer.job_title}</strong> at {currentOffer.company_name}.
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Offer Details</h3>
                  <div className="space-y-3">
                    {currentOffer.salary && (
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <span className="text-gray-600">Salary:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {currentOffer.salary_currency} {currentOffer.salary.toLocaleString()} ({currentOffer.salary_period})
                          </span>
                        </div>
                      </div>
                    )}
                    {currentOffer.employment_type && (
                      <div className="flex items-center">
                        <Briefcase className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <span className="text-gray-600">Employment Type:</span>
                          <span className="ml-2 font-semibold text-gray-900 capitalize">{currentOffer.employment_type}</span>
                        </div>
                      </div>
                    )}
                    {currentOffer.start_date && (
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <span className="text-gray-600">Start Date:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {new Date(currentOffer.start_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                    {currentOffer.probation_months && (
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <span className="text-gray-600">Probation Period:</span>
                          <span className="ml-2 font-semibold text-gray-900">{currentOffer.probation_months} months</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {currentOffer.benefits && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Benefits</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{currentOffer.benefits}</p>
                  </div>
                )}

                {currentOffer.additional_terms && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Additional Terms</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{currentOffer.additional_terms}</p>
                  </div>
                )}

                {currentOffer.expires_at && currentOffer.status === 'sent' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      <strong>This offer expires on {new Date(currentOffer.expires_at).toLocaleDateString()}</strong>
                    </p>
                  </div>
                )}

                <p className="text-gray-700 mt-6">
                  We look forward to having you join our team!
                </p>
                <p className="text-gray-700">
                  Best regards,<br />
                  {currentOffer.company_name}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {currentOffer.status === 'draft' && !editMode && (
          <div className="flex gap-3">
            <button
              onClick={() => setEditMode(true)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit Offer
            </button>
            <button
              onClick={handleSend}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
            >
              <Send className="h-5 w-5 mr-2" />
              Send to Candidate
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view (if not viewing specific offer)
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Offer Letters</h1>
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p>No offer letters yet. Create an offer from the applicants page.</p>
      </div>
    </div>
  );
}
