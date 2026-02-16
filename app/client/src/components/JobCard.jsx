import { Link } from 'react-router-dom';
import { timeAgo, stripHTML, truncate } from '../utils/helpers';

export default function JobCard({ job, compact = false }) {
  const excerpt = job.excerpt || truncate(stripHTML(job.description), compact ? 80 : 150);
  
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100 hover:border-primary-200"
    >
      <div className="flex gap-4">
        {/* Company Logo */}
        {job.logo_url && (
          <div className="flex-shrink-0">
            <img 
              src={job.logo_url} 
              alt={job.company_name || job.employer_name} 
              className="w-14 h-14 rounded-lg object-cover border border-gray-200" 
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Company */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors mb-1 line-clamp-1">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 font-medium">
              {job.company_name || job.employer_name}
            </p>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {job.location && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                📍 {job.location}
              </span>
            )}
            {job.job_type && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {job.job_type}
              </span>
            )}
            {job.salary_min && job.salary_max && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                💰 {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
              </span>
            )}
            {job.source === 'headhunter' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                🤖 Imported
              </span>
            )}
          </div>

          {/* Excerpt */}
          {!compact && excerpt && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {excerpt}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">
              {job.created_at && timeAgo(job.created_at)}
            </span>
            <div className="flex items-center gap-3">
              {job.views_count > 0 && (
                <span>👁️ {job.views_count}</span>
              )}
              {job.applications_count > 0 && (
                <span>📝 {job.applications_count} applicants</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
