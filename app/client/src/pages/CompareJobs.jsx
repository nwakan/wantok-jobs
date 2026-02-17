import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { X, Plus, Search, ArrowLeft } from 'lucide-react';
import PageHead from '../components/PageHead';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const FIELDS = [
  { key: 'title', label: 'Job Title' },
  { key: 'company_name', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'salary', label: 'Salary', render: j => j.salary_min && j.salary_max ? `${j.salary_currency || 'PGK'} ${j.salary_min.toLocaleString()} - ${j.salary_max.toLocaleString()}` : 'Not specified' },
  { key: 'job_type', label: 'Job Type' },
  { key: 'experience_level', label: 'Experience' },
  { key: 'categories', label: 'Category', render: j => j.categories?.map(c => c.name).join(', ') || 'Uncategorized' },
  { key: 'benefits', label: 'Benefits', render: j => j.benefits || 'Not listed' },
  { key: 'created_at', label: 'Posted', render: j => j.created_at ? new Date(j.created_at).toLocaleDateString() : '-' },
];

function getSalaryNum(job) {
  return job.salary_max || job.salary_min || 0;
}

export default function CompareJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const jobIds = searchParams.get('jobs')?.split(',').filter(Boolean).map(Number) || [];

  const fetchJobs = useCallback(async (ids) => {
    if (!ids.length) { setJobs([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/jobs/compare?ids=${ids.join(',')}`);
      const data = await res.json();
      // Preserve order
      setJobs(ids.map(id => data.find(j => j.id === id)).filter(Boolean));
    } catch { setJobs([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Also check sessionStorage for IDs if none in URL
    if (!jobIds.length) {
      const stored = JSON.parse(sessionStorage.getItem('compareJobs') || '[]');
      if (stored.length >= 2) {
        setSearchParams({ jobs: stored.join(',') }, { replace: true });
        return;
      }
    }
    fetchJobs(jobIds);
  }, [searchParams.get('jobs')]);

  const removeJob = (id) => {
    const next = jobIds.filter(i => i !== id);
    if (next.length) setSearchParams({ jobs: next.join(',') });
    else setSearchParams({});
    sessionStorage.setItem('compareJobs', JSON.stringify(next));
  };

  const addJob = (id) => {
    if (jobIds.includes(id) || jobIds.length >= 3) return;
    const next = [...jobIds, id];
    setSearchParams({ jobs: next.join(',') });
    sessionStorage.setItem('compareJobs', JSON.stringify(next));
    setShowSearch(false);
    setQuery('');
    setResults([]);
  };

  const searchJobs = async (q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/jobs?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults((data.jobs || data).filter(j => !jobIds.includes(j.id)));
    } catch { setResults([]); }
    setSearching(false);
  };

  const highestSalary = Math.max(...jobs.map(getSalaryNum), 0);

  const getValue = (job, field) => {
    if (field.render) return field.render(job);
    return job[field.key] || '-';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHead title="Compare Jobs" description="Compare jobs side by side on WantokJobs" />
      
      <div className="mb-6">
        <Link to="/jobs" className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Compare Jobs</h1>
        <p className="text-gray-600 mt-1">Compare up to 3 jobs side by side</p>
      </div>

      {jobs.length === 0 && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">No jobs selected for comparison</p>
          <p className="text-sm text-gray-400 mb-6">Select jobs from the job listings using the compare checkbox, or search below</p>
          <button onClick={() => setShowSearch(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4 inline mr-1" /> Add Job
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : jobs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-xl shadow-sm border border-gray-200">
            <thead>
              <tr>
                <th className="p-4 text-left text-sm font-medium text-gray-500 bg-gray-50 w-36 rounded-tl-xl">Field</th>
                {jobs.map(job => (
                  <th key={job.id} className="p-4 bg-gray-50 min-w-[220px]">
                    <div className="flex items-center justify-between">
                      <Link to={`/jobs/${job.id}`} className="text-primary-600 hover:underline text-sm font-semibold truncate">
                        {job.title}
                      </Link>
                      <button onClick={() => removeJob(job.id)} className="text-gray-400 hover:text-red-500 ml-2" title="Remove">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
                {jobs.length < 3 && (
                  <th className="p-4 bg-gray-50 min-w-[180px] rounded-tr-xl">
                    <button onClick={() => setShowSearch(true)} className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1 mx-auto">
                      <Plus className="w-4 h-4" /> Add Job
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((field, i) => (
                <tr key={field.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="p-4 text-sm font-medium text-gray-600 border-t border-gray-100">{field.label}</td>
                  {jobs.map(job => {
                    const val = getValue(job, field);
                    const isBestSalary = field.key === 'salary' && highestSalary > 0 && getSalaryNum(job) === highestSalary;
                    return (
                      <td key={job.id} className={`p-4 text-sm border-t border-gray-100 ${isBestSalary ? 'text-green-700 font-semibold bg-green-50' : 'text-gray-800'}`}>
                        {val}
                      </td>
                    );
                  })}
                  {jobs.length < 3 && <td className="p-4 border-t border-gray-100" />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24" onClick={() => setShowSearch(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => searchJobs(e.target.value)}
                placeholder="Search jobs to compare..."
                className="flex-1 outline-none text-sm"
              />
              <button onClick={() => setShowSearch(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searching && <p className="text-sm text-gray-400 p-2">Searching...</p>}
              {results.map(job => (
                <button key={job.id} onClick={() => addJob(job.id)} className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.company_name || 'Company'} · {job.location || 'PNG'}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary-600" />
                </button>
              ))}
              {query.length >= 2 && !searching && results.length === 0 && <p className="text-sm text-gray-400 p-2">No results</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
