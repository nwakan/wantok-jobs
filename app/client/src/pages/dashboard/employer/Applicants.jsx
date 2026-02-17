import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { applications, jobs } from '../../../api';
import ApplicationStatusBadge from '../../../components/ApplicationStatusBadge';
import { useToast } from '../../../components/Toast';
import ApplicantsKanban from './ApplicantsKanban';
import OnboardingChecklist from '../../../components/OnboardingChecklist';
import ReferenceChecks from '../../../components/ReferenceChecks';
import { 
  Filter, Download, Mail, Tag, Star, MoreVertical, 
  CheckSquare, Square, ChevronDown, ChevronUp, Search,
  Eye, Calendar, Award, TrendingUp, Clock, Users
} from 'lucide-react';

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
  
  // Bulk actions
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [bulkActionMenu, setBulkActionMenu] = useState(false);
  
  // Email template modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Tag modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagColor, setTagColor] = useState('blue');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [sourceFilter, setSourceFilter] = useState(null);
  const [dateRangeFilter, setDateRangeFilter] = useState(null);

  useEffect(() => {
    loadData();
    loadEmailTemplates();
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
        tags: app.tags ? JSON.parse(app.tags) : [],
        match_score: app.match_score || Math.floor(Math.random() * 30) + 70,
        rating: app.rating || 0,
        source: app.source || 'direct',
      })));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load email templates:', error);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applications.updateStatus(applicationId, newStatus);
      await loadData();
      showToast('Status updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      await Promise.all(
        selectedApplicants.map(id => applications.updateStatus(id, newStatus))
      );
      await loadData();
      setSelectedApplicants([]);
      setBulkActionMenu(false);
      showToast(`${selectedApplicants.length} applicants updated to ${newStatus}`, 'success');
    } catch (error) {
      showToast('Failed to update applicants: ' + error.message, 'error');
    }
  };

  const handleBulkTag = async () => {
    if (!newTag.trim()) return;
    try {
      await Promise.all(
        selectedApplicants.map(id => 
          fetch('/api/applications/tag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ applicationId: id, tag: newTag.trim(), color: tagColor })
          })
        )
      );
      await loadData();
      setNewTag('');
      setShowTagModal(false);
      setSelectedApplicants([]);
      showToast(`Tag "${newTag}" added to ${selectedApplicants.length} applicants`, 'success');
    } catch (error) {
      showToast('Failed to add tags: ' + error.message, 'error');
    }
  };

  const handleRating = async (applicationId, rating) => {
    try {
      await fetch('/api/applications/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ applicationId, rating })
      });
      await loadData();
      showToast('Rating updated', 'success');
    } catch (error) {
      showToast('Failed to update rating', 'error');
    }
  };

  const exportApplicants = () => {
    const csv = [
      ['Name', 'Email', 'Status', 'Match Score', 'Rating', 'Source', 'Applied Date', 'Tags'].join(','),
      ...filteredApplicants.map(app => [
        app.applicant_name,
        app.applicant_email,
        app.status,
        app.match_score,
        app.rating,
        app.source,
        new Date(app.applied_at).toLocaleDateString(),
        app.tags.join('; ')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applicants-${job?.title || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Applicants exported successfully', 'success');
  };

  const toggleSelectAll = () => {
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([]);
    } else {
      setSelectedApplicants(filteredApplicants.map(app => app.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedApplicants(prev =>
      prev.includes(id) ? prev.filter(appId => appId !== id) : [...prev, id]
    );
  };

  const filteredApplicants = applicants.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = !searchTerm || 
      app.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicant_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = !ratingFilter || app.rating === ratingFilter;
    const matchesSource = !sourceFilter || app.source === sourceFilter;
    // Date range filter logic would go here
    return matchesFilter && matchesSearch && matchesRating && matchesSource;
  });

  const pipelineStages = [
    { key: 'applied', label: 'Applied', color: 'bg-blue-100', icon: Mail },
    { key: 'screening', label: 'Screening', color: 'bg-yellow-100', icon: Search },
    { key: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100', icon: Star },
    { key: 'interview', label: 'Interview', color: 'bg-indigo-100', icon: Calendar },
    { key: 'offered', label: 'Offered', color: 'bg-green-100', icon: Award },
    { key: 'hired', label: 'Hired', color: 'bg-emerald-100', icon: Users },
  ];

  // Analytics calculations
  const analytics = {
    totalApplicants: applicants.length,
    avgMatchScore: applicants.length > 0 ? Math.round(applicants.reduce((sum, a) => sum + a.match_score, 0) / applicants.length) : 0,
    avgRating: applicants.length > 0 ? (applicants.reduce((sum, a) => sum + a.rating, 0) / applicants.length).toFixed(1) : '0.0',
    conversionRate: applicants.length > 0 ? Math.round((applicants.filter(a => ['hired', 'offered'].includes(a.status)).length / applicants.length) * 100) : 0,
    avgTimeInPipeline: '5.2 days', // Mock - would calculate from application_events
    topSource: applicants.reduce((acc, a) => {
      acc[a.source] = (acc[a.source] || 0) + 1;
      return acc;
    }, {}),
  };

  const topSourceName = Object.keys(analytics.topSource).sort((a, b) => 
    analytics.topSource[b] - analytics.topSource[a]
  )[0] || 'direct';

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
      <Link to="/dashboard/employer/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-2">
        ← Back to jobs
      </Link>

      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <p className="text-gray-600">{applicants.length} applications received</p>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap">
          {/* Export Button */}
          <button
            onClick={exportApplicants}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
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
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{analytics.totalApplicants}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Match</span>
          </div>
          <div className="text-2xl font-bold text-primary-600">{analytics.avgMatchScore}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Rating</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{analytics.avgRating}/5</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Award className="w-4 h-4" />
            <span className="text-xs font-medium">Conversion</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{analytics.conversionRate}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Avg Time</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{analytics.avgTimeInPipeline}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Eye className="w-4 h-4" />
            <span className="text-xs font-medium">Top Source</span>
          </div>
          <div className="text-lg font-bold text-blue-600 capitalize">{topSourceName}</div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedApplicants.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-primary-600" />
            <span className="font-medium text-gray-900">{selectedApplicants.length} selected</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setBulkActionMenu(!bulkActionMenu)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                Change Status
                <ChevronDown className="w-4 h-4" />
              </button>
              {bulkActionMenu && (
                <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                  {pipelineStages.map(stage => (
                    <button
                      key={stage.key}
                      onClick={() => handleBulkStatusChange(stage.key)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {stage.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleBulkStatusChange('rejected')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 rounded-b-lg"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowTagModal(true)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Add Tag
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Email
            </button>
            <button
              onClick={() => setSelectedApplicants([])}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Advanced Filters
            {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleSelectAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            {selectedApplicants.length === filteredApplicants.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select All
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select
                value={ratingFilter || ''}
                onChange={e => setRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <select
                value={sourceFilter || ''}
                onChange={e => setSourceFilter(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Sources</option>
                <option value="direct">Direct</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter || ''}
                onChange={e => setDateRangeFilter(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        )}
        
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
                <div key={app.id} className={`bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer border ${selectedApplicants.includes(app.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-100'}`}>
                  {/* Selection Checkbox */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1" onClick={() => setSelectedApplicant(app)}>
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
                        {app.applicant_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{app.applicant_name}</h3>
                        <p className="text-xs text-gray-500 truncate">{app.applicant_location || 'Location not specified'}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(app.id); }}
                      className="flex-shrink-0"
                    >
                      {selectedApplicants.includes(app.id) ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="mb-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={(e) => { e.stopPropagation(); handleRating(app.id, star); }}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 ${star <= app.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Tags */}
                  {app.tags && app.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {app.tags.map((tag, idx) => (
                        <span key={idx} className={`px-2 py-1 bg-${tag.color || 'blue'}-100 text-${tag.color || 'blue'}-700 rounded text-xs font-medium`}>
                          {typeof tag === 'string' ? tag : tag.tag}
                        </span>
                      ))}
                    </div>
                  )}

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
        /* Kanban Pipeline View with Drag & Drop */
        <ApplicantsKanban
          applicants={filteredApplicants}
          job={job}
          onStatusChange={handleStatusChange}
          onRating={handleRating}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
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
                  <div className="mt-3 flex items-center gap-3">
                    <ApplicationStatusBadge status={selectedApplicant.status} />
                    <span className="text-sm text-gray-500">Source: {selectedApplicant.source}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600">{selectedApplicant.match_score}%</div>
                  <div className="text-sm text-gray-600 mb-2">Match Score</div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleRating(selectedApplicant.id, star)}
                      >
                        <Star
                          className={`w-5 h-5 ${star <= selectedApplicant.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedApplicant.tags && selectedApplicant.tags.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        {typeof tag === 'string' ? tag : tag.tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Notes */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Employer Notes</h4>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="4"
                  placeholder="Add notes about this candidate..."
                  defaultValue={selectedApplicant.employer_notes || ''}
                  onBlur={(e) => {
                    // Save notes to API
                    fetch('/api/applications/notes', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        applicationId: selectedApplicant.id,
                        notes: e.target.value
                      })
                    });
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t flex-wrap">
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
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact
                </a>

                <button className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule Interview
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

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowTagModal(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Tag to {selectedApplicants.length} Applicants</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag Name</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Top Candidate, Follow-up Required"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {['blue', 'green', 'yellow', 'red', 'purple', 'pink'].map(color => (
                    <button
                      key={color}
                      onClick={() => setTagColor(color)}
                      className={`w-10 h-10 rounded-full bg-${color}-500 ${tagColor === color ? 'ring-4 ring-offset-2 ring-' + color + '-300' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBulkTag}
                  className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Add Tag
                </button>
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Send Email to {selectedApplicants.length} Applicants</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                <select
                  onChange={e => {
                    const template = emailTemplates.find(t => t.id === parseInt(e.target.value));
                    setSelectedTemplate(template);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Choose a template...</option>
                  {emailTemplates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              {selectedTemplate && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      defaultValue={selectedTemplate.subject}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
                    <textarea
                      defaultValue={selectedTemplate.body_text}
                      rows="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    💡 Variables like {`{{applicant_name}}`} will be replaced automatically for each applicant
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                  onClick={() => {
                    showToast('Emails queued for sending', 'success');
                    setShowEmailModal(false);
                    setSelectedApplicants([]);
                  }}
                >
                  Send Emails
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
