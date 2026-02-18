#!/usr/bin/env node
const Database = require('better-sqlite3');
const db = new Database('server/data/wantokjobs.db');

console.log('=== Analyzing job company data ===\n');

// Check jobs with NULL or generic company names
console.log('1. Jobs with NULL company_name:');
const nullCompany = db.prepare(`
  SELECT id, title, company_display_name, employer_id, description
  FROM jobs 
  WHERE company_name IS NULL
  LIMIT 5
`).all();

nullCompany.forEach(j => {
  console.log(`\n[${j.id}] ${j.title}`);
  console.log(`  Display name: ${j.company_display_name || 'NULL'}`);
  console.log(`  Employer ID: ${j.employer_id}`);
  console.log(`  Description (first 200 chars): ${j.description ? j.description.substring(0, 200) : 'NULL'}...`);
});

// Check what employer profiles exist
console.log('\n\n2. Employer profiles (top 20):');
const employers = db.prepare(`
  SELECT id, company_name, industry, 
         (SELECT COUNT(*) FROM jobs WHERE employer_id = profiles_employer.id) as job_count
  FROM profiles_employer
  ORDER BY job_count DESC
  LIMIT 20
`).all();

employers.forEach(e => {
  console.log(`[${e.id}] ${e.company_name} (${e.industry || 'N/A'}) - ${e.job_count} jobs`);
});

// Check if there are jobs that might reference real companies in their data
console.log('\n\n3. Jobs that might contain company names in description:');
const sampleJobs = db.prepare(`
  SELECT id, title, company_name, company_display_name, employer_id, 
         SUBSTR(description, 1, 300) as desc_snippet
  FROM jobs
  WHERE (company_name IS NULL OR company_name = '' OR company_name LIKE '%Various%')
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 10
`).all();

sampleJobs.forEach(j => {
  console.log(`\n[${j.id}] ${j.title}`);
  console.log(`  Company: ${j.company_name || 'NULL'}`);
  console.log(`  Display: ${j.company_display_name || 'NULL'}`);
  console.log(`  Employer ID: ${j.employer_id}`);
  console.log(`  Snippet: ${j.desc_snippet}...`);
});

// Total stats
console.log('\n\n4. Summary Statistics:');
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total_jobs,
    SUM(CASE WHEN company_name IS NULL THEN 1 ELSE 0 END) as null_company,
    SUM(CASE WHEN company_name = '' THEN 1 ELSE 0 END) as empty_company,
    SUM(CASE WHEN company_name LIKE '%Various%' THEN 1 ELSE 0 END) as various_company,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_jobs
  FROM jobs
`).get();

console.log('Total jobs:', stats.total_jobs);
console.log('Active jobs:', stats.active_jobs);
console.log('Jobs with NULL company_name:', stats.null_company);
console.log('Jobs with empty company_name:', stats.empty_company);
console.log('Jobs with "Various" in company_name:', stats.various_company);
console.log('Total problematic jobs:', stats.null_company + stats.empty_company + stats.various_company);

db.close();
