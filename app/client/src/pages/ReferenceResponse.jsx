import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Star } from 'lucide-react';

export default function ReferenceResponse() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reference, setReference] = useState(null);
  const [responses, setResponses] = useState([]);
  const [overallRating, setOverallRating] = useState(0);
  const [recommendation, setRecommendation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReference();
  }, [token]);

  const loadReference = async () => {
    try {
      const response = await fetch(`/api/references/respond/${token}`);
      if (response.ok) {
        const data = await response.json();
        setReference(data);
        // Initialize responses array
        setResponses(new Array(data.questions.length).fill(''));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load reference request');
      }
    } catch (err) {
      setError('Failed to load reference request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all questions answered
    const allAnswered = responses.every(r => r.trim().length > 0);
    if (!allAnswered) {
      alert('Please answer all questions');
      return;
    }

    if (!recommendation) {
      alert('Please select a recommendation');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/references/respond/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses,
          overall_rating: overallRating,
          recommendation
        })
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to submit reference');
      }
    } catch (err) {
      alert('Failed to submit reference');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reference request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please contact the requester for a new link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reference Submitted</h1>
          <p className="text-gray-600 mb-4">
            Thank you for providing your reference for {reference.candidate_name}.
          </p>
          <p className="text-sm text-gray-500">
            Your feedback has been recorded and will be kept confidential.
          </p>
          <div className="mt-6 pt-6 border-t">
            <a
              href="https://wantokjobs.com"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Visit WantokJobs →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reference Check Request</h1>
            <p className="text-gray-600">
              {reference.candidate_name} has applied for the position of{' '}
              <span className="font-semibold">{reference.job_title}</span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">Dear {reference.referee_name},</p>
            <p>
              {reference.candidate_name} has listed you as a professional reference. We would greatly
              appreciate your honest feedback about your working relationship with them. Your responses
              will be kept confidential and used solely for employment evaluation purposes.
            </p>
          </div>
        </div>

        {/* Questions Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {reference.questions.map((question, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-lg p-6">
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                {idx + 1}. {question}
              </label>
              <textarea
                value={responses[idx]}
                onChange={(e) => {
                  const newResponses = [...responses];
                  newResponses[idx] = e.target.value;
                  setResponses(newResponses);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows="4"
                placeholder="Please provide your response..."
                required
              />
            </div>
          ))}

          {/* Overall Rating */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Overall Rating
            </label>
            <p className="text-sm text-gray-600 mb-4">
              How would you rate this candidate overall?
            </p>
            <div className="flex gap-2 items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-10 h-10 ${star <= overallRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`}
                  />
                </button>
              ))}
              {overallRating > 0 && (
                <span className="ml-4 text-lg font-medium text-gray-700">
                  {overallRating} / 5
                </span>
              )}
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Recommendation
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Would you recommend this candidate for employment?
            </p>
            <div className="space-y-3">
              {[
                { value: 'strongly-recommend', label: 'Strongly Recommend', color: 'green' },
                { value: 'recommend', label: 'Recommend', color: 'blue' },
                { value: 'neutral', label: 'Neutral', color: 'gray' },
                { value: 'not-recommend', label: 'Do Not Recommend', color: 'red' }
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    recommendation === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value={option.value}
                    checked={recommendation === option.value}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="w-5 h-5 mr-3"
                    required
                  />
                  <span className="font-medium text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Reference'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              By submitting, you confirm that the information provided is truthful and accurate.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by <a href="https://wantokjobs.com" className="text-primary-600 hover:text-primary-700 font-medium">WantokJobs</a></p>
          <p className="mt-2">Papua New Guinea's Premier Job Portal</p>
        </div>
      </div>
    </div>
  );
}
