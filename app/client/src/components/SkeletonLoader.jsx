/**
 * SkeletonLoader — animated placeholder for loading states.
 * 
 * Usage:
 *   <SkeletonLoader variant="title" />
 *   <JobCardSkeleton />
 *   <TableSkeleton rows={5} cols={4} />
 */
export default function SkeletonLoader({ className = '', variant = 'default' }) {
  const variants = {
    default: 'h-4 bg-gray-200 rounded animate-pulse',
    card: 'h-48 bg-gray-200 rounded-lg animate-pulse',
    circle: 'w-12 h-12 bg-gray-200 rounded-full animate-pulse',
    text: 'h-3 bg-gray-200 rounded animate-pulse',
    title: 'h-6 bg-gray-200 rounded animate-pulse w-3/4',
    button: 'h-10 w-32 bg-gray-200 rounded-lg animate-pulse',
    avatar: 'w-10 h-10 bg-gray-200 rounded-full animate-pulse',
    image: 'w-full h-40 bg-gray-200 rounded-lg animate-pulse',
  };

  return (
    <div
      className={`${variants[variant]} ${className}`}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    />
  );
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" aria-hidden="true">
      <div className="flex items-start gap-4">
        <SkeletonLoader variant="circle" />
        <div className="flex-1 space-y-3">
          <SkeletonLoader variant="title" />
          <SkeletonLoader className="w-1/2" />
          <SkeletonLoader className="w-2/3" />
          <div className="flex gap-2 pt-2">
            <SkeletonLoader className="w-20 h-6" />
            <SkeletonLoader className="w-24 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" aria-hidden="true">
      <div className="flex flex-col items-center text-center space-y-4">
        <SkeletonLoader variant="circle" className="w-20 h-20" />
        <SkeletonLoader variant="title" className="w-full" />
        <SkeletonLoader className="w-3/4" />
        <SkeletonLoader className="w-1/2" />
      </div>
    </div>
  );
}

/**
 * Table skeleton — for dashboard data tables.
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" aria-hidden="true">
      {/* Header row */}
      <div className="flex gap-4 p-4 bg-gray-50 border-b border-gray-200">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLoader key={i} className="flex-1 h-4" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 p-4 border-b border-gray-100 last:border-0">
          {Array.from({ length: cols }).map((_, col) => (
            <SkeletonLoader key={col} className={`flex-1 h-4 ${col === 0 ? 'w-1/3' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Profile skeleton — for profile/dashboard overview.
 */
export function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" aria-hidden="true">
      <div className="flex items-center gap-4 mb-6">
        <SkeletonLoader variant="circle" className="w-16 h-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="title" />
          <SkeletonLoader className="w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonLoader className="w-full" />
        <SkeletonLoader className="w-4/5" />
        <SkeletonLoader className="w-3/5" />
      </div>
    </div>
  );
}

/**
 * Stats card skeleton — for dashboard stat cards.
 */
export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" aria-hidden="true">
      <div className="flex items-center justify-between mb-2">
        <SkeletonLoader className="w-24 h-3" />
        <SkeletonLoader variant="avatar" className="w-8 h-8" />
      </div>
      <SkeletonLoader className="w-16 h-8 mt-2" />
      <SkeletonLoader className="w-20 h-3 mt-3" />
    </div>
  );
}

/**
 * Job search page skeleton — matches the JobSearch layout.
 */
export function JobSearchSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true" role="status" aria-label="Loading jobs...">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-start gap-4">
            <SkeletonLoader variant="circle" className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <SkeletonLoader variant="title" />
              <SkeletonLoader className="w-1/3 h-3" />
              <SkeletonLoader className="w-2/3 h-3" />
              <div className="flex gap-2 pt-2">
                <SkeletonLoader className="w-20 h-6 rounded-full" />
                <SkeletonLoader className="w-24 h-6 rounded-full" />
                <SkeletonLoader className="w-28 h-6 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Category grid skeleton — matches the Categories page layout.
 */
export function CategoryGridSkeleton({ count = 8 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-hidden="true" role="status" aria-label="Loading categories...">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start gap-4 mb-4">
            <SkeletonLoader className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="title" className="w-3/4" />
              <SkeletonLoader className="w-1/2 h-3" />
            </div>
          </div>
          <SkeletonLoader className="w-full h-3" />
          <SkeletonLoader className="w-2/3 h-3 mt-2" />
          <SkeletonLoader className="w-24 h-4 mt-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Job detail skeleton — matches the JobDetail page layout.
 */
export function JobDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-hidden="true" role="status" aria-label="Loading job details...">
      <SkeletonLoader className="w-24 h-4 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="flex items-start gap-4 mb-6">
              <SkeletonLoader className="w-16 h-16 rounded-lg" />
              <div className="flex-1 space-y-3">
                <SkeletonLoader className="w-3/4 h-8" />
                <SkeletonLoader className="w-1/2 h-5" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonLoader key={i} className="w-32 h-6 rounded-full" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-3">
            <SkeletonLoader variant="title" className="w-1/3" />
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonLoader key={i} className={`h-3 ${i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-4/5' : 'w-3/5'}`} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100 space-y-3">
            <SkeletonLoader variant="button" className="w-full h-12" />
            <SkeletonLoader variant="button" className="w-full h-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
