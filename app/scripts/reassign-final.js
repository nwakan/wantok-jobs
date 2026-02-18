#!/usr/bin/env node
/**
 * Final reassignment with correct user IDs from profiles_employer
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(DB_PATH);

// Consolidated mappings - using user_id from profiles_employer
// jobs.employer_id references users.id, so we need user_id not profile id
const EMPLOYER_USER_IDS = {
  // UN family - consolidate to main UN profile
  'United Nations': 61613,  // United Nations Volunteers (profile 227)
  'UN': 61613,
  'UNDP': 63194,  // UNDP Pacific
  'UNICEF': 63195,  // UNICEF Pacific
  'UN Women': 62439,
  'UNFPA': 62173,
  
  // Asian Development Bank
  'Asian Development Bank': 63302,  // Profile 1808
  'ADB': 63302,
  
  // Universities
  'University of Papua New Guinea': 61443,
  'UPNG': 61443,
  'PNG University of Technology': 61541,
  'UNITECH': 61541,
  'Divine Word University': 61394,
  'DWU': 61394,
  
  // Mining
  'Ok Tedi': 61866,
  'Ok Tedi Mining Limited': 61866,
  
  // IT/Tech
  'Able Computing': 62512,
  'Able computing': 62512,
  
  // Finance/Banking
  'KPMG PNG': 62520,
  'KPMG': 62520,
  
  // Other known companies
  'South Pacific Post': 62024,  // Using NICTA as proxy - need to verify
  'Post Courier': 62024,
  'Boroko Motors': null,  // Need to create
  'Newcrest Mining Limited': null,
  'Spectra Industrial': null,
  'Baker Boy': null,
  'CreditBank PNG': null,
};

console.log('🔍 Reassigning orphan jobs with correct employer mappings...\n');

// Get orphan jobs
const orphanJobs = db.prepare(`
  SELECT id, title, company_name, description
  FROM jobs
  WHERE employer_id = 11
  ORDER BY id
`).all();

console.log(`Found ${orphanJobs.length} orphan jobs\n`);

function extractCompany(job) {
  const desc = (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const company_name = job.company_name;
  
  // 1. Check company_name if not placeholder
  if (company_name && !company_name.match(/^(Employer on WantokJobs|Various|Confidential)$/i)) {
    if (EMPLOYER_USER_IDS[company_name] !== undefined) {
      return { name: company_name, userId: EMPLOYER_USER_IDS[company_name] };
    }
  }
  
  // 2. Scan description for known companies
  for (const [name, userId] of Object.entries(EMPLOYER_USER_IDS)) {
    if (userId === null) continue;  // Skip companies without profiles
    
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (desc.match(regex) || job.title.match(regex)) {
      return { name, userId };
    }
  }
  
  return null;
}

// Analyze
const results = orphanJobs.map(job => {
  const match = extractCompany(job);
  return { job, match };
});

// Group
const groups = {};
results.forEach(({ job, match }) => {
  const key = match ? `${match.name}|${match.userId}` : 'UNKNOWN';
  if (!groups[key]) groups[key] = [];
  groups[key].push(job);
});

console.log('📊 Analysis:\n');
Object.entries(groups)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([key, jobs]) => {
    const [name, userId] = key.split('|');
    console.log(`  ${name} (user_id: ${userId}): ${jobs.length} jobs`);
  });

const identified = results.filter(r => r.match).length;
console.log(`\nIdentified: ${identified}/${orphanJobs.length} jobs\n`);

if (!process.argv.includes('--fix')) {
  console.log('💡 Run with --fix to apply changes\n');
  db.close();
  process.exit(0);
}

// Apply changes
console.log('🔧 Applying reassignments...\n');

let reassigned = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  Object.entries(groups).forEach(([key, jobs]) => {
    if (key === 'UNKNOWN') {
      skipped += jobs.length;
      return;
    }
    
    const [name, userId] = key.split('|');
    
    if (!userId || userId === 'null') {
      console.log(`  ⏭ Skipped ${jobs.length} jobs for "${name}" (no profile)`);
      skipped += jobs.length;
      return;
    }
    
    const update = db.prepare(`
      UPDATE jobs 
      SET employer_id = ?, company_name = ?, company_display_name = ?
      WHERE id = ?
    `);
    
    jobs.forEach(job => {
      update.run(parseInt(userId), name, name, job.id);
    });
    
    reassigned += jobs.length;
    console.log(`  ✓ Reassigned ${jobs.length} jobs to "${name}" (user_id: ${userId})`);
  });
});

transaction();

console.log('\n✅ Complete!');
console.log(`  Reassigned: ${reassigned} jobs`);
console.log(`  Skipped: ${skipped} jobs\n`);

const remaining = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = 11').get();
console.log(`Remaining in employer 11: ${remaining.count}\n`);

db.close();
