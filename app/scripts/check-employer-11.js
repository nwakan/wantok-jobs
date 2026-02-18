#!/usr/bin/env node
const Database = require('better-sqlite3');
const db = new Database('server/data/wantokjobs.db');

console.log('=== Analyzing Employer ID 11 ===\n');

const employer = db.prepare('SELECT * FROM profiles_employer WHERE id = 11').get();
console.log('Employer Profile:');
console.log(employer);

console.log('\n\n=== Sample jobs from this employer ===');
const jobs = db.prepare(`
  SELECT id, title, company_name, company_display_name, 
         SUBSTR(description, 1, 400) as desc_snippet,
         created_at
  FROM jobs
  WHERE employer_id = 11
  ORDER BY created_at DESC
  LIMIT 20
`).all();

jobs.forEach(j => {
  console.log(`\n[${j.id}] ${j.title} (${j.created_at})`);
  console.log(`  Company name: ${j.company_name || 'NULL'}`);
  console.log(`  Display name: ${j.company_display_name || 'NULL'}`);
  console.log(`  Description snippet: ${j.desc_snippet}...`);
  console.log(`  ---`);
});

// Try to extract actual companies from descriptions
console.log('\n\n=== Extracting companies from descriptions ===');
const patterns = [
  /(?:join|work at|career at)\s+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:is|are|has|offers|seeks|looking|hiring)|\.|!)/i,
  /(?:KPMG|Brian Bell|South Pacific Post|Spectra Industrial|Baker Boy|Duffy|Air Niugini|Oil Search|Santos)/gi,
  /^([A-Z][A-Za-z\s&.,-]+?)\s+(?:is|are)\s+(?:seeking|looking|hiring|advertising)/i,
];

const extracted = new Map();

jobs.forEach(j => {
  let found = null;
  
  // Try patterns
  for (const pattern of patterns) {
    const match = j.desc_snippet?.match(pattern);
    if (match) {
      found = match[0] || match[1];
      break;
    }
  }
  
  if (found) {
    const clean = found.trim()
      .replace(/^(join|work at|career at)\s+/i, '')
      .replace(/\s+(is|are|has|offers|seeks|looking|hiring).*$/i, '')
      .trim();
    
    if (!extracted.has(clean)) {
      extracted.set(clean, []);
    }
    extracted.get(clean).push(j.id);
  }
});

console.log('\nCompanies found in descriptions:');
extracted.forEach((jobIds, company) => {
  console.log(`${company}: ${jobIds.length} jobs (IDs: ${jobIds.slice(0, 5).join(', ')}${jobIds.length > 5 ? '...' : ''})`);
});

db.close();
