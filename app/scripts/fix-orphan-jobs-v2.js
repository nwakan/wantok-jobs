#!/usr/bin/env node
/**
 * Reassign orphan jobs - IMPROVED VERSION
 * Better company name extraction with manual mappings
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(DB_PATH);

console.log('🔍 Analyzing orphan jobs in employer profile 11...\n');

// Get all jobs from employer 11
const orphanJobs = db.prepare(`
  SELECT id, title, company_name, company_display_name, description, 
         external_url, source, location, created_at
  FROM jobs
  WHERE employer_id = 11
  ORDER BY created_at DESC
`).all();

console.log(`Found ${orphanJobs.length} jobs assigned to employer 11\n`);

// Enhanced company extraction
function extractCompanyName(job) {
  const desc = (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '); // Strip HTML
  const title = job.title || '';
  
  // 1. Check existing company_name (if not placeholder)
  if (job.company_name && !job.company_name.match(/^(Employer on WantokJobs|Various|Confidential|Not Specified)$/i)) {
    return job.company_name.trim();
  }
  
  // 2. Known PNG companies - comprehensive list with aliases
  const companyPatterns = [
    { pattern: /\b(united nations|UN[A-Z]{2,})\b/i, name: 'United Nations' },
    { pattern: /\b(asian development bank|ADB)\b/i, name: 'Asian Development Bank' },
    { pattern: /\b(world bank|WB)\b/i, name: 'World Bank' },
    { pattern: /\bKPMG\b/i, name: 'KPMG PNG' },
    { pattern: /\b(brian bell|BBG)\b/i, name: 'Brian Bell Group' },
    { pattern: /\b(south pacific post|post courier)\b/i, name: 'South Pacific Post' },
    { pattern: /\bspectra industrial\b/i, name: 'Spectra Industrial' },
    { pattern: /\b(baker boy|duffy)\b/i, name: 'Baker Boy' },
    { pattern: /\bable computing\b/i, name: 'Able Computing' },
    { pattern: /\bboroko motors\b/i, name: 'Boroko Motors' },
    { pattern: /\bair niugini\b/i, name: 'Air Niugini' },
    { pattern: /\b(BSP|bank south pacific)\b/i, name: 'Bank South Pacific' },
    { pattern: /\bkina bank\b/i, name: 'Kina Bank' },
    { pattern: /\bwestpac png\b/i, name: 'Westpac PNG' },
    { pattern: /\bcredit bank\b/i, name: 'CreditBank PNG' },
    { pattern: /\bdigicel\b/i, name: 'Digicel PNG' },
    { pattern: /\btelikom\b/i, name: 'Telikom PNG' },
    { pattern: /\bpng power\b/i, name: 'PNG Power' },
    { pattern: /\bwater png\b/i, name: 'Water PNG' },
    { pattern: /\bpng dataco\b/i, name: 'PNG DataCo' },
    { pattern: /\b(oil search|santos|exxonmobil|harmony gold|newcrest|ok tedi|barrick|lihir)\b/i, name: (m) => m[1] },
    { pattern: /\bsteamships\b/i, name: 'Steamships Trading Company' },
    { pattern: /\b(university of papua new guinea|UPNG)\b/i, name: 'University of Papua New Guinea' },
    { pattern: /\b(PNG university of technology|UNITECH)\b/i, name: 'PNG University of Technology' },
    { pattern: /\b(divine word university|DWU)\b/i, name: 'Divine Word University' },
    { pattern: /\bwildlife conservation society\b/i, name: 'Wildlife Conservation Society PNG' },
    { pattern: /\bcurtin bros\b/i, name: 'Curtain Brothers' },
  ];
  
  for (const { pattern, name } of companyPatterns) {
    const match = desc.match(pattern) || title.match(pattern);
    if (match) {
      return typeof name === 'function' ? name(match) : name;
    }
  }
  
  // 3. Generic extraction patterns
  const patterns = [
    // "Company Name - Job Title"
    /^([A-Z][A-Za-z\s&.'()-]{2,40}?)\s+-\s+/,
    
    // "Company: Company Name"
    /(?:Company|Employer|Organization):\s*([A-Z][A-Za-z\s&.'()-]{3,50})/i,
    
    // "Location: Place Company: Name"
    /Company:\s*([A-Z][A-Za-z\s&.'()-]{3,50})/i,
    
    // "Join Company Name team"
    /join\s+(?:the\s+)?([A-Z][A-Za-z\s&.'()-]{3,40}?)\s+team/i,
    
    // "Company Name is seeking"
    /^([A-Z][A-Za-z\s&.'()-]{3,50}?)\s+(?:is|are)\s+(?:seeking|hiring|looking|recruiting)/im,
  ];
  
  for (const pattern of patterns) {
    const match = desc.match(pattern) || title.match(pattern);
    if (match && match[1]) {
      let company = match[1].trim()
        .replace(/\s+(?:Ltd|Limited|PNG|Inc|Corporation|Corp|Group|Company|Pty)\.?$/i, '')
        .replace(/[,.]$/, '')
        .trim();
      
      // Validate
      const words = company.split(/\s+/);
      if (words.length >= 2 && words.length <= 6 && 
          company.length >= 5 && company.length <= 60 &&
          !company.match(/\b(opportunity|position|vacancy|role|job|hiring|seeking|looking)\b/i)) {
        return company;
      }
    }
  }
  
  return null;
}

// Analyze jobs
console.log('🔬 Extracting company names...\n');
const analysis = orphanJobs.map(job => ({
  job,
  company: extractCompanyName(job)
}));

// Group by company
const grouped = {};
analysis.forEach(({ job, company }) => {
  const key = company || 'UNKNOWN';
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(job);
});

// Display results
const identified = Object.keys(grouped).filter(k => k !== 'UNKNOWN').length;
console.log('📊 Results:');
console.log(`  Total jobs: ${orphanJobs.length}`);
console.log(`  Companies identified: ${identified}`);
console.log(`  Unknown: ${grouped['UNKNOWN']?.length || 0}\n`);

console.log('Companies found:');
Object.entries(grouped)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([company, jobs], i) => {
    if (i < 30) {
      console.log(`  ${company}: ${jobs.length} jobs`);
    }
  });

// Check for existing employer profiles
console.log('\n\n🔍 Checking existing employer profiles...\n');
const employerMap = {};

Object.keys(grouped).forEach(company => {
  if (company === 'UNKNOWN') return;
  
  // Try exact match
  let emp = db.prepare(`
    SELECT id, company_name FROM profiles_employer 
    WHERE LOWER(company_name) = LOWER(?)
  `).get(company);
  
  if (emp) {
    employerMap[company] = { id: emp.id, name: emp.company_name, action: 'exists' };
    return;
  }
  
  // Try fuzzy match
  const fuzzy = db.prepare(`
    SELECT id, company_name FROM profiles_employer 
    WHERE LOWER(company_name) LIKE ?
  `).all(`%${company.toLowerCase()}%`);
  
  if (fuzzy.length === 1) {
    employerMap[company] = { id: fuzzy[0].id, name: fuzzy[0].company_name, action: 'fuzzy' };
  } else if (fuzzy.length > 1) {
    employerMap[company] = { matches: fuzzy, action: 'multiple' };
  } else {
    employerMap[company] = { action: 'missing' };
  }
});

const exists = Object.values(employerMap).filter(e => e.action === 'exists').length;
const fuzzy = Object.values(employerMap).filter(e => e.action === 'fuzzy').length;
const missing = Object.values(employerMap).filter(e => e.action === 'missing').length;

console.log(`  Exact match: ${exists} companies`);
console.log(`  Fuzzy match: ${fuzzy} companies`);
console.log(`  Need creation: ${missing} companies\n`);

if (!process.argv.includes('--fix')) {
  console.log('💡 Run with --fix to reassign jobs');
  console.log('   Add --create-missing to create new employer profiles\n');
  db.close();
  process.exit(0);
}

// Execute reassignment
console.log('🔧 Reassigning jobs...\n');

const shouldCreate = process.argv.includes('--create-missing');
let reassigned = 0;
let created = 0;
let skipped = 0;

const transaction = db.transaction(() => {
  Object.entries(grouped).forEach(([company, jobs]) => {
    if (company === 'UNKNOWN') {
      skipped += jobs.length;
      console.log(`  ⏭ Skipped ${jobs.length} jobs (unknown company)`);
      return;
    }
    
    const empInfo = employerMap[company];
    let empId = null;
    
    if (empInfo.action === 'exists' || empInfo.action === 'fuzzy') {
      empId = empInfo.id;
      if (empInfo.action === 'fuzzy') {
        console.log(`  → "${company}" matched to existing "${empInfo.name}"`);
      }
    } else if (empInfo.action === 'missing' && shouldCreate) {
      // Create new employer
      const maxUserId = db.prepare('SELECT MAX(user_id) as max FROM profiles_employer').get();
      const newUserId = (maxUserId.max || 70000) + 1;
      
      try {
        const insert = db.prepare(`
          INSERT INTO profiles_employer (user_id, company_name, industry, employer_type, verified)
          VALUES (?, ?, 'Various', 'private', 0)
        `);
        const result = insert.run(newUserId, company);
        empId = result.lastInsertRowid;
        created++;
        console.log(`  ✨ Created: ${company} (ID ${empId})`);
      } catch (err) {
        console.error(`  ❌ Failed to create "${company}":`, err.message);
      }
    } else {
      skipped += jobs.length;
      console.log(`  ⏭ Skipped ${jobs.length} jobs for "${company}" (no profile, --create-missing not set)`);
      return;
    }
    
    if (empId) {
      const update = db.prepare(`
        UPDATE jobs 
        SET employer_id = ?, company_name = ?, company_display_name = ?
        WHERE id = ?
      `);
      
      jobs.forEach(job => {
        update.run(empId, company, company, job.id);
        reassigned++;
      });
      
      console.log(`  ✓ Reassigned ${jobs.length} jobs to ${company}`);
    }
  });
});

transaction();

console.log('\n✅ Complete!');
console.log(`  Reassigned: ${reassigned} jobs`);
console.log(`  Created: ${created} employers`);
console.log(`  Skipped: ${skipped} jobs`);

const remaining = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = 11').get();
console.log(`\n  Remaining in employer 11: ${remaining.count}\n`);

db.close();
