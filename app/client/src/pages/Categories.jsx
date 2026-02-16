import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Hammer, Droplet, Heart, GraduationCap, Code, DollarSign, ShoppingBag,
  Coffee, Building2, Users, Globe, Truck, Zap, TreePine, Landmark, Shield
} from 'lucide-react';
import PageHead from '../components/PageHead';

const categories = [
  { name: 'Mining & Resources', slug: 'mining', icon: Droplet, count: 245, color: 'bg-orange-100 text-orange-600' },
  { name: 'Oil & Gas', slug: 'oil-gas', icon: Zap, count: 78, color: 'bg-red-100 text-red-600' },
  { name: 'Healthcare & Medical', slug: 'healthcare', icon: Heart, count: 189, color: 'bg-pink-100 text-pink-600' },
  { name: 'Education & Training', slug: 'education', icon: GraduationCap, count: 156, color: 'bg-blue-100 text-blue-600' },
  { name: 'Information Technology', slug: 'it', icon: Code, count: 134, color: 'bg-purple-100 text-purple-600' },
  { name: 'Banking & Finance', slug: 'finance', icon: DollarSign, count: 98, color: 'bg-green-100 text-green-600' },
  { name: 'Construction', slug: 'construction', icon: Hammer, count: 167, color: 'bg-yellow-100 text-yellow-600' },
  { name: 'Retail & Sales', slug: 'retail', icon: ShoppingBag, count: 143, color: 'bg-indigo-100 text-indigo-600' },
  { name: 'Hospitality & Tourism', slug: 'hospitality', icon: Coffee, count: 87, color: 'bg-teal-100 text-teal-600' },
  { name: 'Government & Public Sector', slug: 'government', icon: Landmark, count: 112, color: 'bg-blue-100 text-blue-700' },
  { name: 'NGO & Development', slug: 'ngo', icon: Globe, count: 94, color: 'bg-cyan-100 text-cyan-600' },
  { name: 'Engineering', slug: 'engineering', icon: Building2, count: 156, color: 'bg-slate-100 text-slate-600' },
  { name: 'Human Resources', slug: 'hr', icon: Users, count: 67, color: 'bg-rose-100 text-rose-600' },
  { name: 'Logistics & Transport', slug: 'logistics', icon: Truck, count: 89, color: 'bg-amber-100 text-amber-600' },
  { name: 'Agriculture & Forestry', slug: 'agriculture', icon: TreePine, count: 56, color: 'bg-lime-100 text-lime-600' },
  { name: 'Security & Defense', slug: 'security', icon: Shield, count: 43, color: 'bg-gray-100 text-gray-600' },
];

export default function Categories() {
  const navigate = useNavigate();

  const handleCategoryClick = (slug) => {
    navigate(`/jobs?category=${slug}`);
  };

  return (
    <>
      <PageHead
        title="Browse by Category"
        description="Explore jobs across all industries in Papua New Guinea. Find opportunities in mining, healthcare, IT, education, and more."
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
                <div className="text-3xl font-bold text-primary-600">16</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">1,600+</div>
                <div className="text-sm text-gray-600">Active Jobs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">330+</div>
                <div className="text-sm text-gray-600">Employers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">K1.1M+</div>
                <div className="text-sm text-gray-600">in Opportunities</div>
              </div>
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category, idx) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleCategoryClick(category.slug)}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-lg ${category.color} group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.count} active jobs
                      </p>
                    </div>
                  </div>
                  <div className="text-primary-600 text-sm font-medium group-hover:underline">
                    Browse jobs →
                  </div>
                </button>
              );
            })}
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
