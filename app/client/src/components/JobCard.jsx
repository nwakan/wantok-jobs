import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { timeAgo, stripHTML, truncate, isNewJob, isHotJob } from '../utils/helpers';
import { getDisplayCompanyName, formatJobSource } from '../utils/pngHelpers';

export default function JobCard({ job, compact = false }) {
  const excerpt = job.excerpt || truncate(stripHTML(job.description), compact ? 80 : 150);
  const isNew = isNewJob(job.created_at);
  const isHot = isHotJob(job.created_at);
  
  // Task 3: Check if job is featured
  const isFeatured = !!job.is_featured && (!job.featured_until || new Date(job.featured_until) > new Date());
  
  return (
    <Link
      to={`/jobs/${job.id}`}
      className={`block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border hover:border-primary-200 relative ${
        isFeatured ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white' : 'border-gray-100'
      }`}
    >
      {/* Featured Badge - Task 3 */}
      {isFeatured && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
          ⭐ Featured
        </div>
      )}
      
      {/* New/Hot Badge (only if not featured) */}
      {!isFeatured && isHot && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
          🔥 HOT
        </div>
      )}
      {!isFeatured && !isHot && isNew && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
          ✨ NEW
        </div>
      )}
      
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
            <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
              {job.company_name || job.employer_name}
              {/* Task 5: Verification badge */}
              {!!job.employer_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" title="Verified employer" />
              )}
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
              {job.views_count > 0 ? (
                <span>👁️ {job.views_count}</span>
              ) : null}
              {job.applications_count > 0 ? (
                <span>📝 {job.applications_count} applicants</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
