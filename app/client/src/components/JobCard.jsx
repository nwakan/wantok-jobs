import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, GitCompareArrows } from 'lucide-react';
import { timeAgo, stripHTML, truncate, isNewJob, isHotJob } from '../utils/helpers';
import { getDisplayCompanyName, formatJobSource } from '../utils/pngHelpers';
import OptimizedImage from './OptimizedImage';

function getCompareIds() {
  return JSON.parse(sessionStorage.getItem('compareJobs') || '[]');
}
function setCompareIds(ids) {
  sessionStorage.setItem('compareJobs', JSON.stringify(ids));
  window.dispatchEvent(new Event('compareUpdate'));
}

export function CompareFloatingBar() {
  const [ids, setIds] = useState(getCompareIds());
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => setIds(getCompareIds());
    window.addEventListener('compareUpdate', handler);
    window.addEventListener('storage', handler);
    return () => { window.removeEventListener('compareUpdate', handler); window.removeEventListener('storage', handler); };
  }, []);
  if (ids.length < 2) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-bounce-once">
      <GitCompareArrows className="w-5 h-5" />
      <span className="font-medium">Compare {ids.length} jobs</span>
      <button onClick={() => navigate(`/compare?jobs=${ids.join(',')}`)} className="bg-white text-primary-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-primary-50">
        Compare
      </button>
      <button onClick={() => { setCompareIds([]); }} className="text-primary-200 hover:text-white text-sm ml-1">Clear</button>
    </div>
  );
}

function CompareCheckbox({ jobId }) {
  const [checked, setChecked] = useState(() => getCompareIds().includes(jobId));
  useEffect(() => {
    const handler = () => setChecked(getCompareIds().includes(jobId));
    window.addEventListener('compareUpdate', handler);
    return () => window.removeEventListener('compareUpdate', handler);
  }, [jobId]);
  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = getCompareIds();
    if (ids.includes(jobId)) {
      setCompareIds(ids.filter(id => id !== jobId));
    } else if (ids.length < 3) {
      setCompareIds([...ids, jobId]);
    }
  };
  return (
    <button onClick={toggle} className={`absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${checked ? 'bg-primary-100 text-primary-700 border border-primary-300' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`} title={checked ? 'Remove from compare' : 'Add to compare (max 3)'}>
      <GitCompareArrows className="w-3 h-3" />
      {checked ? 'Comparing' : 'Compare'}
    </button>
  );
}

export default function JobCard({ job, compact = false }) {
  const excerpt = job.excerpt || truncate(stripHTML(job.description), compact ? 80 : 150);
  const isNew = isNewJob(job.created_at);
  const isHot = isHotJob(job.created_at);
  
  // Task 3: Check if job is featured
  const isFeatured = !!job.is_featured && (!job.featured_until || new Date(job.featured_until) > new Date());
  
  return (
    <article className="relative" aria-label={`${job.title} at ${getDisplayCompanyName(job)}`}>
    <Link
      to={`/jobs/${job.id}`}
      className={`block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border hover:border-primary-200 dark:hover:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 relative ${
        isFeatured ? 'border-yellow-300 dark:border-yellow-600 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800' : 'border-gray-100 dark:border-gray-700'
      }`}
      aria-label={`View job: ${job.title}`}
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
            <OptimizedImage 
              src={job.logo_url} 
              alt={`${job.company_name || job.employer_name} logo`} 
              width={56} height={56}
              className="w-14 h-14 rounded-lg object-cover border border-gray-200" 
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Company */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-1 line-clamp-1">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
              {getDisplayCompanyName(job)}
              {!!job.employer_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" aria-label="Verified employer" role="img" />
              )}
              {(() => {
                const src = formatJobSource(job.source);
                return src && (job.company_name === 'Various Employers' || job.company_name === 'WantokJobs Imports' || !job.company_name) ? null : src ? (
                  <span className="text-xs text-gray-400 ml-1">{src.short}</span>
                ) : null;
              })()}
            </p>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {job.location && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                📍 {job.location}
              </span>
            )}
            {job.job_type && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {job.job_type}
              </span>
            )}
            {job.salary_min && job.salary_max && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                💰 {job.salary_currency || 'PGK'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
              </span>
            )}
            {job.company_size && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                🏢 {job.company_size}
              </span>
            )}
            {formatJobSource(job.source) ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                🤖 {formatJobSource(job.source).short}
              </span>
            ) : null}
          </div>

          {/* Excerpt */}
          {!compact && excerpt && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {excerpt}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
    <CompareCheckbox jobId={job.id} />
    </article>
  );
}
