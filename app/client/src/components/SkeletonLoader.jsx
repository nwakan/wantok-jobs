export default function SkeletonLoader({ className = '', variant = 'default' }) {
  const variants = {
    default: 'h-4 bg-gray-200 rounded animate-pulse',
    card: 'h-48 bg-gray-200 rounded-lg animate-pulse',
    circle: 'w-12 h-12 bg-gray-200 rounded-full animate-pulse',
    text: 'h-3 bg-gray-200 rounded animate-pulse',
    title: 'h-6 bg-gray-200 rounded animate-pulse w-3/4',
  };

  return <div className={`${variants[variant]} ${className}`} />;
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col items-center text-center space-y-4">
        <SkeletonLoader variant="circle" className="w-20 h-20" />
        <SkeletonLoader variant="title" className="w-full" />
        <SkeletonLoader className="w-3/4" />
        <SkeletonLoader className="w-1/2" />
      </div>
    </div>
  );
}
