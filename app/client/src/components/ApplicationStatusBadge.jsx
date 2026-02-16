export default function ApplicationStatusBadge({ status }) {
  const statusConfig = {
    applied: { color: 'bg-blue-100 text-blue-800', label: 'Applied' },
    screening: { color: 'bg-yellow-100 text-yellow-800', label: 'Screening' },
    shortlisted: { color: 'bg-purple-100 text-purple-800', label: 'Shortlisted' },
    interview: { color: 'bg-indigo-100 text-indigo-800', label: 'Interview' },
    offered: { color: 'bg-green-100 text-green-800', label: 'Offered' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
    withdrawn: { color: 'bg-gray-100 text-gray-800', label: 'Withdrawn' },
  };

  const config = statusConfig[status] || statusConfig.applied;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
