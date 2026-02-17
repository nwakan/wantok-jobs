import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Tag, ArrowLeft, Share2, Clock, Facebook, Twitter, Linkedin, Link as LinkIcon, Check } from 'lucide-react';
import { format } from 'date-fns';
import PageHead from '../components/PageHead';
import api from '../api';
import OptimizedImage from '../components/OptimizedImage';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    fetchArticle();
  }, [slug]);
  
  useEffect(() => {
    if (article && contentRef.current) {
      generateTableOfContents();
      setupScrollSpy();
    }
  }, [article]);

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
  
  const generateTableOfContents = () => {
    const content = contentRef.current;
    if (!content) return;
    
    const headings = content.querySelectorAll('h2, h3');
    const toc = Array.from(headings).map((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
      return {
        id,
        text: heading.textContent,
        level: heading.tagName.toLowerCase(),
      };
    });
    
    setTableOfContents(toc);
  };
  
  const setupScrollSpy = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );
    
    const headings = contentRef.current?.querySelectorAll('h2, h3');
    headings?.forEach((heading) => observer.observe(heading));
    
    return () => observer.disconnect();
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
  
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };
  
  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(article.title)}`, '_blank');
  };
  
  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
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
                    <OptimizedImage src={article.image} alt={article.title} className="w-full h-full object-cover" eager />
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
                  </div>
                  
                  {/* Social Share Buttons */}
                  <div className="mb-8 pb-8 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Share this article:</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={shareOnFacebook}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Facebook className="w-4 h-4" />
                        Facebook
                      </button>
                      <button
                        onClick={shareOnTwitter}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </button>
                      <button
                        onClick={shareOnLinkedIn}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </button>
                      <button
                        onClick={copyLink}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        {linkCopied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        {linkCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  {/* Article Content */}
                  <div ref={contentRef} className="prose prose-lg max-w-none">
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
                {/* Table of Contents */}
                {tableOfContents.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      📖 Table of Contents
                    </h3>
                    <nav className="space-y-2 text-sm">
                      {tableOfContents.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={`block py-1 transition-colors ${
                            item.level === 'h3' ? 'pl-4' : ''
                          } ${
                            activeSection === item.id
                              ? 'text-primary-600 font-medium'
                              : 'text-gray-600 hover:text-primary-600'
                          }`}
                        >
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}
                
                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4">📚 Related Articles</h3>
                    <div className="space-y-4">
                      {relatedArticles.map((related) => (
                        <button
                          key={related.id}
                          onClick={() => navigate(`/blog/${related.slug}`)}
                          className="block text-left group w-full"
                        >
                          <h4 className="font-medium text-gray-900 group-hover:text-primary-600 transition mb-1 line-clamp-2 text-sm">
                            {related.title}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {related.category}
                          </p>
                        </button>
                      ))}
                    </div>
                    <Link
                      to="/blog"
                      className="block mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View all articles →
                    </Link>
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
