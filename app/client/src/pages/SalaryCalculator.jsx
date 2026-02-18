import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';

const INDUSTRIES = ['Mining', 'Construction', 'Banking', 'IT', 'Health', 'Education', 'Agriculture', 'Oil & Gas', 'Retail', 'Government', 'NGO', 'Telecommunications', 'Tourism', 'Transport', 'Legal'];
const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Executive'];

// ─── Country Tax Systems ───────────────────────────────────────────
// Each country has: currency, symbol, tax brackets (annual, resident rates),
// locations for the salary filter, and a display name.
// Sources: IRC PNG, FRCS Fiji, IRD Solomon Islands, official budget docs.

const COUNTRIES = {
  PNG: {
    name: 'Papua New Guinea',
    flag: '🇵🇬',
    currency: 'PGK',
    symbol: 'K',
    locations: ['Port Moresby', 'Lae', 'Mt Hagen', 'Goroka', 'Madang', 'Wewak', 'Kokopo', 'Lihir', 'Other'],
    // PNG 2024/2025 resident tax brackets (annual)
    // 0–K20,000: 30% on excess over 0
    // K20,001–K33,000: K3,900 + 35%
    // K33,001–K70,000: K8,450 + 40% (corrected from PWC: cumulative)
    // K70,001–K250,000: K23,250 + 42% (corrected)
    // Over K250,000: K98,850 + 42%
    // Note: PNG has NO tax-free threshold for residents as of 2024 budget changes.
    brackets: [
      { limit: 20000, rate: 0.30 },
      { limit: 33000, rate: 0.35 },
      { limit: 70000, rate: 0.40 },
      { limit: 250000, rate: 0.42 },
      { limit: Infinity, rate: 0.42 },
    ],
    bracketDisplay: '30% up to K20,000 · 35% K20,001–K33,000 · 40% K33,001–K70,000 · 42% K70,001–K250,000 · 42% over K250,000',
    fortnightDivisor: 26,
  },
  FJ: {
    name: 'Fiji',
    flag: '🇫🇯',
    currency: 'FJD',
    symbol: '$',
    locations: ['Suva', 'Nadi', 'Lautoka', 'Labasa', 'Ba', 'Other'],
    // Fiji 2025 resident tax brackets (annual)
    // Tax-free threshold: FJD 30,000
    // FJD 30,001–50,000: 18%
    // FJD 50,001–270,000: 20%
    // FJD 270,001–300,000: 33%
    // FJD 300,001–350,000: 34%
    // Over FJD 350,000: 35%
    // Plus Social Responsibility Tax (SRT) on income over FJD 270,000
    brackets: [
      { limit: 30000, rate: 0 },
      { limit: 50000, rate: 0.18 },
      { limit: 270000, rate: 0.20 },
      { limit: 300000, rate: 0.33 },
      { limit: 350000, rate: 0.34 },
      { limit: Infinity, rate: 0.35 },
    ],
    bracketDisplay: '0% up to $30,000 · 18% $30,001–$50,000 · 20% $50,001–$270,000 · 33% $270,001–$300,000 · 34% $300,001–$350,000 · 35% over $350,000',
    fortnightDivisor: 26,
  },
  SB: {
    name: 'Solomon Islands',
    flag: '🇸🇧',
    currency: 'SBD',
    symbol: '$',
    locations: ['Honiara', 'Gizo', 'Auki', 'Other'],
    // Solomon Islands resident tax brackets (annual)
    // Tax-free threshold: SBD 15,080
    // SBD 15,081–30,000: 11%
    // SBD 30,001–60,000: 23%
    // SBD 60,001–90,000: 35%
    // Over SBD 90,000: 40%
    brackets: [
      { limit: 15080, rate: 0 },
      { limit: 30000, rate: 0.11 },
      { limit: 60000, rate: 0.23 },
      { limit: 90000, rate: 0.35 },
      { limit: Infinity, rate: 0.40 },
    ],
    bracketDisplay: '0% up to $15,080 · 11% $15,081–$30,000 · 23% $30,001–$60,000 · 35% $60,001–$90,000 · 40% over $90,000',
    fortnightDivisor: 26,
  },
  VU: {
    name: 'Vanuatu',
    flag: '🇻🇺',
    currency: 'VUV',
    symbol: 'VT',
    locations: ['Port Vila', 'Luganville', 'Other'],
    // Vanuatu has NO personal income tax
    brackets: [],
    bracketDisplay: 'Vanuatu has no personal income tax. Employees pay no tax on salary/wages.',
    fortnightDivisor: 26,
    noIncomeTax: true,
  },
  WS: {
    name: 'Samoa',
    flag: '🇼🇸',
    currency: 'WST',
    symbol: '$',
    locations: ['Apia', 'Other'],
    // Samoa resident tax brackets (annual)
    // Tax-free threshold: WST 15,000
    // WST 15,001–25,000: 20%
    // Over WST 25,000: 27%
    brackets: [
      { limit: 15000, rate: 0 },
      { limit: 25000, rate: 0.20 },
      { limit: Infinity, rate: 0.27 },
    ],
    bracketDisplay: '0% up to $15,000 · 20% $15,001–$25,000 · 27% over $25,000',
    fortnightDivisor: 26,
  },
  TO: {
    name: 'Tonga',
    flag: '🇹🇴',
    currency: 'TOP',
    symbol: '$',
    locations: ["Nuku'alofa", 'Other'],
    // Tonga: flat 20% income tax on employment income
    // Tax-free threshold: TOP 7,400
    brackets: [
      { limit: 7400, rate: 0 },
      { limit: Infinity, rate: 0.20 },
    ],
    bracketDisplay: '0% up to $7,400 · 20% flat rate on income over $7,400',
    fortnightDivisor: 26,
  },
  TL: {
    name: 'Timor-Leste',
    flag: '🇹🇱',
    currency: 'USD',
    symbol: '$',
    locations: ['Dili', 'Other'],
    // Timor-Leste: flat 10% wage income tax
    // No tax-free threshold for residents
    brackets: [
      { limit: Infinity, rate: 0.10 },
    ],
    bracketDisplay: '10% flat rate on all wage income',
    fortnightDivisor: 26,
  },
};

function calculateTax(gross, countryCode) {
  const country = COUNTRIES[countryCode];
  if (!country || !gross || gross <= 0) return 0;
  if (country.noIncomeTax) return 0;

  let tax = 0;
  let prev = 0;
  for (const b of country.brackets) {
    const taxable = Math.min(gross, b.limit) - prev;
    if (taxable <= 0) break;
    tax += taxable * b.rate;
    prev = b.limit;
  }
  return Math.round(tax);
}

function formatCurrency(amount, countryCode) {
  const country = COUNTRIES[countryCode] || COUNTRIES.PNG;
  if (!amount) return `${country.symbol}0`;
  const formatted = Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
  // For currencies where symbol goes before (like $), handle accordingly
  if (country.symbol === '$') return `${country.symbol}${formatted}`;
  if (country.symbol === 'VT') return `${formatted} VT`;
  return `${country.symbol}${formatted}`;
}

// For backward compat with salary estimates API (returns PGK)
function formatPGK(amount) {
  if (!amount) return 'K0';
  return 'K' + Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function SalaryCalculator() {
  const [country, setCountry] = useState('PNG');
  const [industry, setIndustry] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [customSalary, setCustomSalary] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const countryData = COUNTRIES[country];

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (industry) params.set('industry', industry);
      if (experience) params.set('experience', experience);
      if (location && location !== 'Other') params.set('location', location);
      if (country !== 'PNG') params.set('country', countryData.name);
      const res = await fetch(`/api/salary-estimates?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [industry, experience, location, country, countryData.name]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  // Reset location when country changes
  useEffect(() => {
    setLocation('');
  }, [country]);

  const avgSalary = data?.stats?.avg_salary || 0;
  const grossForTax = customSalary ? Number(customSalary) : avgSalary;
  const tax = useMemo(() => calculateTax(grossForTax, country), [grossForTax, country]);
  const net = grossForTax - tax;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHead 
        title="Pacific Salary Calculator — Take-Home Pay Estimator | WantokJobs" 
        description="Calculate your take-home pay across Pacific Island nations. Includes current income tax brackets for PNG, Fiji, Solomon Islands, Vanuatu, Samoa, Tonga, and Timor-Leste." 
      />
      
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🧮 Pacific Salary Calculator</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Estimate salaries and calculate take-home pay across Pacific Island nations</p>

      {/* Country Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(COUNTRIES).map(([code, c]) => (
          <button
            key={code}
            onClick={() => setCountry(code)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              country === code 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-400'
            }`}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>

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
            {countryData.locations.map(l => <option key={l} value={l}>{l}</option>)}
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
                {country !== 'PNG' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Salary estimates are based on PNG job data. For {countryData.name}, adjust expectations based on local market conditions. Tax calculator below uses accurate {countryData.name} tax brackets.
                  </p>
                )}
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💰 {countryData.flag} {countryData.name} Tax Calculator (Annual)
            </h2>

            {countryData.noIncomeTax ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">No Personal Income Tax!</p>
                <p className="text-green-600 dark:text-green-400">
                  {countryData.name} does not levy personal income tax on salary and wages. Your gross pay is your take-home pay.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gross Annual Salary ({countryData.currency})
                  </label>
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
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(grossForTax, country)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                      <p className="text-sm text-red-600 dark:text-red-400">Tax</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">-{formatCurrency(tax, country)}</p>
                      <p className="text-xs text-red-500">{grossForTax > 0 ? Math.round((tax / grossForTax) * 100) : 0}% effective rate</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-600 dark:text-green-400">Take Home</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(net, country)}</p>
                      <p className="text-xs text-green-500">{formatCurrency(Math.round(net / countryData.fortnightDivisor), country)}/fortnight</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <p>{countryData.flag} {countryData.name} Tax Brackets: {countryData.bracketDisplay}</p>
                </div>
              </>
            )}

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Disclaimer:</strong> This calculator provides estimates based on standard resident employee tax brackets. 
                Actual tax may vary based on deductions, allowances, superannuation, non-resident status, and other factors. 
                Consult a qualified tax professional or your country's revenue authority for exact calculations.
              </p>
            </div>
          </div>

          {/* Tax Comparison Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🌏 Pacific Tax Comparison</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              How much would you take home on the same salary across different Pacific nations?
            </p>
            {grossForTax > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Country</th>
                      <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Tax</th>
                      <th className="text-right py-2 px-4 font-medium text-gray-600 dark:text-gray-400">Effective Rate</th>
                      <th className="text-right py-2 pl-4 font-medium text-gray-600 dark:text-gray-400">Take Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(COUNTRIES)
                      .map(([code, c]) => {
                        const t = calculateTax(grossForTax, code);
                        const n = grossForTax - t;
                        const rate = grossForTax > 0 ? Math.round((t / grossForTax) * 100) : 0;
                        return { code, c, t, n, rate };
                      })
                      .sort((a, b) => b.n - a.n)
                      .map(({ code, c, t, n, rate }) => (
                        <tr
                          key={code}
                          className={`border-b border-gray-100 dark:border-gray-700 ${code === country ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                        >
                          <td className="py-2.5 pr-4">
                            <button
                              onClick={() => setCountry(code)}
                              className="flex items-center gap-2 hover:text-primary-600 transition"
                            >
                              <span>{c.flag}</span>
                              <span className={`font-medium ${code === country ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                                {c.name}
                              </span>
                              {code === country && <span className="text-xs bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">selected</span>}
                            </button>
                          </td>
                          <td className="text-right py-2.5 px-4 text-red-600 dark:text-red-400">
                            {c.noIncomeTax ? '—' : `-${Number(t).toLocaleString()}`}
                          </td>
                          <td className="text-right py-2.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              rate === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              rate < 20 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                              rate < 30 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="text-right py-2.5 pl-4 font-semibold text-green-600 dark:text-green-400">
                            {Number(n).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                  * Comparison uses the same gross amount across all countries (not currency-adjusted). 
                  For accurate cross-country comparison, convert to a common currency first.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Enter a salary above to see the comparison.</p>
            )}
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
