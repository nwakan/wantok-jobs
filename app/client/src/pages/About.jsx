import { Shield, Users, Building2, TrendingUp, Eye, CheckCircle, Globe, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

export default function About() {
  return (
    <>
      <PageHead
        title="About WantokJobs — PNG's First Transparent Hiring Platform"
        description="WantokJobs is Papua New Guinea's answer to unfair hiring practices. The first Pacific platform with mandatory transparency for government and public sector employers."
        keywords="about WantokJobs, transparent hiring PNG, fair recruitment Papua New Guinea, job platform PNG"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🏆 First in the Pacific
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            PNG's Answer to Unfair Hiring
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're building a job platform where merit matters more than connections. 
            Where transparency replaces hidden deals. Where every Papua New Guinean gets a fair chance.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl shadow-sm p-8 mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            To end corrupt hiring practices in Papua New Guinea by mandating transparency for public sector employers. 
            We believe every job seeker deserves to know how they're evaluated, who's on the hiring panel, and why decisions are made. 
            <strong> Merit should trump wantok connections.</strong>
          </p>
        </div>

        {/* The Problem */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">The Problem We're Solving</h2>
          <div className="bg-white rounded-xl shadow-sm p-8 border-l-4 border-red-500">
            <p className="text-gray-700 mb-4">
              For too long, hiring in PNG—especially in government and public sector roles—has been plagued by:
            </p>
            <ul className="space-y-3">
              {[
                'Hidden wantok deals where jobs go to relatives and friends',
                'Opaque selection processes with no accountability',
                'Talented candidates overlooked because they lack connections',
                'Public sector positions filled without transparency',
                'No way for job seekers to understand why they were rejected'
              ].map((issue, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-red-500 font-bold text-xl">✗</span>
                  <span className="text-gray-700">{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The Solution */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Solution: The Transparency Framework</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Shield,
                title: 'Mandatory Transparency',
                desc: 'Government departments, SOEs, NGOs, statutory authorities, and publicly listed companies MUST disclose hiring processes, panels, and criteria.'
              },
              {
                icon: Eye,
                title: 'Open Selection Criteria',
                desc: 'Job seekers see exactly what skills, qualifications, and experience are being evaluated—before they apply.'
              },
              {
                icon: Users,
                title: 'Hiring Panel Disclosure',
                desc: 'Know who is evaluating applications. Conflict of interest declarations are required and public.'
              },
              {
                icon: CheckCircle,
                title: 'Transparency Scoring',
                desc: 'Employers get a score (0-100) based on how transparent their hiring is. Public data shows who is complying.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-gray-700">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why It Matters */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Why This Matters</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🎯 For Job Seekers</h3>
              <p className="text-gray-700">
                You finally have visibility into the process. You know you're being evaluated fairly. 
                You can challenge decisions if something seems off. <strong>Your skills matter more than your surname.</strong>
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🏢 For Employers</h3>
              <p className="text-gray-700">
                Build trust with candidates. Meet compliance requirements. Stand out from competitors. 
                Reduce recruitment disputes and legal challenges. Show the public you have nothing to hide.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🇵🇬 For Papua New Guinea</h3>
              <p className="text-gray-700">
                Combat corruption. Increase public sector accountability. Create a level playing field. 
                Build trust in government institutions. Ensure the best people get the jobs—not just the best-connected.
              </p>
            </div>
          </div>
        </div>

        {/* By The Numbers */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">WantokJobs By The Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '463', label: 'Total Employers', icon: Building2 },
              { value: '65', label: 'Government Bodies', icon: Globe },
              { value: '112', label: 'Transparent Employers', icon: Shield },
              { value: '360+', label: 'Active Jobs', icon: TrendingUp }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm p-6 text-center">
                <stat.icon className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary-600 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What Makes Us Different */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">What Makes Us Different</h2>
          <div className="space-y-4">
            {[
              {
                title: '🏆 First in the Pacific',
                desc: 'No other job platform in PNG or the Pacific has mandatory transparency requirements.'
              },
              {
                title: '🤖 Employer Scout',
                desc: 'We automatically build employer profiles from multiple sources — 65 public sector profiles already live.'
              },
              {
                title: '💬 Jean AI Assistant',
                desc: 'Our AI assistant helps job seekers and employers on every page — instant answers, career advice, application tips.'
              },
              {
                title: '📱 WhatsApp Job Alerts',
                desc: 'Get notified via WhatsApp, email, or SMS when jobs match your profile. Real-time updates.'
              },
              {
                title: '🗣️ Tok Pisin Support',
                desc: 'Platform available in both English and Tok Pisin. Built for Papua New Guineans, by Papua New Guineans.'
              },
              {
                title: '💳 Credit-Based Billing',
                desc: 'Employers pay as they go — no monthly subscriptions, no recurring charges. Buy credits when you need them.'
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl">{item.title.split(' ')[0]}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title.substring(3)}</h3>
                  <p className="text-gray-700 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Competitors */}
        <div className="bg-gray-50 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How We Compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4 bg-primary-50 font-bold text-primary-700">WantokJobs</th>
                  <th className="text-center py-3 px-4">PNGJobSeek</th>
                  <th className="text-center py-3 px-4">PNGWorkforce</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {[
                  ['Transparency Framework', '✅', '❌', '❌'],
                  ['Government Profiles', '65', '~10', '~15'],
                  ['Transparency Scoring', '✅', '❌', '❌'],
                  ['AI Assistant (Jean)', '✅', '❌', '❌'],
                  ['WhatsApp Alerts', '✅', '❌', '❌'],
                  ['Credit-Based Billing', '✅', '❌', '❌'],
                  ['Tok Pisin Support', '✅', 'Limited', 'Limited']
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-3 px-4 font-medium">{row[0]}</td>
                    <td className="text-center py-3 px-4 bg-primary-50 font-semibold">{row[1]}</td>
                    <td className="text-center py-3 px-4">{row[2]}</td>
                    <td className="text-center py-3 px-4">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join the Movement</h2>
          <p className="text-xl text-primary-100 mb-6 max-w-2xl mx-auto">
            Whether you're a job seeker tired of hidden processes or an employer committed to fair hiring, 
            WantokJobs is your platform. <strong>Transparency yumi gat!</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?type=jobseeker"
              className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition"
            >
              Sign Up as Job Seeker
            </Link>
            <Link
              to="/register?type=employer"
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              Register as Employer
            </Link>
          </div>
          <Link to="/transparency" className="inline-block mt-6 text-white underline hover:text-primary-100">
            Learn more about the Transparency Framework →
          </Link>
        </div>
      </div>
    </>
  );
}
