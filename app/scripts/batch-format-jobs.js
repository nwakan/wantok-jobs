#!/usr/bin/env node
/**
 * Batch Job Formatter
 * Re-formats all unformatted jobs using AI
 */

const path = require('path');
const db = require('../server/database');
const { formatJobDescription } = require('../server/lib/job-formatter');

async function batchFormatJobs() {
  console.log('🔍 Checking for unformatted jobs...\n');

  // Get stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN format_status = 'formatted' THEN 1 ELSE 0 END) as formatted,
      SUM(CASE WHEN format_status IS NULL OR format_status = 'pending' THEN 1 ELSE 0 END) as unformatted,
      SUM(CASE WHEN format_status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM jobs 
    WHERE status = 'active'
  `).get();

  console.log('📊 Job Formatting Stats:');
  console.log(`   Total active jobs: ${stats.total}`);
  console.log(`   ✅ Formatted: ${stats.formatted}`);
  console.log(`   ⏳ Unformatted: ${stats.unformatted}`);
  console.log(`   ❌ Failed: ${stats.failed}\n`);

  // Get unformatted jobs
  const unformattedJobs = db.prepare(`
    SELECT id, title, description, company_name
    FROM jobs
    WHERE status = 'active'
      AND (format_status IS NULL OR format_status = 'pending' OR format_status = 'failed')
      AND description IS NOT NULL
      AND LENGTH(description) > 100
    ORDER BY created_at DESC
  `).all();

  if (unformattedJobs.length === 0) {
    console.log('✨ All jobs are already formatted!');
    return;
  }

  console.log(`🚀 Starting batch format of ${unformattedJobs.length} jobs...\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < unformattedJobs.length; i++) {
    const job = unformattedJobs[i];
    const progress = `[${i + 1}/${unformattedJobs.length}]`;

    try {
      // Skip if description is too short
      if (!job.description || job.description.length < 100) {
        console.log(`${progress} ⏭️  Skipped job #${job.id} (description too short)`);
        skipped++;
        continue;
      }

      console.log(`${progress} 🔄 Formatting job #${job.id}: ${job.title.slice(0, 50)}...`);

      // Format the job description
      const formatted = await formatJobDescription(
        job.description,
        job.title,
        job.company_name || ''
      );

      // Update the database
      db.prepare(`
        UPDATE jobs 
        SET formatted_description = ?, 
            format_status = 'formatted',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(formatted.formatted_html, job.id);

      console.log(`${progress} ✅ Job #${job.id} formatted successfully`);
      success++;

      // Rate limiting: wait 1 second between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`${progress} ❌ Failed to format job #${job.id}:`, error.message);
      
      // Mark as failed in DB
      db.prepare(`
        UPDATE jobs 
        SET format_status = 'failed'
        WHERE id = ?
      `).run(job.id);
      
      failed++;

      // Continue with next job
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📈 Batch Formatting Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully formatted: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total processed: ${success + failed + skipped}`);
  
  // Final stats
  const finalStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN format_status = 'formatted' THEN 1 ELSE 0 END) as formatted
    FROM jobs 
    WHERE status = 'active'
  `).get();
  
  console.log(`\n🎯 Overall: ${finalStats.formatted}/${finalStats.total} active jobs now formatted`);
}

// Run the batch formatter
batchFormatJobs()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
