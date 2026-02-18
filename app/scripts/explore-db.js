#!/usr/bin/env node
const Database = require('better-sqlite3');
const db = new Database('server/data/wantokjobs.db');

console.log('=== Tables ===');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
tables.forEach(t => console.log('-', t.name));

console.log('\n=== Various Employers Count ===');
const count = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE company_name LIKE '%Various%'`).get();
console.log('Count:', count.count);

if (count.count > 0) {
  console.log('\n=== Sample Jobs ===');
  const samples = db.prepare(`
    SELECT id, title, company_name, company_display_name, employer_id, location
    FROM jobs 
    WHERE company_name LIKE '%Various%'
    LIMIT 10
  `).all();
  samples.forEach(j => {
    console.log(`[${j.id}] ${j.title}`);
    console.log(`  Company: ${j.company_name}`);
    console.log(`  Display: ${j.company_display_name}`);
    console.log(`  Employer ID: ${j.employer_id}`);
    console.log(`  Location: ${j.location}`);
    console.log('');
  });
}

console.log('\n=== Checking employer_id reference ===');
const empCheck = db.prepare(`
  SELECT DISTINCT employer_id 
  FROM jobs 
  WHERE company_name LIKE '%Various%'
  LIMIT 5
`).all();
console.log('Employer IDs used by Various Employers jobs:', empCheck);

db.close();
