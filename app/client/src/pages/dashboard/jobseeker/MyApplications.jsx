import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applications } from '../../../api';

export default function MyApplications() {
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'status'

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await applications.getMy();
      // API returns { data: [...], pagination: {...} }
      const list = response?.data || (Array.isArray(response) ? response : []);
      setMyApplications(list);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setMyApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (appId) => {
    if (!confirm('Are you sure you want to withdraw this application? This cannot be undone.')) return;
    try {
      await fetch(`/api/applications/${appId}/withdraw`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      loadApplications();
    } catch (error) {
      console.error('Failed to withdraw application:', error);
    }
  };

  // Filter applications
  const filteredApplications = filter === 'all' 
    ? myApplications 
    : myApplications.filter(app => app.status === filter);

  // Sort applications
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.applied_at) - new Date(a.applied_at);
    } else {
      const statusOrder = { hired: 0, offered: 1, interviewed: 2, shortlisted: 3, reviewed: 4, pending: 5, rejected: 6, withdrawn: 7 };
      return (statusOrder[a.status] || 10) - (statusOrder[b.status] || 10);
    }
  });

  // Status configuration
  const statusConfig = {
    pending: { 
      label: 'Pending', 
      color: 'bg-gray-100 text-gray-800 border-gray-300', 
      icon: '⏳',
      step: 1,
    },
    reviewed: { 
      label: 'Reviewed', 
      color: 'bg-blue-100 text-blue-800 border-blue-300', 
      icon: '👁️',
      step: 2,
    },
    shortlisted: { 
      label: 'Shortlisted', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
      icon: '⭐',
      step: 3,
    },
    interviewed: { 
      label: 'Interviewed', 
      color: 'bg-purple-100 text-purple-800 border-purple-300', 
      icon: '🎯',
      step: 4,
    },
    offered: { 
      label: 'Offered', 
      color: 'bg-green-100 text-green-800 border-green-300', 
      icon: '🎉',
      step: 5,
    },
    hired: { 
      label: 'Hired', 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300', 
      icon: '✅',
      step: 6,
    },
    rejected: { 
      label: 'Rejected', 
      color: 'bg-red-100 text-red-800 border-red-300', 
      icon: '❌',
      step: 0,
    },
    withdrawn: { 
      label: 'Withdrawn', 
      color: 'bg-gray-100 text-gray-500 border-gray-300', 
      icon: '↩️',
      step: 0,
    },
  };

  // Status counts for filters
  const statusCounts = {
    all: myApplications.length,
    pending: myApplications.filter(a => a.status === 'pending').length,
    reviewed: myApplications.filter(a => a.status === 'reviewed').length,
    shortlisted: myApplications.filter(a => a.status === 'shortlisted').length,
    interviewed: myApplications.filter(a => a.status === 'interviewed').length,
    offered: myApplications.filter(a => a.status === 'offered').length,
    hired: myApplications.filter(a => a.status === 'hired').length,
    rejected: myApplications.filter(a => a.status === 'rejected').length,
  };

  // Status Timeline Component
  const StatusTimeline = ({ status }) => {
    const currentStep = statusConfig[status]?.step || 0;
    const steps = ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Offered', 'Hired'];
    
    if (status === 'rejected' || status === 'withdrawn') {
      return (
        <div className="flex items-center justify-center py-2">
          <span className={`px-4 py-2 rounded-full font-semibold text-sm ${statusConfig[status].color}`}>
            {statusConfig[status].icon} {statusConfig[status].label}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 py-3">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  isCompleted 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? '✓' : stepNum}
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {step}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 -mt-6 ${
                  stepNum < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-gray-600">Track all your job applications in one place</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All ({statusCounts.all})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'pending' 
              ? 'bg-gray-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          ⏳ Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setFilter('reviewed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'reviewed' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          👁️ Reviewed ({statusCounts.reviewed})
        </button>
        <button
          onClick={() => setFilter('shortlisted')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'shortlisted' 
              ? 'bg-yellow-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          ⭐ Shortlisted ({statusCounts.shortlisted})
        </button>
        <button
          onClick={() => setFilter('interviewed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'interviewed' 
              ? 'bg-purple-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🎯 Interviewed ({statusCounts.interviewed})
        </button>
        <button
          onClick={() => setFilter('offered')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'offered' 
              ? 'bg-green-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          🎉 Offered ({statusCounts.offered})
        </button>
        <button
          onClick={() => setFilter('hired')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'hired' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          ✅ Hired ({statusCounts.hired})
        </button>
      </div>

      {/* Sort Options */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{sortedApplications.length}</span> application{sortedApplications.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('date')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === 'date'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Sort by Date
          </button>
          <button
            onClick={() => setSortBy('status')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === 'status'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Sort by Status
          </button>
        </div>
      </div>

      {/* Applications Cards */}
      {sortedApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Start applying to jobs that match your skills and experience'
              : `You don't have any applications with status: ${filter}`
            }
          </p>
          {filter === 'all' ? (
            <Link 
              to="/jobs" 
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Browse Jobs
            </Link>
          ) : (
            <button
              onClick={() => setFilter('all')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              View All Applications
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sortedApplications.map(app => {
            const config = statusConfig[app.status] || statusConfig.applied;
            
            return (
              <div key={app.id} className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-primary-500 transition overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <Link 
                        to={`/jobs/${app.job_id}`} 
                        className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition"
                      >
                        {app.job_title}
                      </Link>
                      <p className="text-lg text-gray-700 font-medium mt-1">{app.company_name}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${config.color}`}>
                      {config.icon} {config.label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>📍 {app.location}</span>
                    <span>💼 {app.job_type}</span>
                    {app.salary_min && app.salary_max && (
                      <span>💰 {app.salary_currency || 'K'}{app.salary_min.toLocaleString()} - {app.salary_currency || 'K'}{app.salary_max.toLocaleString()}</span>
                    )}
                    <span className="text-gray-500">
                      • Applied {new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="px-6 py-4 bg-gray-50">
                  <StatusTimeline status={app.status} />
                </div>

                {/* Cover Letter */}
                {app.cover_letter && (
                  <div className="px-6 py-4 border-t bg-white">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 list-none flex items-center justify-between">
                        <span>📄 Your Cover Letter</span>
                        <svg className="w-5 h-5 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg mt-3 whitespace-pre-wrap border border-gray-200">
                        {app.cover_letter}
                      </p>
                    </details>
                  </div>
                )}

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t flex gap-2">
                  <Link
                    to={`/jobs/${app.job_id}`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm transition"
                  >
                    View Job Details
                  </Link>
                  {(app.status === 'offered' || app.status === 'interviewed' || app.status === 'hired') && (
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition"
                    >
                      📧 Contact Employer
                    </button>
                  )}
                  {!['withdrawn', 'rejected', 'hired'].includes(app.status) && (
                    <button
                      onClick={() => handleWithdraw(app.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-red-100 hover:text-red-700 font-medium text-sm transition"
                    >
                      ↩️ Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
