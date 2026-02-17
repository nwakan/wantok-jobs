#!/usr/bin/env node
/**
 * WantokJobs — Automated Job Expiry
 *
 * Finds active jobs older than N days and closes them as auto-expired.
 * Notifies employers via in-app notification.
 *
 * Usage:
 *   node scripts/expire-jobs.js                # Expire jobs older than 60 days
 *   node scripts/expire-jobs.js --dry-run      # Preview without changes
 *   node scripts/expire-jobs.js --days 30      # Override to 30 days
 *
 * Cron (daily at 2AM PGT):
 *   0 2 * * * cd /opt/wantokjobs/app && node scripts/expire-jobs.js >> /var/log/wantokjobs-expire.log 2>&1
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../server/database');

// CLI flags
const DRY_RUN = process.argv.includes('--dry-run');
const daysIdx = process.argv.indexOf('--days');
const DAYS = daysIdx !== -1 ? parseInt(process.argv[daysIdx + 1], 10) : 60;

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

function run() {
  log(`=== Job Expiry ${DRY_RUN ? '(DRY RUN) ' : ''}— closing jobs older than ${DAYS} days ===`);

  // Find active jobs older than N days
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  const staleJobs = db.prepare(`
    SELECT j.id, j.title, j.employer_id, j.created_at
    FROM jobs j
    WHERE j.status = 'active'
      AND j.created_at < ?
    ORDER BY j.created_at ASC
  `).all(cutoff);

  log(`Found ${staleJobs.length} active jobs older than ${DAYS} days`);

  if (staleJobs.length === 0) {
    log('Nothing to expire. Done.');
    process.exit(0);
  }

  // Preview
  for (const job of staleJobs) {
    log(`  → [${job.id}] "${job.title}" (created ${job.created_at}, employer #${job.employer_id})`);
  }

  if (DRY_RUN) {
    log(`DRY RUN complete. ${staleJobs.length} jobs would be expired. No changes made.`);
    process.exit(0);
  }

  // Execute expiry in a transaction
  const updateJob = db.prepare(`
    UPDATE jobs SET status = 'closed', updated_at = datetime('now')
    WHERE id = ?
  `);

  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (?, 'job_expired', 'Job Listing Expired', ?, ?)
  `);

  const expireAll = db.transaction(() => {
    let expired = 0;
    const notifiedEmployers = new Set();

    for (const job of staleJobs) {
      updateJob.run(job.id);
      expired++;

      const message = `Your job listing '${job.title}' has been automatically closed after ${DAYS} days. You can repost it from your dashboard.`;
      const data = JSON.stringify({ job_id: job.id, reason: 'auto-expired' });
      insertNotification.run(job.employer_id, message, data);
      notifiedEmployers.add(job.employer_id);
    }

    return { expired, notified: notifiedEmployers.size };
  });

  const result = expireAll();
  log(`✅ ${result.expired} jobs expired, ${result.notified} employers notified`);
}

try {
  run();
} catch (err) {
  log(`❌ Error: ${err.message}`);
  console.error(err);
  process.exit(1);
}
