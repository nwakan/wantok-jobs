#!/usr/bin/env node
/**
 * Audit current transparency status
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== TRANSPARENCY AUDIT ===\n');

// 1. Count employers by transparency_required
console.log('1. Employers by transparency_required:');
const requiredCounts = db.prepare(`
  SELECT transparency_required, COUNT(*) as count
  FROM profiles_employer
  GROUP BY transparency_required
`).all();
console.table(requiredCounts);

// 2. List all transparency_required employers
console.log('\n2. Transparency-required employers:');
const requiredEmployers = db.prepare(`
  SELECT company_name, employer_type, transparency_required, transparency_score
  FROM profiles_employer
  WHERE transparency_required = 1
  ORDER BY company_name
`).all();
console.log(`Total: ${requiredEmployers.length}`);
console.table(requiredEmployers.slice(0, 30));

// 3. Count transparency records
console.log('\n3. Transparency records:');
const transparencyCount = db.prepare('SELECT COUNT(*) as count FROM hiring_transparency').get();
console.log(`Total hiring_transparency records: ${transparencyCount.count}`);

const transparencyJobs = db.prepare(`
  SELECT j.id, j.title, j.employer_id, ht.job_id
  FROM jobs j
  LEFT JOIN hiring_transparency ht ON j.id = ht.job_id
  WHERE j.employer_id IN (SELECT user_id FROM profiles_employer WHERE transparency_required = 1)
  LIMIT 20
`).all();
console.log('\nSample jobs from required employers:');
console.table(transparencyJobs);

// 4. Employers with NO transparency score
console.log('\n4. Employers with NO transparency score (score = NULL or 0):');
const noScoreEmployers = db.prepare(`
  SELECT company_name, employer_type, transparency_score
  FROM profiles_employer
  WHERE transparency_required = 1 
    AND (transparency_score IS NULL OR transparency_score = 0)
`).all();
console.log(`Total with no score: ${noScoreEmployers.length}`);
console.table(noScoreEmployers.slice(0, 20));

// 5. Check for test data
console.log('\n5. Test/sample employers:');
const testEmployers = db.prepare(`
  SELECT company_name, employer_type, transparency_required
  FROM profiles_employer
  WHERE company_name LIKE '%Test%' OR company_name LIKE '%test%'
`).all();
console.table(testEmployers);

// 6. Private companies that should NOT be required
console.log('\n6. Private companies with transparency_required=1 (likely wrong):');
const wronglyRequired = db.prepare(`
  SELECT company_name, employer_type, transparency_required
  FROM profiles_employer
  WHERE transparency_required = 1
    AND employer_type NOT IN ('government', 'soe', 'statutory')
    AND company_name NOT LIKE '%Foundation%'
    AND company_name NOT LIKE '%Alliance%'
    AND company_name NOT LIKE '%NGO%'
    AND company_name NOT LIKE '%Charity%'
`).all();
console.log(`Total private companies wrongly required: ${wronglyRequired.length}`);
console.table(wronglyRequired);

db.close();
