import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../components/Toast';
import { FileText, CheckCircle, XCircle, Clock, DollarSign, Calendar, Briefcase, MessageCircle } from 'lucide-react';

export default function MyOffers() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [offers, setOffers] = useState([]);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState(null);

  useEffect(() => {
    if (id) {
      loadOffer(id);
    } else {
      loadOffers();
    }
  }, [id]);

  const loadOffers = async () => {
    try {
      const response = await fetch('/api/offer-letters/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to load offers');
      const data = await response.json();
      setOffers(data);
    } catch (error) {
      console.error('Failed to load offers:', error);
      showToast('Failed to load offers', 'error');
    } finally {
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
    } catch (error) {
      showToast('Failed to load offer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (response) => {
    const action = response === 'accepted' ? 'accept' : 'decline';
    const message = response === 'accepted'
      ? 'Accept this job offer? This action cannot be undone.'
      : 'Decline this job offer? You can provide a reason via messaging.';

    if (!confirm(message)) return;

    setRespondingTo(response);
    try {
      const res = await fetch(`/api/offer-letters/${currentOffer.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ response })
      });
      if (!res.ok) throw new Error('Failed to respond to offer');
      
      showToast(
        response === 'accepted' ? '🎉 Congratulations! Offer accepted!' : 'Offer declined',
        response === 'accepted' ? 'success' : 'info'
      );
      
      if (id) {
        loadOffer(id);
      } else {
        loadOffers();
      }
    } catch (error) {
      showToast('Failed to respond to offer: ' + error.message, 'error');
    } finally {
      setRespondingTo(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      sent: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pending Response' },
      accepted: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Declined' },
      expired: { color: 'bg-orange-100 text-orange-800', icon: Clock, label: 'Expired' }
    };
    const badge = badges[status] || badges.sent;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {badge.label}
      </span>
    );
  };

  const isExpiringSoon = (expiresAt) => {
    if (!expiresAt) return false;
    const daysLeft = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3 && daysLeft > 0;
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentOffer) {
    const expired = isExpired(currentOffer.expires_at);
    const expiringSoon = isExpiringSoon(currentOffer.expires_at);

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Offer</h1>
              <p className="text-gray-600 mt-1">{currentOffer.job_title} at {currentOffer.company_name}</p>
            </div>
            {getStatusBadge(currentOffer.status)}
          </div>

          {/* Expiration Warning */}
          {currentOffer.status === 'sent' && (
            <>
              {expired && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium">
                    ⚠️ This offer has expired on {new Date(currentOffer.expires_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {expiringSoon && !expired && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-medium">
                    ⏰ This offer expires soon on {new Date(currentOffer.expires_at).toLocaleDateString()}. Please respond promptly!
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Offer Letter */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-6">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations! 🎉</h2>
              <p className="text-gray-600">You've received a job offer from {currentOffer.company_name}</p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">Dear {currentOffer.candidate_name},</p>
              <p className="text-gray-700">
                We are pleased to offer you the position of <strong>{currentOffer.job_title}</strong> at {currentOffer.company_name}.
              </p>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 my-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">📋 Offer Details</h3>
                <div className="space-y-4">
                  {currentOffer.salary && (
                    <div className="flex items-start">
                      <div className="bg-white rounded-lg p-3 mr-4">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Salary</span>
                        <div className="font-bold text-gray-900 text-xl">
                          {currentOffer.salary_currency} {currentOffer.salary.toLocaleString()}
                        </div>
                        <span className="text-gray-500 text-sm capitalize">({currentOffer.salary_period})</span>
                      </div>
                    </div>
                  )}
                  {currentOffer.employment_type && (
                    <div className="flex items-start">
                      <div className="bg-white rounded-lg p-3 mr-4">
                        <Briefcase className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Employment Type</span>
                        <div className="font-semibold text-gray-900 capitalize">{currentOffer.employment_type}</div>
                      </div>
                    </div>
                  )}
                  {currentOffer.start_date && (
                    <div className="flex items-start">
                      <div className="bg-white rounded-lg p-3 mr-4">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Start Date</span>
                        <div className="font-semibold text-gray-900">
                          {new Date(currentOffer.start_date).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {currentOffer.probation_months && (
                    <div className="flex items-start">
                      <div className="bg-white rounded-lg p-3 mr-4">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <span className="text-gray-600 text-sm">Probation Period</span>
                        <div className="font-semibold text-gray-900">{currentOffer.probation_months} months</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {currentOffer.benefits && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-lg">✨</span>
                    <span className="ml-2">Benefits</span>
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{currentOffer.benefits}</p>
                </div>
              )}

              {currentOffer.additional_terms && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Additional Terms</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{currentOffer.additional_terms}</p>
                </div>
              )}

              <div className="pt-6 border-t">
                <p className="text-gray-700">
                  We look forward to having you join our team!
                </p>
                <p className="text-gray-700 mt-4">
                  Best regards,<br />
                  <strong>{currentOffer.company_name}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {currentOffer.status === 'sent' && !expired && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleRespond('accepted')}
                disabled={respondingTo !== null}
                className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {respondingTo === 'accepted' ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Offer
                  </>
                )}
              </button>
              <button
                onClick={() => handleRespond('declined')}
                disabled={respondingTo !== null}
                className="px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {respondingTo === 'declined' ? (
                  <>Processing...</>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Decline Offer
                  </>
                )}
              </button>
            </div>
            <button
              className="w-full px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium flex items-center justify-center"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Have Questions? Message the Employer
            </button>
          </div>
        )}

        {currentOffer.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">Offer Accepted!</h3>
            <p className="text-green-700">
              You accepted this offer on {new Date(currentOffer.responded_at).toLocaleDateString()}. 
              The employer will contact you with next steps.
            </p>
          </div>
        )}

        {currentOffer.status === 'declined' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Offer Declined</h3>
            <p className="text-gray-700">
              You declined this offer on {new Date(currentOffer.responded_at).toLocaleDateString()}.
            </p>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Job Offers</h1>

      {offers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No offers yet</h3>
          <p className="text-gray-500">When employers send you job offers, they'll appear here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{offer.job_title}</h3>
                  <p className="text-gray-600">{offer.company_name}</p>
                </div>
                {getStatusBadge(offer.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                {offer.salary && (
                  <div>
                    <span className="text-gray-500">Salary</span>
                    <p className="font-semibold text-gray-900">{offer.salary_currency} {offer.salary.toLocaleString()}</p>
                  </div>
                )}
                {offer.employment_type && (
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="font-semibold text-gray-900 capitalize">{offer.employment_type}</p>
                  </div>
                )}
                {offer.start_date && (
                  <div>
                    <span className="text-gray-500">Start Date</span>
                    <p className="font-semibold text-gray-900">{new Date(offer.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Received</span>
                  <p className="font-semibold text-gray-900">{new Date(offer.sent_at).toLocaleDateString()}</p>
                </div>
              </div>

              {offer.expires_at && offer.status === 'sent' && (
                <div className={`${isExpiringSoon(offer.expires_at) ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-700'} border rounded-lg p-3 mb-4 text-sm`}>
                  {isExpired(offer.expires_at) ? (
                    <strong>Expired on {new Date(offer.expires_at).toLocaleDateString()}</strong>
                  ) : (
                    <>Expires on {new Date(offer.expires_at).toLocaleDateString()}</>
                  )}
                </div>
              )}

              <a
                href={`/dashboard/jobseeker/offers/${offer.id}`}
                className="block w-full text-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View Full Offer
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
