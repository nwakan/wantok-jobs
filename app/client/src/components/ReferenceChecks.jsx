import { useState } from 'react';
import { useToast } from './Toast';
import { Plus, Mail, Clock, CheckCircle, XCircle, AlertCircle, Star } from 'lucide-react';

export default function ReferenceChecks({ applicationId, references, onRefresh }) {
  const { showToast } = useToast();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newReference, setNewReference] = useState({
    referee_name: '',
    referee_email: '',
    referee_phone: '',
    referee_company: '',
    referee_relationship: 'colleague'
  });
  const [selectedReference, setSelectedReference] = useState(null);

  const requestReference = async () => {
    if (!newReference.referee_name || !newReference.referee_email) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/references', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          application_id: applicationId,
          ...newReference
        })
      });

      if (response.ok) {
        showToast('Reference request sent successfully', 'success');
        setNewReference({
          referee_name: '',
          referee_email: '',
          referee_phone: '',
          referee_company: '',
          referee_relationship: 'colleague'
        });
        setShowRequestForm(false);
        onRefresh();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to send reference request', 'error');
      }
    } catch (error) {
      showToast('Failed to send reference request', 'error');
    }
  };

  const sendReminder = async (referenceId) => {
    try {
      const response = await fetch(`/api/references/${referenceId}/remind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        showToast('Reminder sent', 'success');
      } else {
        showToast('Failed to send reminder', 'error');
      }
    } catch (error) {
      showToast('Failed to send reminder', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Pending' },
      sent: { icon: Mail, color: 'bg-blue-100 text-blue-700', label: 'Sent' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Completed' },
      declined: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Declined' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getRecommendationBadge = (recommendation) => {
    const badges = {
      'strongly-recommend': { color: 'bg-green-100 text-green-700', label: 'Strongly Recommend' },
      'recommend': { color: 'bg-blue-100 text-blue-700', label: 'Recommend' },
      'neutral': { color: 'bg-gray-100 text-gray-700', label: 'Neutral' },
      'not-recommend': { color: 'bg-red-100 text-red-700', label: 'Not Recommend' },
    };

    const badge = badges[recommendation] || badges.neutral;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Request New Reference Button */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {!showRequestForm ? (
          <button
            onClick={() => setShowRequestForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-5 h-5" />
            Request New Reference
          </button>
        ) : (
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 text-lg">Request Reference Check</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Referee Name *</label>
                <input
                  type="text"
                  value={newReference.referee_name}
                  onChange={(e) => setNewReference({ ...newReference, referee_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={newReference.referee_email}
                  onChange={(e) => setNewReference({ ...newReference, referee_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
                <input
                  type="tel"
                  value={newReference.referee_phone}
                  onChange={(e) => setNewReference({ ...newReference, referee_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="+675 1234 5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company (optional)</label>
                <input
                  type="text"
                  value={newReference.referee_company}
                  onChange={(e) => setNewReference({ ...newReference, referee_company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Company name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
              <select
                value={newReference.referee_relationship}
                onChange={(e) => setNewReference({ ...newReference, referee_relationship: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="manager">Manager</option>
                <option value="colleague">Colleague</option>
                <option value="report">Direct Report</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              An email will be sent to the referee with a secure link to provide their reference.
            </div>

            <div className="flex gap-2">
              <button
                onClick={requestReference}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Send Request
              </button>
              <button
                onClick={() => setShowRequestForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* References List */}
      {references.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No reference checks requested yet</p>
          <p className="text-sm text-gray-500 mt-1">Request references from candidates' former employers or colleagues</p>
        </div>
      ) : (
        <div className="space-y-4">
          {references.map(ref => (
            <div key={ref.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{ref.referee_name}</h4>
                  <p className="text-gray-600 text-sm">{ref.referee_email}</p>
                  {ref.referee_company && (
                    <p className="text-gray-500 text-sm">{ref.referee_company}</p>
                  )}
                  <p className="text-gray-500 text-sm capitalize">{ref.referee_relationship}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(ref.status)}
                  {ref.recommendation && getRecommendationBadge(ref.recommendation)}
                </div>
              </div>

              {/* Overall Rating */}
              {ref.overall_rating && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Overall Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= ref.overall_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex gap-4 text-sm text-gray-500 mb-3">
                {ref.sent_at && (
                  <span>Sent: {new Date(ref.sent_at).toLocaleDateString()}</span>
                )}
                {ref.completed_at && (
                  <span>Completed: {new Date(ref.completed_at).toLocaleDateString()}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {ref.status === 'completed' && (
                  <button
                    onClick={() => setSelectedReference(ref)}
                    className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 font-medium text-sm"
                  >
                    View Responses
                  </button>
                )}
                {ref.status === 'sent' && (
                  <button
                    onClick={() => sendReminder(ref.id)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                  >
                    Send Reminder
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reference Detail Modal */}
      {selectedReference && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedReference(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Reference from {selectedReference.referee_name}</h3>
              <button
                onClick={() => setSelectedReference(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Referee Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">Referee Information</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedReference.referee_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedReference.referee_email}</p>
                  {selectedReference.referee_company && (
                    <p><span className="font-medium">Company:</span> {selectedReference.referee_company}</p>
                  )}
                  <p className="capitalize"><span className="font-medium">Relationship:</span> {selectedReference.referee_relationship}</p>
                </div>
              </div>

              {/* Overall Rating & Recommendation */}
              <div className="grid grid-cols-2 gap-4">
                {selectedReference.overall_rating && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-2">Overall Rating</h4>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${star <= selectedReference.overall_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {selectedReference.recommendation && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 mb-2">Recommendation</h4>
                    {getRecommendationBadge(selectedReference.recommendation)}
                  </div>
                )}
              </div>

              {/* Questions & Responses */}
              {selectedReference.responses && selectedReference.responses.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-4">Reference Responses</h4>
                  <div className="space-y-4">
                    {selectedReference.responses.map((response, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">{selectedReference.questions[idx]}</h5>
                        <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-500 text-center pt-4 border-t">
                Reference completed on {new Date(selectedReference.completed_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
