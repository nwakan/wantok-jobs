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
      setApplicants(appsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applications.updateStatus(applicationId, newStatus);
      // Reload applicants
      const appsData = await applications.getForJob(jobId);
      setApplicants(appsData);
    } catch (error) {
      showToast('Failed to update status: ' + error.message, 'error');
    }
  };

  const filteredApplicants = filter === 'all'
    ? applicants
    : applicants.filter(app => app.status === filter);

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

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
      <p className="text-gray-600 mb-6">{applicants.length} applications received</p>

      {/* Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({applicants.length})
        </button>
        {['applied', 'screening', 'shortlisted', 'interview', 'offered', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg capitalize ${filter === status ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {status} ({applicants.filter(a => a.status === status).length})
          </button>
        ))}
      </div>

      {/* Applicants List */}
      {filteredApplicants.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-600">No applicants in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplicants.map(app => {
            const skills = app.skills ? JSON.parse(app.skills) : [];
            
            return (
              <div key={app.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{app.applicant_name}</h3>
                    <p className="text-gray-600">{app.applicant_email}</p>
                    {app.phone && <p className="text-gray-600">{app.phone}</p>}
                    {app.applicant_location && <p className="text-sm text-gray-500">{app.applicant_location}</p>}
                  </div>
                  <ApplicationStatusBadge status={app.status} />
                </div>

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {app.cover_letter && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Cover Letter:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{app.cover_letter}</p>
                  </div>
                )}

                {/* CV Link */}
                {app.cv_url && (
                  <div className="mb-4">
                    <a
                      href={app.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View CV/Resume →
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app.id, e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="offered">Offered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  <a
                    href={`mailto:${app.applicant_email}`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                  >
                    Contact
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  Applied: {new Date(app.applied_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
