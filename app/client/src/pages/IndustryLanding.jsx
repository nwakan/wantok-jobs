import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, TrendingUp, Building2, MapPin, Clock, ChevronRight,
  DollarSign, Users, Lightbulb, ArrowRight, Star
} from 'lucide-react';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';

export default function IndustryLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIndustry();
  }, [slug]);

  const loadIndustry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/industries/${slug}`);
      if (!res.ok) throw new Error('Industry not found');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (amount) => {
    if (!amount || amount === 0) return null;
    return `K${Math.round(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Industry Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Sorry, we couldn't find that industry page.</p>
          <Link to="/jobs" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">
            Browse All Jobs
          </Link>
        </div>
      </div>
    );
  }

  const { industry, stats, jobs, employers, related, categorySlugs } = data;
  const avgSalary = stats.avgSalaryMin && stats.avgSalaryMax
    ? `${formatSalary(stats.avgSalaryMin)} - ${formatSalary(stats.avgSalaryMax)}`
    : stats.avgSalaryMin ? `From ${formatSalary(stats.avgSalaryMin)}` : null;

  // Build search URL with category filter
  const searchUrl = categorySlugs?.length
    ? `/jobs?category=${categorySlugs[0]}`
    : `/jobs?q=${encodeURIComponent(industry.name)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: industry.metaTitle,
    description: industry.metaDescription,
    url: `https://wantokjobs.com/industries/${industry.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: stats.jobCount,
      itemListElement: jobs.map((job, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'JobPosting',
          title: job.title,
          hiringOrganization: { '@type': 'Organization', name: job.company_display_name || job.company_name }
        }
      }))
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHead
        title={industry.metaTitle}
        description={industry.metaDescription}
        keywords={industry.keywords?.join(', ')}
        jsonLd={jsonLd}
      />

      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${industry.color}15, ${industry.color}30)` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-5xl">{industry.icon}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {industry.name} Jobs in PNG
              </h1>
              <p className="mt-3 text-lg text-gray-700 dark:text-gray-300 max-w-3xl">
                {industry.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to={searchUrl}
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition font-medium"
            >
              <Briefcase className="w-5 h-5" />
              Browse All {industry.name} Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 -mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.jobCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Salary Range</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {avgSalary || 'Varies'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top Employers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{employers.length}+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Featured Jobs */}
            {jobs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Featured {industry.name} Jobs
                  </h2>
                  <Link
                    to={searchUrl}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {jobs.map(job => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    to={searchUrl}
                    className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition font-medium"
                  >
                    Browse All {industry.name} Jobs ({stats.jobCount})
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </section>
            )}

            {jobs.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No {industry.name} Jobs Right Now
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  New jobs are posted regularly. Set up a job alert to be notified.
                </p>
                <Link to="/jobs" className="text-primary-600 hover:underline font-medium">
                  Browse all available jobs →
                </Link>
              </div>
            )}

            {/* Industry Tips */}
            {industry.tips?.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Tips for {industry.name} Jobs in PNG
                </h2>
                <ul className="space-y-3">
                  {industry.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Employers */}
            {employers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Top Employers
                </h3>
                <ul className="space-y-3">
                  {employers.map((emp, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {emp.logo_url ? (
                          <img src={emp.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-gray-50" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
                            {emp.name?.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{emp.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {emp.job_count} {emp.job_count === 1 ? 'job' : 'jobs'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Industries */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Related Industries
              </h3>
              <ul className="space-y-2">
                {related.map(ind => (
                  <li key={ind.slug}>
                    <Link
                      to={`/industries/${ind.slug}`}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition py-1"
                    >
                      <span>{ind.icon}</span>
                      <span>{ind.name}</span>
                      <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-5 border border-primary-100 dark:border-primary-800">
              <h3 className="font-bold text-primary-900 dark:text-primary-100 mb-2">
                Get {industry.name} Job Alerts
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300 mb-4">
                Be the first to know when new {industry.name.toLowerCase()} jobs are posted in PNG.
              </p>
              <Link
                to="/register"
                className="block w-full text-center bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
              >
                Sign Up for Alerts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
