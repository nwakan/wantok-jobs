/**
 * Career Insights Page (Part 2.8)
 * Public page showing PNG job market data
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CareerInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const response = await fetch(`${API_URL}/api/insights/market`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Unable to load market insights. Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      <PageHead 
        title="Career Insights - PNG Job Market Data | WantokJobs"
        description="Explore PNG job market trends, in-demand skills, salary ranges, and top hiring companies. Make informed career decisions with real-time data."
      />

      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">PNG Job Market Insights</h1>
          <p className="text-xl text-primary-100 max-w-2xl">
            Real-time data and trends to help you make informed career decisions
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* In-Demand Skills */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Most In-Demand Skills</h2>
            <span className="text-sm text-gray-600">Based on active job postings</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.inDemandSkills?.slice(0, 12).map((skill, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 capitalize">{skill.skill}</h3>
                    <p className="text-sm text-gray-600">{skill.count} jobs require this skill</p>
                  </div>
                  <div className="text-2xl font-bold text-primary-600">#{index + 1}</div>
                </div>
                <div className="mt-3 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (skill.count / insights.inDemandSkills[0].count) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Salary Ranges */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Average Salary Ranges by Industry</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Jobs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Average Min</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Average Max</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {insights.salaryRanges?.map((range, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{range.industry}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{range.jobCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{range.currency} {range.averageMin.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{range.currency} {range.averageMax.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{range.range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Hiring Trends */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Hiring Trends (Last 12 Months)</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-end justify-between h-64 gap-2">
              {insights.hiringTrends?.map((trend, index) => {
                const maxJobs = Math.max(...insights.hiringTrends.map(t => t.jobsPosted));
                const height = (trend.jobsPosted / maxJobs) * 100;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end">
                    <div className="text-center mb-2">
                      <div className="text-lg font-bold text-gray-900">{trend.jobsPosted}</div>
                    </div>
                    <div 
                      className="w-full bg-primary-600 rounded-t transition-all duration-500 hover:bg-primary-700"
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Top Hiring Companies */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Hiring Companies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.topCompanies?.map((company, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 font-bold">
                        {company.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.industry || 'Various Industries'}</p>
                    {company.location && (
                      <p className="text-xs text-gray-500">{company.location}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">{company.activeJobs}</div>
                    <div className="text-xs text-gray-600">Active Jobs</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Location Distribution */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Jobs by Location</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="space-y-4">
              {insights.locationDistribution?.map((location, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{location.location}</span>
                    <span className="text-sm text-gray-600">{location.count} jobs ({location.percentage}%)</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${location.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary-50 rounded-lg p-8 text-center border border-primary-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Job Search?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join thousands of jobseekers finding their dream jobs on WantokJobs. 
            Get personalized job recommendations based on your skills and experience.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              to="/register" 
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              Create Account
            </Link>
            <Link 
              to="/jobs" 
              className="px-6 py-3 bg-white text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 font-medium"
            >
              Browse Jobs
            </Link>
          </div>
        </section>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Last updated: {new Date(insights.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </>
  );
}
