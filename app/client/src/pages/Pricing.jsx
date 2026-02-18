import { Check, CheckCircle, X, HelpCircle, Zap, TrendingUp, Building2, Crown, Bell, Sparkles, Shield, Smartphone, FileText, Users, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useState, useEffect, useMemo } from 'react';

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
      { text: 'Transparency tools (if eligible)', included: true },
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
      { text: 'Transparency tools (if eligible)', included: true },
      { text: 'Email notifications', included: true },
      { text: '"Transparent Employer" badge (opt-in)', included: true },
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
    description: 'Best value for active recruiters — with transparency tools',
    credits: ['20 job posting credits', '15 AI matching credits', '50 candidate search credits'],
    features: [
      { text: '20 job posting credits', included: true },
      { text: '15 AI matching credits', included: true },
      { text: '50 candidate searches', included: true },
      { text: 'Premium job listings', included: true },
      { text: 'Full transparency tools', included: true },
      { text: '"Transparent Employer" badge', included: true },
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
    description: 'For large organizations — includes full transparency compliance suite',
    credits: ['100 job posting credits', 'Unlimited AI matching', 'Unlimited candidate search'],
    features: [
      { text: '100 job posting credits', included: true },
      { text: 'Unlimited AI matching', included: true },
      { text: 'Unlimited candidate search', included: true },
      { text: 'Premium listings with priority', included: true },
      { text: 'Full transparency compliance tools', included: true },
      { text: 'Auditor access & reporting', included: true },
      { text: 'Enterprise AI screening', included: true },
      { text: 'Unlimited featured listings', included: true },
      { text: 'Custom analytics & reporting', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'API access', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

// ─── Agency Packages ───────────────────────────────────────────────

const agencyPackages = [
  {
    name: 'Agency Starter',
    icon: Users,
    price: '2,500',
    period: '/month',
    description: 'For new agencies building their client portfolio',
    features: [
      { text: '20 job postings/month', included: true },
      { text: '3 client companies', included: true },
      { text: 'Candidate search', included: true },
      { text: 'Client branding on jobs', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Unlimited clients', included: false },
      { text: 'Priority support', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Agency Pro',
    icon: Building2,
    price: '7,500',
    period: '/month',
    description: 'For established agencies with growing client base',
    features: [
      { text: '100 job postings/month', included: true },
      { text: 'Unlimited client companies', included: true },
      { text: 'Advanced candidate search', included: true },
      { text: 'Client branding on jobs', included: true },
      { text: 'Full analytics dashboard', included: true },
      { text: 'Priority support', included: true },
      { text: 'Bulk job import', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    cta: 'Get Pro',
    popular: true,
  },
  {
    name: 'Agency Enterprise',
    icon: Crown,
    price: 'Custom',
    period: '',
    description: 'Tailored solutions for large recruitment firms',
    features: [
      { text: 'Unlimited job postings', included: true },
      { text: 'Unlimited client companies', included: true },
      { text: 'Full candidate database', included: true },
      { text: 'White-label options', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'SLA & priority support', included: true },
      { text: 'API access', included: true },
      { text: 'Custom reporting', included: true },
    ],
    cta: 'Contact Us on WhatsApp',
    popular: false,
    isWhatsApp: true,
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
  { q: 'How do credits work?', a: 'Credits are prepaid — buy a package, get credits instantly (after payment verification). Use 1 credit per job posting. Credits never expire until the annual reset. No recurring charges.' },
  { q: 'Do credits really never expire?', a: 'Credits persist for 24 months of account inactivity. As long as you log in or use the platform at least once every 2 years, your credits never expire.' },
  { q: 'Can I try before I buy?', a: 'Yes! Every account gets a free 14-day trial with credits included. No credit card required.' },
  { q: 'How do I pay?', a: "We accept bank transfers (BSP), mobile money, and cash. Credits are added within 24 hours of payment verification." },
  { q: 'Is it free for job seekers?', a: 'Searching and applying for jobs is 100% free. Job alert packages are optional extras.' },
  { q: 'What are agency plans?', a: 'Agency plans are designed for recruitment agencies managing multiple client companies. You can post jobs on behalf of clients with their branding.' },
  { q: 'Do you offer refunds?', a: 'Unused credits can be refunded within 14 days of purchase. Contact support@wantokjobs.com.' },
];

// ─── Components ────────────────────────────────────────────────────

function PricingCard({ plan, linkBase = '/register?type=employer' }) {
  const IconComponent = plan.icon;
  return (
    <div className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${plan.popular ? 'ring-4 ring-primary-500' : ''}`}>
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold px-4 py-1 rounded-bl-lg">
          {plan.name.includes('Agency') ? 'MOST POPULAR' : 'BEST VALUE'}
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
            {plan.price !== 'Custom' ? (
              <>
                <span className="text-3xl font-bold text-gray-900">K{plan.price}</span>
                {plan.period && plan.period !== 'No cost' && <span className="text-gray-500 text-sm">{plan.period}</span>}
              </>
            ) : (
              <span className="text-3xl font-bold text-gray-900">Custom</span>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-sm">{plan.description}</p>
        {plan.credits && (
          <div className="mt-3 space-y-1">
            {plan.credits.map((credit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm font-medium text-primary-700 bg-primary-50 rounded px-2 py-1">
                <Sparkles className="w-3.5 h-3.5" /> {credit}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, idx) => {
            const text = typeof feature === 'string' ? feature : feature.text;
            const included = typeof feature === 'string' ? true : feature.included;
            return (
              <li key={idx} className="flex items-start gap-3">
                {included ? <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
                <span className={included ? 'text-gray-700' : 'text-gray-400'}>{text}</span>
              </li>
            );
          })}
        </ul>
        <Link
          to={plan.isWhatsApp ? 'https://wa.me/67570000000?text=I%27m%20interested%20in%20Agency%20Enterprise' : (plan.cta === 'Contact Sales' ? '/contact' : linkBase)}
          target={plan.isWhatsApp ? '_blank' : undefined}
          className={`block w-full py-3 px-6 rounded-lg font-semibold text-center transition ${
            plan.popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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

// ─── Interactive Price Calculator ──────────────────────────────────

function PriceCalculator() {
  const [jobCount, setJobCount] = useState(5);
  const [duration, setDuration] = useState(30);
  const [addons, setAddons] = useState({
    aiMatching: false,
    featured: false,
    candidateSearch: false,
    socialBoost: false,
  });

  const basePrice = useMemo(() => {
    // Price per job based on volume
    let perJob;
    if (jobCount <= 5) perJob = 100;
    else if (jobCount <= 20) perJob = 90;
    else if (jobCount <= 50) perJob = 80;
    else perJob = 75;

    // Duration multiplier
    const durationMultiplier = { 7: 0.5, 14: 0.7, 30: 1, 60: 1.5, 90: 1.8 }[duration] || 1;

    return Math.round(perJob * jobCount * durationMultiplier);
  }, [jobCount, duration]);

  const addonPrices = {
    aiMatching: 200,
    featured: 500,
    candidateSearch: 300,
    socialBoost: 400,
  };

  const addonTotal = useMemo(() => {
    return Object.entries(addons).reduce((sum, [key, on]) => sum + (on ? addonPrices[key] : 0), 0);
  }, [addons]);

  const total = basePrice + addonTotal;

  const toggleAddon = (key) => setAddons(a => ({ ...a, [key]: !a[key] }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-primary-600" />
        <h3 className="text-2xl font-bold text-gray-900">Build Your Custom Package</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Job count */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Number of Jobs: <span className="text-primary-600">{jobCount}</span>
            </label>
            <input
              type="range" min={1} max={100} value={jobCount}
              onChange={e => setJobCount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Posting Duration</label>
            <select
              value={duration} onChange={e => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          {/* Add-ons */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Add-ons</label>
            <div className="space-y-2">
              {[
                ['aiMatching', 'AI Matching', 200, 'Smart candidate-job matching'],
                ['featured', 'Featured Listings', 500, 'Top placement in search results'],
                ['candidateSearch', 'Candidate Search', 300, 'Browse candidate database'],
                ['socialBoost', 'Social Boost', 400, 'Promote on social media'],
              ].map(([key, label, price, desc]) => (
                <label key={key} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${addons[key] ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={addons[key]} onChange={() => toggleAddon(key)} className="w-4 h-4 text-primary-600 rounded" />
                    <div>
                      <span className="font-medium text-gray-900">{label}</span>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">+K{price.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-4">Your Quote</h4>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{jobCount} jobs × {duration} days</span>
              <span className="font-medium">K{basePrice.toLocaleString()}</span>
            </div>
            {Object.entries(addons).filter(([, on]) => on).map(([key]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {key === 'aiMatching' ? 'AI Matching' : key === 'featured' ? 'Featured Listings' : key === 'candidateSearch' ? 'Candidate Search' : 'Social Boost'}
                </span>
                <span className="font-medium">K{addonPrices[key].toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-300 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-primary-600">K{total.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-500">* All prices in PGK Kina. One-time payment.</p>
          </div>

          <div className="space-y-3">
            <Link to="/contact" className="block w-full py-3 bg-primary-600 text-white rounded-lg font-semibold text-center hover:bg-primary-700 transition">
              Get Quote
            </Link>
            <a
              href={`https://wa.me/67570000000?text=${encodeURIComponent(`Hi, I'd like a quote for ${jobCount} jobs, ${duration} days. Total: K${total.toLocaleString()}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-center hover:bg-green-700 transition"
            >
              Contact Us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function Pricing() {
  const [tab, setTab] = useState('employer');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStats(d.data || d)).catch(() => {});
  }, []);

  const formatCount = (n) => {
    if (!n) return '0';
    if (n >= 1000) return Math.floor(n / 1000).toLocaleString() + 'K+';
    return n.toLocaleString() + '+';
  };

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
              {[['14-day free trial', Check], ['No credit card required', Check], ['14-day money-back guarantee', Shield], ['Credits persist for 24 months', Check]].map(([text, Icon], i) => (
                <div key={i} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <Icon className="w-5 h-5" /><span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transparency Notice for Public Sector */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 py-12 border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-sm p-8 border-l-4 border-green-500">
              <div className="flex items-start gap-4">
                <Shield className="w-12 h-12 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Government & Public Sector Employers
                  </h3>
                  <p className="text-gray-700 mb-4">
                    <strong>Transparency tools are included FREE</strong> for all government departments, SOEs, NGOs, 
                    statutory authorities, and publicly listed companies. All plans include full transparency compliance features.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Hiring panel declaration & conflict of interest management
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Selection criteria disclosure & transparency scoring
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      Public hiring outcome statistics & auditor access
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-white py-12 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-500 mb-8">Trusted by PNG's leading employers — including 69 government bodies</p>
            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{stats ? formatCount(stats.totalEmployers) : '...'}</div>
                <p className="text-gray-600">Active Employers</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{stats ? formatCount(stats.totalJobseekers) : '...'}</div>
                <p className="text-gray-600">Job Seekers</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{stats ? formatCount(stats.activeJobs) : '...'}</div>
                <p className="text-gray-600">Active Jobs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
              {['employer', 'agency', 'jobseeker', 'custom'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2.5 rounded-md font-semibold transition text-sm ${tab === t ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {t === 'employer' ? 'Employers' : t === 'agency' ? 'Agencies' : t === 'jobseeker' ? 'Job Seekers' : 'Build Custom'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Employer Packages */}
        {tab === 'employer' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {employerPackages.map((plan, idx) => <PricingCard key={idx} plan={plan} />)}
            </div>

            {/* How Credits Work */}
            <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How Credits Work</h3>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  ['1', 'Buy a Package', 'Choose a credit package and pay via bank transfer, mobile money, or cash. No recurring charges.'],
                  ['2', 'Credits Added', 'Once payment is verified (within 24 hours), credits are added to your account instantly.'],
                  ['3', 'Use When Ready', 'Use 1 credit per job post. Credits persist until used — buy more anytime you need them.'],
                ].map(([num, title, desc]) => (
                  <div key={num} className="text-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary-600">{num}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
                    <p className="text-gray-600 text-sm">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
              <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Flexible Payment Options</h3>
              <p className="text-center text-gray-600 mb-8">Pay the way that works for you</p>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  [Building2, 'Bank Transfer', 'BSP, Westpac, ANZ', 'Verified within 24 hours'],
                  [Smartphone, 'Mobile Money', 'Moni Plus, True Money', 'Instant confirmation'],
                  [FileText, 'Company Invoice', 'NET30 for businesses', 'Registered companies only'],
                ].map(([Icon, title, desc, sub], i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-8 h-8 text-primary-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
                    <p className="text-sm text-gray-600">{desc}</p>
                    <p className="text-xs text-gray-500 mt-1">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agency Packages */}
        {tab === 'agency' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Built for Recruitment Agencies</h3>
              <p className="text-gray-600">Post jobs on behalf of your clients with their branding. Manage multiple companies from one dashboard.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {agencyPackages.map((plan, idx) => <PricingCard key={idx} plan={plan} linkBase="/register?type=employer&agency=true" />)}
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
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold px-4 py-1 rounded-bl-lg">POPULAR</div>
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
                    <Link to="/register?type=jobseeker" className={`block w-full py-2.5 rounded-lg font-semibold text-center transition ${pkg.popular ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                      {pkg.price === '0' ? 'Sign Up Free' : 'Get Started'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Calculator */}
        {tab === 'custom' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <PriceCalculator />
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            {faqs.map((faq, idx) => <FAQItem key={idx} question={faq.q} answer={faq.a} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Find Great Talent?</h2>
            <p className="text-xl text-primary-100 mb-8">Start with a free 14-day trial — no credit card, no commitment.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?type=employer" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Start Free Trial</Link>
              <Link to="/contact" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">Contact Sales</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
