import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobs as jobsAPI } from '../api';
import JobCard from '../components/JobCard';

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState([]);

  useEffect(() => {
    // Load featured jobs
    jobsAPI.getAll({ limit: 6 })
      .then(response => setFeaturedJobs(response.data))
      .catch(error => console.error('Failed to load featured jobs:', error));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/jobs?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Find Your Dream Job in the Pacific
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Connecting talent with opportunity across Papua New Guinea and the Pacific region
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, keywords, or company"
                  className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Search Jobs
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Featured Jobs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Jobs</h2>
          <Link to="/jobs" className="text-primary-600 hover:text-primary-700 font-medium">
            View all jobs →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of job seekers and employers on WantokJobs
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Sign Up Now
            </Link>
            <Link
              to="/jobs"
              className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
