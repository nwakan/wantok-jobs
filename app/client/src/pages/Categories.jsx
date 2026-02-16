import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Calculator, FileText, DollarSign, Users, Hammer, GraduationCap,
  Cog, Landmark, Heart, Coffee, UserPlus, Code, Scale, Truck, TrendingUp,
  Globe, Microscope, Shield, Flame, Sparkles, TrendingDown
} from 'lucide-react';
import PageHead from '../components/PageHead';

// Icon mapping for lucide-react icons
const iconMap = {
  Calculator, FileText, DollarSign, Users, Hammer, GraduationCap, Cog, Landmark, 
  Heart, Coffee, UserPlus, Code, Scale, Briefcase, Truck, TrendingUp, Globe, 
  Microscope, Shield, Flame, Sparkles
};

// Color schemes for different categories (SEEK-style)
const colorSchemes = [
  'bg-orange-100 text-orange-600',
  'bg-blue-100 text-blue-600',
  'bg-green-100 text-green-600',
  'bg-purple-100 text-purple-600',
  'bg-pink-100 text-pink-600',
  'bg-indigo-100 text-indigo-600',
  'bg-yellow-100 text-yellow-600',
  'bg-teal-100 text-teal-600',
  'bg-red-100 text-red-600',
  'bg-cyan-100 text-cyan-600',
  'bg-slate-100 text-slate-600',
  'bg-amber-100 text-amber-600',
  'bg-lime-100 text-lime-600',
  'bg-rose-100 text-rose-600',
  'bg-emerald-100 text-emerald-600',
  'bg-violet-100 text-violet-600',
];

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [trendingCategories, setTrendingCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalJobs: 0,
    totalEmployers: 330,
    totalOpportunities: 'K1.1M+'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const [allRes, featuredRes, trendingRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/categories/featured'),
        fetch('/api/categories/trending')
      ]);

      const allData = await allRes.json();
      const featuredData = await featuredRes.json();
      const trendingData = await trendingRes.json();

      setCategories(allData.categories || []);
      setFeaturedCategories(featuredData.categories || []);
      setTrendingCategories(trendingData.categories || []);

      // Calculate stats
      const totalJobs = allData.categories?.reduce((sum, cat) => sum + (cat.active_jobs || 0), 0) || 0;
      setStats({
        totalCategories: allData.categories?.length || 0,
        totalJobs,
        totalEmployers: 330,
        totalOpportunities: 'K1.1M+'
      });
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (slug) => {
    navigate(`/category/${slug}`);
  };

  const renderCategoryCard = (category, idx) => {
    const IconComponent = iconMap[category.icon_name] || Briefcase;
    const colorClass = colorSchemes[idx % colorSchemes.length];

    return (
      <button
        key={category.id}
        onClick={() => handleCategoryClick(category.slug)}
        className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-lg ${colorClass} group-hover:scale-110 transition-transform`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {category.name}
              </h3>
              {category.trending === 1 && (
                <Flame className="w-4 h-4 text-red-500" title="Trending" />
              )}
            </div>
            <p className="text-sm text-gray-500">
              {category.active_jobs || 0} active jobs
            </p>
          </div>
        </div>
        {category.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {category.description}
          </p>
        )}
        <div className="text-primary-600 text-sm font-medium group-hover:underline">
          Browse jobs →
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title="Browse Jobs by Category | WantokJobs"
        description="Explore jobs across all industries in Papua New Guinea. Find opportunities in mining, healthcare, IT, education, and more. Start your career search today."
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Jobs by Category</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore thousands of opportunities across all major industries in Papua New Guinea and the Pacific.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-12 text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary-600">{stats.totalCategories}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">{stats.totalJobs.toLocaleString()}+</div>
                <div className="text-sm text-gray-600">Active Jobs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">{stats.totalEmployers}+</div>
                <div className="text-sm text-gray-600">Employers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">{stats.totalOpportunities}</div>
                <div className="text-sm text-gray-600">in Opportunities</div>
              </div>
            </div>
          </div>

          {/* Trending Categories */}
          {trendingCategories.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Flame className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-900">Trending Now</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingCategories.slice(0, 4).map((category, idx) => (
                  <div key={category.id} className="relative">
                    {renderCategoryCard(category, idx)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured Categories */}
          {featuredCategories.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">Popular Categories</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredCategories.map((category, idx) => renderCategoryCard(category, idx))}
              </div>
            </div>
          )}

          {/* All Categories */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Categories</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category, idx) => renderCategoryCard(category, idx))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Can't Find Your Category?</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              We're constantly adding new categories and opportunities. Set up a job alert and be the first to know when new positions are posted.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Create Job Alert
            </button>
          </div>

          {/* Popular Searches */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Popular Searches</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {['Mining Engineer', 'Nurse', 'Teacher', 'Software Developer', 'Accountant', 'Project Manager', 'Chef', 'Security Officer'].map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/jobs?q=${encodeURIComponent(term)}`)}
                  className="px-4 py-2 bg-white rounded-full text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 border border-gray-200 transition"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
