#!/usr/bin/env node
/**
 * WantokJobs — Weekly Employer Email Digest
 * 
 * Compiles a weekly summary for each active employer:
 * - New applications received this week
 * - Job views (this week vs last week)
 * - Active jobs + expiring soon
 * - New messages
 * - Recommended actions
 * 
 * Usage:
 *   node scripts/employer-digest.js              # Send digests
 *   node scripts/employer-digest.js --dry-run     # Preview without sending
 * 
 * Cron (Monday 8AM UTC):
 *   0 8 * * 1 cd /opt/wantokjobs/app && node scripts/employer-digest.js >> /var/log/wantokjobs-employer-digest.log 2>&1
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));

require('dotenv').config();
const db = require('../server/database');
const { sendEmail } = require('../server/lib/email');
const { emailLayout, button, greeting, divider, COLORS } = require('../server/lib/email-templates');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// ─── Data Queries ────────────────────────────────────────────────────

function getActiveEmployers() {
  return db.prepare(`
    SELECT u.id, u.name, u.email
    FROM users u
    WHERE u.role = 'employer'
    ORDER BY u.id
  `).all();
}

function getNewApplications(employerId) {
  return db.prepare(`
    SELECT a.id, a.status, a.applied_at, a.ai_score,
           j.title AS job_title, j.id AS job_id,
           u.name AS applicant_name, u.email AS applicant_email
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN users u ON u.id = a.jobseeker_id
    WHERE j.employer_id = ?
      AND a.applied_at > datetime('now', '-7 days')
    ORDER BY a.ai_score DESC, a.applied_at DESC
  `).all(employerId);
}

function getUnreviewedCount(employerId) {
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE j.employer_id = ? AND a.status = 'pending'
  `).get(employerId).count;
}

function getJobViewsThisWeek(employerId) {
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM job_views jv
    JOIN jobs j ON j.id = jv.job_id
    WHERE j.employer_id = ?
      AND jv.viewed_at > datetime('now', '-7 days')
  `).get(employerId).count;
}

function getJobViewsLastWeek(employerId) {
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM job_views jv
    JOIN jobs j ON j.id = jv.job_id
    WHERE j.employer_id = ?
      AND jv.viewed_at > datetime('now', '-14 days')
      AND jv.viewed_at <= datetime('now', '-7 days')
  `).get(employerId).count;
}

function getActiveJobs(employerId) {
  return db.prepare(`
    SELECT id, title, application_deadline, status, views_count
    FROM jobs
    WHERE employer_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `).all(employerId);
}

function getNewMessagesCount(employerId) {
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM conversation_messages cm
    JOIN conversations c ON c.id = cm.conversation_id
    WHERE c.employer_id = ?
      AND cm.sender_id != ?
      AND cm.created_at > datetime('now', '-7 days')
  `).get(employerId, employerId).count;
}

// ─── HTML Builder ────────────────────────────────────────────────────

function statBox(label, value, trend) {
  const trendHtml = trend !== undefined
    ? `<span style="font-size:13px;color:${trend >= 0 ? '#10B981' : '#EF4444'};font-weight:600;">${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%</span>`
    : '';
  return `
    <td style="padding:12px;text-align:center;background:#F9FAFB;border-radius:8px;width:33%;">
      <div style="font-size:28px;font-weight:700;color:${COLORS.dark};">${value}</div>
      <div style="font-size:12px;color:${COLORS.gray};margin-top:4px;">${label}</div>
      ${trendHtml ? `<div style="margin-top:4px;">${trendHtml}</div>` : ''}
    </td>`;
}

function buildDigestHtml(employer, data) {
  const { applications, viewsThisWeek, viewsLastWeek, activeJobs, expiringSoon, newMessages, unreviewedCount, actions } = data;

  const viewsTrend = viewsLastWeek > 0
    ? Math.round(((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100)
    : (viewsThisWeek > 0 ? 100 : 0);

  // Stats row
  const statsHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="8" border="0">
      <tr>
        ${statBox('New Applications', applications.length)}
        ${statBox('Job Views', viewsThisWeek, viewsTrend)}
        ${statBox('Active Jobs', activeJobs.length)}
      </tr>
    </table>`;

  // Top applicants
  let applicantsHtml = '';
  if (applications.length > 0) {
    const topApps = applications.slice(0, 5);
    const rows = topApps.map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;">
          <strong style="color:${COLORS.dark};">${a.applicant_name}</strong>
          <div style="font-size:12px;color:${COLORS.gray};">Applied for: ${a.job_title}</div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;text-align:right;">
          ${a.ai_score ? `<span style="background:#ECFDF5;color:#059669;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">${Math.round(a.ai_score)}% match</span>` : ''}
        </td>
      </tr>`).join('');

    applicantsHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:${COLORS.dark};font-size:16px;margin:0 0 12px;">📋 Top Applicants This Week</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAFA;border-radius:8px;">
          ${rows}
        </table>
        ${applications.length > 5 ? `<p style="font-size:13px;color:${COLORS.gray};margin:8px 0 0;">+ ${applications.length - 5} more applicants</p>` : ''}
        <div style="margin-top:12px;">
          ${button('Review Applications', `${BASE_URL}/employer/applications`)}
        </div>
      </div>`;
  }

  // Expiring soon
  let expiringHtml = '';
  if (expiringSoon.length > 0) {
    const items = expiringSoon.map(j => {
      const daysLeft = Math.ceil((new Date(j.application_deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return `<li style="padding:4px 0;color:${COLORS.dark};">
        <strong>${j.title}</strong> — <span style="color:#EF4444;font-weight:600;">${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>
      </li>`;
    }).join('');

    expiringHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:${COLORS.dark};font-size:16px;margin:0 0 12px;">⏰ Jobs Expiring Soon</h3>
        <ul style="margin:0;padding:0 0 0 20px;font-size:14px;">${items}</ul>
        <div style="margin-top:12px;">
          ${button('Manage Jobs', `${BASE_URL}/employer/jobs`, true)}
        </div>
      </div>`;
  }

  // Messages
  let messagesHtml = '';
  if (newMessages > 0) {
    messagesHtml = `
      <div style="margin-top:24px;padding:16px;background:#FFF7ED;border-radius:8px;border-left:4px solid ${COLORS.gold};">
        <strong style="color:${COLORS.dark};">💬 ${newMessages} new message${newMessages !== 1 ? 's' : ''}</strong>
        <span style="color:${COLORS.gray};font-size:13px;"> from candidates this week</span>
        <div style="margin-top:8px;">
          ${button('View Messages', `${BASE_URL}/employer/messages`, true)}
        </div>
      </div>`;
  }

  // Recommended actions
  let actionsHtml = '';
  if (actions.length > 0) {
    const items = actions.map(a => `<li style="padding:4px 0;color:${COLORS.dark};font-size:14px;">${a}</li>`).join('');
    actionsHtml = `
      <div style="margin-top:24px;">
        <h3 style="color:${COLORS.dark};font-size:16px;margin:0 0 12px;">✅ Recommended Actions</h3>
        <ul style="margin:0;padding:0 0 0 20px;">${items}</ul>
      </div>`;
  }

  const body = `
    ${greeting(employer.name)}
    <p style="color:${COLORS.gray};font-size:15px;line-height:1.6;">
      Here's your weekly hiring summary for the past 7 days.
    </p>
    ${statsHtml}
    ${applicantsHtml}
    ${expiringHtml}
    ${messagesHtml}
    ${actionsHtml}
    ${divider()}
    <div style="text-align:center;margin-top:16px;">
      ${button('Go to Dashboard', `${BASE_URL}/employer/dashboard`)}
    </div>
  `;

  return emailLayout({
    preheader: `Your weekly hiring digest — ${applications.length} new applications, ${viewsThisWeek} job views`,
    body,
    footerText: "You're receiving this weekly digest because you have an employer account on WantokJobs.",
    showUnsubscribe: true,
  });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  log(`🚀 Employer Weekly Digest — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  const employers = getActiveEmployers();
  log(`Found ${employers.length} employers`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const employer of employers) {
    try {
      const applications = getNewApplications(employer.id);
      const viewsThisWeek = getJobViewsThisWeek(employer.id);
      const viewsLastWeek = getJobViewsLastWeek(employer.id);
      const activeJobs = getActiveJobs(employer.id);
      const newMessages = getNewMessagesCount(employer.id);
      const unreviewedCount = getUnreviewedCount(employer.id);

      // Skip employers with zero activity
      const totalActivity = applications.length + viewsThisWeek + newMessages;
      if (totalActivity === 0 && activeJobs.length === 0) {
        skipped++;
        continue;
      }

      // Find jobs expiring within 7 days
      const now = new Date();
      const expiringSoon = activeJobs.filter(j => {
        if (!j.application_deadline) return false;
        const deadline = new Date(j.application_deadline);
        const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft <= 7;
      });

      // Build recommended actions
      const actions = [];
      if (unreviewedCount > 0) {
        actions.push(`You have <strong>${unreviewedCount} unreviewed application${unreviewedCount !== 1 ? 's' : ''}</strong> waiting for review`);
      }
      if (expiringSoon.length > 0) {
        const minDays = Math.min(...expiringSoon.map(j => Math.ceil((new Date(j.application_deadline) - now) / (1000 * 60 * 60 * 24))));
        actions.push(`<strong>${expiringSoon.length} job${expiringSoon.length !== 1 ? 's' : ''}</strong> expiring in ${minDays} day${minDays !== 1 ? 's' : ''} — consider extending or reposting`);
      }
      if (newMessages > 0) {
        actions.push(`<strong>${newMessages} unread message${newMessages !== 1 ? 's' : ''}</strong> from candidates`);
      }
      if (activeJobs.length === 0) {
        actions.push('Post a new job to start receiving applications');
      }

      const html = buildDigestHtml(employer, {
        applications, viewsThisWeek, viewsLastWeek,
        activeJobs, expiringSoon, newMessages, unreviewedCount, actions,
      });

      if (DRY_RUN) {
        log(`📧 [DRY RUN] ${employer.email} — ${applications.length} apps, ${viewsThisWeek} views, ${activeJobs.length} jobs, ${newMessages} msgs`);
        if (actions.length) log(`   Actions: ${actions.map(a => a.replace(/<[^>]+>/g, '')).join('; ')}`);
      } else {
        const result = await sendEmail({
          to: employer.email,
          toName: employer.name,
          subject: `Your Weekly Hiring Digest — ${applications.length} new application${applications.length !== 1 ? 's' : ''}`,
          html,
          tags: ['employer-digest', 'weekly'],
        });

        if (result.success) {
          log(`✅ Sent to ${employer.email}`);
        } else {
          log(`⚠️ Failed for ${employer.email}: ${result.error || result.reason}`);
          errors++;
          continue;
        }
      }
      sent++;
    } catch (err) {
      log(`❌ Error for employer ${employer.id} (${employer.email}): ${err.message}`);
      errors++;
    }
  }

  log(`\n📊 Summary: ${sent} sent, ${skipped} skipped (no activity), ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  log(`❌ Fatal: ${err.message}`);
  process.exit(1);
});
