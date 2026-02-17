#!/usr/bin/env node
/**
 * Estimate salaries for jobs with null salary_max
 * Based on PNG market rates (in PGK Kina) by category and experience level
 */

const db = require('../server/database');

// PNG salary ranges by category and experience (annual PGK)
const SALARY_RANGES = {
  'accounting':              { 'Entry Level': [25000, 40000], 'Mid Level': [40000, 70000], 'Senior': [70000, 120000] },
  'administration':          { 'Entry Level': [18000, 30000], 'Mid Level': [30000, 55000], 'Senior': [55000, 90000] },
  'banking-and-finance':     { 'Entry Level': [28000, 45000], 'Mid Level': [45000, 80000], 'Senior': [80000, 150000] },
  'community-and-development':{ 'Entry Level': [20000, 35000], 'Mid Level': [35000, 60000], 'Senior': [60000, 100000] },
  'construction-and-trades': { 'Entry Level': [22000, 38000], 'Mid Level': [38000, 65000], 'Senior': [65000, 110000] },
  'education-and-training':  { 'Entry Level': [20000, 35000], 'Mid Level': [35000, 60000], 'Senior': [60000, 100000] },
  'engineering':             { 'Entry Level': [30000, 50000], 'Mid Level': [50000, 90000], 'Senior': [90000, 160000] },
  'government':              { 'Entry Level': [22000, 38000], 'Mid Level': [38000, 65000], 'Senior': [65000, 120000] },
  'health-and-medical':      { 'Entry Level': [25000, 42000], 'Mid Level': [42000, 75000], 'Senior': [75000, 140000] },
  'hospitality-and-tourism':  { 'Entry Level': [15000, 28000], 'Mid Level': [28000, 50000], 'Senior': [50000, 90000] },
  'hr-and-recruitment':      { 'Entry Level': [25000, 40000], 'Mid Level': [40000, 70000], 'Senior': [70000, 120000] },
  'ict-and-technology':      { 'Entry Level': [28000, 48000], 'Mid Level': [48000, 85000], 'Senior': [85000, 150000] },
  'legal-and-law':           { 'Entry Level': [30000, 50000], 'Mid Level': [50000, 90000], 'Senior': [90000, 180000] },
  'management-and-executive':{ 'Entry Level': [35000, 55000], 'Mid Level': [55000, 100000], 'Senior': [100000, 200000] },
  'manufacturing-and-logistics':{ 'Entry Level': [20000, 35000], 'Mid Level': [35000, 60000], 'Senior': [60000, 100000] },
  'marketing-and-sales':     { 'Entry Level': [22000, 38000], 'Mid Level': [38000, 65000], 'Senior': [65000, 110000] },
  'mining-and-resources':    { 'Entry Level': [35000, 55000], 'Mid Level': [55000, 100000], 'Senior': [100000, 200000] },
  'ngo-and-volunteering':    { 'Entry Level': [25000, 40000], 'Mid Level': [40000, 75000], 'Senior': [75000, 150000] },
  'science-and-research':    { 'Entry Level': [28000, 45000], 'Mid Level': [45000, 80000], 'Senior': [80000, 150000] },
  'security':                { 'Entry Level': [18000, 30000], 'Mid Level': [30000, 55000], 'Senior': [55000, 90000] },
};

// Title-based salary adjustments
function titleMultiplier(title) {
  const t = title.toLowerCase();
  if (/director|ceo|managing director|country manager|general manager/.test(t)) return 1.4;
  if (/chief|head of|principal|lead/.test(t)) return 1.2;
  if (/senior|specialist|expert/.test(t)) return 1.1;
  if (/junior|trainee|intern|graduate/.test(t)) return 0.8;
  if (/assistant|aide|helper/.test(t)) return 0.85;
  return 1.0;
}

// Map experience strings to our keys
function normalizeExp(exp) {
  if (!exp) return 'Mid Level';
  const e = exp.toLowerCase();
  if (/entry|junior|graduate|intern/.test(e)) return 'Entry Level';
  if (/senior|lead|principal|executive|director/.test(e)) return 'Senior';
  return 'Mid Level';
}

const jobs = db.prepare("SELECT id, title, category_slug, experience_level FROM jobs WHERE status = 'active' AND salary_max IS NULL").all();
console.log(`Found ${jobs.length} jobs with null salary_max`);

const update = db.prepare('UPDATE jobs SET salary_min = ?, salary_max = ?, salary_currency = ? WHERE id = ?');

const tx = db.transaction(() => {
  let updated = 0;
  for (const job of jobs) {
    const cat = job.category_slug || 'administration';
    const ranges = SALARY_RANGES[cat] || SALARY_RANGES['administration'];
    const expKey = normalizeExp(job.experience_level);
    const [baseMin, baseMax] = ranges[expKey] || ranges['Mid Level'];
    
    const mult = titleMultiplier(job.title);
    const salaryMin = Math.round(baseMin * mult / 1000) * 1000;
    const salaryMax = Math.round(baseMax * mult / 1000) * 1000;
    
    update.run(salaryMin, salaryMax, 'PGK', job.id);
    updated++;
  }
  return updated;
});

const updated = tx();
console.log(`Updated ${updated} jobs with estimated salaries (PGK).`);

// Show sample
console.log('\nSample salary estimates:');
db.prepare(`
  SELECT title, category_slug, experience_level, salary_min, salary_max 
  FROM jobs WHERE status = 'active' AND salary_max IS NOT NULL 
  ORDER BY RANDOM() LIMIT 10
`).all().forEach(j => {
  console.log(`  K${j.salary_min?.toLocaleString()}-K${j.salary_max?.toLocaleString()} | ${j.experience_level} | ${j.title}`);
});
