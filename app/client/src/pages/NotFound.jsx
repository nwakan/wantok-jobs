import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeft, Briefcase } from 'lucide-react';
import PageHead from '../components/PageHead';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <PageHead
        title="Page Not Found — WantokJobs"
        description="The page you're looking for doesn't exist. Browse jobs or return to the homepage."
      />
      <main
        className="min-h-[calc(100vh-300px)] flex items-center justify-center px-4 py-12"
        role="main"
        aria-labelledby="not-found-heading"
      >
        <div className="text-center max-w-lg">
          {/* Animated 404 illustration */}
          <div className="relative mb-6">
            <h1
              className="text-[10rem] sm:text-[12rem] font-extrabold text-primary-100 leading-none select-none"
              aria-hidden="true"
            >
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl" role="img" aria-label="Confused face">🤔</span>
            </div>
          </div>

          <h2
            id="not-found-heading"
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
          >
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Sorry, we couldn't find that page. It may have been moved or deleted.
            Let's get you back on track!
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
              aria-label="Go to homepage"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-primary-50 transition-colors border border-primary-200 w-full sm:w-auto justify-center"
              aria-label="Browse all jobs"
            >
              <Briefcase className="w-5 h-5" />
              Browse Jobs
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-6 py-3 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors w-full sm:w-auto justify-center"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>

          {/* Popular categories */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500 mb-3">Popular categories:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: '🏗️ Construction', slug: 'construction' },
                { label: '💼 Accounting', slug: 'accounting-finance' },
                { label: '👨‍🏫 Teaching', slug: 'education-training' },
                { label: '⛏️ Mining', slug: 'mining-resources' },
                { label: '🏥 Health', slug: 'healthcare' },
                { label: '💻 IT', slug: 'information-technology' },
              ].map(({ label, slug }) => (
                <Link
                  key={slug}
                  to={`/category/${slug}`}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick search */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Looking for a specific job? Try searching:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.target.elements.q.value.trim();
                if (q) navigate(`/jobs?q=${encodeURIComponent(q)}`);
              }}
              className="flex gap-2"
              role="search"
              aria-label="Search jobs"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input
                  name="q"
                  type="search"
                  placeholder="e.g. Accountant, Engineer, Teacher..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  aria-label="Search for jobs"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm whitespace-nowrap"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
