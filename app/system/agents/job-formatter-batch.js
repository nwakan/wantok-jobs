#!/usr/bin/env node
/**
 * Job Formatter Batch Script
 * Processes unformatted jobs using AI to extract structured sections
 * 
 * Usage:
 *   node system/agents/job-formatter-batch.js [--batch-size=20] [--test]
 */

const path = require('path');
const db = require('../../server/database');
const { formatJobDescription } = require('../../server/lib/job-formatter');

// Parse CLI args
const args = process.argv.slice(2);
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '20', 10);
const testMode = args.includes('--test');

async function run() {
  console.log('🔄 Job Formatter Batch Processor');
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Test mode: ${testMode ? 'YES' : 'NO'}`);
  console.log('');

  // Find jobs that need formatting
  const jobs = db.prepare(`
    SELECT id, title, description, company_name, company_display_name, employer_id
    FROM jobs
    WHERE (formatted_description IS NULL OR format_status = 'pending')
      AND status = 'active'
      AND description IS NOT NULL
      AND length(description) > 50
    ORDER BY created_at DESC
    LIMIT ?
  `).all(batchSize);

  if (jobs.length === 0) {
    console.log('✅ No jobs need formatting. All done!');
    return;
  }

  console.log(`📋 Found ${jobs.length} jobs to format\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const progress = `[${i + 1}/${jobs.length}]`;
    
    console.log(`${progress} Job #${job.id}: ${job.title}`);
    
    try {
      // Skip if description is too short or looks like placeholder
      if (job.description.length < 100) {
        console.log(`   ⏭️  Skipped (too short)`);
        if (!testMode) {
          db.prepare(`UPDATE jobs SET format_status = 'manual' WHERE id = ?`).run(job.id);
        }
        skipped++;
        continue;
      }

      // Format the job description
      const companyName = job.company_display_name || job.company_name || '';
      const formatted = await formatJobDescription(job.description, job.title, companyName);

      // Save to database
      if (!testMode) {
        db.prepare(`
          UPDATE jobs 
          SET formatted_description = ?,
              format_status = 'formatted',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(formatted.formatted_html, job.id);
      }

      // Log summary
      const sectionCount = [
        formatted.about ? 1 : 0,
        formatted.responsibilities.length,
        formatted.requirements.length,
        formatted.benefits.length
      ].reduce((a, b) => a + b, 0);
      
      console.log(`   ✅ Formatted (${sectionCount} sections, ${formatted.formatted_html.length} chars)`);
      successful++;

      // Rate limit: small delay between requests
      if (i < jobs.length - 1) {
        await sleep(200);
      }

    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      
      if (!testMode) {
        db.prepare(`UPDATE jobs SET format_status = 'failed' WHERE id = ?`).run(job.id);
      }
      failed++;

      // If we hit rate limits, stop early
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        console.log('\n⚠️  Rate limit hit. Stopping batch.');
        break;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Batch Summary:');
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📝 Total processed: ${successful + failed + skipped}/${jobs.length}`);
  
  if (testMode) {
    console.log('\n⚠️  TEST MODE - No changes saved to database');
  }
  
  // Check remaining
  const remaining = db.prepare(`
    SELECT COUNT(*) as count
    FROM jobs
    WHERE (formatted_description IS NULL OR format_status = 'pending')
      AND status = 'active'
      AND description IS NOT NULL
      AND length(description) > 50
  `).get();
  
  if (remaining.count > 0) {
    console.log(`\n💡 ${remaining.count} jobs still need formatting. Run again to continue.`);
  } else {
    console.log('\n🎉 All jobs formatted!');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
