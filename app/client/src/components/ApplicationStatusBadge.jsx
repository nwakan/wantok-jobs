export default function ApplicationStatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-800', label: 'Pending', icon: '⏳' },
    reviewed: { color: 'bg-blue-100 text-blue-800', label: 'Reviewed', icon: '👁️' },
    shortlisted: { color: 'bg-yellow-100 text-yellow-800', label: 'Shortlisted', icon: '⭐' },
    interviewed: { color: 'bg-purple-100 text-purple-800', label: 'Interviewed', icon: '🎯' },
    offered: { color: 'bg-green-100 text-green-800', label: 'Offered', icon: '🎉' },
    hired: { color: 'bg-emerald-100 text-emerald-800', label: 'Hired', icon: '✅' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected', icon: '❌' },
    withdrawn: { color: 'bg-gray-100 text-gray-500', label: 'Withdrawn', icon: '↩️' },
    // Legacy status support
    applied: { color: 'bg-gray-100 text-gray-800', label: 'Pending', icon: '⏳' },
    screening: { color: 'bg-blue-100 text-blue-800', label: 'Reviewed', icon: '👁️' },
    interview: { color: 'bg-purple-100 text-purple-800', label: 'Interviewed', icon: '🎯' },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
