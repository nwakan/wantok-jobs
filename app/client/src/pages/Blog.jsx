import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, User, Tag, ArrowRight, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PageHead from '../components/PageHead';
import SkeletonLoader from '../components/SkeletonLoader';
import api from '../api';
import OptimizedImage from '../components/OptimizedImage';

export default function Blog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    'All',
    'Career Advice',
    'Job Search Tips',
    'Industry News',
    'Company Culture',
    'Resume Writing',
    'Interview Tips',
    'PNG Employment',
  ];

  useEffect(() => {
    fetchArticles();
  }, [page, selectedCategory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', page);
      params.append('limit', 9);

      const response = await api.get(`/articles?${params.toString()}`);
      setArticles(response.articles || response.data?.articles || []);
      setTotalPages(response.totalPages || response.data?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      // Fallback to mock data
      setArticles(getMockArticles());
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchArticles();
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category === 'All' ? '' : category);
    setPage(1);
  };

  return (
    <>
      <PageHead
        title="Career Blog"
        description="Expert career advice, job search tips, and industry insights for job seekers in Papua New Guinea."
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">WantokJobs Blog</h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto text-center">
              Career advice, job search tips, and industry insights to help you succeed in Papua New Guinea's job market.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search and Categories */}
          <div className="mb-8">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    (category === 'All' && !selectedCategory) || category === selectedCategory
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <SkeletonLoader variant="card" className="h-48" />
                  <div className="p-6 space-y-3">
                    <SkeletonLoader variant="title" />
                    <SkeletonLoader />
                    <SkeletonLoader className="w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => navigate(`/blog/${article.slug}`)}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
                  >
                    {/* Featured Image */}
                    <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center overflow-hidden">
                      {article.image ? (
                        <OptimizedImage src={article.image} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-6xl">📝</div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Category */}
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-primary-600" />
                        <span className="text-sm font-medium text-primary-600">{article.category}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition line-clamp-2">
                        {article.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{article.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
                        </div>
                      </div>

                      {/* Read More */}
                      <div className="mt-4 flex items-center gap-2 text-primary-600 font-medium group-hover:gap-3 transition-all">
                        <span>Read more</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    {[...Array(totalPages)].map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPage(idx + 1)}
                        className={`w-10 h-10 rounded-lg font-medium ${
                          page === idx + 1
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600">Try adjusting your search or filter.</p>
            </div>
          )}

          {/* Newsletter CTA */}
          <div className="mt-16 bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">Stay Updated</h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Subscribe to our newsletter and get the latest career tips, job search advice, and industry news delivered to your inbox.
            </p>
            <form className="max-w-md mx-auto flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900"
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
      </div>
    </>
  );
}

// Mock data fallback
function getMockArticles() {
  return [
    {
      id: 1,
      slug: 'how-to-write-perfect-cv-png',
      title: 'How to Write the Perfect CV for PNG Employers',
      excerpt: 'Learn the essential tips for creating a CV that stands out to Papua New Guinea employers. From formatting to content, we cover everything you need to know.',
      category: 'Resume Writing',
      author: 'Sarah Johnson',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      slug: 'top-10-interview-tips',
      title: 'Top 10 Interview Tips That Actually Work',
      excerpt: 'Master your next job interview with these proven strategies. From preparation to follow-up, learn what really impresses employers.',
      category: 'Interview Tips',
      author: 'Michael Kila',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 3,
      slug: 'mining-jobs-png-guide',
      title: 'Complete Guide to Mining Jobs in PNG',
      excerpt: 'Explore the thriving mining sector in Papua New Guinea. Learn about opportunities, requirements, and how to land your dream mining job.',
      category: 'Industry News',
      author: 'David Pato',
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      id: 4,
      slug: 'career-change-guide',
      title: 'Making a Career Change: A Step-by-Step Guide',
      excerpt: 'Thinking about switching careers? This comprehensive guide will help you navigate the transition successfully.',
      category: 'Career Advice',
      author: 'Lisa Toka',
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      id: 5,
      slug: 'salary-negotiation-png',
      title: 'How to Negotiate Your Salary in PNG',
      excerpt: 'Master the art of salary negotiation with these practical tips tailored for the PNG job market.',
      category: 'Career Advice',
      author: 'John Aisi',
      publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    },
    {
      id: 6,
      slug: 'remote-work-opportunities',
      title: 'Remote Work Opportunities in Papua New Guinea',
      excerpt: 'Discover how remote work is changing the employment landscape in PNG and how you can take advantage of it.',
      category: 'Job Search Tips',
      author: 'Emma Wari',
      publishedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
    },
  ];
}
