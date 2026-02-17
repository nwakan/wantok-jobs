import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, TrendingUp, Users, Building2, CheckCircle, Zap,
  Bell, Award, Star, ChevronRight, ArrowRight, Clock, Shield, Globe,
  Cpu, Heart, GraduationCap, Code, DollarSign, Hammer, ShoppingBag, Coffee,
  Droplet, Pickaxe, Scale, Landmark, Megaphone, Cog, Leaf, Truck, Wrench
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/SkeletonLoader';
import { jobs as jobsAPI } from '../api';
import ActivityToast from '../components/ActivityToast';
import ActivityFeed from '../components/ActivityFeed';

// Icon map for categories
const categoryIcons = {
  'mining-and-resources': Pickaxe,
  'health-and-medical': Heart,
  'education-and-training': GraduationCap,
  'ict-and-technology': Code,
  'finance': DollarSign,
  'construction-and-trades': Hammer,
  'manufacturing-and-logistics': Truck,
  'hospitality': Coffee,
  'community-and-development': Globe,
  'engineering': Cog,
  'administration': Briefcase,
  'management-and-executive': TrendingUp,
  'hr-and-recruitment': Users,
  'marketing-and-sales': Megaphone,
  'legal-and-law': Scale,
  'government': Landmark,
  'science-and-research': Cpu,
  'agriculture-and-environment': Leaf,
};

const categoryColors = [
  'text-orange-600 bg-orange-100',
  'text-pink-600 bg-pink-100',
  'text-blue-600 bg-blue-100',
  'text-purple-600 bg-purple-100',
  'text-green-600 bg-green-100',
  'text-yellow-600 bg-yellow-100',
  'text-indigo-600 bg-indigo-100',
  'text-teal-600 bg-teal-100',
  'text-cyan-600 bg-cyan-100',
  'text-slate-600 bg-slate-100',
  'text-red-600 bg-red-100',
  'text-emerald-600 bg-emerald-100',
];

const provinces = [
  'All Locations', 'Port Moresby, NCD', 'Lae, Morobe', 'Mt Hagen, WHP', 'Kokopo, ENBP', 
  'Madang', 'Goroka, EHP', 'Kimbe, WNB', 'Wewak, ESP', 'Alotau, Milne Bay'
];

export default function Home() {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({ keyword: '', location: '', category: '' });
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topEmployers, setTopEmployers] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalEmployers: 0, totalJobseekers: 0 });
  const [loading, setLoading] = useState(true);
  const [emailAlert, setEmailAlert] = useState('');
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [jobsResponse, statsResponse, catResponse, employerResponse] = await Promise.all([
        jobsAPI.getAll({ limit: 6 }),
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/stats/categories').then(r => r.json()).catch(() => null),
        fetch('/api/stats/top-employers').then(r => r.json()).catch(() => null),
      ]);
      setFeaturedJobs(jobsResponse?.data || jobsResponse || []);
      if (statsResponse) {
        setStats({
          totalJobs: statsResponse.totalJobs || 0,
          activeJobs: statsResponse.activeJobs || 0,
          totalEmployers: statsResponse.totalEmployers || 0,
          totalJobseekers: statsResponse.totalJobseekers || 0,
        });
      }
      if (catResponse?.data) {
        setCategories(catResponse.data.filter(c => c.job_count > 0).slice(0, 10));
      }
      if (employerResponse?.data) {
        setTopEmployers(employerResponse.data.filter(e => e.company_name && e.company_name !== 'WantokJobs Imports'));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const handleEmailAlert = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/job-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAlert, frequency: 'daily' }),
      });
      setAlertSubmitted(true);
      setEmailAlert('');
    } catch {
      // Fallback: prompt registration
      navigate(`/register?email=${encodeURIComponent(emailAlert)}`);
    }
  };

  return (
    <>
      <ActivityToast />
      <PageHead
        title="Find Jobs in Papua New Guinea"
        description={`Leading job platform for Papua New Guinea and the Pacific. ${stats.activeJobs}+ active jobs from ${stats.totalEmployers}+ employers. Connect with top employers, search jobs, and advance your career.`}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white relative overflow-hidden">
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
              Join <strong>{stats.totalJobseekers.toLocaleString()}+</strong> job seekers and <strong>{stats.totalEmployers.toLocaleString()}+</strong> employers
            </p>
            <p className="text-lg text-primary-200">
              <strong>{stats.activeJobs.toLocaleString()}</strong> active opportunities across PNG
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job title or keywords..."
                  value={searchData.keyword}
                  onChange={(e) => setSearchData({ ...searchData, keyword: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 md:py-3 text-base md:text-sm border-2 md:border border-gray-300 rounded-xl md:rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-gray-400" />
                <select
                  value={searchData.location}
                  onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 md:py-3 text-base md:text-sm border-2 md:border border-gray-300 rounded-xl md:rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  {provinces.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-gray-400" />
                <select
                  value={searchData.category}
                  onChange={(e) => setSearchData({ ...searchData, category: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 md:py-3 text-base md:text-sm border-2 md:border border-gray-300 rounded-xl md:rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name} ({cat.job_count})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-primary-700 transition flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search {stats.activeJobs > 0 ? `${stats.activeJobs.toLocaleString()} Jobs` : 'Jobs'}
            </button>
          </motion.form>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-6"
          >
            <p className="text-primary-100 mb-2">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Mining', 'IT', 'Nursing', 'Engineering', 'Accounting', 'Teaching', 'Driver'].map((term) => (
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
            {[
              { value: stats.activeJobs, label: 'Active Jobs', icon: Briefcase },
              { value: stats.totalEmployers, label: 'Employers', icon: Building2 },
              { value: stats.totalJobseekers, label: 'Job Seekers', icon: Users },
              { value: categories.length || 20, label: 'Industries', icon: Globe },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
              >
                <stat.icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-1">
                  {stat.value.toLocaleString()}{typeof stat.value === 'number' && stat.value > 10 ? '+' : ''}
                </div>
                <div className="text-sm md:text-base text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Browse by Category — REAL data */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Browse by Industry</h2>
            <p className="text-xl text-gray-600">Explore opportunities across Papua New Guinea's key sectors</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {categories.slice(0, 10).map((cat, idx) => {
              const IconComponent = categoryIcons[cat.slug] || Briefcase;
              const color = categoryColors[idx % categoryColors.length];
              return (
                <motion.button
                  key={cat.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={() => navigate(`/jobs?category=${cat.slug}`)}
                  className="bg-white rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">{cat.name}</h3>
                  <p className="text-sm text-primary-600 font-medium">{cat.job_count} jobs</p>
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

      {/* Latest Jobs */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Latest Jobs</h2>
              <p className="text-lg text-gray-600">Fresh opportunities added daily</p>
            </div>
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
            >
              View all jobs <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => <JobCardSkeleton key={idx} />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}

          <div className="text-center mt-8 md:hidden">
            <Link
              to="/jobs"
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              View All Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <ActivityFeed />

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary-50 to-teal-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, step: '1', title: 'Create Your Profile', desc: 'Sign up free. Upload your CV, add skills, and set job preferences. Takes under 5 minutes.' },
              { icon: Search, step: '2', title: 'Search & Apply', desc: 'Browse jobs with smart filters. Get AI-powered recommendations. Apply with one click.' },
              { icon: Award, step: '3', title: 'Get Hired', desc: 'Track your applications in real-time. Receive interview invitations. Land your dream role.' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.15 }}
                className="bg-white rounded-xl p-8 text-center shadow-sm relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 mt-2">
                  <item.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA for both user types */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link to="/register?type=jobseeker" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition text-center">
              Sign Up as Job Seeker
            </Link>
            <Link to="/register?type=employer" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition border border-primary-200 text-center">
              Post a Job — It's Free
            </Link>
          </div>
        </div>
      </div>

      {/* Top Employers — REAL data */}
      {topEmployers.length > 0 && (
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Top Employers</h2>
              <p className="text-xl text-gray-600">Leading companies hiring on WantokJobs</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {topEmployers.slice(0, 12).map((employer) => (
                <Link
                  key={employer.id}
                  to={`/companies/${employer.id}`}
                  className="bg-gray-50 rounded-lg p-5 flex flex-col items-center justify-center hover:bg-gray-100 hover:shadow-md transition group"
                >
                  {employer.logo_url ? (
                    <img
                      src={employer.logo_url.startsWith('http') ? employer.logo_url : `/uploads/${employer.logo_url}`}
                      alt={employer.company_name}
                      className="w-16 h-16 object-contain mb-3 group-hover:scale-105 transition-transform"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`w-16 h-16 bg-primary-100 rounded-lg items-center justify-center mb-3 ${employer.logo_url ? 'hidden' : 'flex'}`}>
                    <Building2 className="w-8 h-8 text-primary-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 text-center line-clamp-2">{employer.company_name}</p>
                  {employer.job_count > 0 && (
                    <p className="text-xs text-primary-600 mt-1">{employer.job_count} active jobs</p>
                  )}
                </Link>
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
      )}

      {/* Why WantokJobs */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why WantokJobs?</h2>
            <p className="text-xl text-gray-600">Built for Papua New Guinea. Powered by AI.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Zap, title: 'AI-Powered Matching', desc: 'Smart algorithms match you with the most relevant opportunities based on your skills and experience' },
              { icon: Clock, title: 'Real-Time Alerts', desc: 'Get notified instantly when jobs matching your profile are posted — via email, SMS, or WhatsApp' },
              { icon: Shield, title: 'Free for Job Seekers', desc: 'Search, apply, build your CV, and track applications — all completely free, forever' },
              { icon: Globe, title: 'PNG-First Platform', desc: 'Purpose-built for the Papua New Guinean job market with local companies and local opportunities' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
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
            Get new job alerts delivered to your inbox daily
          </p>
          {alertSubmitted ? (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
              <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-3" />
              <p className="text-white font-semibold">You're signed up! Create an account to customize your alerts.</p>
              <Link to="/register" className="text-white underline mt-2 inline-block hover:text-primary-100">
                Create Free Account →
              </Link>
            </div>
          ) : (
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
                className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      {/* For Employers CTA */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Hiring? Reach {stats.totalJobseekers.toLocaleString()}+ Candidates</h2>
          <p className="text-xl text-gray-600 mb-8">
            Post jobs, search candidates, and find the right talent for your team. Start with a free posting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=employer"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Post a Job — Free
            </Link>
            <Link
              to="/pricing"
              className="bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              View Pricing Plans
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
