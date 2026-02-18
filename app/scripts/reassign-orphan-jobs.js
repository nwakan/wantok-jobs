#!/usr/bin/env node
/**
 * Reassign orphan jobs from catch-all employer (ID 11) to correct employers
 * 
 * Employer ID 11 ("Bank of Papua New Guinea") has been used as a catch-all
 * for jobs from various companies. This script:
 * 1. Analyzes jobs assigned to employer_id = 11
 * 2. Extracts actual company names from job data
 * 3. Matches to existing employer profiles or creates new ones
 * 4. Reassigns jobs to correct employers
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

console.log(`Found ${orphanJobs.length} jobs assigned to employer 11 (Bank of Papua New Guinea)\n`);

// Company name extraction patterns
function extractCompanyName(job) {
  const text = job.description || '';
  const title = job.title || '';
  
  // If company_name is already set and not NULL, use it (unless it's a generic placeholder)
  if (job.company_name && job.company_name.trim()) {
    const name = job.company_name.trim();
    // Ignore placeholder/generic names
    if (!name.match(/^(Employer on WantokJobs|Various|Confidential|Not Specified|TBD|N\/?A)$/i)) {
      return name;
    }
  }
  
  // Known PNG companies (exact matches)
  const knownCompanies = [
    'KPMG', 'Brian Bell Group', 'Brian Bell', 'South Pacific Post', 'Post Courier',
    'Spectra Industrial', 'Baker Boy', 'Duffy Cafe', 'Air Niugini', 
    'Oil Search', 'Santos', 'ExxonMobil', 'BSP', 'Bank South Pacific',
    'Digicel', 'Telikom', 'PNG Power', 'Water PNG', 'PNG DataCo',
    'Asian Development Bank', 'ADB', 'United Nations', 'UN', 'UNICEF',
    'World Bank', 'IMF', 'WHO', 'UNDP', 'IFC', 'FAO',
    'Curtain Bros', 'Steamships', 'Lae Biscuit Company', 'Paradise Foods',
    'Coca-Cola Amatil', 'SP Brewery', 'Credit Corporation', 'Kina Bank',
    'Westpac', 'ANZ', 'Puma Energy', 'InterOil', 'Harmony Gold', 'Newcrest',
    'Ok Tedi', 'Barrick', 'Lihir Gold', 'Pacific MMI', 'Mineral Resources Development Company'
  ];
  
  // Check for known companies in description
  const lowerText = text.toLowerCase();
  for (const company of knownCompanies) {
    if (lowerText.includes(company.toLowerCase())) {
      return company;
    }
  }
  
  // Pattern matching
  const patterns = [
    // "Company Name is seeking..." or "Company Name is hiring..."
    /^([A-Z][A-Za-z\s&.,'()-]+?)\s+(?:is|are)\s+(?:seeking|looking|hiring|advertising|recruiting)/m,
    
    // "Join Company Name" or "Work at Company Name"
    /(?:join|work at|career at|apply to)\s+([A-Z][A-Za-z\s&.,'()-]+?)(?:\s+(?:team|as|for|in|today|now)|\.|!|\n)/i,
    
    // "Company Name - Job Title" at start
    /^([A-Z][A-Za-z\s&.,'()-]+?)\s+-\s+/,
    
    // "About Company Name" or "Company Name About"
    /(?:about|at|with)\s+([A-Z][A-Za-z\s&.,'()-]{3,50}?)(?:\s+(?:is|are|has|offers|provides)|:|\n)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let company = match[1].trim();
      
      // Clean up common suffixes
      company = company
        .replace(/\s+(?:Limited|Ltd|PNG|Corporation|Corp|Inc|Pty|Group|Company)\.?$/i, '')
        .replace(/[,.]$/, '')
        .replace(/\s+(?:the|our|your|their|his|her|its)$/i, '')
        .trim();
      
      // Validate length and content
      if (company.length >= 3 && company.length <= 80 && 
          !company.match(/^(the|a|an|in|at|for|with|by|from|about|this|that|our|your)$/i) &&
          !company.includes('Opportunity') &&
          !company.includes('This is a') &&
          !company.includes('We are looking') &&
          company.split(' ').length <= 8) {  // Max 8 words
        return company;
      }
    }
  }
  
  return null;
}

// Analyze and extract companies
console.log('🔬 Extracting company names from job data...\n');
const analysis = orphanJobs.map(job => {
  const extracted = extractCompanyName(job);
  return {
    job,
    extractedCompany: extracted,
    confidence: extracted ? (job.company_name ? 'high' : 'medium') : 'low'
  };
});

// Group by extracted company
const grouped = {};
analysis.forEach(item => {
  const company = item.extractedCompany || 'UNKNOWN';
  if (!grouped[company]) {
    grouped[company] = [];
  }
  grouped[company].push(item);
});

// Display results
console.log('📊 Analysis Results:');
console.log(`Total jobs: ${orphanJobs.length}`);
console.log(`Companies identified: ${Object.keys(grouped).length - (grouped['UNKNOWN'] ? 1 : 0)}`);
console.log(`Jobs without identifiable company: ${grouped['UNKNOWN']?.length || 0}\n`);

console.log('Top companies found:');
Object.entries(grouped)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 25)
  .forEach(([company, jobs]) => {
    const high = jobs.filter(j => j.confidence === 'high').length;
    const medium = jobs.filter(j => j.confidence === 'medium').length;
    console.log(`  ${company}: ${jobs.length} jobs (${high} high confidence, ${medium} medium)`);
  });

if (!process.argv.includes('--fix')) {
  console.log('\n💡 Review the results above.');
  console.log('   Run with --fix to reassign jobs');
  console.log('   Add --create-missing to create new employer profiles as needed\n');
  db.close();
  process.exit(0);
}

// Proceed with reassignment
console.log('\n🔧 Starting reassignment process...\n');

let reassigned = 0;
let created = 0;
let skipped = 0;
let updated = 0;

const shouldCreateMissing = process.argv.includes('--create-missing');

// Helper to find or create employer
function findOrCreateEmployer(companyName) {
  // Try exact match first
  let employer = db.prepare(`
    SELECT id, company_name FROM profiles_employer 
    WHERE LOWER(company_name) = LOWER(?)
  `).get(companyName);
  
  if (employer) {
    return employer;
  }
  
  // Try fuzzy match
  const fuzzyMatches = db.prepare(`
    SELECT id, company_name FROM profiles_employer 
    WHERE LOWER(company_name) LIKE ?
  `).all(`%${companyName.toLowerCase()}%`);
  
  if (fuzzyMatches.length === 1) {
    console.log(`  → Fuzzy matched "${companyName}" to existing "${fuzzyMatches[0].company_name}"`);
    return fuzzyMatches[0];
  }
  
  // Create new employer if allowed
  if (shouldCreateMissing) {
    try {
      // Generate unique user_id (we'll use a high number range to avoid conflicts)
      const maxUserId = db.prepare('SELECT MAX(user_id) as max FROM profiles_employer').get();
      const newUserId = (maxUserId.max || 70000) + 1;
      
      const insert = db.prepare(`
        INSERT INTO profiles_employer (user_id, company_name, industry, employer_type, verified)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = insert.run(newUserId, companyName, 'Various', 'private', 0);
      created++;
      console.log(`  ✨ Created new employer profile: ${companyName} (ID: ${result.lastInsertRowid})`);
      
      return {
        id: result.lastInsertRowid,
        company_name: companyName
      };
    } catch (err) {
      console.error(`  ❌ Failed to create employer "${companyName}":`, err.message);
      return null;
    }
  }
  
  return null;
}

// Process in transaction
const reassignTransaction = db.transaction(() => {
  Object.entries(grouped).forEach(([companyName, items]) => {
    if (companyName === 'UNKNOWN') {
      skipped += items.length;
      return;
    }
    
    // Find or create employer
    const employer = findOrCreateEmployer(companyName);
    
    if (!employer) {
      console.log(`  ⏭ Skipped ${items.length} jobs for "${companyName}" (no employer profile, --create-missing not set)`);
      skipped += items.length;
      return;
    }
    
    // Update jobs
    const updateJob = db.prepare(`
      UPDATE jobs 
      SET employer_id = ?,
          company_name = ?,
          company_display_name = ?
      WHERE id = ?
    `);
    
    items.forEach(({ job, confidence }) => {
      updateJob.run(employer.id, employer.company_name, employer.company_name, job.id);
      reassigned++;
      
      if (items.length <= 5) {  // Only log individual jobs for small batches
        console.log(`  ✓ [${job.id}] "${job.title}" → ${employer.company_name} (${confidence})`);
      }
    });
    
    if (items.length > 5) {
      console.log(`  ✓ Reassigned ${items.length} jobs to ${employer.company_name}`);
    }
    
    updated++;
  });
});

reassignTransaction();

console.log('\n✅ Reassignment complete!');
console.log(`Employers processed: ${updated}`);
console.log(`Employer profiles created: ${created}`);
console.log(`Jobs reassigned: ${reassigned}`);
console.log(`Jobs skipped: ${skipped}`);

// Verify the fix
const remaining = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = 11').get();
console.log(`\nJobs still assigned to employer 11: ${remaining.count}`);

db.close();
