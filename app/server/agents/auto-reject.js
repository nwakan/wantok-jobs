/**
 * Auto-Reject Stale Applications Agent
 * Runs daily to auto-reject applications that have been stale for too long
 */
const db = require('../database');
const { sendEmail } = require('../lib/email');

// Default thresholds (in days) per status
const DEFAULT_THRESHOLDS = {
  applied: 30,
  screening: 14,
  shortlisted: 21
};

async function autoRejectStaleApplications() {
  console.log('[Auto-Reject Agent] Running stale application check...');

  try {
    const now = new Date();
    const rejectedCount = { applied: 0, screening: 0, shortlisted: 0 };

    // Process each status
    for (const [status, thresholdDays] of Object.entries(DEFAULT_THRESHOLDS)) {
      // Find stale applications
      const staleApps = db.prepare(`
        SELECT a.*,
               j.title as job_title,
               j.employer_id,
               u.name as candidate_name,
               u.email as candidate_email,
               pe.company_name,
               julianday('now') - julianday(a.updated_at) as days_stale
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        JOIN users u ON a.jobseeker_id = u.id
        LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
        WHERE a.status = ?
          AND julianday('now') - julianday(a.updated_at) >= ?
      `).all(status, thresholdDays);

      console.log(`  Found ${staleApps.length} stale applications in '${status}' status (>${thresholdDays} days)`);

      for (const app of staleApps) {
        // Check if employer has been active on this job recently (last 7 days)
        const recentActivity = db.prepare(`
          SELECT COUNT(*) as count
          FROM application_events ae
          WHERE ae.application_id IN (
            SELECT id FROM applications WHERE job_id = ?
          )
          AND julianday('now') - julianday(ae.created_at) <= 7
        `).get(app.job_id);

        // Skip if employer has been active recently
        if (recentActivity && recentActivity.count > 0) {
          console.log(`  Skipping app ${app.id} - employer active on this job recently`);
          continue;
        }

        // Update application status to rejected
        db.prepare(`
          UPDATE applications
          SET status = 'rejected',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(app.id);

        // Log event
        db.prepare(`
          INSERT INTO application_events
          (application_id, from_status, to_status, changed_by, notes, ai_generated)
          VALUES (?, ?, 'rejected', NULL, ?, 1)
        `).run(app.id, status, `Auto-rejected after ${Math.floor(app.days_stale)} days of inactivity`);

        rejectedCount[status]++;

        // Send gentle rejection email
        const companyName = app.company_name || 'the employer';
        const emailHtml = `
          <h2>Application Update</h2>
          <p>Dear ${app.candidate_name},</p>
          <p>Thank you for your interest in the <strong>${app.job_title}</strong> position at ${companyName}.</p>
          <p>We've carefully reviewed your application along with many other qualified candidates. After thorough consideration, we've decided to move forward with other applicants whose experience more closely matches our current needs.</p>
          <p>We appreciate the time you took to apply and encourage you to explore other opportunities on WantokJobs. We wish you the best in your job search.</p>
          <p>Thank you again for your interest in ${companyName}.</p>
          <p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/jobs" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
              Browse More Jobs
            </a>
          </p>
          <p>Best regards,<br>The WantokJobs Team</p>
        `;

        try {
          await sendEmail({
            to: app.candidate_email,
            subject: `Application Update: ${app.job_title}`,
            html: emailHtml
          });
          console.log(`  ✅ Rejected app ${app.id} and sent email to ${app.candidate_email}`);
        } catch (emailError) {
          console.error(`  ⚠️  Rejected app ${app.id} but failed to send email:`, emailError.message);
        }
      }
    }

    const totalRejected = Object.values(rejectedCount).reduce((sum, n) => sum + n, 0);
    console.log(`[Auto-Reject Agent] Completed. Total rejected: ${totalRejected} (applied: ${rejectedCount.applied}, screening: ${rejectedCount.screening}, shortlisted: ${rejectedCount.shortlisted})`);

    return {
      success: true,
      rejected: totalRejected,
      breakdown: rejectedCount
    };

  } catch (error) {
    console.error('[Auto-Reject Agent] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if executed directly
if (require.main === module) {
  autoRejectStaleApplications()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { autoRejectStaleApplications };
