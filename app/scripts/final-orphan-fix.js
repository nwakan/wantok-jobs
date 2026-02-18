#!/usr/bin/env node
/**
 * Final orphan job reassignment with improved matching
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(DB_PATH);

// Get employer profile to user_id mappings
const employerProfiles = db.prepare(`
  SELECT id, user_id, company_name FROM profiles_employer
  WHERE id IN (227, 514, 458, 1018, 57, 155, 8, 423, 530, 1048, 401, 550, 1059)
`).all();

// Build mapping from company name to user_id (since jobs.employer_id references users.id)
const COMPANY_MAPPINGS = {};
employerProfiles.forEach(emp => {
  COMPANY_MAPPINGS[emp.company_name] = emp.user_id;
});

// Add aliases
COMPANY_MAPPINGS['UN'] = COMPANY_MAPPINGS['United Nations'];
COMPANY_MAPPINGS['UNDP'] = COMPANY_MAPPINGS['United Nations'];
COMPANY_MAPPINGS['UNICEF'] = COMPANY_MAPPINGS['United Nations'];
COMPANY_MAPPINGS['ADB'] = COMPANY_MAPPINGS['Asian Development Bank'];
COMPANY_MAPPINGS['Ok Tedi Mining Limited'] = COMPANY_MAPPINGS['Ok Tedi Mining Limited'] || COMPANY_MAPPINGS['Ok Tedi'];
COMPANY_MAPPINGS['UPNG'] = COMPANY_MAPPINGS['University of Papua New Guinea'];
COMPANY_MAPPINGS['UNITECH'] = COMPANY_MAPPINGS['PNG University of Technology'];
COMPANY_MAPPINGS['DWU'] = COMPANY_MAPPINGS['Divine Word University'];
COMPANY_MAPPINGS['KPMG'] = COMPANY_MAPPINGS['KPMG PNG'];
COMPANY_MAPPINGS['Post Courier'] = COMPANY_MAPPINGS['South Pacific Post'];
COMPANY_MAPPINGS['Newcrest'] = COMPANY_MAPPINGS['Newcrest Mining Limited'];

console.log('📋 Loaded employer mappings:');
console.log(COMPANY_MAPPINGS);
console.log('');

console.log('🔍 Analyzing and reassigning orphan jobs...\n');

// Get all jobs from employer 11
const orphanJobs = db.prepare(`
  SELECT id, title, company_name, description
  FROM jobs
  WHERE employer_id = 11
  ORDER BY id
`).all();

console.log(`Found ${orphanJobs.length} orphan jobs\n`);

function extractCompany(job) {
  const desc = (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const companyName = job.company_name;
  
  // Check company_name first (if not placeholder)
  if (companyName && !companyName.match(/^(Employer on WantokJobs|Various|Confidential)$/i)) {
    // Check direct mapping
    if (COMPANY_MAPPINGS[companyName]) {
      return { name: companyName, userId: COMPANY_MAPPINGS[companyName], confidence: 'high' };
    }
  }
  
  // Check description for known patterns
  for (const [name, userId] of Object.entries(COMPANY_MAPPINGS)) {
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (desc.match(pattern) || job.title.match(pattern)) {
      return { name, userId, confidence: 'medium' };
    }
  }
  
  // Additional extraction for unmapped companies
  const knownCompanies = ['Baker Boy', 'CreditBank PNG', 'Spectra Industrial', 'Wildlife Conservation Society'];
  for (const company of knownCompanies) {
    if (desc.toLowerCase().includes(company.toLowerCase())) {
      return { name: company, empId: null, confidence: 'low' };
    }
  }
  
  return null;
}

// Analyze jobs
const analysis = orphanJobs.map(job => {
  const extracted = extractCompany(job);
  return { job, extracted };
});

// Group by company
const groups = {};
analysis.forEach(({ job, extracted }) => {
  const key = extracted ? `${extracted.name}:${extracted.userId || 'NEW'}` : 'UNKNOWN';
  if (!groups[key]) groups[key] = [];
  groups[key].push(job);
});

console.log('📊 Analysis:');
Object.entries(groups)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20)
  .forEach(([key, jobs]) => {
    const [name, empId] = key.split(':');
    console.log(`  ${name} (${empId}): ${jobs.length} jobs`);
  });

const totalIdentified = Object.keys(groups).filter(k => k !== 'UNKNOWN').length;
const totalUnknown = (groups['UNKNOWN'] || []).length;
console.log(`\n  Identified: ${orphanJobs.length - totalUnknown} jobs`);
console.log(`  Unknown: ${totalUnknown} jobs\n`);

if (!process.argv.includes('--fix')) {
  console.log('💡 Run with --fix to reassign jobs\n');
  db.close();
  process.exit(0);
}

// Execute reassignment
console.log('🔧 Reassigning jobs...\n');

let reassigned = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  Object.entries(groups).forEach(([key, jobs]) => {
    if (key === 'UNKNOWN') {
      skipped += jobs.length;
      return;
    }
    
    const [name, userIdStr] = key.split(':');
    const userId = userIdStr === 'NEW' ? null : parseInt(userIdStr);
    
    if (!userId) {
      console.log(`  ⏭ Skipped ${jobs.length} jobs for "${name}" (no employer profile)`);
      skipped += jobs.length;
      return;
    }
    
    const update = db.prepare(`
      UPDATE jobs 
      SET employer_id = ?, company_name = ?, company_display_name = ?
      WHERE id = ?
    `);
    
    jobs.forEach(job => {
      update.run(userId, name, name, job.id);
      reassigned++;
    });
    
    console.log(`  ✓ Reassigned ${jobs.length} jobs to ${name} (User ID: ${userId})`);
  });
});

transaction();

console.log('\n✅ Complete!');
console.log(`  Reassigned: ${reassigned} jobs`);
console.log(`  Skipped: ${skipped} jobs\n`);

const remaining = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = 11').get();
console.log(`  Remaining in employer 11: ${remaining.count}\n`);

// Show what's left
if (remaining.count > 0 && remaining.count < 20) {
  console.log('Jobs still in employer 11:');
  const leftover = db.prepare(`
    SELECT id, title, company_name 
    FROM jobs 
    WHERE employer_id = 11
    LIMIT 20
  `).all();
  
  leftover.forEach(j => {
    console.log(`  [${j.id}] ${j.title} (${j.company_name || 'NULL'})`);
  });
}

db.close();
