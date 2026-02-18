import { useState, useEffect } from 'react';
import { 
  Shield, Check, X, Clock, AlertCircle, Building2, Mail, Phone, 
  ExternalLink, Filter, Search, ChevronDown 
} from 'lucide-react';
import api from '../../../api';
import { useToast } from '../../../components/Toast';
import PageHead from '../../../components/PageHead';

export default function EmployerClaims() {
  const { showToast } = useToast();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'approve' or 'reject'
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Override form
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideEmployerId, setOverrideEmployerId] = useState('');
  const [overrideUserId, setOverrideUserId] = useState('');

  useEffect(() => {
    fetchClaims();
  }, [filterStatus]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      
      const res = await api.get(`/admin/employer-claims?${params}`);
      setClaims(res.claims || []);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      showToast('Failed to load claims', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openActionModal = (claim, action) => {
    setSelectedClaim(claim);
    setModalAction(action);
    setAdminNotes('');
    setShowModal(true);
  };

  const handleUpdateClaim = async () => {
    if (!selectedClaim) return;

    setSubmitting(true);
    try {
      await api.put(`/admin/employer-claims/${selectedClaim.id}`, {
        status: modalAction === 'approve' ? 'verified' : 'rejected',
        notes: adminNotes
      });

      showToast(
        `Claim ${modalAction === 'approve' ? 'approved' : 'rejected'} successfully`,
        'success'
      );
      
      setShowModal(false);
      setSelectedClaim(null);
      fetchClaims();
    } catch (error) {
      console.error('Failed to update claim:', error);
      showToast(
        error.message || 'Failed to update claim',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideEmployerId || !overrideUserId) {
      showToast('Please provide both employer ID and user ID', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/employer-claims/override', {
        employer_id: parseInt(overrideEmployerId),
        user_id: parseInt(overrideUserId)
      });

      showToast('Employer profile assigned successfully', 'success');
      setShowOverrideModal(false);
      setOverrideEmployerId('');
      setOverrideUserId('');
      fetchClaims();
    } catch (error) {
      console.error('Failed to override claim:', error);
      showToast(
        error.message || 'Failed to assign employer profile',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      pending: Clock,
      verified: Check,
      rejected: X,
      expired: AlertCircle
    };

    const Icon = icons[status] || AlertCircle;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getMethodIcon = (method) => {
    if (method === 'email') return <Mail className="w-4 h-4" />;
    if (method === 'phone') return <Phone className="w-4 h-4" />;
    return <Shield className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <PageHead 
        title="Employer Claims - Admin Dashboard"
        description="Manage employer profile claim requests"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employer Claims</h1>
          <p className="text-gray-600 mt-1">Review and approve employer verification requests</p>
        </div>
        <button 
          onClick={() => setShowOverrideModal(true)}
          className="btn-primary"
        >
          <Shield className="w-4 h-4" />
          Manual Override
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'verified', 'rejected', 'expired'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status === 'all' ? '' : status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  (status === 'all' && !filterStatus) || filterStatus === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
            <p className="text-gray-600">
              {filterStatus 
                ? `No ${filterStatus} claims at the moment`
                : 'No employer claims have been submitted yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {claim.company_name}
                          </div>
                          {claim.website && (
                            <a 
                              href={claim.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                              Website
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        {getMethodIcon(claim.claim_method)}
                        {claim.claim_method}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {claim.verification_value}
                      </div>
                      {claim.user_email && (
                        <div className="text-xs text-gray-500">
                          User: {claim.user_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {claim.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openActionModal(claim, 'approve')}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(claim, 'reject')}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {claim.status === 'verified' ? 'Approved' : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalAction === 'approve' ? 'Approve' : 'Reject'} Claim
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Company:</span>{' '}
                    <span className="text-gray-900">{selectedClaim.company_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Method:</span>{' '}
                    <span className="text-gray-900">{selectedClaim.claim_method}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Value:</span>{' '}
                    <span className="text-gray-900">{selectedClaim.verification_value}</span>
                  </div>
                  {selectedClaim.admin_notes && (
                    <div>
                      <span className="font-medium text-gray-700">Previous Notes:</span>{' '}
                      <span className="text-gray-600 italic">{selectedClaim.admin_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes {modalAction === 'reject' && '(Required)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="input w-full"
                  placeholder={modalAction === 'approve' 
                    ? 'Optional notes about this approval...'
                    : 'Reason for rejection...'
                  }
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedClaim(null);
                }}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateClaim}
                className={`flex-1 ${
                  modalAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
                disabled={submitting || (modalAction === 'reject' && !adminNotes.trim())}
              >
                {submitting ? 'Processing...' : modalAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Manual Profile Assignment
            </h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-900">
                  <p className="font-semibold mb-1">Admin Override</p>
                  <p>
                    Use this to manually assign an employer profile to a user without going through verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employer Profile ID
                </label>
                <input
                  type="number"
                  value={overrideEmployerId}
                  onChange={(e) => setOverrideEmployerId(e.target.value)}
                  className="input w-full"
                  placeholder="12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="number"
                  value={overrideUserId}
                  onChange={(e) => setOverrideUserId(e.target.value)}
                  className="input w-full"
                  placeholder="67890"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideEmployerId('');
                  setOverrideUserId('');
                }}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                className="btn-primary flex-1"
                disabled={submitting || !overrideEmployerId || !overrideUserId}
              >
                {submitting ? 'Assigning...' : 'Assign Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
