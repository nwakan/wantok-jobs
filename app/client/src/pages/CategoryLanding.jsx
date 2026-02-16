import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase, Calculator, FileText, DollarSign, Users, Hammer, GraduationCap,
  Cog, Landmark, Heart, Coffee, UserPlus, Code, Scale, Truck, TrendingUp,
  Globe, Microscope, Shield, Building2, MapPin, Clock, ChevronRight, Search
} from 'lucide-react';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';

// Icon mapping
const iconMap = {
  Calculator, FileText, DollarSign, Users, Hammer, GraduationCap, Cog, Landmark, 
  Heart, Coffee, UserPlus, Code, Scale, Briefcase, Truck, TrendingUp, Globe, 
  Microscope, Shield
};

export default function CategoryLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState(null);
  const [relatedCategories, setRelatedCategories] = useState([]);
  const [topEmployers, setTopEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadCategoryData();
  }, [slug]);

  const loadCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load category details
      const catRes = await fetch(`/api/categories/${slug}`);
      if (!catRes.ok) throw new Error('Category not found');
      const catData = await catRes.json();
      
      setCategory(catData.category);
      setRelatedCategories(catData.related || []);
      setTopEmployers(catData.topEmployers || []);
      
      // Load jobs
      const jobsRes = await fetch(`/api/categories/${slug}/jobs?page=1&limit=12`);
      const jobsData = await jobsRes.json();
      
      setJobs(jobsData.jobs || []);
      setPagination(jobsData.pagination || {});
      
    } catch (error) {
      console.error('Error loading category:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJobs = async (page) => {
    try {
      const jobsRes = await fetch(`/api/categories/${slug}/jobs?page=${page}&limit=12`);
      const jobsData = await jobsRes.json();
      
      setJobs(jobsData.jobs || []);
      setPagination(jobsData.pagination || {});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error loading more jobs:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h2>
          <p className="text-gray-600 mb-6">The category you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/categories')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Browse All Categories
          </button>
        </div>
      </div>
    );
  }

  const IconComponent = iconMap[category.icon_name] || Briefcase;

  return (
    <>
      <PageHead
        title={category.meta_title || `${category.name} Jobs in PNG | WantokJobs`}
        description={category.meta_description || category.description}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <IconComponent className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{category.name}</h1>
                <p className="text-primary-100 text-lg">
                  {category.active_jobs || 0} active job{category.active_jobs !== 1 ? 's' : ''} in Papua New Guinea
                </p>
              </div>
            </div>
            
            {category.description && (
              <p className="text-lg text-primary-50 max-w-3xl mt-6">
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Jobs */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Latest {category.name} Jobs
                </h2>
                <button
                  onClick={() => navigate(`/jobs?category=${category.slug}`)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600 mb-6">
                    There are currently no active {category.name} jobs. Set up a job alert to be notified when new positions are posted.
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    Create Job Alert
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {jobs.map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => loadMoreJobs(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="min-w-[100px] min-h-[48px] px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-2">
                        {[...Array(pagination.totalPages)].map((_, idx) => {
                          const pageNum = idx + 1;
                          // Show first 2, last 2, and current +/- 1
                          if (
                            pageNum <= 2 ||
                            pageNum > pagination.totalPages - 2 ||
                            Math.abs(pageNum - pagination.page) <= 1
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => loadMoreJobs(pageNum)}
                                className={`min-w-[44px] min-h-[44px] rounded-lg ${
                                  pageNum === pagination.page
                                    ? 'bg-primary-600 text-white'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === 3 && pagination.page > 4 ||
                            pageNum === pagination.totalPages - 2 && pagination.page < pagination.totalPages - 3
                          ) {
                            return <span key={pageNum} className="text-gray-500">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => loadMoreJobs(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="min-w-[100px] min-h-[48px] px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Top Employers */}
              {topEmployers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    Top Employers Hiring
                  </h3>
                  <div className="space-y-3">
                    {topEmployers.map((employer, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigate(`/jobs?company=${encodeURIComponent(employer.company_display_name)}`)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition text-left"
                      >
                        {employer.company_logo ? (
                          <img
                            src={employer.company_logo}
                            alt={employer.company_display_name}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {employer.company_display_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employer.job_count} job{employer.job_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Categories */}
              {relatedCategories.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Related Categories</h3>
                  <div className="space-y-2">
                    {relatedCategories.map((relCat) => {
                      const RelIcon = iconMap[relCat.icon_name] || Briefcase;
                      return (
                        <button
                          key={relCat.id}
                          onClick={() => navigate(`/category/${relCat.slug}`)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition text-left"
                        >
                          <div className="p-2 bg-primary-50 rounded text-primary-600">
                            <RelIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {relCat.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {relCat.active_jobs || 0} jobs
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Job Alert CTA */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Stay Updated</h3>
                <p className="text-primary-100 text-sm mb-4">
                  Get notified when new {category.name} jobs are posted.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  Create Job Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
