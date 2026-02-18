#!/usr/bin/env node
/**
 * Batch Job Formatter v2
 * Formats all pending/failed jobs using hybrid regex+LLM
 * Tracks progress, handles errors, reports stats
 */
require('dotenv').config();
const db = require('../server/database');
const { formatJobDescription } = require('../server/lib/job-formatter');

async function run() {
  const jobs = db.prepare(`
    SELECT id, title, description, company_name 
    FROM jobs 
    WHERE (format_status IS NULL OR format_status = 'pending' OR format_status = 'failed')
    AND description IS NOT NULL 
    AND length(description) > 50
    ORDER BY id
  `).all();

  console.log(`Found ${jobs.length} jobs to format`);
  
  let formatted = 0, skipped = 0, failed = 0, llmUsed = 0, regexUsed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    try {
      const result = await formatJobDescription(job.description, job.title || '', job.company_name || '');
      
      if (result && result.formatted_html) {
        db.prepare(`
          UPDATE jobs SET formatted_description = ?, format_status = 'formatted' WHERE id = ?
        `).run(JSON.stringify(result), job.id);
        formatted++;
        if (result.method === 'regex') regexUsed++;
        else llmUsed++;
      } else {
        db.prepare(`UPDATE jobs SET format_status = 'failed' WHERE id = ?`).run(job.id);
        failed++;
      }
    } catch (err) {
      db.prepare(`UPDATE jobs SET format_status = 'failed' WHERE id = ?`).run(job.id);
      failed++;
      if (failed <= 5) console.error(`  Error on job ${job.id}: ${err.message}`);
    }

    // Progress every 50
    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/${jobs.length} (${formatted} ok, ${failed} fail, regex=${regexUsed}, llm=${llmUsed})`);
    }

    // Rate limit for LLM calls
    if (llmUsed > 0 && llmUsed % 1 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\nDONE:`);
  console.log(`  Total: ${jobs.length}`);
  console.log(`  Formatted: ${formatted} (regex: ${regexUsed}, llm: ${llmUsed})`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  
  // Verify
  const counts = db.prepare(`SELECT format_status, COUNT(*) as c FROM jobs GROUP BY format_status`).all();
  console.log(`\nDB status:`, counts);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
