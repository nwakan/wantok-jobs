#!/usr/bin/env node
/**
 * WantokJobs — Saved Search Notification Digest
 * 
 * Finds new jobs matching each user's saved searches since last notification,
 * and sends an email digest.
 * 
 * Usage:
 *   node scripts/notify-saved-searches.js              # Process all
 *   node scripts/notify-saved-searches.js --dry-run     # Preview without sending
 * 
 * Cron (daily at 9AM UTC):
 *   0 9 * * * cd /opt/wantok/app && node scripts/notify-saved-searches.js >> logs/saved-search-notify.log 2>&1
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));

const db = require('../server/database');

let sendEmail;
try {
  const emailLib = require('../server/lib/email');
  sendEmail = emailLib.sendEmail || emailLib.sendJobAlertEmail;
} catch (e) {
  sendEmail = null;
}

const DRY_RUN = process.argv.includes('--dry-run');
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

function buildMatchQuery(search, sinceDate) {
  const conditions = ["j.status = 'active'"];
  const params = [];

  if (sinceDate) {
    conditions.push("j.created_at > ?");
    params.push(sinceDate);
  }

  if (search.query) {
    conditions.push("(j.title LIKE ? OR j.description LIKE ?)");
    params.push(`%${search.query}%`, `%${search.query}%`);
  }
  if (search.category) {
    conditions.push("j.category = ?");
    params.push(search.category);
  }
  if (search.location) {
    conditions.push("j.location LIKE ?");
    params.push(`%${search.location}%`);
  }
  if (search.experience_level) {
    conditions.push("j.experience_level = ?");
    params.push(search.experience_level);
  }
  if (search.salary_min) {
    conditions.push("j.salary_max >= ?");
    params.push(search.salary_min);
  }
  if (search.salary_max) {
    conditions.push("j.salary_min <= ?");
    params.push(search.salary_max);
  }

  return { where: conditions.join(' AND '), params };
}

async function main() {
  log('=== Saved Search Notification Digest ===');
  if (DRY_RUN) log('DRY RUN — no emails will be sent');

  // Get all saved searches with notifications enabled
  const searches = db.prepare(`
    SELECT ss.*, u.email, u.name as user_name
    FROM saved_searches ss
    JOIN users u ON u.id = ss.user_id
    WHERE ss.notify = 1
      AND u.email_verified = 1
  `).all();

  log(`Found ${searches.length} saved searches with notifications enabled`);

  // Group by user for digest
  const userSearches = {};
  for (const search of searches) {
    if (!userSearches[search.user_id]) {
      userSearches[search.user_id] = { email: search.email, name: search.user_name, searches: [] };
    }

    const sinceDate = search.last_notified_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { where, params } = buildMatchQuery(search, sinceDate);

    const jobs = db.prepare(`
      SELECT j.id, j.title, j.company_name, j.location, j.salary_min, j.salary_max, j.created_at
      FROM jobs j
      WHERE ${where}
      ORDER BY j.created_at DESC
      LIMIT 10
    `).all(...params);

    if (jobs.length > 0) {
      userSearches[search.user_id].searches.push({
        ...search,
        matchingJobs: jobs,
      });
    }
  }

  let emailsSent = 0;
  const updateStmt = db.prepare('UPDATE saved_searches SET last_notified_at = datetime("now") WHERE id = ?');

  for (const [userId, userData] of Object.entries(userSearches)) {
    if (userData.searches.length === 0) continue;

    const totalJobs = userData.searches.reduce((sum, s) => sum + s.matchingJobs.length, 0);
    log(`  User ${userData.email}: ${userData.searches.length} searches, ${totalJobs} new jobs`);

    if (!DRY_RUN && sendEmail) {
      try {
        // Build email body
        const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';
        let jobsHtml = '';
        for (const search of userData.searches) {
          jobsHtml += `<h3 style="color:#1a56db;margin:16px 0 8px">${search.name} (${search.matchingJobs.length} new)</h3>`;
          for (const job of search.matchingJobs) {
            const salary = job.salary_min && job.salary_max ? `K${job.salary_min.toLocaleString()} – K${job.salary_max.toLocaleString()}` : '';
            jobsHtml += `
              <div style="padding:8px 0;border-bottom:1px solid #eee">
                <a href="${BASE_URL}/jobs/${job.id}" style="color:#1a56db;font-weight:600;text-decoration:none">${job.title}</a>
                <div style="color:#666;font-size:13px">${job.company_name || ''} · ${job.location || ''} ${salary ? '· ' + salary : ''}</div>
              </div>`;
          }
        }

        await sendEmail({
          to: userData.email,
          subject: `${totalJobs} new job${totalJobs > 1 ? 's' : ''} matching your saved searches`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#111">Hi ${userData.name || 'there'},</h2>
              <p>We found <strong>${totalJobs} new job${totalJobs > 1 ? 's' : ''}</strong> matching your saved searches:</p>
              ${jobsHtml}
              <p style="margin-top:20px"><a href="${BASE_URL}/dashboard/jobseeker/saved-searches" style="color:#1a56db">Manage your saved searches →</a></p>
            </div>
          `,
        });
        emailsSent++;
      } catch (err) {
        log(`  ERROR sending to ${userData.email}: ${err.message}`);
      }
    }

    // Update last_notified_at
    if (!DRY_RUN) {
      for (const search of userData.searches) {
        updateStmt.run(search.id);
      }
    }
  }

  log(`Done. ${emailsSent} digest emails sent.`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
