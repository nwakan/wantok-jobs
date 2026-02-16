import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">
            {job.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {job.company_name || job.employer_name}
          </p>
        </div>
        {job.logo_url && (
          <img src={job.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover ml-4" />
        )}
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {job.source === 'headhunter' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
            🤖 Imported
          </span>
        )}
        {job.location && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
            📍 {job.location}
          </span>
        )}
        {job.job_type && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
            {job.job_type}
          </span>
        )}
        {job.salary_min && job.salary_max && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
            {job.salary_currency} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
          </span>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-600 line-clamp-2">
        {job.description}
      </p>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>{job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}</span>
        {job.views_count > 0 && <span>{job.views_count} views</span>}
      </div>
    </Link>
  );
}
