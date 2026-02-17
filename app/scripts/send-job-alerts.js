#!/usr/bin/env node
/**
 * WantokJobs — Job Alert Email Digest
 * 
 * Finds all active job alert subscriptions, matches new jobs posted since
 * last alert, and sends digest emails via Brevo.
 * 
 * Usage:
 *   node scripts/send-job-alerts.js              # Process all due alerts
 *   node scripts/send-job-alerts.js --dry-run     # Preview without sending
 *   node scripts/send-job-alerts.js --force        # Ignore frequency timing
 * 
 * Cron (daily at 8AM PGT):
 *   0 8 * * * cd /path/to/app && node scripts/send-job-alerts.js >> logs/job-alerts.log 2>&1
 */

const path = require('path');
// Ensure we load from the app directory
process.chdir(path.join(__dirname, '..'));

const db = require('../server/database');
const { sendJobAlertEmail } = require('../server/lib/email');
const { dailyJobAlertDigest, weeklyJobAlertDigest, noMatchesAlert } = require('../server/lib/job-alert-emails');

// CLI flags
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

/**
 * Build a WHERE clause to match jobs against an alert's criteria.
 */
function buildMatchQuery(alert) {
  const conditions = ["j.status = 'active'"];
  const params = [];

  // Time window: jobs posted since last_sent (or last 24h for daily, 7d for weekly)
  if (alert.last_sent && !FORCE) {
    conditions.push("j.created_at > ?");
    params.push(alert.last_sent);
  } else {
    const hours = alert.frequency === 'weekly' ? 168 : 24;
    conditions.push(`j.created_at > datetime('now', '-${hours} hours')`);
  }

  // Keywords match (title or description)
  if (alert.keywords) {
    const kw = alert.keywords.trim().toLowerCase();
    // Split on commas or spaces for multi-keyword matching
    const words = kw.split(/[,\s]+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const kwConds = words.map(() => "(LOWER(j.title) LIKE ? OR LOWER(j.description) LIKE ?)");
      conditions.push(`(${kwConds.join(' OR ')})`);
      for (const w of words) {
        params.push(`%${w}%`, `%${w}%`);
      }
    }
  }

  // Category
  if (alert.category_id) {
    conditions.push("j.category_id = ?");
    params.push(alert.category_id);
  }

  // Location
  if (alert.location) {
    conditions.push("(LOWER(j.location) LIKE ? OR LOWER(j.country) LIKE ?)");
    const loc = `%${alert.location.toLowerCase()}%`;
    params.push(loc, loc);
  }

  // Job type
  if (alert.job_type) {
    conditions.push("j.job_type = ?");
    params.push(alert.job_type);
  }

  // Minimum salary
  if (alert.salary_min) {
    conditions.push("(j.salary_min >= ? OR j.salary_max >= ?)");
    params.push(alert.salary_min, alert.salary_min);
  }

  return { where: conditions.join(' AND '), params };
}

/**
 * Check if an alert is due to be sent based on its frequency.
 */
function isDue(alert) {
  if (FORCE) return true;
  if (!alert.last_sent) return true;

  const lastSent = new Date(alert.last_sent);
  const now = new Date();
  const hoursSince = (now - lastSent) / (1000 * 60 * 60);

  switch (alert.frequency) {
    case 'instant': return true; // instant alerts are handled by sendNewJobAlerts in email.js
    case 'daily': return hoursSince >= 20; // ~daily with some buffer
    case 'weekly': return hoursSince >= 160; // ~weekly with buffer
    default: return hoursSince >= 20;
  }
}

async function main() {
  log(`=== WantokJobs Job Alert Digest ===`);
  log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${FORCE ? ' (FORCED)' : ''}`);

  // Get all active email alerts (daily + weekly only; instant handled elsewhere)
  const alerts = db.prepare(`
    SELECT ja.*, u.email, u.name
    FROM job_alerts ja
    JOIN users u ON ja.user_id = u.id
    WHERE ja.active = 1
      AND ja.channel = 'email'
      AND ja.frequency IN ('daily', 'weekly')
      AND u.email_verified = 1
    ORDER BY ja.frequency, ja.user_id
  `).all();

  log(`Found ${alerts.length} active email alerts (daily/weekly)`);

  let sent = 0;
  let skipped = 0;
  let noMatches = 0;
  let errors = 0;

  for (const alert of alerts) {
    try {
      // Check if due
      if (!isDue(alert)) {
        skipped++;
        continue;
      }

      // Find matching jobs
      const { where, params } = buildMatchQuery(alert);
      const query = `
        SELECT j.id, j.title, j.description, j.location, j.job_type,
               j.salary_min, j.salary_max, j.salary_currency, j.created_at,
               j.company_name, pe.company_name as employer_company
        FROM jobs j
        LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
        WHERE ${where}
        ORDER BY j.created_at DESC
        LIMIT 20
      `;
      
      const jobs = db.prepare(query).all(...params);

      // Normalize company_name
      for (const job of jobs) {
        job.company_name = job.company_name || job.employer_company || 'PNG Employer';
        delete job.employer_company;
      }

      if (jobs.length === 0) {
        noMatches++;
        log(`  [${alert.id}] ${alert.email} — "${alert.keywords || 'all'}" — 0 matches (${alert.frequency})`);
        // Don't send "no matches" email every time — only occasionally
        // Skip no-match emails for now to avoid annoyance
        continue;
      }

      log(`  [${alert.id}] ${alert.email} — "${alert.keywords || 'all'}" — ${jobs.length} matches (${alert.frequency})`);

      if (!DRY_RUN) {
        // Use the existing sendJobAlertEmail from email.js
        await sendJobAlertEmail(
          { email: alert.email, name: alert.name },
          jobs,
          alert.keywords || 'your job alert'
        );

        // Update last_sent
        db.prepare("UPDATE job_alerts SET last_sent = datetime('now') WHERE id = ?").run(alert.id);
        sent++;
      } else {
        log(`    [DRY RUN] Would send ${jobs.length} jobs to ${alert.email}`);
        sent++;
      }

      // Small delay between sends to avoid rate limiting
      if (!DRY_RUN) {
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (err) {
      errors++;
      log(`  [ERROR] Alert ${alert.id} (${alert.email}): ${err.message}`);
    }
  }

  log(`\n=== Summary ===`);
  log(`Total alerts: ${alerts.length}`);
  log(`Sent: ${sent}`);
  log(`Skipped (not due): ${skipped}`);
  log(`No matches: ${noMatches}`);
  log(`Errors: ${errors}`);
  log(`Done.`);

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  log(`[FATAL] ${err.message}`);
  console.error(err);
  process.exit(1);
});
