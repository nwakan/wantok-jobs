import { Shield, Eye, Users, FileCheck, AlertTriangle, CheckCircle, Building2, Scale, TrendingUp, MessageCircle, Lock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useState, useEffect } from 'react';

export default function Transparency() {
  const [activeTab, setActiveTab] = useState('jobseekers');
  const [stats, setStats] = useState({ transparentEmployers: 0, governmentBodies: 0, totalEmployers: 0 });
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => {
      setStats({
        transparentEmployers: d.transparentEmployers || 0,
        governmentBodies: d.governmentBodies || 0,
        totalEmployers: d.totalEmployers || 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <>
      <PageHead
        title="Transparency Framework — Fair Hiring for PNG | WantokJobs"
        description="PNG's first mandatory hiring transparency framework. See how employers hire, who's on panels, and selection criteria. Fair, merit-based recruitment for all."
        keywords="transparency framework PNG, fair hiring Papua New Guinea, transparent recruitment, public sector hiring PNG, wantok system PNG"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-600 via-teal-600 to-blue-600 text-white py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🏆 First in the Pacific
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Transparency Framework
            </h1>
            <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto mb-8">
              Mandatory hiring transparency for PNG's public sector. Fair processes. Open criteria. 
              Merit-based hiring. <strong>No more hidden wantok deals.</strong>
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/companies" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Browse Transparent Employers
              </Link>
              <Link to="/jobs" className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition">
                Find Fair Jobs
              </Link>
            </div>
          </div>
        </div>

        {/* What Is It? */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Is the Transparency Framework?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A system of mandatory disclosure requirements for public sector and large private employers. 
              It ensures hiring processes are open, fair, and accountable.
            </p>
          </div>

          {/* Who Must Be Transparent */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary-600" />
              Who Must Be Transparent?
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🏛️', label: 'Government Departments', desc: 'All national, provincial, and local government entities' },
                { icon: '🏢', label: 'State-Owned Enterprises', desc: 'SOEs like PNG Power, PNGPL, Bank South Pacific (SOE status)' },
                { icon: '⚖️', label: 'Statutory Authorities', desc: 'IRC, ICCC, PNGEC, and other statutory bodies' },
                { icon: '🤝', label: 'NGOs', desc: 'International and local non-government organizations' },
                { icon: '📈', label: 'Publicly Listed Companies', desc: 'Companies listed on PNGX (Port Moresby Stock Exchange)' },
                { icon: '🏪', label: 'Private Employers (Opt-In)', desc: 'Private companies can opt in to earn the "Transparent Employer" badge' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-3xl flex-shrink-0">{item.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-700">
                <strong>Current count:</strong> {stats.transparentEmployers} employers required to be transparent • {stats.governmentBodies} government bodies • {stats.totalEmployers.toLocaleString()}+ total employers on WantokJobs
              </p>
            </div>
          </div>

          {/* What Employers Must Disclose */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Eye className="w-8 h-8 text-primary-600" />
              What Employers Must Disclose
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: 'Hiring Panel Members', desc: 'Names, titles, and roles of everyone on the selection committee', icon: Users },
                { title: 'Selection Criteria', desc: 'Exact skills, qualifications, and experience being evaluated', icon: FileCheck },
                { title: 'Conflict of Interest Declarations', desc: 'Panel members must declare conflicts (e.g., relatives applying)', icon: AlertTriangle },
                { title: 'Weighting & Scoring', desc: 'How criteria are weighted (e.g., 40% experience, 30% qualifications)', icon: Scale },
                { title: 'Hiring Outcomes', desc: 'Public statistics on who was hired, diversity metrics, timelines', icon: TrendingUp },
                { title: 'Auditor Access', desc: 'Independent auditors can review hiring records for compliance', icon: Search }
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-700">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
                {[
                  { key: 'jobseekers', label: '👤 For Job Seekers' },
                  { key: 'employers', label: '🏢 For Employers' },
                  { key: 'auditors', label: '🔍 For Auditors' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-2.5 rounded-md font-semibold transition ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Seekers Tab */}
            {activeTab === 'jobseekers' && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">How Transparency Helps You</h3>
                <div className="space-y-6">
                  {[
                    {
                      title: 'Know What They\'re Looking For',
                      desc: 'See the exact selection criteria before you apply. No guessing. No hidden requirements. You know if you\'re a fit.',
                      icon: Eye
                    },
                    {
                      title: 'Understand the Process',
                      desc: 'Know who\'s reviewing your application. See their names and titles. Understand how decisions are made.',
                      icon: Users
                    },
                    {
                      title: 'Merit Beats Connections',
                      desc: 'Hiring panels must declare conflicts of interest. If your cousin is on the panel, it\'s public. Fair chance for everyone.',
                      icon: CheckCircle
                    },
                    {
                      title: 'Challenge Unfair Decisions',
                      desc: 'If something seems wrong, you have data to back your complaint. Transparency creates accountability.',
                      icon: Shield
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                        <p className="text-gray-700">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <Link to="/jobs?transparency_only=true" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                    <Shield className="w-5 h-5" />
                    Find Transparent Jobs
                  </Link>
                </div>
              </div>
            )}

            {/* Employers Tab */}
            {activeTab === 'employers' && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Transparency Benefits Employers</h3>
                <div className="space-y-6">
                  {[
                    {
                      title: 'Build Trust & Credibility',
                      desc: 'Show candidates you have nothing to hide. Transparent employers attract higher-quality applicants who value fairness.',
                      icon: CheckCircle
                    },
                    {
                      title: 'Meet Compliance Requirements',
                      desc: 'If you\'re a government, SOE, NGO, statutory authority, or listed company — transparency is mandatory. WantokJobs makes compliance easy.',
                      icon: FileCheck
                    },
                    {
                      title: 'Stand Out from Competitors',
                      desc: 'Earn the "Transparent Employer" badge. Show up in transparency filters. Differentiate yourself from opaque competitors.',
                      icon: TrendingUp
                    },
                    {
                      title: 'Reduce Recruitment Disputes',
                      desc: 'When everything is documented and public, there are fewer complaints. Transparent processes reduce legal and reputational risk.',
                      icon: Shield
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                        <p className="text-gray-700">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-6 rounded">
                  <p className="text-gray-700 mb-4">
                    <strong>Government & SOE employers:</strong> Transparency tools are included FREE in all plans. 
                    Private employers can opt in starting at the Pro Pack.
                  </p>
                  <Link to="/pricing" className="text-primary-600 font-semibold hover:underline">
                    View Pricing & Features →
                  </Link>
                </div>
                <div className="mt-6 text-center">
                  <Link to="/register?type=employer" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                    <Building2 className="w-5 h-5" />
                    Register as Transparent Employer
                  </Link>
                </div>
              </div>
            )}

            {/* Auditors Tab */}
            {activeTab === 'auditors' && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">For Auditors & Oversight Bodies</h3>
                <div className="space-y-6">
                  {[
                    {
                      title: 'Full Audit Trail Access',
                      desc: 'Authorized auditors can access complete hiring records: applications, panel deliberations, scoring sheets, final decisions.',
                      icon: Search
                    },
                    {
                      title: 'Transparency Score Reports',
                      desc: 'View employer compliance scores (0-100). See which organizations are meeting transparency requirements and which aren\'t.',
                      icon: TrendingUp
                    },
                    {
                      title: 'Conflict of Interest Tracking',
                      desc: 'Review all conflict declarations. Flag cases where panel members had undisclosed relationships with candidates.',
                      icon: AlertTriangle
                    },
                    {
                      title: 'Public Outcome Statistics',
                      desc: 'Aggregate data on hiring outcomes across government and public sector. Identify systemic bias or nepotism patterns.',
                      icon: FileCheck
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                        <p className="text-gray-700">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded">
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Secure Auditor Access</p>
                      <p className="text-gray-700 text-sm">
                        Auditor accounts require verification. Contact us to set up access for your oversight body, 
                        anti-corruption commission, or regulatory agency.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <Link to="/contact" className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                    <MessageCircle className="w-5 h-5" />
                    Request Auditor Access
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Transparency Score System */}
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">How the Transparency Score Works</h3>
            <p className="text-gray-600 text-center mb-8 max-w-3xl mx-auto">
              Every employer gets a score from 0-100 based on how well they comply with transparency requirements. 
              Scores are updated in real-time and publicly visible.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { emoji: '🟢', range: '80-100', label: 'Excellent Transparency', desc: 'Full disclosure: panel names, criteria, weighting, conflicts, outcomes all public. Gold standard.' },
                { emoji: '🟡', range: '50-79', label: 'Improving', desc: 'Partial transparency: some criteria disclosed, panel members listed, but missing some elements.' },
                { emoji: '🔴', range: '0-49', label: 'Needs Work', desc: 'Limited disclosure: minimal transparency, missing key information, not meeting requirements.' }
              ].map((score, idx) => (
                <div key={idx} className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-6xl mb-4">{score.emoji}</div>
                  <div className="text-xl font-bold text-gray-900 mb-2">{score.label}</div>
                  <div className="text-sm font-semibold text-gray-600 mb-3">Score: {score.range}</div>
                  <p className="text-sm text-gray-700">{score.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-gray-700">
                <strong>Want to see employer scores?</strong> Browse the{' '}
                <Link to="/companies" className="text-primary-600 font-semibold hover:underline">company directory</Link>
                {' '}— scores are shown on each employer profile.
              </p>
            </div>
          </div>

          {/* How to Report Non-Compliance */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-8 mb-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Report Non-Compliance</h3>
                <p className="text-gray-700">
                  If you believe an employer is not meeting transparency requirements, you can report it. 
                  We investigate all reports and work with employers to improve compliance.
                </p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-700 mb-6">
              <p><strong>What to report:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Missing hiring panel information</li>
                <li>Undisclosed selection criteria</li>
                <li>Suspected conflicts of interest not declared</li>
                <li>Opaque hiring processes in public sector</li>
                <li>Employers not responding to transparency requests</li>
              </ul>
            </div>
            <Link to="/contact?subject=transparency-report" className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
              <AlertTriangle className="w-5 h-5" />
              Report a Violation
            </Link>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h3>
            <div className="space-y-6">
              {[
                {
                  q: 'Is this legally required?',
                  a: 'The Transparency Framework is a WantokJobs policy for employers using our platform. While not (yet) PNG law, it aligns with international best practices and PNG\'s commitment to good governance. We believe transparency should be the standard.'
                },
                {
                  q: 'What if an employer refuses?',
                  a: 'Employers required to be transparent (government, SOEs, NGOs, statutory authorities, listed companies) cannot post jobs on WantokJobs without meeting basic transparency requirements. Private employers can opt out but won\'t receive the "Transparent Employer" badge.'
                },
                {
                  q: 'Can I see who applied for a job?',
                  a: 'No. Individual applicant data is private. Transparency applies to the PROCESS (criteria, panel, scoring), not to other candidates\' personal information.'
                },
                {
                  q: 'Does this slow down hiring?',
                  a: 'Not significantly. Most disclosure happens upfront (panel, criteria) — things good employers already know. Transparency actually speeds up hiring by reducing disputes and complaints.'
                },
                {
                  q: 'How is this different from LinkedIn or other platforms?',
                  a: 'NO other job platform in PNG (or the Pacific) has mandatory transparency requirements. PNGJobSeek, PNGWorkforce, LinkedIn — none of them enforce this. WantokJobs is first.'
                },
                {
                  q: 'What if I\'m a small private business?',
                  a: 'Small private employers are NOT required to be transparent (though it\'s encouraged). Transparency is mandatory for public sector, SOEs, NGOs, statutory authorities, and listed companies.'
                }
              ].map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 pb-6 last:border-0">
                  <h4 className="font-bold text-gray-900 mb-2">{item.q}</h4>
                  <p className="text-gray-700">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Join the Transparent Hiring Movement</h2>
            <p className="text-xl text-primary-100 mb-6 max-w-2xl mx-auto">
              Whether you're a job seeker seeking fairness or an employer committed to integrity, WantokJobs is your platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register?type=jobseeker" className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition">
                Sign Up — It's Free
              </Link>
              <Link to="/companies?transparency_only=true" className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition">
                Browse Transparent Employers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
