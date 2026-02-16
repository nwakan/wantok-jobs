import { Check, X, HelpCircle, Zap, TrendingUp, Building2, Crown, Bell, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useState, useEffect } from 'react';

// ─── Employer Packages ─────────────────────────────────────────────

const employerPackages = [
  {
    name: 'Free',
    icon: Zap,
    price: '0',
    period: 'No cost',
    description: 'Get started — post your first job at no cost',
    credits: ['1 active job posting', 'Basic job listing', '30-day posting duration'],
    features: [
      { text: '1 active job posting', included: true },
      { text: 'Basic job listing', included: true },
      { text: 'Email notifications', included: true },
      { text: 'AI matching credits', included: false },
      { text: 'Candidate search credits', included: false },
      { text: 'Featured listings', included: false },
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Starter Pack',
    icon: TrendingUp,
    price: '500',
    period: 'one-time',
    description: 'Perfect for small businesses with occasional hiring',
    credits: ['5 job posting credits', '3 AI matching credits', '10 candidate search credits'],
    features: [
      { text: '5 job posting credits', included: true },
      { text: '3 AI matching credits', included: true },
      { text: '10 candidate searches', included: true },
      { text: 'Enhanced job listings', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Featured listings', included: false },
    ],
    cta: 'Buy Starter Pack',
    popular: false,
  },
  {
    name: 'Pro Pack',
    icon: Building2,
    price: '1,800',
    period: 'one-time',
    description: 'Best value for active recruiters',
    credits: ['20 job posting credits', '15 AI matching credits', '50 candidate search credits'],
    features: [
      { text: '20 job posting credits', included: true },
      { text: '15 AI matching credits', included: true },
      { text: '50 candidate searches', included: true },
      { text: 'Premium job listings', included: true },
      { text: 'AI-powered screening', included: true },
      { text: 'Featured job listings', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Priority support', included: true },
    ],
    cta: 'Buy Pro Pack',
    popular: true,
  },
  {
    name: 'Enterprise Pack',
    icon: Crown,
    price: '7,500',
    period: 'one-time',
    description: 'For large organizations with high-volume hiring',
    credits: ['100 job posting credits', 'Unlimited AI matching', 'Unlimited candidate search'],
    features: [
      { text: '100 job posting credits', included: true },
      { text: 'Unlimited AI matching', included: true },
      { text: 'Unlimited candidate search', included: true },
      { text: 'Premium listings with priority', included: true },
      { text: 'Enterprise AI screening', included: true },
      { text: 'Unlimited featured listings', included: true },
      { text: 'Custom analytics & reporting', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'API access', included: true },
    ],
    cta: 'Buy Enterprise Pack',
    popular: false,
  },
];

// ─── Jobseeker Packages ────────────────────────────────────────────

const jobseekerPackages = [
  {
    name: 'Free',
    icon: Zap,
    price: '0',
    period: 'No cost',
    description: 'Search and apply to unlimited jobs for free',
    features: ['Unlimited job search', 'Unlimited applications', 'Basic profile', 'Email notifications'],
  },
  {
    name: 'Starter Alert Pack',
    icon: Bell,
    price: '20',
    period: 'one-time',
    description: '50 job alert credits — get notified first',
    features: ['50 job alert credits', 'Instant match notifications', 'Custom alert filters', 'SMS + Email alerts'],
  },
  {
    name: 'Pro Alert Pack',
    icon: Sparkles,
    price: '60',
    period: 'one-time',
    description: '200 alerts + auto-apply for busy professionals',
    features: ['200 job alert credits', 'Auto-apply feature', 'Priority notifications', 'All alert channels'],
    popular: true,
  },
  {
    name: 'Premium Alert Pack',
    icon: Crown,
    price: '120',
    period: 'one-time',
    description: '500 alerts for power users',
    features: ['500 job alert credits', 'Auto-apply feature', 'Priority notifications', 'Dedicated support'],
  },
];

const faqs = [
  {
    q: 'How do credits work?',
    a: 'Credits are prepaid — buy a package, get credits instantly (after payment verification). Use 1 credit per job posting. Credits never expire until the annual reset. No recurring charges.',
  },
  {
    q: 'What is the annual credit reset?',
    a: 'Unused credits reset to zero once per year (January 1st). This encourages active use of the platform. Premium trial users are exempt from resets.',
  },
  {
    q: 'Can I try before I buy?',
    a: 'Yes! Every account gets a free 14-day trial with credits included. Employers get 3 job posting credits, 2 AI matching credits, and 5 candidate search credits. No credit card required.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept bank transfers (BSP), mobile money, and cash. After placing an order, you\'ll receive bank transfer details with your invoice number. Credits are added within 24 hours of payment verification.',
  },
  {
    q: 'What happens when I run out of credits?',
    a: 'You can always buy more credits! Your existing job postings remain active. You just need credits to post new jobs or use premium features like AI matching.',
  },
  {
    q: 'Is it free for job seekers?',
    a: 'Searching and applying for jobs is 100% free. Job alert packages are optional — they give you instant notifications when jobs matching your criteria are posted.',
  },
  {
    q: 'What is AI matching?',
    a: 'Our AI analyzes candidate profiles against your job requirements and scores them by fit. It helps you find the best candidates faster. Each AI match uses 1 credit.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Unused credits can be refunded within 14 days of purchase. Contact support@wantokjobs.com with your invoice number.',
  },
];

function EmployerPricingCard({ plan }) {
  const IconComponent = plan.icon;
  
  return (
    <div className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${plan.popular ? 'ring-4 ring-primary-500' : ''}`}>
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold px-4 py-1 rounded-bl-lg">
          BEST VALUE
        </div>
      )}
      
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary-100' : 'bg-gray-100'}`}>
            <IconComponent className={`w-6 h-6 ${plan.popular ? 'text-primary-600' : 'text-gray-600'}`} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        </div>
        
        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">K{plan.price}</span>
            {plan.period !== 'No cost' && <span className="text-gray-500 text-sm">{plan.period}</span>}
          </div>
        </div>
        
        <p className="text-gray-600 text-sm">{plan.description}</p>

        {plan.credits && (
          <div className="mt-3 space-y-1">
            {plan.credits.map((credit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm font-medium text-primary-700 bg-primary-50 rounded px-2 py-1">
                <Sparkles className="w-3.5 h-3.5" />
                {credit}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              {feature.included ? (
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>
        
        <Link
          to={plan.name === 'Enterprise Pack' ? '/contact' : '/register?type=employer'}
          className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition ${
            plan.popular
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          {plan.cta}
        </Link>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex items-center justify-between text-left hover:text-primary-600 transition">
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <HelpCircle className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-4 text-gray-600">{answer}</div>}
    </div>
  );
}

export default function Pricing() {
  const [tab, setTab] = useState('employer');

  return (
    <>
      <PageHead title="Pricing — Credit Packages" description="Buy credits as you need them. No monthly subscriptions, no recurring charges. Pay-as-you-go pricing for PNG employers and job seekers." />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Buy Credits, Post Jobs</h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              No monthly subscriptions. No recurring charges. Buy credits when you need them — they persist until used.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Check className="w-5 h-5" />
                <span>14-day free trial</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Check className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Check className="w-5 h-5" />
                <span>Credits never expire*</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
              <button
                onClick={() => setTab('employer')}
                className={`px-6 py-2.5 rounded-md font-semibold transition ${tab === 'employer' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                For Employers
              </button>
              <button
                onClick={() => setTab('jobseeker')}
                className={`px-6 py-2.5 rounded-md font-semibold transition ${tab === 'jobseeker' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                For Job Seekers
              </button>
            </div>
          </div>
        </div>

        {/* Employer Packages */}
        {tab === 'employer' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {employerPackages.map((plan, idx) => (
                <EmployerPricingCard key={idx} plan={plan} />
              ))}
            </div>

            {/* How Credits Work */}
            <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How Credits Work</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-600">1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Buy a Package</h4>
                  <p className="text-gray-600 text-sm">Choose a credit package and pay via bank transfer, mobile money, or cash. No recurring charges.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-600">2</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Credits Added</h4>
                  <p className="text-gray-600 text-sm">Once payment is verified (within 24 hours), credits are added to your account instantly.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-600">3</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Use When Ready</h4>
                  <p className="text-gray-600 text-sm">Use 1 credit per job post. Credits persist until used — buy more anytime you need them.</p>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="mt-12 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Compare Packages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-900">Free</th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-900">Starter</th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-900 bg-primary-50">Pro</th>
                        <th className="text-center py-4 px-4 font-semibold text-gray-900">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-700">Job Posting Credits</td>
                        <td className="text-center py-3 px-4">1 active</td>
                        <td className="text-center py-3 px-4">5</td>
                        <td className="text-center py-3 px-4 bg-primary-50 font-semibold">20</td>
                        <td className="text-center py-3 px-4">100</td>
                      </tr>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">AI Matching Credits</td>
                        <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                        <td className="text-center py-3 px-4">3</td>
                        <td className="text-center py-3 px-4 bg-primary-50 font-semibold">15</td>
                        <td className="text-center py-3 px-4">Unlimited</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-700">Candidate Searches</td>
                        <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                        <td className="text-center py-3 px-4">10</td>
                        <td className="text-center py-3 px-4 bg-primary-50 font-semibold">50</td>
                        <td className="text-center py-3 px-4">Unlimited</td>
                      </tr>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">Price</td>
                        <td className="text-center py-3 px-4 font-bold">Free</td>
                        <td className="text-center py-3 px-4 font-bold">K500</td>
                        <td className="text-center py-3 px-4 bg-primary-50 font-bold text-primary-600">K1,800</td>
                        <td className="text-center py-3 px-4 font-bold">K7,500</td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-700">Cost per Job Post</td>
                        <td className="text-center py-3 px-4">Free (1 only)</td>
                        <td className="text-center py-3 px-4">~K100</td>
                        <td className="text-center py-3 px-4 bg-primary-50 font-semibold text-primary-600">~K90</td>
                        <td className="text-center py-3 px-4">~K75</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Jobseeker Packages */}
        {tab === 'jobseeker' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="mb-8 bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Job searching is 100% free!</h3>
              <p className="text-gray-600">Search jobs, create your profile, and apply to unlimited positions at no cost. Alert packages are optional extras for faster notifications.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {jobseekerPackages.map((pkg, idx) => (
                <div key={idx} className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${pkg.popular ? 'ring-4 ring-primary-500' : ''}`}>
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold px-4 py-1 rounded-bl-lg">
                      POPULAR
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${pkg.popular ? 'bg-primary-100' : 'bg-gray-100'}`}>
                        <pkg.icon className={`w-6 h-6 ${pkg.popular ? 'text-primary-600' : 'text-gray-600'}`} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-gray-900">K{pkg.price}</span>
                      {pkg.period !== 'No cost' && <span className="text-gray-500 text-sm">{pkg.period}</span>}
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                    <ul className="space-y-2 mb-6">
                      {pkg.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/register?type=jobseeker"
                      className={`block w-full py-2.5 rounded-lg font-semibold text-center transition ${pkg.popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                    >
                      {pkg.price === '0' ? 'Sign Up Free' : 'Get Started'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.q} answer={faq.a} />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">* Credits reset annually on January 1st. Premium trial users are exempt.</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Great Talent?</h2>
            <p className="text-xl text-primary-100 mb-8">Start with a free 14-day trial — no credit card, no commitment. Buy credits only when you're ready.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?type=employer" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Start Free Trial
              </Link>
              <Link to="/contact" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
