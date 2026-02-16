import { Check, X, HelpCircle, Zap, TrendingUp, Building2, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useState } from 'react';

const plans = [
  {
    name: 'Free',
    icon: Zap,
    price: '0',
    period: 'Forever',
    description: 'Perfect for small businesses trying out our platform',
    features: [
      { text: '1 active job posting', included: true },
      { text: 'Basic job listing', included: true },
      { text: '30-day posting duration', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Basic analytics', included: false },
      { text: 'AI-powered screening', included: false },
      { text: 'Featured listings', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    icon: TrendingUp,
    price: '2,500',
    period: 'per month',
    description: 'Great for growing companies with regular hiring needs',
    features: [
      { text: '5 active job postings', included: true },
      { text: 'Enhanced job listings', included: true },
      { text: '60-day posting duration', included: true },
      { text: 'Email & SMS notifications', included: true },
      { text: 'AI-powered candidate screening', included: true },
      { text: 'Candidate search access', included: true },
      { text: 'Standard analytics', included: true },
      { text: 'Featured listings', included: false },
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    icon: Building2,
    price: '7,500',
    period: 'per month',
    description: 'Best for established companies with ongoing recruitment',
    features: [
      { text: '20 active job postings', included: true },
      { text: 'Premium job listings', included: true },
      { text: '90-day posting duration', included: true },
      { text: 'Email, SMS & WhatsApp alerts', included: true },
      { text: 'Advanced AI screening', included: true },
      { text: 'Unlimited candidate search', included: true },
      { text: 'Featured job listings (5/month)', included: true },
      { text: 'Advanced analytics & reports', included: true },
      { text: 'Priority customer support', included: true },
      { text: 'Company profile verification badge', included: true },
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    icon: Crown,
    price: '20,000',
    period: 'per month',
    description: 'For large organizations with complex hiring requirements',
    features: [
      { text: 'Unlimited job postings', included: true },
      { text: 'Premium listings with priority', included: true },
      { text: 'Extended posting durations', included: true },
      { text: 'Multi-channel notifications', included: true },
      { text: 'Enterprise AI screening & matching', included: true },
      { text: 'Advanced candidate search & filters', included: true },
      { text: 'Unlimited featured listings', included: true },
      { text: 'Custom analytics & reporting', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'API access for integration', included: true },
      { text: 'Custom branding options', included: true },
      { text: '24/7 priority support', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const faqs = [
  {
    q: 'Can I change my plan later?',
    a: 'Yes! You can upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately, and we will pro-rate any charges.',
  },
  {
    q: 'What happens if I exceed my job posting limit?',
    a: 'If you reach your plan limit, you can either upgrade to a higher plan or purchase additional job slots separately. We\'ll notify you when you\'re close to your limit.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a 14-day money-back guarantee for first-time subscribers. If you\'re not satisfied with our service, contact us within 14 days for a full refund.',
  },
  {
    q: 'Are there any setup fees or hidden charges?',
    a: 'No! The prices shown are all-inclusive. There are no setup fees, hidden charges, or long-term contracts. You only pay the monthly subscription.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept credit/debit cards, bank transfers, and mobile money payments. Enterprise customers can also arrange invoicing.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start. Try all features risk-free.',
  },
  {
    q: 'How does AI screening work?',
    a: 'Our AI analyzes candidate resumes, matches them against job requirements, and scores them based on qualifications, experience, and fit. This helps you identify top candidates quickly.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely! There are no long-term contracts. You can cancel your subscription anytime from your account settings. Your access continues until the end of your current billing period.',
  },
];

function PricingCard({ plan }) {
  const IconComponent = plan.icon;
  
  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
        plan.popular ? 'ring-4 ring-primary-500' : ''
      }`}
    >
      {plan.popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-bold px-4 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}
      
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary-100' : 'bg-gray-100'}`}>
            <IconComponent className={`w-6 h-6 ${plan.popular ? 'text-primary-600' : 'text-gray-600'}`} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">K{plan.price}</span>
            <span className="text-gray-600">/{plan.period === 'Forever' ? 'free' : 'mo'}</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm">{plan.description}</p>
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
          to={plan.name === 'Enterprise' ? '/contact' : '/register?type=employer'}
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left hover:text-primary-600 transition"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <HelpCircle className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Pricing() {
  return (
    <>
      <PageHead
        title="Pricing Plans"
        description="Affordable pricing plans for employers. Post jobs, find talent, and grow your team with WantokJobs."
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Find the perfect plan for your hiring needs. All plans include AI-powered matching and access to 30,000+ job seekers.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Check className="w-5 h-5" />
              <span>14-day free trial • No credit card required</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => (
              <PricingCard key={idx} plan={plan} />
            ))}
          </div>

          {/* Job Seekers Note */}
          <div className="mt-12 bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Looking for a job?
            </h3>
            <p className="text-gray-600 mb-4">
              WantokJobs is 100% free for job seekers. Search jobs, create alerts, and apply to unlimited positions at no cost!
            </p>
            <Link
              to="/register?type=jobseeker"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Create Job Seeker Account
            </Link>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Compare All Features
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                    {plans.map((plan, idx) => (
                      <th key={idx} className="text-center py-4 px-4 font-semibold text-gray-900">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">Active Job Postings</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4">5</td>
                    <td className="text-center py-3 px-4">20</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">AI Screening</td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">Featured Listings</td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4">5/mo</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">Analytics</td>
                    <td className="text-center py-3 px-4">Basic</td>
                    <td className="text-center py-3 px-4">Standard</td>
                    <td className="text-center py-3 px-4">Advanced</td>
                    <td className="text-center py-3 px-4">Custom</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-700">Dedicated Manager</td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><X className="w-5 h-5 text-gray-300 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            {faqs.map((faq, idx) => (
              <FAQItem key={idx} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Find Great Talent?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Join 330+ employers hiring on WantokJobs. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register?type=employer"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Start Free Trial
              </Link>
              <Link
                to="/contact"
                className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
