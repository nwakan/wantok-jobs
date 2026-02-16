import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Tag, ArrowLeft, Share2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import PageHead from '../components/PageHead';
import api from '../api';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/articles/${slug}`);
      setArticle(response.data.article);
      setRelatedArticles(response.data.related || []);
    } catch (error) {
      console.error('Failed to fetch article:', error);
      // Fallback to mock data
      setArticle(getMockArticle());
      setRelatedArticles(getMockRelated());
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Article Not Found</h2>
          <p className="text-gray-600 mb-6">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title={article.title}
        description={article.excerpt}
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Back Button */}
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>

              <article className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Featured Image */}
                {article.image && (
                  <div className="h-96 overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-8">
                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-4 h-4 text-primary-600" />
                    <Link
                      to={`/blog?category=${encodeURIComponent(article.category)}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {article.category}
                    </Link>
                  </div>

                  {/* Title */}
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{article.title}</h1>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>By <strong>{article.author}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(article.publishedAt), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{article.readTime || '5 min'} read</span>
                    </div>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 text-primary-600 hover:text-primary-700 ml-auto"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>

                  {/* Article Content */}
                  <div className="prose prose-lg max-w-none">
                    {article.content ? (
                      <div dangerouslySetInnerHTML={{ __html: article.content }} />
                    ) : (
                      <>
                        <p className="text-gray-700 leading-relaxed mb-6">
                          {article.excerpt}
                        </p>
                        <p className="text-gray-700 leading-relaxed mb-6">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                          Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Key Takeaways</h2>
                        <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
                          <li>Understanding the local job market is essential for success</li>
                          <li>Networking plays a crucial role in finding opportunities</li>
                          <li>Tailoring your application materials to each position increases your chances</li>
                          <li>Continuous learning and skill development are key differentiators</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mb-6">
                          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Final Thoughts</h2>
                        <p className="text-gray-700 leading-relaxed mb-6">
                          The job market in Papua New Guinea is dynamic and full of opportunities for those who are prepared. 
                          By following these guidelines and staying informed, you'll be well-positioned to advance your career.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-gray-200">
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Author Bio */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">About {article.author}</h4>
                        <p className="text-sm text-gray-600">
                          {article.authorBio || `${article.author} is a career expert and writer at WantokJobs, helping job seekers across Papua New Guinea advance their careers.`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      {relatedArticles.map((related) => (
                        <button
                          key={related.id}
                          onClick={() => navigate(`/blog/${related.slug}`)}
                          className="block text-left group"
                        >
                          <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition mb-1 line-clamp-2">
                            {related.title}
                          </h4>
                          <p className="text-sm text-gray-500">{related.category}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Newsletter CTA */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-bold mb-3">Get Career Tips Weekly</h3>
                  <p className="text-primary-100 text-sm mb-4">
                    Subscribe to our newsletter for the latest job search advice and career insights.
                  </p>
                  <form className="space-y-2">
                    <input
                      type="email"
                      placeholder="Your email"
                      className="w-full px-4 py-2 rounded-lg text-gray-900"
                    />
                    <button
                      type="submit"
                      className="w-full bg-white text-primary-600 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>

                {/* Job Alert CTA */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Looking for a Job?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a job alert and be the first to know about new opportunities.
                  </p>
                  <Link
                    to="/dashboard"
                    className="block w-full bg-primary-600 text-white text-center py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    Create Job Alert
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Mock data fallback
function getMockArticle() {
  return {
    id: 1,
    slug: 'how-to-write-perfect-cv-png',
    title: 'How to Write the Perfect CV for PNG Employers',
    excerpt: 'Learn the essential tips for creating a CV that stands out to Papua New Guinea employers. From formatting to content, we cover everything you need to know.',
    category: 'Resume Writing',
    author: 'Sarah Johnson',
    authorBio: 'Sarah Johnson is a career coach and resume expert with over 10 years of experience helping professionals in Papua New Guinea land their dream jobs.',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    readTime: '8 min',
    tags: ['CV', 'Resume', 'Job Search', 'Career Tips', 'PNG Jobs'],
  };
}

function getMockRelated() {
  return [
    {
      id: 2,
      slug: 'top-10-interview-tips',
      title: 'Top 10 Interview Tips That Actually Work',
      category: 'Interview Tips',
    },
    {
      id: 3,
      slug: 'career-change-guide',
      title: 'Making a Career Change: A Step-by-Step Guide',
      category: 'Career Advice',
    },
    {
      id: 4,
      slug: 'salary-negotiation-png',
      title: 'How to Negotiate Your Salary in PNG',
      category: 'Career Advice',
    },
  ];
}
