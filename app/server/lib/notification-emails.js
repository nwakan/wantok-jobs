/**
 * WantokJobs Notification Email Service
 * 
 * Sends email notifications for critical in-app events.
 * Integrated with main notification system (notifications.js).
 */

const db = require('../database');
const email = require('./email');

// Email notification types (subset of in-app notifications that warrant email)
const EMAIL_ENABLED_TYPES = new Set([
  'application_status_changed',
  'new_application',
  'new_matching_job',
  'saved_job_expiring',
  'job_expiring',
  'job_expired',
  'application_milestone',
  'ai_match_found',
  'payment_confirmed',
  'new_company_review',
  'job_reported'
]);

/**
 * Send email notification based on notification type
 * @param {number} userId - User ID to send to
 * @param {string} type - Notification type
 * @param {object} data - Notification data
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
async function sendNotificationEmail(userId, type, data, title, message) {
  // Only send emails for critical notification types
  if (!EMAIL_ENABLED_TYPES.has(type)) {
    return null;
  }

  try {
    // Get user info
    const user = db.prepare('SELECT email, name, role FROM users WHERE id = ?').get(userId);
    if (!user || !user.email) {
      return null;
    }

    // Build email based on notification type
    let emailSubject = title;
    let emailBody = message;
    let actionUrl = null;
    let actionText = null;

    switch (type) {
      case 'application_status_changed':
        emailSubject = `Application Update: ${data.status}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/applications`;
        actionText = 'View Application';
        break;

      case 'new_application':
        emailSubject = `New Application: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/applicants?job=${data.jobId}`;
        actionText = 'Review Applicant';
        break;

      case 'new_matching_job':
        emailSubject = `New Job Match: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/jobs/${data.jobId}`;
        actionText = 'View Job';
        break;

      case 'saved_job_expiring':
        emailSubject = `⏰ Saved Job Closing Soon: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/jobs/${data.jobId}`;
        actionText = 'Apply Now';
        break;

      case 'job_expiring':
        emailSubject = `Job Expiring Soon: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/jobs`;
        actionText = 'Manage Jobs';
        break;

      case 'job_expired':
        emailSubject = `Job Expired: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/post-job`;
        actionText = 'Repost Job';
        break;

      case 'application_milestone':
        emailSubject = `🎉 Milestone: ${data.count} Applications`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/applicants?job=${data.jobId}`;
        actionText = 'Review Applicants';
        break;

      case 'ai_match_found':
        emailSubject = `⭐ High-Quality Candidate Found`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/applicants`;
        actionText = 'View Candidate';
        break;

      case 'payment_confirmed':
        emailSubject = `Payment Confirmed - K${data.amount}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/orders`;
        actionText = 'View Invoice';
        break;

      case 'new_company_review':
        emailSubject = `New Company Review Posted`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/companies/${data.companyId || user.id}`;
        actionText = 'View Review';
        break;

      case 'job_reported':
        emailSubject = `🚩 Job Reported: ${data.jobTitle}`;
        actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/admin/jobs`;
        actionText = 'Review Report';
        break;

      default:
        // Default template
        emailSubject = title;
    }

    // Send the email
    const result = await email.sendNotificationEmail({
      to: user.email,
      toName: user.name,
      subject: emailSubject,
      body: emailBody,
      actionUrl: actionUrl,
      actionText: actionText,
      notificationType: type
    });

    return result;
  } catch (error) {
    console.error(`Failed to send notification email (${type} for user ${userId}):`, error.message);
    return null;
  }
}

/**
 * Send batch notification emails (for digest/alerts)
 * @param {number} userId - User ID
 * @param {array} notifications - Array of notifications
 * @param {string} digestType - 'daily' or 'weekly'
 */
async function sendDigestEmail(userId, notifications, digestType = 'daily') {
  try {
    const user = db.prepare('SELECT email, name, role FROM users WHERE id = ?').get(userId);
    if (!user || !user.email) {
      return null;
    }

    // Build digest email
    const subject = digestType === 'weekly' 
      ? `Your Weekly Digest — ${notifications.length} New Notifications`
      : `Your Daily Digest — ${notifications.length} New Notifications`;

    const body = `You have ${notifications.length} new notifications waiting for you on WantokJobs.`;

    const actionUrl = `${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/notifications`;
    const actionText = 'View All Notifications';

    // Group notifications by type for better digest format
    const grouped = {};
    notifications.forEach(notif => {
      if (!grouped[notif.type]) {
        grouped[notif.type] = [];
      }
      grouped[notif.type].push(notif);
    });

    const result = await email.sendNotificationEmail({
      to: user.email,
      toName: user.name,
      subject,
      body,
      actionUrl,
      actionText,
      notificationType: 'digest',
      digestData: grouped
    });

    return result;
  } catch (error) {
    console.error(`Failed to send digest email for user ${userId}:`, error.message);
    return null;
  }
}

module.exports = {
  sendNotificationEmail,
  sendDigestEmail,
  EMAIL_ENABLED_TYPES
};
