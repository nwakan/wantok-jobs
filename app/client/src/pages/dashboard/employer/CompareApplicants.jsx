import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applications } from '../../../api';
import { useToast } from '../../../components/Toast';
import { ArrowLeft, Award, Briefcase, MapPin, GraduationCap, Mail, Phone, TrendingUp, ChevronRight, Star } from 'lucide-react';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';

export default function CompareApplicants() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const ids = searchParams.get('ids');

  useEffect(() => {
    if (!ids) {
      navigate(-1);
      return;
    }
    loadApplicants();
  }, [ids]);

  const loadApplicants = async () => {
    try {
      const response = await fetch(`/api/applications/compare?ids=${ids}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to load applicants');
      const data = await response.json();
      setApplicants(data.data || []);
    } catch (error) {
      console.error('Failed to load applicants:', error);
      showToast('Failed to load applicants for comparison', 'error');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWinner = async (applicationId) => {
    try {
      await applications.updateStatus(applicationId, 'shortlisted');
      showToast('Applicant moved to shortlisted!', 'success');
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getBestRating = () => {
    return Math.max(...applicants.map(a => a.rating || 0));
  };

  const getBestScore = () => {
    return Math.max(...applicants.map(a => a.ai_score || 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Applicants
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Compare Candidates</h1>
          <p className="text-gray-600 mt-1">Side-by-side comparison of {applicants.length} candidates</p>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 w-48 sticky left-0 bg-gray-50 z-10">
                  Criteria
                </th>
                {applicants.map((app) => (
                  <th key={app.id} className="py-4 px-6 text-center min-w-[250px]">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2">
                        {app.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="font-semibold text-gray-900">{app.applicant_name}</div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Match Score */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                    Match Score
                  </div>
                </td>
                {applicants.map((app) => {
                  const isBest = app.ai_score === getBestScore();
                  return (
                    <td key={app.id} className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold border-2 ${getScoreColor(app.ai_score || 0)} ${isBest ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                        {app.ai_score || 0}%
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Rating */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 mr-2 text-yellow-600" />
                    Your Rating
                  </div>
                </td>
                {applicants.map((app) => {
                  const isBest = app.rating === getBestRating();
                  return (
                    <td key={app.id} className="py-4 px-6 text-center">
                      <div className={`flex justify-center ${isBest ? 'scale-110' : ''}`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-6 w-6 ${star <= (app.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Headline */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  Headline
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6 text-center">
                    <p className="text-gray-700">{app.headline || 'N/A'}</p>
                  </td>
                ))}
              </tr>

              {/* Contact */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  Contact
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {app.applicant_email}
                      </div>
                      {app.phone && (
                        <div className="flex items-center justify-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          {app.phone}
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-red-600" />
                    Location
                  </div>
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6 text-center text-gray-700">
                    {app.applicant_location || 'Not specified'}
                  </td>
                ))}
              </tr>

              {/* Skills */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  Skills
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(app.skills || []).slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {typeof skill === 'string' ? skill : skill.name || skill.skill}
                        </span>
                      ))}
                      {(app.skills || []).length > 5 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{(app.skills || []).length - 5} more
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Experience */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-purple-600" />
                    Experience
                  </div>
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6">
                    <div className="space-y-2 text-sm">
                      {(app.work_history || []).slice(0, 2).map((exp, idx) => (
                        <div key={idx} className="text-left">
                          <div className="font-medium text-gray-900">{exp.title}</div>
                          <div className="text-gray-600">{exp.company}</div>
                          <div className="text-gray-500 text-xs">
                            {exp.start_date ? new Date(exp.start_date).getFullYear() : '?'} - {exp.end_date ? new Date(exp.end_date).getFullYear() : 'Present'}
                          </div>
                        </div>
                      ))}
                      {(app.work_history || []).length > 2 && (
                        <div className="text-center text-gray-500 text-xs">
                          +{(app.work_history || []).length - 2} more positions
                        </div>
                      )}
                      {(!app.work_history || app.work_history.length === 0) && (
                        <div className="text-center text-gray-500">No experience listed</div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Education */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  <div className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
                    Education
                  </div>
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6">
                    <div className="space-y-2 text-sm">
                      {(app.education || []).slice(0, 2).map((edu, idx) => (
                        <div key={idx} className="text-left">
                          <div className="font-medium text-gray-900">{edu.degree}</div>
                          <div className="text-gray-600">{edu.institution}</div>
                          <div className="text-gray-500 text-xs">{edu.year}</div>
                        </div>
                      ))}
                      {(!app.education || app.education.length === 0) && (
                        <div className="text-center text-gray-500">No education listed</div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Cover Letter Preview */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                  Cover Letter
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-4 px-6">
                    <p className="text-sm text-gray-700 text-left line-clamp-3">
                      {app.cover_letter || 'No cover letter provided'}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Tags */}
              {applicants.some(a => a.tags && a.tags.length > 0) && (
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6 font-semibold text-gray-700 sticky left-0 bg-white">
                    Tags
                  </td>
                  {applicants.map((app) => (
                    <td key={app.id} className="py-4 px-6">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {(app.tags || []).map((tag, idx) => (
                          <span key={idx} className={`px-3 py-1 bg-${tag.color || 'gray'}-100 text-${tag.color || 'gray'}-800 rounded-full text-xs font-medium`}>
                            {tag.tag || tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              )}

              {/* Actions */}
              <tr>
                <td className="py-6 px-6 font-semibold text-gray-700 sticky left-0 bg-gray-50">
                  Actions
                </td>
                {applicants.map((app) => (
                  <td key={app.id} className="py-6 px-6 bg-gray-50">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleSelectWinner(app.id)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                      >
                        Select Winner <ChevronRight className="h-4 w-4 ml-2" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/employer/applicants/${app.id}`)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        View Full Profile
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
