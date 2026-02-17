/**
 * Job Alert Email Templates
 * 
 * Generates email content for job alert notifications — instant, daily, and weekly digests.
 */

const { emailLayout, button, jobCard, greeting, divider, alertBox, COLORS } = require('./email-templates');

const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';

/**
 * Instant job alert — sent immediately when a matching job is posted.
 */
function instantJobAlert({ userName, alert, job }) {
  return emailLayout({
    preheader: `New job match: ${job.title} at ${job.company_name || 'a PNG employer'}`,
    body: `
      ${greeting(userName)}

      <h2 style="color:${COLORS.dark};font-size:20px;margin:0 0 8px;font-weight:700;">
        🔔 New Job Match!
      </h2>
      <p style="font-size:15px;color:${COLORS.darkLight};margin:0 0 20px;line-height:1.6;">
        A new job matching your alert "<strong>${alert.keywords}</strong>" was just posted:
      </p>

      ${jobCard(job)}

      ${button('View & Apply Now', `${BASE_URL}/jobs/${job.id}`)}

      ${divider()}
      <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
        This alert matches: <strong>${alert.keywords}</strong>
        ${alert.location ? ` in <strong>${alert.location}</strong>` : ''}
        ${alert.job_type ? ` (${alert.job_type})` : ''}
      </p>
      <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">
          Manage your alerts
        </a> · 
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.gray};text-decoration:underline;">
          Unsubscribe from this alert
        </a>
      </p>
    `,
    footerText: `You're receiving this because you set up a job alert on WantokJobs.`,
  });
}

/**
 * Daily job alert digest — summary of matching jobs from the past 24 hours.
 */
function dailyJobAlertDigest({ userName, alert, jobs, totalMatches }) {
  const displayJobs = jobs.slice(0, 10);

  return emailLayout({
    preheader: `${totalMatches} new job${totalMatches !== 1 ? 's' : ''} matching "${alert.keywords}" posted today`,
    body: `
      ${greeting(userName)}

      <h2 style="color:${COLORS.dark};font-size:20px;margin:0 0 8px;font-weight:700;">
        📋 Daily Job Alert Summary
      </h2>
      <p style="font-size:15px;color:${COLORS.darkLight};margin:0 0 4px;line-height:1.6;">
        <strong>${totalMatches} new job${totalMatches !== 1 ? 's' : ''}</strong> matching your alert were posted in the last 24 hours.
      </p>
      <p style="font-size:13px;color:${COLORS.gray};margin:0 0 24px;">
        Alert: "<strong>${alert.keywords}</strong>"
        ${alert.location ? ` · ${alert.location}` : ''}
        ${alert.job_type ? ` · ${alert.job_type}` : ''}
      </p>

      ${displayJobs.map(job => jobCard(job)).join('')}

      ${totalMatches > displayJobs.length ? `
        <p style="text-align:center;font-size:14px;color:${COLORS.gray};margin:16px 0;">
          <em>+ ${totalMatches - displayJobs.length} more matching jobs</em>
        </p>
      ` : ''}

      ${button('View All Matches', `${BASE_URL}/jobs?q=${encodeURIComponent(alert.keywords)}${alert.location ? `&location=${encodeURIComponent(alert.location)}` : ''}`, { fullWidth: true })}

      ${alertBox('Tip: Apply early! Jobs posted within the last 24 hours get 5x more attention from employers.', 'tip')}

      ${divider()}
      <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">
          Manage your alerts
        </a> · 
        Switch to <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">instant</a> or 
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">weekly</a> frequency
      </p>
    `,
    footerText: `You're receiving daily alerts for "${alert.keywords}" on WantokJobs.`,
  });
}

/**
 * Weekly job alert digest — summary of matching jobs from the past 7 days.
 */
function weeklyJobAlertDigest({ userName, alert, jobs, totalMatches }) {
  const displayJobs = jobs.slice(0, 15);

  return emailLayout({
    preheader: `${totalMatches} job${totalMatches !== 1 ? 's' : ''} matching "${alert.keywords}" this week`,
    body: `
      ${greeting(userName)}

      <h2 style="color:${COLORS.dark};font-size:20px;margin:0 0 8px;font-weight:700;">
        📬 Weekly Job Alert Digest
      </h2>
      <p style="font-size:15px;color:${COLORS.darkLight};margin:0 0 4px;line-height:1.6;">
        <strong>${totalMatches} job${totalMatches !== 1 ? 's' : ''}</strong> matching your alert were posted this week.
      </p>
      <p style="font-size:13px;color:${COLORS.gray};margin:0 0 24px;">
        Alert: "<strong>${alert.keywords}</strong>"
        ${alert.location ? ` · ${alert.location}` : ''}
        ${alert.job_type ? ` · ${alert.job_type}` : ''}
      </p>

      ${displayJobs.map(job => jobCard(job)).join('')}

      ${totalMatches > displayJobs.length ? `
        <p style="text-align:center;font-size:14px;color:${COLORS.gray};margin:16px 0;">
          <em>+ ${totalMatches - displayJobs.length} more matching jobs</em>
        </p>
      ` : ''}

      ${button('Browse All Matches', `${BASE_URL}/jobs?q=${encodeURIComponent(alert.keywords)}${alert.location ? `&location=${encodeURIComponent(alert.location)}` : ''}`, { fullWidth: true })}

      ${divider()}
      <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">
          Manage your alerts
        </a>
      </p>
    `,
    footerText: `You're receiving weekly alerts for "${alert.keywords}" on WantokJobs.`,
  });
}

/**
 * No matches notification — sent when alert frequency fires but no matching jobs found.
 * Only sent occasionally (not every day) to avoid annoying users.
 */
function noMatchesAlert({ userName, alert }) {
  return emailLayout({
    preheader: `No new matches for "${alert.keywords}" — but we have suggestions!`,
    body: `
      ${greeting(userName)}

      <h2 style="color:${COLORS.dark};font-size:20px;margin:0 0 8px;font-weight:700;">
        No New Matches This Time
      </h2>
      <p style="font-size:15px;color:${COLORS.darkLight};margin:0 0 24px;line-height:1.6;">
        We didn't find new jobs matching "<strong>${alert.keywords}</strong>" recently, but don't worry — we'll keep looking!
      </p>

      ${alertBox('Try broadening your alert criteria (e.g., wider location or more keywords) to get more matches.', 'tip')}

      <h3 style="color:${COLORS.dark};font-size:16px;margin:24px 0 12px;font-weight:600;">💡 Suggestions:</h3>
      <ul style="padding:0 0 0 20px;font-size:14px;color:${COLORS.darkLight};line-height:1.8;">
        <li>Add alternative job titles or keywords</li>
        <li>Expand to nearby provinces or "All PNG"</li>
        <li>Switch from weekly to daily alerts for faster notifications</li>
        <li>Browse all active jobs — new postings appear every day</li>
      </ul>

      ${button('Edit This Alert', `${BASE_URL}/dashboard/job-alerts`)}
      ${button('Browse All Jobs', `${BASE_URL}/jobs`, { variant: 'secondary' })}

      ${divider()}
      <p style="font-size:13px;color:${COLORS.gray};line-height:1.6;">
        <a href="${BASE_URL}/dashboard/job-alerts" style="color:${COLORS.green};text-decoration:underline;">
          Manage your alerts
        </a>
      </p>
    `,
    footerText: `You're subscribed to job alerts for "${alert.keywords}" on WantokJobs.`,
  });
}

module.exports = {
  instantJobAlert,
  dailyJobAlertDigest,
  weeklyJobAlertDigest,
  noMatchesAlert,
};
