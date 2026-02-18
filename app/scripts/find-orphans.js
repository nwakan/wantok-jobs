#!/usr/bin/env node
const Database = require('better-sqlite3');
const db = new Database('server/data/wantokjobs.db');

console.log('=== Checking profiles_employer table ===');
const empSchema = db.prepare(`PRAGMA table_info(profiles_employer)`).all();
console.log('Columns:', empSchema.map(c => c.name).join(', '));

console.log('\n=== Looking for "Various" employer profiles ===');
const variousProfiles = db.prepare(`
  SELECT id, user_id, company_name, industry
  FROM profiles_employer 
  WHERE company_name LIKE '%Various%'
`).all();
console.log('Found:', variousProfiles.length);
variousProfiles.forEach(p => console.log(p));

if (variousProfiles.length > 0) {
  const variousId = variousProfiles[0].id;
  console.log(`\n=== Jobs assigned to Various Employers (employer_id = ${variousId}) ===`);
  const jobs = db.prepare(`
    SELECT id, title, company_name, company_display_name, employer_id, location, created_at
    FROM jobs 
    WHERE employer_id = ?
    ORDER BY created_at DESC
    LIMIT 15
  `).all(variousId);
  
  console.log(`Total jobs: ${jobs.length}`);
  jobs.forEach(j => {
    console.log(`[${j.id}] ${j.title}`);
    console.log(`  Company name: ${j.company_name || 'NULL'}`);
    console.log(`  Display name: ${j.company_display_name || 'NULL'}`);
    console.log(`  Location: ${j.location}`);
    console.log('');
  });
  
  // Get total count
  const totalCount = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE employer_id = ?`).get(variousId);
  console.log(`\nTotal orphan jobs: ${totalCount.count}`);
}

// Also check for jobs without proper employer linkage
console.log('\n=== Jobs with generic company names ===');
const generic = db.prepare(`
  SELECT COUNT(*) as count, company_name
  FROM jobs
  WHERE company_name IN ('Various Employers', 'Confidential', 'Not Specified', 'Multiple Employers', 'N/A', '')
    OR company_name IS NULL
  GROUP BY company_name
`).all();
generic.forEach(g => console.log(`${g.company_name || 'NULL'}: ${g.count} jobs`));

db.close();
