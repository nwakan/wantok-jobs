import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Heart, X } from 'lucide-react';
import { timeAgo, stripHTML, truncate, isNewJob, isHotJob } from '../utils/helpers';
import { formatPNGSalary, needsLogoPlaceholder, generateCompanyLogoPlaceholder } from '../utils/pngHelpers';
import { useSwipeActions } from '../hooks/useSwipeActions';
import { useLanguage } from '../context/LanguageContext';

export default function SwipeableJobCard({ 
  job, 
  compact = false, 
  onSave, 
  onDismiss,
  enableSwipe = true 
}) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  const handleSave = () => {
    if (onSave) {
      onSave(job);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(job);
    }
    setIsVisible(false);
  };

  const {
    bind,
    getSwipeStyle,
    getBackgroundStyle,
    getIconOpacity,
    swipeTriggered
  } = useSwipeActions({
    onSwipeLeft: handleDismiss,
    onSwipeRight: handleSave,
    enabled: enableSwipe && (onSave || onDismiss)
  });

  if (!isVisible) return null;

  const excerpt = job.excerpt || truncate(stripHTML(job.description), compact ? 80 : 150);
  const isNew = isNewJob(job.created_at);
  const isHot = isHotJob(job.created_at);
  const isFeatured = !!job.is_featured && (!job.featured_until || new Date(job.featured_until) > new Date());
  
  // Generate placeholder logo if needed
  const logoPlaceholder = needsLogoPlaceholder(job) 
    ? generateCompanyLogoPlaceholder(job.company_name) 
    : null;

  return (
    <div 
      {...bind}
      className="relative overflow-hidden"
      style={getBackgroundStyle()}
    >
      {/* Swipe Icons */}
      {enableSwipe && (
        <>
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-opacity"
            style={{ opacity: getIconOpacity('right') }}
          >
            <Heart className="w-8 h-8 text-green-600 fill-green-600" />
          </div>
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 transition-opacity"
            style={{ opacity: getIconOpacity('left') }}
          >
            <X className="w-8 h-8 text-red-600" />
          </div>
        </>
      )}

      <Link
        to={`/jobs/${job.id}`}
        className={`block bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border hover:border-primary-200 relative ${
          isFeatured ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white' : 'border-gray-100'
        }`}
        style={getSwipeStyle()}
      >
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
            ⭐ {t('jobs.featured')}
          </div>
        )}
        
        {/* New/Hot Badge */}
        {!isFeatured && isHot && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
            🔥 {t('jobs.hot')}
          </div>
        )}
        {!isFeatured && !isHot && isNew && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
            ✨ {t('jobs.new')}
          </div>
        )}
        
        <div className="flex gap-4">
          {/* Company Logo or Placeholder */}
          <div className="flex-shrink-0">
            {job.logo_url ? (
              <img 
                src={job.logo_url} 
                alt={job.company_name || job.employer_name} 
                className="w-14 h-14 rounded-lg object-cover border border-gray-200" 
                loading="lazy"
              />
            ) : logoPlaceholder ? (
              <div className={`w-14 h-14 rounded-lg ${logoPlaceholder.colorClass} flex items-center justify-center text-white font-bold text-lg border border-gray-200`}>
                {logoPlaceholder.initials}
              </div>
            ) : null}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title & Company */}
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors mb-1 line-clamp-1">
                {job.title}
              </h3>
              <p className="text-sm text-gray-600 font-medium flex items-center gap-1">
                {job.company_name || job.employer_name}
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
                  💰 {formatPNGSalary(job.salary_min)} - {formatPNGSalary(job.salary_max)}
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
                  <span>📝 {job.applications_count} {t('jobs.applicants')}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
