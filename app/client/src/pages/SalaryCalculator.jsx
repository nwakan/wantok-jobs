import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

const INDUSTRIES = ['Mining', 'Construction', 'Banking', 'IT', 'Health', 'Education', 'Agriculture', 'Oil & Gas', 'Retail', 'Government', 'NGO', 'Telecommunications', 'Tourism', 'Transport', 'Legal'];
const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Executive'];
const LOCATIONS = ['Port Moresby', 'Lae', 'Mt Hagen', 'Goroka', 'Other'];

function calculateTax(gross) {
  // PNG annual tax brackets
  if (gross <= 12500) return 0;
  let tax = 0;
  let remaining = gross;
  const brackets = [
    { limit: 12500, rate: 0 },
    { limit: 20000, rate: 0.22 },
    { limit: 33000, rate: 0.30 },
    { limit: 70000, rate: 0.35 },
    { limit: 250000, rate: 0.40 },
    { limit: Infinity, rate: 0.42 },
  ];
  let prev = 0;
  for (const b of brackets) {
    const taxable = Math.min(remaining, b.limit - prev);
    if (taxable <= 0) break;
    tax += taxable * b.rate;
    remaining -= taxable;
    prev = b.limit;
  }
  return Math.round(tax);
}

function formatPGK(amount) {
  if (!amount) return 'K0';
  return 'K' + Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function SalaryCalculator() {
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [customSalary, setCustomSalary] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (industry) params.set('industry', industry);
      if (experience) params.set('experience', experience);
      if (location && location !== 'Other') params.set('location', location);
      const res = await fetch(`/api/salary-estimates?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [industry, experience, location]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const avgSalary = data?.stats?.avg_salary || 0;
  const grossForTax = customSalary ? Number(customSalary) : avgSalary;
  const tax = calculateTax(grossForTax);
  const net = grossForTax - tax;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHead title="Salary Calculator - WantokJobs" description="Estimate salaries in Papua New Guinea by industry, experience and location. Calculate your take-home pay with PNG tax brackets." />
      
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🧮 PNG Salary Calculator</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Estimate salaries and calculate take-home pay for jobs in Papua New Guinea</p>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500">
            <option value="">All Industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            {data?.filters?.industries?.filter(i => !INDUSTRIES.includes(i)).map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience Level</label>
          <select value={experience} onChange={e => setExperience(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500">
            <option value="">All Levels</option>
            {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <select value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500">
            <option value="">All Locations</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : (
        <>
          {/* Salary Range Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estimated Salary Range</h2>
            {data?.stats?.job_count > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Average Salary</p>
                    <p className="text-3xl font-bold text-primary-600">{formatPGK(data.stats.avg_salary)}<span className="text-base font-normal text-gray-500">/year</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Based on {data.stats.job_count} jobs</p>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-3 relative">
                  <div className="bg-primary-500 h-3 rounded-full" style={{ width: data.stats.highest > 0 ? `${Math.min(100, ((data.stats.avg_salary - data.stats.lowest) / (data.stats.highest - data.stats.lowest)) * 100)}%` : '50%' }}></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Low: {formatPGK(data.stats.lowest)}</span>
                  <span>Range: {formatPGK(data.stats.avg_min)} – {formatPGK(data.stats.avg_max)}</span>
                  <span>High: {formatPGK(data.stats.highest)}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No salary data available for these filters. Try broadening your search.</p>
            )}
          </div>

          {/* Comparison */}
          {industry && data?.industryAvg?.avg_salary > 0 && data?.stats?.avg_salary > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">📊 Your Estimate vs Industry Average</h3>
              <p className="text-blue-800 dark:text-blue-300">
                Your filtered estimate: <strong>{formatPGK(data.stats.avg_salary)}</strong> | 
                Overall {industry} average: <strong>{formatPGK(data.industryAvg.avg_salary)}</strong>
                {data.stats.avg_salary > data.industryAvg.avg_salary
                  ? ` — ${Math.round(((data.stats.avg_salary - data.industryAvg.avg_salary) / data.industryAvg.avg_salary) * 100)}% above average ✅`
                  : data.stats.avg_salary < data.industryAvg.avg_salary
                  ? ` — ${Math.round(((data.industryAvg.avg_salary - data.stats.avg_salary) / data.industryAvg.avg_salary) * 100)}% below average`
                  : ' — Right at average'}
              </p>
            </div>
          )}

          {/* Tax Calculator */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💰 PNG Tax Calculator (Annual)</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gross Annual Salary (PGK)</label>
              <input
                type="number"
                value={customSalary}
                onChange={e => setCustomSalary(e.target.value)}
                placeholder={avgSalary ? `Using estimate: ${avgSalary}` : 'Enter salary'}
                className="w-full sm:w-64 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {grossForTax > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gross</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatPGK(grossForTax)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">Tax</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">-{formatPGK(tax)}</p>
                  <p className="text-xs text-red-500">{grossForTax > 0 ? Math.round((tax / grossForTax) * 100) : 0}% effective rate</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 dark:text-green-400">Take Home</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatPGK(net)}</p>
                  <p className="text-xs text-green-500">{formatPGK(Math.round(net / 26))}/fortnight</p>
                </div>
              </div>
            )}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>PNG Tax Brackets: 0% up to K12,500 · 22% K12,501–K20,000 · 30% K20,001–K33,000 · 35% K33,001–K70,000 · 40% K70,001–K250,000 · 42% over K250,000</p>
            </div>
          </div>

          {/* Related Jobs */}
          {data?.jobs?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📋 Related Jobs ({data.jobs.length})</h2>
              <div className="space-y-3">
                {data.jobs.map(job => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{job.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{job.company_name} · {job.location}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary-600 whitespace-nowrap">
                        {job.salary_min && job.salary_max ? `${formatPGK(job.salary_min)} – ${formatPGK(job.salary_max)}` : 'Salary TBD'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
