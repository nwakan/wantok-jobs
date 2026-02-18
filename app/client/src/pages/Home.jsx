import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, TrendingUp, Users, Building2, CheckCircle, Zap,
  Bell, Award, Star, ChevronLeft, ChevronRight, ArrowRight, Clock, Shield, Globe,
  Cpu, Heart, GraduationCap, Code, DollarSign, Hammer, ShoppingBag, Coffee,
  Droplet, Pickaxe, Scale, Landmark, Megaphone, Cog, Leaf, Truck, Wrench, Eye, FileCheck, UserCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHead from '../components/PageHead';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/SkeletonLoader';
import { jobs as jobsAPI } from '../api';
import ActivityToast from '../components/ActivityToast';
import ActivityFeed from '../components/ActivityFeed';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function TestimonialsCarousel() {
  const [testimonials, setTestimonials] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.get('/testimonials?limit=4')
      .then(data => setTestimonials((data.testimonials || []).filter(t => t.featured).slice(0, 4)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;
  const t = testimonials[current];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">What People Say</h2>
        <p className="text-gray-500 mb-10">Real stories from our community</p>
        <div className="relative">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 p-8 md:p-10 mx-auto max-w-2xl min-h-[200px] flex flex-col items-center justify-center">
            <div className="flex gap-0.5 mb-4">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-5 h-5 ${i <= t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
            <blockquote className="text-lg md:text-xl text-gray-700 dark:text-gray-300 italic mb-6 leading-relaxed">
              "{t.quote}"
            </blockquote>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">{t.name}</p>
              <p className="text-sm text-gray-500">{t.role}{t.company ? ` at ${t.company}` : ''}</p>
            </div>
          </div>
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition ${i === current ? 'bg-primary-600' : 'bg-gray-300'}`} />
              ))}
            </div>
          )}
        </div>
        <Link to="/success-stories" className="inline-block mt-8 text-primary-600 font-semibold hover:underline">
          Read all success stories →
        </Link>
      </div>
    </div>
  );
}

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchData, setSearchData] = useState({ keyword: '', location: '', category: '' });
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recType, setRecType] = useState('popular');
  const [categories, setCategories] = useState([]);
  const [topEmployers, setTopEmployers] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalEmployers: 0, totalJobseekers: 0, transparentEmployers: 0, governmentBodies: 0 });
  const [loading, setLoading] = useState(true);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [emailAlert, setEmailAlert] = useState('');
  const [alertSubmitted, setAlertSubmitted] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // WebSite JSON-LD structured data with SearchAction for sitelinks
  useEffect(() => {
    const websiteData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "WantokJobs",
      "url": "https://wantokjobs.com",
      "description": "Papua New Guinea's leading job board. Find jobs, post vacancies, and connect with employers across PNG.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://wantokjobs.com/jobs?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(websiteData);
    script.id = 'website-structured-data';
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('website-structured-data');
      if (existing) existing.remove();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [jobsResponse, statsResponse, catResponse, employerResponse, trendingResponse] = await Promise.all([
        jobsAPI.getAll({ limit: 6 }).catch(() => null),
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/stats/categories').then(r => r.json()).catch(() => null),
        fetch('/api/stats/top-employers').then(r => r.json()).catch(() => null),
        fetch('/api/analytics/popular-searches').then(r => r.json()).catch(() => null),
      ]);
      setFeaturedJobs(jobsResponse?.data || jobsResponse || []);
      // Fetch recommendations
      try {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const recRes = await fetch('/api/recommendations?limit=10', { headers }).then(r => r.json());
        if (recRes?.data?.length > 0) {
          setRecommendations(recRes.data);
          setRecType(recRes.type || 'popular');
        }
      } catch (e) {}
      if (statsResponse) {
        setStats({
          totalJobs: statsResponse.totalJobs || 0,
          activeJobs: statsResponse.activeJobs || 0,
          totalEmployers: statsResponse.totalEmployers || 0,
          totalJobseekers: statsResponse.totalJobseekers || 0,
          transparentEmployers: statsResponse.transparentEmployers || 0,
          governmentBodies: statsResponse.governmentBodies || 0,
        });
      }
      if (catResponse?.data) {
        setCategories(catResponse.data.filter(c => c.job_count > 0).slice(0, 10));
      }
      if (employerResponse?.data) {
        setTopEmployers(employerResponse.data.filter(e => e.company_name && e.company_name !== 'Various Employers'));
      }
      if (trendingResponse?.data?.length > 0) {
        setTrendingSearches(trendingResponse.data.map(s => s.query));
      }
      // Fetch region stats
      try {
        const regionRes = await fetch('/api/stats/regions').then(r => r.json());
        if (regionRes?.data) setRegions(regionRes.data);
      } catch (e) {}
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
        title="WantokJobs — PNG's First Transparent Hiring Platform | Fair Recruitment"
        description={`PNG's leading transparent job platform. ${stats.totalEmployers.toLocaleString()}+ employers, ${stats.transparentEmployers} transparent employers, ${stats.governmentBodies} government bodies. Fair hiring, open processes. ${stats.activeJobs}+ jobs.`}
        keywords="jobs PNG, transparent hiring PNG, fair recruitment Papua New Guinea, government jobs PNG, Port Moresby jobs, Lae jobs, careers PNG, employment PNG"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "WantokJobs",
          "url": "https://wantokjobs.com",
          "description": "Leading job platform for Papua New Guinea and the Pacific Islands.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://wantokjobs.com/jobs?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-24 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-6xl font-bold mb-4 md:mb-6">
              PNG's First<br />
              <span className="text-secondary-400">Transparent Hiring Platform</span>
            </h1>
            <p className="text-lg md:text-2xl text-primary-100 mb-2">
              {stats.totalEmployers.toLocaleString()}+ employers • {stats.totalJobseekers.toLocaleString()}+ job seekers • {stats.transparentEmployers} transparent employers
            </p>
            <p className="text-lg text-primary-200">
              Fair recruitment. Open processes. No more hidden wantok deals.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSearch}
            className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl p-4"
            role="search"
            aria-label="Search jobs"
          >
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('hero.searchPlaceholder')}
                  value={searchData.keyword}
                  onChange={(e) => setSearchData({ ...searchData, keyword: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 md:py-3 text-base md:text-sm border-2 md:border border-gray-300 rounded-xl md:rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  aria-label="Job title or keywords"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-gray-400" />
                <select
                  value={searchData.location}
                  onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 md:py-3 text-base md:text-sm border-2 md:border border-gray-300 rounded-xl md:rounded-lg text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                  aria-label="Job location"
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
                  aria-label="Job category"
                >
                  <option value="">{t('hero.allCategories')}</option>
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
              {t('hero.searchButton')} {stats.activeJobs > 0 ? `(${stats.activeJobs.toLocaleString()})` : ''}
            </button>
          </motion.form>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-6"
          >
            <p className="text-primary-100 mb-2">
              <TrendingUp className="inline w-4 h-4 mr-1" />
              {trendingSearches.length > 0 ? 'Trending searches:' : 'Popular searches:'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(trendingSearches.length > 0 ? trendingSearches.slice(0, 7) : ['Mining', 'IT', 'Nursing', 'Engineering', 'Accounting', 'Teaching', 'Driver']).map((term) => (
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { value: stats.totalEmployers, label: 'Employers', icon: Building2 },
              { value: stats.governmentBodies, label: 'Government Bodies', icon: Landmark },
              { value: stats.transparentEmployers, label: 'Transparent Employers', icon: Shield },
              { value: stats.activeJobs, label: 'Active Jobs', icon: Briefcase },
              { value: stats.totalJobseekers, label: 'Job Seekers', icon: Users },
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
                <div className="text-sm md:text-base text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Transparency Framework Section */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 py-16 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🏆 First in the Pacific
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              The Transparency Framework
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Fair hiring for PNG. Government departments, SOEs, NGOs, and statutory authorities must now disclose hiring panels, 
              selection criteria, and outcomes. <strong>No other PNG job platform has this.</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                icon: Eye,
                title: 'For Job Seekers',
                color: 'bg-blue-100 text-blue-600',
                points: [
                  'See exactly how you\'re evaluated',
                  'Know who\'s on the hiring panel',
                  'Understand selection criteria upfront',
                  'Fair chance — merit-based hiring'
                ]
              },
              {
                icon: Building2,
                title: 'For Employers',
                color: 'bg-purple-100 text-purple-600',
                points: [
                  'Build trust and credibility',
                  'Meet compliance requirements',
                  'Stand out from competitors',
                  'Reduce recruitment disputes'
                ]
              },
              {
                icon: Shield,
                title: 'For PNG',
                color: 'bg-green-100 text-green-600',
                points: [
                  'Combat wantok system abuse',
                  'Public sector accountability',
                  'Transparent governance',
                  'Level playing field for all'
                ]
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.15 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm"
              >
                <div className={`w-16 h-16 ${item.color} rounded-full flex items-center justify-center mx-auto mb-6`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center">{item.title}</h3>
                <ul className="space-y-3">
                  {item.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{point}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Transparency Score Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
              Transparency Score System
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { badge: '🟢', range: '80-100', label: 'Excellent', desc: 'Full disclosure, all criteria public, panel declared' },
                { badge: '🟡', range: '50-79', label: 'Improving', desc: 'Partial transparency, some criteria disclosed' },
                { badge: '🔴', range: '0-49', label: 'Needs Work', desc: 'Limited disclosure, improving compliance' }
              ].map((score, idx) => (
                <div key={idx} className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-5xl mb-3">{score.badge}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{score.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-semibold">{score.range} Score</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{score.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/transparency"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Learn More About Transparency Framework
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Browse by Region */}
      {regions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 py-12 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">🌏 Browse by Region</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">Jobs across the Pacific Islands</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {regions.map((region) => {
                const icons = { png: '🇵🇬', fj: '🇫🇯', remote: '🌐', other: '🏝️' };
                const colors = { png: 'from-red-500 to-yellow-500', fj: '  from-blue-500 to-cyan-500', remote: 'from-green-500 to-teal-500', other: 'from-purple-500 to-pink-500' };
                const searchParam = region.key === 'remote' ? 'remote=true' : region.key === 'other' ? '' : `country=${encodeURIComponent(region.label)}`;
                return (
                  <Link
                    key={region.key}
                    to={searchParam ? `/jobs?${searchParam}` : '/jobs'}
                    className="bg-gradient-to-br bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 group border border-gray-100 dark:border-gray-600"
                  >
                    <div className="text-4xl mb-3">{icons[region.key] || '🌏'}</div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{region.label}</h3>
                    <p className="text-primary-600 font-semibold text-lg">{region.count} jobs</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Browse by Category — REAL data */}
      <div className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">{t('home.browseCategories')}</h2>
            <p className="text-xl text-gray-600">{t('hero.activeJobs', { count: stats.activeJobs.toLocaleString() })}</p>
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
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">{cat.name}</h3>
                  <p className="text-sm text-primary-600 font-medium">{cat.job_count} jobs</p>
                </motion.button>
              );
            })}
          </div>

          <div className="text-center">
            <Link to="/categories" className="text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-2">
              {t('common.viewAll')}
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recommended Jobs */}
      {recommendations.length > 0 && (
        <div className="bg-white py-16 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <Zap className="w-8 h-8 text-primary-600" />
                  {recType === 'personalized' ? 'Recommended for You' : 'Trending Jobs'}
                </h2>
                <p className="text-lg text-gray-600">
                  {recType === 'personalized'
                    ? 'Jobs matched to your skills, experience and preferences'
                    : 'Popular jobs being viewed and applied to right now'}
                </p>
              </div>
              <Link
                to="/jobs"
                className="hidden md:inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
              >
                View All <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.slice(0, 6).map((job) => <JobCard key={job.id} job={job} />)}
            </div>
            {recommendations.length > 6 && (
              <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendations.slice(6, 10).map((job) => <JobCard key={job.id} job={job} compact />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Latest Jobs */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('home.featuredJobs')}</h2>
              <p className="text-lg text-gray-600">{t('home.viewAllJobs')}</p>
            </div>
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
            >
              {t('home.viewAllJobs')} <ArrowRight className="w-5 h-5" />
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
              {t('home.viewAllJobs')}
            </Link>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <ActivityFeed />

      {/* How It Works */}
      <div className="bg-gradient-to-br from-primary-50 to-teal-50 dark:from-gray-800 dark:to-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Get started in minutes</p>
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
                className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm relative"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 mt-2">
                  <item.icon className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
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
        <div className="bg-white dark:bg-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Top Employers</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">Leading companies hiring on WantokJobs</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {topEmployers.slice(0, 12).map((employer) => (
                <Link
                  key={employer.id}
                  to={`/companies/${employer.id}`}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5 flex flex-col items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 hover:shadow-md transition group"
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
                  {employer.job_count > 0 ? (
                    <p className="text-xs text-primary-600 mt-1">{employer.job_count} active jobs</p>
                  ) : null}
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
      <div className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Why WantokJobs?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Built for Papua New Guinea. Powered by AI.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Shield, title: 'Transparency Framework', desc: 'Only PNG platform with mandatory hiring transparency for public sector. Fair, merit-based recruitment.' },
              { icon: UserCheck, title: 'Employer Scout', desc: `Automated employer profile building from multiple sources — ${stats.governmentBodies || 69} public sector profiles and counting` },
              { icon: Zap, title: 'Jean AI Assistant', desc: 'Chat widget on every page. Get instant help with job searches, applications, and career advice' },
              { icon: Bell, title: 'WhatsApp Job Alerts', desc: 'Get notified instantly when jobs matching your profile are posted — via email, SMS, or WhatsApp' },
              { icon: Globe, title: 'Province-Based Search', desc: 'Find jobs by province and region across PNG and the Pacific Islands' },
              { icon: DollarSign, title: 'Credit-Based Billing', desc: 'No subscriptions! Buy credits when you need them — they never expire. Fair pricing for employers.' },
              { icon: Users, title: `${stats.governmentBodies} Government Profiles`, desc: 'All PNG government departments, SOEs, statutory authorities, and provincial governments' },
              { icon: CheckCircle, title: 'Free for Job Seekers', desc: 'Search, apply, build your CV, track applications, and use Tok Pisin — all completely free' },
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Carousel */}
      <TestimonialsCarousel />

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
                aria-label="Email for job alerts"
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
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Hiring? Reach {stats.totalJobseekers.toLocaleString()}+ Candidates</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
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
