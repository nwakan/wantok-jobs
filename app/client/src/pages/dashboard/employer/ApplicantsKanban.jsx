import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { applications, jobs } from '../../../api';
import { useToast } from '../../../components/Toast';
import OnboardingChecklist from '../../../components/OnboardingChecklist';
import ReferenceChecks from '../../../components/ReferenceChecks';
import {
  Star, Search, ChevronDown, ChevronUp, X, Mail, Calendar, CheckCircle,
  XCircle, Clock, Award, TrendingUp, Phone, MapPin, Briefcase, GraduationCap
} from 'lucide-react';

export default function ApplicantsKanban({ applicants, job, onStatusChange, onRating, searchTerm, setSearchTerm }) {
  const { showToast } = useToast();
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const pipelineStages = [
    { key: 'applied', label: 'Applied', color: 'bg-gray-100', textColor: 'text-gray-700', icon: Mail },
    { key: 'screening', label: 'Screening', color: 'bg-blue-100', textColor: 'text-blue-700', icon: Search },
    { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100', textColor: 'text-purple-700', icon: Star },
    { key: 'interview', label: 'Interview', color: 'bg-indigo-100', textColor: 'text-indigo-700', icon: Calendar },
    { key: 'offered', label: 'Offered', color: 'bg-amber-100', textColor: 'text-amber-700', icon: Award },
    { key: 'hired', label: 'Hired', color: 'bg-green-100', textColor: 'text-green-700', icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', color: 'bg-red-100', textColor: 'text-red-700', icon: XCircle },
  ];

  // Filter applicants by search term
  const filteredBySearch = (stageApplicants) => {
    if (!searchTerm) return stageApplicants;
    const term = searchTerm.toLowerCase();
    return stageApplicants.filter(app =>
      app.applicant_name?.toLowerCase().includes(term) ||
      app.applicant_email?.toLowerCase().includes(term) ||
      app.headline?.toLowerCase().includes(term)
    );
  };

  // Drag handlers
  const handleDragStart = (e, applicant) => {
    setDraggedItem(applicant);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnKey);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedItem || draggedItem.status === newStatus) {
      setDraggedItem(null);
      return;
    }

    try {
      await onStatusChange(draggedItem.id, newStatus);
      showToast(`Moved ${draggedItem.applicant_name} to ${newStatus}`, 'success');
    } catch (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    }

    setDraggedItem(null);
  };

  const toggleColumn = (key) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search applicants across all columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-max">
          {pipelineStages.map(stage => {
            const stageApplicants = applicants.filter(app => app.status === stage.key);
            const filtered = filteredBySearch(stageApplicants);
            const StageIcon = stage.icon;
            const isCollapsed = collapsedColumns[stage.key];
            const isDragOver = dragOverColumn === stage.key;

            return (
              <div
                key={stage.key}
                className={`flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-80'} transition-all duration-200`}
              >
                {/* Column Header */}
                <div
                  className={`${stage.color} rounded-t-lg px-4 py-3 flex items-center justify-between cursor-pointer border-2 ${isDragOver ? 'border-primary-500 border-dashed' : 'border-transparent'}`}
                  onClick={() => toggleColumn(stage.key)}
                >
                  {isCollapsed ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <StageIcon className={`w-5 h-5 ${stage.textColor}`} />
                      <span className={`text-xs font-bold ${stage.textColor} transform -rotate-90 whitespace-nowrap origin-center`}>
                        {filtered.length}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <StageIcon className={`w-5 h-5 ${stage.textColor}`} />
                        <div>
                          <h3 className={`font-bold ${stage.textColor}`}>{stage.label}</h3>
                          <p className="text-sm text-gray-600">{filtered.length} applicant{filtered.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button className="text-gray-600 hover:text-gray-800">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>

                {/* Column Content */}
                {!isCollapsed && (
                  <div
                    className={`bg-gray-50 rounded-b-lg p-3 space-y-3 min-h-[600px] max-h-[70vh] overflow-y-auto border-2 ${isDragOver ? 'border-primary-500 border-dashed bg-primary-50' : 'border-transparent'}`}
                    onDragOver={(e) => handleDragOver(e, stage.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.key)}
                  >
                    {filtered.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {searchTerm ? 'No matches' : 'No applicants'}
                      </div>
                    ) : (
                      filtered.map(app => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedApplicant(app)}
                          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move border border-gray-200 hover:border-primary-400"
                        >
                          {/* Applicant Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold flex-shrink-0">
                              {app.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 truncate">{app.applicant_name}</h4>
                              <p className="text-xs text-gray-500 truncate">{app.headline || app.applicant_email}</p>
                            </div>
                          </div>

                          {/* Rating Stars */}
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={(e) => { e.stopPropagation(); onRating(app.id, star); }}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`w-3 h-3 ${star <= (app.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              </button>
                            ))}
                          </div>

                          {/* Match Score Badge */}
                          <div className="mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getMatchScoreColor(app.match_score || 70)}`}>
                              {app.match_score || 70}% Match
                            </span>
                          </div>

                          {/* Tags */}
                          {app.tags && app.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {app.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {typeof tag === 'string' ? tag : tag.tag}
                                </span>
                              ))}
                              {app.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{app.tags.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* Skills Preview */}
                          {app.skills && app.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {app.skills.slice(0, 2).map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                  {skill}
                                </span>
                              ))}
                              {app.skills.length > 2 && (
                                <span className="text-xs text-gray-500">+{app.skills.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* Applied Date */}
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(app.applied_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Applicant Quick View Modal */}
      {selectedApplicant && (
        <ApplicantQuickView
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onStatusChange={onStatusChange}
          onRating={onRating}
        />
      )}
    </div>
  );
}

// Applicant Quick View Component
function ApplicantQuickView({ applicant, onClose, onStatusChange, onRating }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [notes, setNotes] = useState(applicant.employer_notes || '');
  const [onboardingData, setOnboardingData] = useState(null);
  const [references, setReferences] = useState([]);

  useEffect(() => {
    // Load onboarding checklist if hired
    if (applicant.status === 'hired') {
      fetchOnboarding();
    }
    // Load references
    fetchReferences();
  }, [applicant.id]);

  const fetchOnboarding = async () => {
    try {
      const response = await fetch(`/api/onboarding/${applicant.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOnboardingData(data);
      }
    } catch (error) {
      console.error('Failed to load onboarding:', error);
    }
  };

  const fetchReferences = async () => {
    try {
      const response = await fetch(`/api/references/application/${applicant.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReferences(data);
      }
    } catch (error) {
      console.error('Failed to load references:', error);
    }
  };

  const saveNotes = async () => {
    try {
      await fetch('/api/applications/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ applicationId: applicant.id, notes })
      });
      showToast('Notes saved', 'success');
    } catch (error) {
      showToast('Failed to save notes', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gray-50 border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-2xl">
              {applicant.applicant_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{applicant.applicant_name}</h2>
              <p className="text-gray-600">{applicant.headline || applicant.applicant_email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('cover')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'cover' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              Cover Letter
            </button>
            <button
              onClick={() => setActiveTab('screening')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'screening' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              Screening
            </button>
            <button
              onClick={() => setActiveTab('references')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'references' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              References {references.length > 0 && `(${references.length})`}
            </button>
            {applicant.status === 'hired' && (
              <button
                onClick={() => setActiveTab('onboarding')}
                className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'onboarding' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
              >
                Onboarding
              </button>
            )}
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              Notes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && <ProfileTab applicant={applicant} />}
          {activeTab === 'cover' && <CoverLetterTab applicant={applicant} />}
          {activeTab === 'screening' && <ScreeningTab applicant={applicant} />}
          {activeTab === 'references' && <ReferencesTab applicant={applicant} references={references} onRefresh={fetchReferences} />}
          {activeTab === 'onboarding' && <OnboardingTab applicant={applicant} onboardingData={onboardingData} onRefresh={fetchOnboarding} />}
          {activeTab === 'notes' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Employer Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[200px]"
                placeholder="Add your notes about this candidate..."
              />
              <button
                onClick={saveNotes}
                className="mt-3 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                Save Notes
              </button>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <select
              value={applicant.status}
              onChange={(e) => onStatusChange(applicant.id, e.target.value)}
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
              href={`mailto:${applicant.applicant_email}`}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Email
            </a>

            <button className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Interview
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Rating:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => onRating(applicant.id, star)}>
                  <Star
                    className={`w-5 h-5 ${star <= (applicant.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab
function ProfileTab({ applicant }) {
  const skills = applicant.skills && Array.isArray(applicant.skills) ? applicant.skills : [];
  const workHistory = applicant.work_history ? JSON.parse(applicant.work_history) : [];
  const education = applicant.education ? JSON.parse(applicant.education) : [];

  return (
    <div className="space-y-6">
      {/* Contact Info */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">{applicant.applicant_email}</span>
          </div>
          {applicant.applicant_phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{applicant.applicant_phone}</span>
            </div>
          )}
          {applicant.applicant_location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{applicant.applicant_location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {applicant.bio && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">About</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{applicant.bio}</p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work History */}
      {workHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Work Experience</h3>
          <div className="space-y-4">
            {workHistory.map((work, idx) => (
              <div key={idx} className="border-l-4 border-primary-500 pl-4">
                <div className="flex items-start gap-2">
                  <Briefcase className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{work.title}</h4>
                    <p className="text-gray-600">{work.company}</p>
                    <p className="text-sm text-gray-500">{work.startDate} - {work.endDate || 'Present'}</p>
                    {work.description && <p className="text-gray-700 mt-2">{work.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Education</h3>
          <div className="space-y-4">
            {education.map((edu, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-4">
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                    <p className="text-gray-600">{edu.school}</p>
                    <p className="text-sm text-gray-500">{edu.year}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CV Download */}
      {applicant.cv_url && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Resume / CV</h3>
          <a
            href={applicant.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
          >
            📄 Download CV
          </a>
        </div>
      )}
    </div>
  );
}

// Cover Letter Tab
function CoverLetterTab({ applicant }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Cover Letter</h3>
      {applicant.cover_letter ? (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{applicant.cover_letter}</p>
        </div>
      ) : (
        <p className="text-gray-500 italic">No cover letter provided</p>
      )}
    </div>
  );
}

// Screening Tab
function ScreeningTab({ applicant }) {
  const answers = applicant.screening_answers || [];

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Screening Responses</h3>
      {answers.length > 0 ? (
        <div className="space-y-4">
          {answers.map((qa, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">{qa.question}</h4>
              <p className="text-gray-700">{qa.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No screening responses</p>
      )}
    </div>
  );
}

// References Tab
function ReferencesTab({ applicant, references, onRefresh }) {
  return (
    <ReferenceChecks
      applicationId={applicant.id}
      references={references}
      onRefresh={onRefresh}
    />
  );
}

// Onboarding Tab
function OnboardingTab({ applicant, onboardingData, onRefresh }) {
  return (
    <OnboardingChecklist applicationId={applicant.id} />
  );
}
