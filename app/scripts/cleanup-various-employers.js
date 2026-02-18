#!/usr/bin/env node
/**
 * Clean up "Various Employers" orphan jobs
 * 
 * These jobs are incorrectly assigned to a generic "Various Employers" company
 * instead of their actual employer. This script:
 * 1. Finds all jobs with company_name = "Various Employers"
 * 2. Analyzes the job data to extract the actual company name
 * 3. Reassigns to existing employer profiles or creates new ones
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../server/data/wantokjobs.db');
const db = new Database(DB_PATH);

console.log('🔍 Analyzing "Various Employers" orphan jobs...\n');

// Find all jobs with "Various Employers"
const orphanJobs = db.prepare(`
  SELECT id, title, company_name, company_display_name, description, 
         source_url, source, location, created_at
  FROM jobs
  WHERE company_name = 'Various Employers'
  ORDER BY created_at DESC
`).all();

console.log(`Found ${orphanJobs.length} orphan jobs\n`);

if (orphanJobs.length === 0) {
  console.log('✅ No orphan jobs found!');
  process.exit(0);
}

// Show sample
console.log('Sample orphan jobs:');
orphanJobs.slice(0, 5).forEach((job, i) => {
  console.log(`${i + 1}. [${job.id}] ${job.title}`);
  console.log(`   Location: ${job.location}`);
  console.log(`   Source: ${job.source} | ${job.source_url || 'N/A'}`);
  console.log(`   Description snippet: ${job.description ? job.description.substring(0, 100) + '...' : 'N/A'}`);
  console.log('');
});

// Extract company names from description or other fields
function extractCompanyName(job) {
  // Try various patterns
  const patterns = [
    // "Apply through XYZ Company"
    /apply\s+(?:through|at|to|with)\s+([A-Z][A-Za-z\s&.,-]+?)(?:\s+(?:website|portal|careers|here)|\.|$)/i,
    // "XYZ Company is hiring"
    /^([A-Z][A-Za-z\s&.,-]+?)\s+is\s+(?:hiring|seeking|looking)/i,
    // "Join XYZ Company"
    /join\s+([A-Z][A-Za-z\s&.,-]+?)(?:\s+as|\s+team|\.)/i,
    // Common PNG employers in text
    /((?:Oil Search|Santos|ExxonMobil|BSP|Bank South Pacific|Digicel|Telikom|PNG Power|Air Niugini|Newcrest|Ok Tedi|Barrick|Harmony Gold|Lihir Gold)[A-Za-z\s]*)/i,
  ];

  if (job.description) {
    for (const pattern of patterns) {
      const match = job.description.match(pattern);
      if (match) {
        const company = match[1].trim();
        // Clean up
        const cleaned = company
          .replace(/\s+(?:Limited|Ltd|PNG|Corporation|Corp|Inc)\.?$/i, '')
          .replace(/[,.]$/, '')
          .trim();
        
        if (cleaned.length > 3 && cleaned.length < 80) {
          return cleaned;
        }
      }
    }
  }

  // Check source URL for company hints
  if (job.source_url) {
    const urlMatch = job.source_url.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\./i);
    if (urlMatch) {
      const domain = urlMatch[1];
      // Common company domain patterns
      if (!['seek', 'indeed', 'linkedin', 'jora', 'talent'].includes(domain.toLowerCase())) {
        return domain
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
  }

  return null;
}

// Analyze all jobs
console.log('🔬 Extracting company names...\n');
const analysis = orphanJobs.map(job => {
  const extracted = extractCompanyName(job);
  return {
    job,
    extractedCompany: extracted
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

console.log('📊 Analysis Results:');
console.log(`Total orphan jobs: ${orphanJobs.length}`);
console.log(`Companies identified: ${Object.keys(grouped).length - (grouped['UNKNOWN'] ? 1 : 0)}`);
console.log(`Jobs without identifiable company: ${grouped['UNKNOWN']?.length || 0}\n`);

// Show grouping
Object.entries(grouped)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 15)
  .forEach(([company, jobs]) => {
    console.log(`${company}: ${jobs.length} jobs`);
  });

console.log('\n💡 Next steps:');
console.log('1. Review the extracted company names above');
console.log('2. Run with --fix flag to reassign jobs to correct employers');
console.log('3. Use --create-missing to create new employer profiles where needed\n');

// Check if we should proceed with fixes
if (process.argv.includes('--fix')) {
  console.log('🔧 Starting reassignment process...\n');
  
  let reassigned = 0;
  let created = 0;
  let skipped = 0;
  
  const shouldCreateMissing = process.argv.includes('--create-missing');
  
  // Start transaction
  const reassign = db.transaction(() => {
    Object.entries(grouped).forEach(([companyName, items]) => {
      if (companyName === 'UNKNOWN') {
        skipped += items.length;
        return;
      }
      
      // Check if company exists
      const existing = db.prepare(`
        SELECT id, name FROM companies 
        WHERE LOWER(name) = LOWER(?)
      `).get(companyName);
      
      if (existing) {
        // Update jobs to use this company
        const update = db.prepare(`
          UPDATE jobs 
          SET company_name = ?,
              company_display_name = ?
          WHERE id = ?
        `);
        
        items.forEach(({ job }) => {
          update.run(existing.name, existing.name, job.id);
          reassigned++;
          console.log(`✓ Reassigned job ${job.id} to ${existing.name}`);
        });
      } else if (shouldCreateMissing) {
        // Create new company profile
        const insertCompany = db.prepare(`
          INSERT INTO companies (name, slug, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
        `);
        
        const slug = companyName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        
        try {
          const result = insertCompany.run(companyName, slug);
          created++;
          console.log(`✨ Created new company profile: ${companyName}`);
          
          // Now update jobs
          const update = db.prepare(`
            UPDATE jobs 
            SET company_name = ?,
                company_display_name = ?
            WHERE id = ?
          `);
          
          items.forEach(({ job }) => {
            update.run(companyName, companyName, job.id);
            reassigned++;
            console.log(`✓ Reassigned job ${job.id} to ${companyName}`);
          });
        } catch (err) {
          console.error(`❌ Failed to create company ${companyName}:`, err.message);
          skipped += items.length;
        }
      } else {
        skipped += items.length;
        console.log(`⏭ Skipped ${items.length} jobs for non-existent company: ${companyName}`);
      }
    });
  });
  
  reassign();
  
  console.log('\n✅ Reassignment complete!');
  console.log(`Jobs reassigned: ${reassigned}`);
  console.log(`Companies created: ${created}`);
  console.log(`Jobs skipped: ${skipped}`);
} else {
  console.log('ℹ️  Dry run complete. No changes made.');
  console.log('   Run with --fix to apply changes');
  console.log('   Add --create-missing to create new employer profiles as needed\n');
}

db.close();
