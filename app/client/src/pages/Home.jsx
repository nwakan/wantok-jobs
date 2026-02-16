import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, TrendingUp, Users, Building2, CheckCircle, Zap,
  Bell, MessageSquare, Award, Star, ChevronRight, Droplet, Heart, GraduationCap,
  Code, DollarSign, Hammer, ShoppingBag, Coffee, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/SkeletonLoader';
import { jobs as jobsAPI } from '../api';

const categories = [
  { name: 'Mining', slug: 'mining', icon: Droplet, count: 245, color: 'text-orange-600 bg-orange-100' },
  { name: 'Healthcare', slug: 'healthcare', icon: Heart, count: 189, color: 'text-pink-600 bg-pink-100' },
  { name: 'Education', slug: 'education', icon: GraduationCap, count: 156, color: 'text-blue-600 bg-blue-100' },
  { name: 'IT', slug: 'it', icon: Code, count: 134, color: 'text-purple-600 bg-purple-100' },
  { name: 'Banking', slug: 'finance', icon: DollarSign, count: 98, color: 'text-green-600 bg-green-100' },
  { name: 'Construction', slug: 'construction', icon: Hammer, count: 167, color: 'text-yellow-600 bg-yellow-100' },
  { name: 'Retail', slug: 'retail', icon: ShoppingBag, count: 143, color: 'text-indigo-600 bg-indigo-100' },
  { name: 'Hospitality', slug: 'hospitality', icon: Coffee, count: 87, color: 'text-teal-600 bg-teal-100' },
  { name: 'NGO', slug: 'ngo', icon: Globe, count: 94, color: 'text-cyan-600 bg-cyan-100' },
  { name: 'Engineering', slug: 'engineering', icon: Building2, count: 156, color: 'text-slate-600 bg-slate-100' },
];

const provinces = [
  'All Locations', 'Port Moresby, NCD', 'Lae, Morobe', 'Mt Hagen, WHP', 'Kokopo, ENBP', 
  'Madang', 'Goroka, EHP', 'Kimbe, WNB', 'Wewak, ESP', 'Alotau, Milne Bay'
];

export default function Home() {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({
    keyword: '',
    location: '',
    category: '',
  });
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailAlert, setEmailAlert] = useState('');

  useEffect(() => {
    fetchFeaturedJobs();
  }, []);

  const fetchFeaturedJobs = async () => {
    try {
      const response = await jobsAPI.getAll({ limit: 6 });
      setFeaturedJobs(response?.data || response || []);
    } catch (error) {
      console.error('Failed to load featured jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchData.keyword) params.append('q', searchData.keyword);
    if (searchData.location && searchData.location !== 'All Locations') params.append('location', searchData.location);
    if (searchData.category && searchData.category !== 'All Categories') params.append('category', searchData.category);
    navigate(`/jobs?${params.toString()}`);
  };

  const handleEmailAlert = (e) => {
    e.preventDefault();
    // TODO: API call to subscribe
    alert('Job alerts coming soon! Create an account to set up alerts.');
  };

  return (
    <>
      <PageHead
        title="Find Jobs in Papua New Guinea"
        description="Leading job platform for Papua New Guinea and the Pacific. Connect with top employers, search thousands of jobs, and advance your career. Join 30,000+ job seekers today."
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Dream Job in<br />
              <span className="text-secondary-400">Papua New Guinea</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-2">
              Join <strong>30,000+</strong> job seekers and <strong>330+</strong> employers
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSearch}
            className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-4"
          >
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job title or keywords..."
                  value={searchData.keyword}
                  onChange={(e) => setSearchData({ ...searchData, keyword: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={searchData.location}
                  onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                >
                  {provinces.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={searchData.category}
                  onChange={(e) => setSearchData({ ...searchData, category: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search Jobs
            </button>
          </motion.form>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-6"
          >
            <p className="text-primary-100 mb-2">Popular:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Mining', 'IT', 'Health', 'Education', 'Banking'].map((term) => (
                <button
                  key={term}
                  onClick={() => navigate(`/jobs?q=${term}`)}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-sm text-white transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">30,000+</div>
              <div className="text-sm md:text-base text-gray-600">Job Seekers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">330+</div>
              <div className="text-sm md:text-base text-gray-600">Employers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">1,600+</div>
              <div className="text-sm md:text-base text-gray-600">Jobs Posted</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">K1.1M+</div>
              <div className="text-sm md:text-base text-gray-600">in Opportunities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Browse by Category */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-xl text-gray-600">Explore opportunities across all major industries</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {categories.map((category, idx) => {
              const IconComponent = category.icon;
              return (
                <motion.button
                  key={category.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={() => navigate(`/jobs?category=${category.slug}`)}
                  className="bg-white rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">{category.count} jobs</p>
                </motion.button>
              );
            })}
          </div>

          <div className="text-center">
            <Link to="/categories" className="text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-2">
              View All Categories
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Jobs */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Jobs</h2>
            <p className="text-xl text-gray-600">Hand-picked opportunities from top employers</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <JobCardSkeleton key={idx} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/jobs"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              View All Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary-50 to-teal-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get hired in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up for free and create a professional profile. Upload your CV, add your skills, and set your job preferences.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Search & Apply</h3>
              <p className="text-gray-600">
                Browse thousands of jobs, filter by your preferences, and apply with one click. Get AI-powered job matches.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Get Hired</h3>
              <p className="text-gray-600">
                Receive interview invitations, track your applications, and land your dream job with top PNG employers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Employers */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Top Employers Hiring Now</h2>
            <p className="text-xl text-gray-600">Join these leading companies</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6 flex items-center justify-center hover:bg-gray-100 transition">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/companies" className="text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-2">
              View All Companies
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Why WantokJobs */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose WantokJobs?</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Matching</h3>
              <p className="text-gray-600">Smart algorithms match you with the most relevant jobs</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Multi-Channel Alerts</h3>
              <p className="text-gray-600">Get notified via Email, SMS, and WhatsApp</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Free for Job Seekers</h3>
              <p className="text-gray-600">Search, apply, and get hired at no cost</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trusted by 330+ Companies</h3>
              <p className="text-gray-600">Top PNG employers post here first</p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
            <p className="text-xl text-gray-600">Hear from our community</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'John Kila', role: 'Software Developer', company: 'TechPNG', quote: 'Found my dream job in just 2 weeks!' },
              { name: 'Sarah Pato', role: 'HR Manager', company: 'Mining Corp', quote: 'WantokJobs made hiring so much easier for us.' },
              { name: 'David Aisi', role: 'Nurse', company: 'Port Moresby General', quote: 'The job alerts feature is amazing!' },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role} at {testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Alert CTA */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Bell className="w-16 h-16 text-white mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Never Miss an Opportunity</h2>
          <p className="text-xl text-primary-100 mb-8">
            Get job alerts delivered to your inbox, phone, or WhatsApp
          </p>
          <form onSubmit={handleEmailAlert} className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              value={emailAlert}
              onChange={(e) => setEmailAlert(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-lg text-gray-900"
              required
            />
            <button
              type="submit"
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ready to Find Great Talent?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Post jobs, access 30,000+ candidates, and grow your team
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=employer"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Register as Employer
            </Link>
            <Link
              to="/pricing"
              className="bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
