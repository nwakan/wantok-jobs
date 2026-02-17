import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Briefcase, Building2, User, HelpCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

const categories = [
  {
    id: 'jobseekers',
    title: 'For Jobseekers',
    icon: Briefcase,
    color: 'bg-blue-100 text-blue-600',
    articles: [
      { q: 'How do I apply for a job?', a: 'Find a job you\'re interested in using the search bar or browsing categories. Click on the job to view details, then click "Apply Now". You\'ll need to be logged in. Upload your CV or use your WantokJobs profile, write a cover letter, and submit your application.' },
      { q: 'How do I set up job alerts?', a: 'Go to your Dashboard → Job Alerts. Click "Create Alert" and set your preferred job title, location, industry, and salary range. You\'ll receive email notifications when matching jobs are posted. You can create multiple alerts and manage them anytime.' },
      { q: 'How do I build a resume on WantokJobs?', a: 'Navigate to Dashboard → Resume Builder. Our step-by-step builder helps you create a professional resume. Fill in your personal details, work experience, education, and skills. You can download your resume as a PDF or use it directly when applying for jobs.' },
      { q: 'How do I track my applications?', a: 'Go to Dashboard → My Applications to see all jobs you\'ve applied for. Each application shows its current status: Submitted, Under Review, Shortlisted, Interview, or Rejected. You\'ll also receive email notifications when your application status changes.' },
      { q: 'How do I save jobs for later?', a: 'Click the bookmark/heart icon on any job listing to save it. View all your saved jobs from Dashboard → Saved Jobs. Saved jobs are stored in your account so you can access them from any device.' },
      { q: 'How do I get job recommendations?', a: 'Complete your profile with your skills, experience, and preferences. Our system will automatically suggest relevant jobs based on your profile. Visit Dashboard → Recommendations to see personalized job matches.' },
    ],
  },
  {
    id: 'employers',
    title: 'For Employers',
    icon: Building2,
    color: 'bg-green-100 text-green-600',
    articles: [
      { q: 'How do I post a job?', a: 'Log in to your employer account and go to Dashboard → Post a Job. Fill in the job title, description, requirements, salary range, and location. Choose a posting package (or use available credits), review the preview, and publish. Your job will be live and visible to jobseekers immediately.' },
      { q: 'How do I review applicants?', a: 'Go to Dashboard → My Jobs and click on the job listing. You\'ll see all applications with candidate profiles, CVs, and cover letters. You can filter by status, rate candidates, add notes, and change application statuses (Shortlist, Interview, Reject, etc.).' },
      { q: 'How do I use credits?', a: 'Credits are used to post jobs and access premium features. Purchase credits from Dashboard → Credits/Billing. Each job posting uses a set number of credits depending on the package (Standard, Featured, Premium). Featured jobs appear at the top of search results for more visibility.' },
      { q: 'How do I manage my company profile?', a: 'Go to Dashboard → Company Profile. Add your company logo, description, industry, size, and website. A complete company profile builds trust with jobseekers and increases application rates. Jobseekers can also follow your company for updates.' },
      { q: 'How do I message candidates?', a: 'From the applicant\'s profile or application page, click "Send Message". You can communicate directly with candidates through WantokJobs messaging. All conversations are saved in Dashboard → Messages.' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Settings',
    icon: User,
    color: 'bg-purple-100 text-purple-600',
    articles: [
      { q: 'How do I reset my password?', a: 'Click "Login" then "Forgot Password". Enter the email address associated with your account. You\'ll receive a password reset link via email. Click the link and create a new password. The link expires after 1 hour for security.' },
      { q: 'How do I verify my email address?', a: 'After registering, check your inbox for a verification email from WantokJobs. Click the verification link to activate your account. If you didn\'t receive it, log in and click "Resend Verification Email" from your dashboard. Check your spam/junk folder too.' },
      { q: 'How do I complete my profile?', a: 'Go to Dashboard → Profile. Fill in all sections: personal information, work experience, education, skills, and upload a profile photo. A complete profile increases your chances of being noticed by employers. Aim for 100% profile completion.' },
      { q: 'How do I change my email or phone number?', a: 'Go to Dashboard → Settings → Account. Update your email or phone number. If you change your email, you\'ll need to verify the new address. For security reasons, you may be asked to confirm your current password.' },
      { q: 'How do I delete my account?', a: 'Go to Dashboard → Settings → Account and scroll to "Delete Account". This action is permanent and will remove all your data including applications, saved jobs, and messages. We recommend downloading your data first. Contact support if you need assistance.' },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState('');
  const [openArticle, setOpenArticle] = useState(null);

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
        a.q.toLowerCase().includes(search.toLowerCase()) ||
        a.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.articles.length > 0);

  const toggleArticle = (key) => setOpenArticle(openArticle === key ? null : key);

  return (
    <>
      <PageHead title="Help Center" description="Find answers to common questions about using WantokJobs for job searching, hiring, and managing your account." />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-primary-100 rounded-full mb-4">
              <HelpCircle className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about using WantokJobs
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
            />
          </div>

          {/* Categories */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No articles found for "{search}"</p>
              <p className="text-gray-400">Try a different search term or <Link to="/contact" className="text-primary-600 hover:underline">contact us</Link> for help.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                      <div className={`p-2 rounded-lg ${cat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">{cat.title}</h2>
                      <span className="ml-auto text-sm text-gray-400">{cat.articles.length} articles</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {cat.articles.map((article, i) => {
                        const key = `${cat.id}-${i}`;
                        const isOpen = openArticle === key;
                        return (
                          <div key={key}>
                            <button
                              onClick={() => toggleArticle(key)}
                              className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition"
                            >
                              <span className={`font-medium ${isOpen ? 'text-primary-700' : 'text-gray-900'}`}>{article.q}</span>
                              {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />}
                            </button>
                            {isOpen && (
                              <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                                {article.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Still need help CTA */}
          <div className="mt-12 bg-primary-50 border border-primary-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Still need help?</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Can't find what you're looking for? Our support team is ready to assist you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-700 transition"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Support
              </Link>
              <a
                href="https://wa.me/67583460582"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition"
              >
                <MessageSquare className="w-5 h-5" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
