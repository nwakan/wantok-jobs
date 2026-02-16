/**
 * WantokJobs Email Service — Brevo (Sendinblue) Transactional Email
 * 
 * Usage:
 *   const { sendEmail, sendTemplateEmail } = require('./email');
 *   await sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi!</p>' });
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wantokjobs.com';
const FROM_NAME = process.env.FROM_NAME || 'WantokJobs';
const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';

/**
 * Send a transactional email via Brevo HTTP API
 */
async function sendEmail({ to, toName, subject, html, text, replyTo }) {
  if (!BREVO_API_KEY) {
    console.log(`📧 [EMAIL DISABLED] To: ${to} | Subject: ${subject}`);
    return { success: false, reason: 'No BREVO_API_KEY configured' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html || undefined,
        textContent: text || undefined,
        replyTo: replyTo ? { email: replyTo } : undefined,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`📧 Email sent to ${to}: ${subject} (messageId: ${data.messageId})`);
      return { success: true, messageId: data.messageId };
    } else {
      console.error(`📧 Email failed to ${to}:`, data.message || data);
      return { success: false, error: data.message || 'Unknown error' };
    }
  } catch (error) {
    console.error(`📧 Email error to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

// === Pre-built email templates ===

async function sendWelcomeEmail(user) {
  const dashboardPath = user.role === 'employer' ? '/dashboard/employer' : '/dashboard/jobseeker';
  return sendEmail({
    to: user.email,
    toName: user.name,
    subject: 'Welcome to WantokJobs! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">WantokJobs</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Welcome, ${user.name}!</h2>
          <p>Thank you for joining WantokJobs — Papua New Guinea's AI-powered job platform.</p>
          ${user.role === 'jobseeker' ? `
            <p>Here's what you can do:</p>
            <ul>
              <li>🔍 Search and apply for jobs across PNG</li>
              <li>🔔 Set up job alerts for instant notifications</li>
              <li>📝 Complete your profile to stand out to employers</li>
              <li>✨ Get AI-powered job recommendations</li>
            </ul>
          ` : `
            <p>Here's what you can do:</p>
            <ul>
              <li>📝 Post job listings and reach thousands of candidates</li>
              <li>🤖 AI-powered candidate matching and screening</li>
              <li>📊 Track applications with our smart dashboard</li>
              <li>🏢 Build your company profile</li>
            </ul>
          `}
          <p style="text-align: center; margin-top: 24px;">
            <a href="${BASE_URL}${dashboardPath}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Your Dashboard
            </a>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>WantokJobs — Connecting Papua New Guinea's talent with opportunity</p>
        </div>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: user.email,
    toName: user.name,
    subject: 'Reset Your WantokJobs Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">WantokJobs</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>WantokJobs — Connecting Papua New Guinea's talent with opportunity</p>
        </div>
      </div>
    `,
  });
}

async function sendApplicationStatusEmail(user, jobTitle, status, companyName) {
  const statusMessages = {
    screening: `Your application for <strong>${jobTitle}</strong> at ${companyName} is being reviewed. We'll keep you updated!`,
    shortlisted: `Great news! You've been shortlisted for <strong>${jobTitle}</strong> at ${companyName}. The employer is interested in your profile.`,
    interview: `🎉 Congratulations! You've been invited for an interview for <strong>${jobTitle}</strong> at ${companyName}. Check your messages for details.`,
    offered: `🎊 Amazing news! You've received a job offer for <strong>${jobTitle}</strong> at ${companyName}! Check your dashboard for details.`,
    rejected: `Thank you for your interest in <strong>${jobTitle}</strong> at ${companyName}. Unfortunately, the employer has decided to move forward with other candidates. Don't give up — new opportunities are posted every day!`,
    hired: `🎉 Congratulations on being hired for <strong>${jobTitle}</strong> at ${companyName}! We wish you all the best in your new role.`,
  };

  return sendEmail({
    to: user.email,
    toName: user.name,
    subject: `Application Update: ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">WantokJobs</h1>
        </div>
        <div style="padding: 24px;">
          <h2>Application Update</h2>
          <p>Hi ${user.name},</p>
          <p>${statusMessages[status] || `Your application status for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.`}</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="${BASE_URL}/dashboard/jobseeker/applications" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View My Applications
            </a>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>WantokJobs — Connecting Papua New Guinea's talent with opportunity</p>
        </div>
      </div>
    `,
  });
}

async function sendNewApplicationEmail(employer, jobTitle, applicantName) {
  return sendEmail({
    to: employer.email,
    toName: employer.name,
    subject: `New Application: ${applicantName} applied for ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">WantokJobs</h1>
        </div>
        <div style="padding: 24px;">
          <h2>New Application Received</h2>
          <p>Hi ${employer.name},</p>
          <p><strong>${applicantName}</strong> has applied for your job posting: <strong>${jobTitle}</strong>.</p>
          <p style="text-align: center; margin-top: 24px;">
            <a href="${BASE_URL}/dashboard/employer/applicants" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Applicants
            </a>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>WantokJobs — Connecting Papua New Guinea's talent with opportunity</p>
        </div>
      </div>
    `,
  });
}

async function sendJobAlertEmail(user, jobs) {
  const jobListHtml = jobs.map(j => `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <h3 style="margin: 0 0 8px 0;"><a href="${BASE_URL}/jobs/${j.id}" style="color: #16a34a; text-decoration: none;">${j.title}</a></h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">📍 ${j.location} ${j.company_name ? `• 🏢 ${j.company_name}` : ''} ${j.job_type ? `• ${j.job_type}` : ''}</p>
    </div>
  `).join('');

  return sendEmail({
    to: user.email,
    toName: user.name,
    subject: `${jobs.length} New Job${jobs.length > 1 ? 's' : ''} Matching Your Alert`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">WantokJobs</h1>
        </div>
        <div style="padding: 24px;">
          <h2>New Jobs For You! 🔔</h2>
          <p>Hi ${user.name}, we found ${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching your alert:</p>
          ${jobListHtml}
          <p style="text-align: center; margin-top: 24px;">
            <a href="${BASE_URL}/jobs" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Browse All Jobs
            </a>
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>WantokJobs — Connecting Papua New Guinea's talent with opportunity</p>
          <p><a href="${BASE_URL}/dashboard/jobseeker/job-alerts" style="color: #6b7280;">Manage your alerts</a></p>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendApplicationStatusEmail,
  sendNewApplicationEmail,
  sendJobAlertEmail,
};
