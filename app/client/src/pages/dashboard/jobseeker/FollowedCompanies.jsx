import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { companyFollows } from '../../../api';
import { useToast } from '../../../components/Toast';

export default function FollowedCompanies() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFollows();
  }, []);

  const loadFollows = async () => {
    try {
      const data = await companyFollows.getAll();
      setCompanies(data?.data || []);
    } catch (error) {
      console.error('Failed to load followed companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (employerId) => {
    try {
      await companyFollows.unfollow(employerId);
      setCompanies(prev => prev.filter(c => c.employer_id !== employerId));
      showToast('Unfollowed company', 'success');
    } catch (error) {
      showToast('Failed to unfollow', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Followed Companies</h1>
        <p className="text-gray-600">Stay updated on new jobs from companies you follow</p>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No followed companies</h3>
          <p className="text-gray-600 mb-6">
            Follow companies to get notified when they post new jobs
          </p>
          <Link
            to="/companies"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Browse Companies
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map(company => (
            <div key={company.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-start gap-4 mb-4">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-xl">
                    {company.company_name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <Link
                    to={`/companies/${company.employer_id}`}
                    className="text-lg font-bold text-gray-900 hover:text-primary-600"
                  >
                    {company.company_name}
                  </Link>
                  {company.industry && (
                    <p className="text-sm text-gray-600">{company.industry}</p>
                  )}
                  {company.location && (
                    <p className="text-sm text-gray-500">📍 {company.location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary-600">
                  {company.active_jobs > 0 ? `${company.active_jobs} active job${company.active_jobs !== 1 ? 's' : ''}` : 'No active jobs'}
                </span>
                <div className="flex gap-2">
                  <Link
                    to={`/companies/${company.employer_id}`}
                    className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleUnfollow(company.employer_id)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 font-medium transition"
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
