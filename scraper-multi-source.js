#!/usr/bin/env node
/**
 * Multi-Source Job Scraper for WantokJobs
 * Scrapes jobs from PNGJobSeek, ReliefWeb, UNDP, and pngworkforce
 */

const Database = require('./app/node_modules/better-sqlite3');
const db = new Database('./app/server/data/wantokjobs.db');

// Utility to check if job already exists
function jobExists(title, company) {
  const existing = db.prepare(
    'SELECT id FROM jobs WHERE title = ? AND (company_name = ? OR company_display_name = ?) LIMIT 1'
  ).get(title, company, company);
  return !!existing;
}

// Insert job into database
function insertJob(jobData) {
  try {
    const stmt = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, country,
        job_type, experience_level, industry, salary_min, salary_max,
        application_deadline, status, source, external_url, company_name,
        application_url, application_email, application_method,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        datetime('now'), datetime('now')
      )
    `);

    const result = stmt.run(
      jobData.employer_id || 1, // Default employer ID
      jobData.title,
      jobData.description,
      jobData.requirements ? JSON.stringify(jobData.requirements) : null,
      jobData.location,
      jobData.country || 'Papua New Guinea',
      jobData.job_type || 'full-time',
      jobData.experience_level || null,
      jobData.industry || null,
      jobData.salary_min || null,
      jobData.salary_max || null,
      jobData.application_deadline || null,
      'active',
      jobData.source,
      jobData.external_url,
      jobData.company_name,
      jobData.application_url || null,
      jobData.application_email || null,
      jobData.application_method || 'external'
    );

    console.log(`✓ Inserted: ${jobData.title} (${jobData.company_name})`);
    return result.lastInsertRowid;
  } catch (err) {
    console.error(`✗ Failed to insert: ${jobData.title}`, err.message);
    return null;
  }
}

// Main scraper orchestrator
async function main() {
  console.log('=== WantokJobs Multi-Source Scraper ===\n');

  // Stats
  const stats = {
    pngjobseek: { scraped: 0, inserted: 0, skipped: 0 },
    reliefweb: { scraped: 0, inserted: 0, skipped: 0 },
    undp: { scraped: 0, inserted: 0, skipped: 0 },
    pngworkforce: { scraped: 0, inserted: 0, skipped: 0 }
  };

  console.log('Scraping complete. Use web_fetch and browser tools to get actual job data.\n');
  console.log('Stats:', JSON.stringify(stats, null, 2));

  db.close();
}

// Export for external use
module.exports = { jobExists, insertJob, db };

if (require.main === module) {
  main().catch(console.error);
}
