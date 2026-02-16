import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { applications, jobs } from '../../../api';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import { useToast } from '../../../components/Toast';

export default function Applicants() {
  const { jobId } = useParams();
  const { showToast } = useToast();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'pipeline'
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      const [jobData, appsData] = await Promise.all([
        jobs.getById(jobId),
        applications.getForJob(jobId),
      ]);
      setJob(jobData);
      setApplicants(appsData.map(app => ({
        ...app,
        skills: app.skills ? JSON.parse(app.skills) : [],
        match_score: Math.floor(Math.random() * 30) + 70, // Mock match score
      })));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applications.updateStatus(applicationId, newStatus);
      const appsData = await applications.getForJob(jobId);
      setApplicants(appsData.map(app => ({
        ...app,
        skills: app.skills ? JSON.parse(app.skills) : [],
        match_score: Math.floor(Math.random() * 30) + 70,
      })));
      showToast('Status updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    }
  };

  const filteredApplicants = applicants.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = !searchTerm || 
      app.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pipelineStages = [
    { key: 'applied', label: 'Applied', color: 'bg-blue-100' },
    { key: 'screening', label: 'Screening', color: 'bg-yellow-100' },
    { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100' },
    { key: 'interview', label: 'Interview', color: 'bg-indigo-100' },
    { key: 'offered', label: 'Offered', color: 'bg-green-100' },
    { key: 'hired', label: 'Hired', color: 'bg-emerald-100' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) {
    return <div>Job not found</div>;
  }

  return (
    <div>
      <Link to="/dashboard/employer/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to jobs
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <p className="text-gray-600">{applicants.length} applications received</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'cards' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            📋 Cards
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'pipeline' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            📊 Pipeline
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All ({applicants.length})
          </button>
          {pipelineStages.map(stage => (
            <button
              key={stage.key}
              onClick={() => setFilter(stage.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                filter === stage.key ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {stage.label} ({applicants.filter(a => a.status === stage.key).length})
            </button>
          ))}
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'rejected' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Rejected ({applicants.filter(a => a.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        /* Card View */
        <div>
          {filteredApplicants.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600">No applicants found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApplicants.map(app => (
                <div key={app.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedApplicant(app)}>
                  {/* Photo Placeholder */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
                        {app.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{app.applicant_name}</h3>
                        <p className="text-xs text-gray-500">{app.applicant_location || 'Location not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Match Score</span>
                      <span className="text-sm font-bold text-primary-600">{app.match_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${app.match_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Skills Preview */}
                  {app.skills && app.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {app.skills.slice(0, 3).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                        {app.skills.length > 3 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">+{app.skills.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="mb-4">
                    <ApplicationStatusBadge status={app.status} />
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 text-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedApplicant(app); }}
                      className="flex-1 px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      View
                    </button>
                    {app.status !== 'shortlisted' && app.status !== 'rejected' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChange(app.id, 'shortlisted'); }}
                        className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Shortlist
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Pipeline View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {pipelineStages.map(stage => {
              const stageApplicants = applicants.filter(app => app.status === stage.key);
              return (
                <div key={stage.key} className="flex-shrink-0 w-80">
                  <div className={`${stage.color} rounded-t-lg px-4 py-3`}>
                    <h3 className="font-bold text-gray-900">{stage.label}</h3>
                    <p className="text-sm text-gray-600">{stageApplicants.length} applicants</p>
                  </div>
                  <div className="bg-gray-50 rounded-b-lg p-4 space-y-3 min-h-[500px] max-h-[600px] overflow-y-auto">
                    {stageApplicants.map(app => (
                      <div
                        key={app.id}
                        className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedApplicant(app)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                            {app.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">{app.applicant_name}</h4>
                            <p className="text-xs text-gray-500 truncate">{app.applicant_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span>Match: {app.match_score}%</span>
                          <span>{new Date(app.applied_at).toLocaleDateString()}</span>
                        </div>
                        {app.skills && app.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {app.skills.slice(0, 2).map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applicant Detail Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedApplicant(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Applicant Details</h2>
              <button onClick={() => setSelectedApplicant(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-3xl">
                  {selectedApplicant.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedApplicant.applicant_name}</h3>
                  <p className="text-gray-600">{selectedApplicant.applicant_email}</p>
                  {selectedApplicant.phone && <p className="text-gray-600">{selectedApplicant.phone}</p>}
                  {selectedApplicant.applicant_location && (
                    <p className="text-sm text-gray-500 mt-1">📍 {selectedApplicant.applicant_location}</p>
                  )}
                  <div className="mt-3">
                    <ApplicationStatusBadge status={selectedApplicant.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">{selectedApplicant.match_score}%</div>
                  <div className="text-sm text-gray-600">Match Score</div>
                </div>
              </div>

              {/* Skills */}
              {selectedApplicant.skills && selectedApplicant.skills.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplicant.cover_letter && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Cover Letter</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedApplicant.cover_letter}</p>
                  </div>
                </div>
              )}

              {/* CV/Resume */}
              {selectedApplicant.cv_url && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">CV / Resume</h4>
                  <a
                    href={selectedApplicant.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    📄 Download CV
                  </a>
                </div>
              )}

              {/* Screening Answers (Placeholder) */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Screening Questions</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 italic">No screening questions for this job</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Notes</h4>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder="Add notes about this candidate..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <select
                  value={selectedApplicant.status}
                  onChange={(e) => {
                    handleStatusChange(selectedApplicant.id, e.target.value);
                    setSelectedApplicant({ ...selectedApplicant, status: e.target.value });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium"
                >
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="offered">Offered</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>

                <a
                  href={`mailto:${selectedApplicant.applicant_email}`}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  📧 Contact
                </a>

                <button className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">
                  📅 Schedule Interview
                </button>

                {selectedApplicant.status !== 'rejected' && (
                  <button
                    onClick={() => handleStatusChange(selectedApplicant.id, 'rejected')}
                    className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                  >
                    Reject
                  </button>
                )}
              </div>

              <div className="pt-4 border-t text-sm text-gray-500">
                Applied on {new Date(selectedApplicant.applied_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
