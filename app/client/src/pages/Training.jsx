import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { training } from '../api';
import PageHead from '../components/PageHead';

export default function Training() {
  const [providers, setProviders] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = [
    'IT & Technology', 'Business & Management', 'Health & Safety',
    'Engineering', 'Education', 'Mining', 'Agriculture',
    'Finance & Accounting', 'Hospitality', 'Construction',
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [provData, courseData] = await Promise.all([
        training.getProviders().catch(() => ({ data: [] })),
        training.getCourses().catch(() => ({ data: [] })),
      ]);
      setProviders(provData.data || []);
      setCourses(courseData.data || []);
    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && c.category !== category) return false;
    return true;
  });

  const filteredProviders = providers.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && p.category !== category) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <PageHead
        title="Training & Courses in PNG"
        description="Discover training programs and courses in Papua New Guinea. Upskill with top providers and boost your career prospects."
      />
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 to-teal-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Training & Courses</h1>
          <p className="text-xl text-primary-100 mb-8">
            Upskill with training providers across Papua New Guinea
          </p>
          <div className="max-w-xl mx-auto flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses or providers..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-4 py-3 rounded-lg text-gray-900"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'courses'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📚 Courses ({filteredCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'providers'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🏫 Training Providers ({filteredProviders.length})
          </button>
        </div>

        {activeTab === 'courses' ? (
          filteredCourses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses available yet</h3>
              <p className="text-gray-600 mb-6">
                We're working on partnering with training providers across PNG.
                Check back soon or contact us to suggest a provider.
              </p>
              <Link to="/contact" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                Suggest a Provider
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{course.title}</h3>
                    <p className="text-sm text-primary-600 font-medium">{course.provider_name}</p>
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {course.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {course.category}
                      </span>
                    )}
                    {course.duration && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        ⏱️ {course.duration}
                      </span>
                    )}
                    {course.mode && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {course.mode === 'online' ? '🌐' : '📍'} {course.mode}
                      </span>
                    )}
                    {course.price > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                        💰 {course.currency} {course.price.toLocaleString()}
                      </span>
                    )}
                    {(course.price === 0 || !course.price) && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        Free
                      </span>
                    )}
                  </div>
                  {course.url && (
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
                    >
                      Learn More →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          filteredProviders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🏫</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No training providers listed yet</h3>
              <p className="text-gray-600 mb-6">
                Are you a training provider in PNG? List your institution for free!
              </p>
              <Link to="/contact" className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
                Register as Provider
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map(provider => (
                <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                  <div className="flex items-start gap-4 mb-4">
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt={provider.name} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-xl">
                        {provider.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{provider.name}</h3>
                      {provider.location && <p className="text-sm text-gray-500">📍 {provider.location}</p>}
                      {provider.category && <p className="text-sm text-primary-600">{provider.category}</p>}
                    </div>
                  </div>
                  {provider.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{provider.description}</p>
                  )}
                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      🌐 Visit Website →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-primary-50 to-teal-50 rounded-xl p-8 border border-primary-200 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Are you a training provider?</h2>
          <p className="text-gray-600 mb-6">
            List your courses on WantokJobs and reach thousands of job seekers looking to upskill.
            It's completely free!
          </p>
          <Link
            to="/contact"
            className="inline-block px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
          >
            Partner With Us
          </Link>
        </div>
      </div>
    </div>
  );
}
