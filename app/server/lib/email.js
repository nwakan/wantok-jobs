const logger = require('../utils/logger');
/**
 * WantokJobs Email Service — Brevo Transactional Email
 * 
 * 18 email templates covering the complete user lifecycle:
 * - Auth: welcome (jobseeker/employer), password reset, password changed
 * - Applications: submitted, status changes (7 statuses), new application (employer)
 * - Jobs: posted confirmation, expiring soon, expired
 * - Alerts: job alert matches
 * - Engagement: incomplete profile nudge, order confirmation
 * - Admin: contact form received, weekly digest
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@wantokjobs.com';
const FROM_NAME = process.env.FROM_NAME || 'WantokJobs';
const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';
const SUPPORT_EMAIL = 'support@wantokjobs.com';

// ─── EMAIL SAFETY GATE ──────────────────────────────────────────────
// Set EMAIL_MODE=live to enable real sends. Default is 'test'.
// In test mode: all emails redirect to TEST_EMAIL, auto-triggered emails are blocked.
const EMAIL_MODE = process.env.EMAIL_MODE || 'test';
const TEST_EMAIL = process.env.TEST_EMAIL || 'nick.wakan@gmail.com';
const EMAIL_AUTO_SEND = process.env.EMAIL_AUTO_SEND === 'true'; // explicit opt-in for auto emails

// ─── Shared HTML Layout (from email-templates.js) ────────────────────
const { emailLayout: sharedLayout, button: sharedButton, greeting: sharedGreeting, divider: sharedDivider, COLORS } = require('./email-templates');

/**
 * Adapter: maps the old layout({ preheader, body, footerExtra }) signature
 * to the shared emailLayout from email-templates.js so all emails use one branded wrapper.
 */
function layout({ preheader, body, footerExtra }) {
  return sharedLayout({
    preheader,
    body: `${body}${footerExtra ? `<div style="margin-top:24px;">${footerExtra}</div>` : ''}`,
    footerText: "You're receiving this because you have an account at wantokjobs.com.",
  });
}

function button(text, url, outline = false) {
  return sharedButton(text, url, { variant: outline ? 'secondary' : 'primary' });
}

function greeting(name) {
  return sharedGreeting(name);
}

function divider() {
  return sharedDivider();
}

// ─── Core Send Function ──────────────────────────────────────────────

async function sendEmail({ to, toName, subject, html, text, replyTo, tags }) {
  // SAFETY GATE: In test mode, ALL emails go to TEST_EMAIL only.
  // Set EMAIL_MODE=live in .env when ready for production.
  if (EMAIL_MODE !== 'live') {
    if (!BREVO_API_KEY) {
      logger.info('log', { detail: `📧 [TEST/NO KEY] Would send to: ${to} | ${subject}` });
      return { success: false, reason: 'Test mode + no BREVO_API_KEY' };
    }
    logger.info('log', { detail: `📧 [TEST MODE] Redirecting: ${to} → ${TEST_EMAIL} | ${subject}` });
    to = TEST_EMAIL;
    toName = `[TEST for: ${toName || 'User'}]`;
    subject = `[TEST] ${subject}`;
  }

  if (!BREVO_API_KEY) {
    logger.info('log', { detail: `📧 [NO KEY] To: ${to} | ${subject}` });
    return { success: false, reason: 'No BREVO_API_KEY' };
  }

  try {
    const payload = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html || undefined,
      textContent: text || undefined,
      replyTo: replyTo ? { email: replyTo } : undefined,
    };
    if (tags) payload.tags = tags;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      logger.info('log', { detail: `📧 → ${to}: ${subject}` });
      return { success: true, messageId: data.messageId };
    } else {
      logger.error('Email send failed', { to, detail: data.message || JSON.stringify(data) });
      return { success: false, error: data.message };
    }
  } catch (err) {
    logger.error('error', { detail: `📧 ✗ ${to}: ${err.message}` });
    return { success: false, error: err.message };
  }
}

// ─── 1. Welcome — Jobseeker ─────────────────────────────────────────

async function sendWelcomeJobseeker(user) {
  return sendEmail({
    to: user.email, toName: user.name, tags: ['welcome'],
    subject: `Welcome to WantokJobs, ${user.name}! 🎉`,
    html: layout({
      preheader: `Your job search in PNG just got smarter. Here's how to get started.`,
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Welcome to <strong>WantokJobs</strong> — Papua New Guinea's AI-powered job platform. 
          We're here to help you find the right opportunity, faster.
        </p>

        <h3 style="color:#111827;font-size:16px;margin:24px 0 12px;">🚀 Get started in 3 steps:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            <strong style="color:#16a34a;">1.</strong> Complete your profile — employers see this first
          </td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            <strong style="color:#16a34a;">2.</strong> Set up job alerts — get notified when matching jobs are posted
          </td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            <strong style="color:#16a34a;">3.</strong> Start applying — our AI will recommend the best matches for you
          </td></tr>
        </table>

        ${button('Complete My Profile', `${BASE_URL}/dashboard/jobseeker/profile`)}
        ${button('Browse Jobs', `${BASE_URL}/jobs`, true)}

        <p style="font-size:13px;color:#6b7280;margin-top:24px;line-height:1.6;">
          <strong>Tip:</strong> Profiles with a photo, skills, and work experience get 3x more views from employers.
        </p>
      `,
    }),
  });
}

// ─── 2. Welcome — Employer ──────────────────────────────────────────

async function sendWelcomeEmployer(user) {
  return sendEmail({
    to: user.email, toName: user.name, tags: ['welcome'],
    subject: `Welcome to WantokJobs, ${user.name}! Start Hiring Smarter 🏢`,
    html: layout({
      preheader: `Reach 30,000+ jobseekers across Papua New Guinea. Post your first job today.`,
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Welcome to <strong>WantokJobs</strong> — the smart way to hire in Papua New Guinea. 
          You now have access to over <strong>30,000 registered jobseekers</strong> across the country.
        </p>

        <h3 style="color:#111827;font-size:16px;margin:24px 0 12px;">Here's what you can do:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            📝 <strong>Post jobs</strong> — your first listing is free
          </td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            🤖 <strong>AI matching</strong> — we'll surface the best candidates automatically
          </td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            📊 <strong>Track everything</strong> — manage applications, schedule interviews, send offers
          </td></tr>
          <tr><td style="padding:8px 0;font-size:14px;color:#374151;">
            🏢 <strong>Build your brand</strong> — set up a company profile that attracts top talent
          </td></tr>
        </table>

        ${button('Post Your First Job', `${BASE_URL}/dashboard/employer/post-job`)}
        ${button('Set Up Company Profile', `${BASE_URL}/dashboard/employer/profile`, true)}

        <p style="font-size:13px;color:#6b7280;margin-top:24px;line-height:1.6;">
          Need help? Reply to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. 
          We're here to help you find the right people.
        </p>
      `,
    }),
  });
}

// ─── 3. Email Verification ──────────────────────────────────────────

async function sendVerificationEmail(user, verificationToken) {
  const verifyUrl = `${BASE_URL}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: user.email, toName: user.name, tags: ['auth'],
    subject: 'Verify Your WantokJobs Email Address',
    html: layout({
      preheader: 'Please verify your email to complete your registration.',
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Welcome to <strong>WantokJobs</strong>! To complete your registration and start ${user.role === 'employer' ? 'posting jobs' : 'applying for jobs'}, 
          please verify your email address by clicking the button below:
        </p>

        ${button('Verify My Email', verifyUrl)}

        <p style="font-size:13px;color:#6b7280;margin-top:24px;line-height:1.6;">
          ⏰ This link is valid for <strong>24 hours</strong>.<br>
          If you didn't create this account, you can safely ignore this email.
        </p>
        ${divider()}
        <p style="font-size:12px;color:#9ca3af;">
          Can't click the button? Copy this link: <span style="word-break:break-all;">${verifyUrl}</span>
        </p>
      `,
    }),
  });
}

// ─── 4. Password Reset ──────────────────────────────────────────────

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: user.email, toName: user.name, tags: ['auth'],
    subject: 'Reset Your WantokJobs Password',
    html: layout({
      preheader: 'You requested a password reset. This link expires in 1 hour.',
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          We received a request to reset your WantokJobs password. 
          Click the button below to create a new one:
        </p>

        ${button('Reset My Password', resetUrl)}

        <p style="font-size:13px;color:#6b7280;margin-top:24px;line-height:1.6;">
          ⏰ This link expires in <strong>1 hour</strong>.<br>
          If you did not request this, you can safely ignore this email — your password will not change.
        </p>
        ${divider()}
        <p style="font-size:12px;color:#9ca3af;">
          Can't click the button? Copy this link: <span style="word-break:break-all;">${resetUrl}</span>
        </p>
      `,
    }),
  });
}

// ─── 4. Password Changed Confirmation ───────────────────────────────

async function sendPasswordChangedEmail(user) {
  return sendEmail({
    to: user.email, toName: user.name, tags: ['auth'],
    subject: 'Your WantokJobs Password Was Changed',
    html: layout({
      preheader: 'Your password was successfully updated.',
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Your WantokJobs password was successfully changed on <strong>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
        </p>
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          If you made this change, no further action is needed.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;font-size:14px;color:#991b1b;">
            ⚠️ <strong>Didn't change your password?</strong> Your account may be compromised. 
            <a href="${BASE_URL}/forgot-password" style="color:#dc2626;font-weight:600;">Reset it now</a> and contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#dc2626;">${SUPPORT_EMAIL}</a>.
          </p>
        </div>
      `,
    }),
  });
}

// ─── 5. Application Submitted (to Jobseeker) ────────────────────────

async function sendApplicationConfirmationEmail(user, job, companyName) {
  return sendEmail({
    to: user.email, toName: user.name, tags: ['application'],
    subject: `Application Sent: ${job.title}`,
    html: layout({
      preheader: `Your application for ${job.title} at ${companyName} has been submitted.`,
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Your application has been successfully submitted! Here's a summary:
        </p>
        <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:20px 0;background:#f9fafb;">
          <h3 style="margin:0 0 8px;color:#111827;">${job.title}</h3>
          <p style="margin:0;font-size:14px;color:#6b7280;">
            🏢 ${companyName} · 📍 ${job.location || 'PNG'}${job.job_type ? ` · ${job.job_type}` : ''}
          </p>
        </div>
        <h3 style="color:#111827;font-size:15px;margin:20px 0 10px;">What happens next?</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            1️⃣ The employer will review your application
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            2️⃣ You'll receive an email when your status changes
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            3️⃣ You can track your application in your dashboard
          </td></tr>
        </table>
        ${button('Track My Applications', `${BASE_URL}/dashboard/jobseeker/applications`)}
        <p style="font-size:13px;color:#6b7280;margin-top:20px;">
          💡 <strong>Tip:</strong> Keep applying! On average, successful jobseekers apply to 5–10 positions.
        </p>
      `,
    }),
  });
}

// ─── 6. Application Status Changed (to Jobseeker) ───────────────────

async function sendApplicationStatusEmail(user, jobTitle, status, companyName) {
  const configs = {
    screening: {
      emoji: '📋', subject: `Your application is being reviewed — ${jobTitle}`,
      color: '#2563eb', label: 'Under Review',
      message: `Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> is now being reviewed. The employer is looking through candidates — hang tight!`,
      tip: 'Make sure your profile is complete and up to date. Employers often revisit profiles during screening.',
    },
    shortlisted: {
      emoji: '⭐', subject: `Great news! You're shortlisted — ${jobTitle}`,
      color: '#d97706', label: 'Shortlisted',
      message: `Exciting news! You've been <strong>shortlisted</strong> for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. The employer is interested in your profile and you're in a smaller group of candidates being considered.`,
      tip: 'Prepare for a potential interview. Research the company and review the job description.',
    },
    interview: {
      emoji: '🎤', subject: `Interview invitation — ${jobTitle} at ${companyName}`,
      color: '#7c3aed', label: 'Interview',
      message: `Congratulations! You've been <strong>invited for an interview</strong> for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. Check your messages or email for scheduling details.`,
      tip: 'Prepare examples of your experience. Be on time, dress professionally, and bring copies of your resume.',
    },
    offered: {
      emoji: '🎉', subject: `Job offer! ${jobTitle} at ${companyName}`,
      color: '#16a34a', label: 'Offer Received',
      message: `Amazing news! <strong>${companyName}</strong> has extended a <strong>job offer</strong> to you for <strong>${jobTitle}</strong>! Check your messages for the details and next steps.`,
      tip: 'Review the offer carefully. Consider salary, benefits, location, and growth opportunities before responding.',
    },
    hired: {
      emoji: '🏆', subject: `Congratulations! You're hired — ${jobTitle}`,
      color: '#16a34a', label: 'Hired',
      message: `🎊 <strong>Congratulations!</strong> You've been officially hired for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>! We're thrilled for you. This is the beginning of a great new chapter.`,
      tip: null,
    },
    rejected: {
      emoji: '💪', subject: `Application update — ${jobTitle}`,
      color: '#6b7280', label: 'Not Selected',
      message: `Thank you for your interest in <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. After careful consideration, the employer has decided to move forward with other candidates for this role.`,
      tip: 'Do not be discouraged — every application is practice. New jobs are posted daily on WantokJobs. Keep going!',
    },
    withdrawn: {
      emoji: '📝', subject: `Application withdrawn — ${jobTitle}`,
      color: '#6b7280', label: 'Withdrawn',
      message: `Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been withdrawn. If this was a mistake, you can reapply from the job listing.`,
      tip: null,
    },
  };

  const c = configs[status] || { emoji: '📋', subject: `Application update — ${jobTitle}`, color: '#6b7280', label: status, message: `Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.`, tip: null };

  return sendEmail({
    to: user.email, toName: user.name, tags: ['application'],
    subject: c.subject,
    html: layout({
      preheader: `${c.emoji} ${c.label}: ${jobTitle} at ${companyName}`,
      body: `
        ${greeting(user.name)}
        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:${c.color};color:#ffffff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">
            ${c.emoji} ${c.label}
          </span>
        </div>
        <p style="font-size:15px;color:#374151;line-height:1.7;">${c.message}</p>
        ${c.tip ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:20px 0;">
            <p style="margin:0;font-size:13px;color:#166534;">💡 <strong>Tip:</strong> ${c.tip}</p>
          </div>
        ` : ''}
        ${button('View My Applications', `${BASE_URL}/dashboard/jobseeker/applications`)}
        ${status === 'rejected' ? button('Browse New Jobs', `${BASE_URL}/jobs`, true) : ''}
      `,
    }),
  });
}

// ─── 7. New Application Received (to Employer) ──────────────────────

async function sendNewApplicationEmail(employer, jobTitle, applicantName, applicationCount) {
  return sendEmail({
    to: employer.email, toName: employer.name, tags: ['application'],
    subject: `New applicant: ${applicantName} → ${jobTitle}`,
    html: layout({
      preheader: `${applicantName} just applied for ${jobTitle}. You now have ${applicationCount || 'a new'} application${applicationCount > 1 ? 's' : ''}.`,
      body: `
        ${greeting(employer.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          <strong>${applicantName}</strong> has applied for your job posting:
        </p>
        <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:16px 0;background:#f9fafb;">
          <h3 style="margin:0 0 4px;color:#111827;">${jobTitle}</h3>
          ${applicationCount ? `<p style="margin:0;font-size:13px;color:#6b7280;">📊 Total applicants: <strong>${applicationCount}</strong></p>` : ''}
        </div>
        <p style="font-size:14px;color:#374151;">
          Review their profile and application to decide the next step.
        </p>
        ${button('Review Applicants', `${BASE_URL}/dashboard/employer/applicants`)}
        <p style="font-size:13px;color:#6b7280;margin-top:20px;">
          💡 <strong>Tip:</strong> Respond to applicants within 48 hours. Quick responses attract better candidates.
        </p>
      `,
    }),
  });
}

// ─── 8. Job Posted Confirmation (to Employer) ───────────────────────

async function sendJobPostedEmail(employer, job) {
  return sendEmail({
    to: employer.email, toName: employer.name, tags: ['jobs'],
    subject: `Your job is live: ${job.title}`,
    html: layout({
      preheader: `${job.title} is now visible to thousands of jobseekers across PNG.`,
      body: `
        ${greeting(employer.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Your job listing is now <strong>live</strong> and visible to jobseekers across Papua New Guinea! 🎉
        </p>
        <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:16px 0;background:#f9fafb;">
          <h3 style="margin:0 0 8px;color:#111827;">${job.title}</h3>
          <p style="margin:0;font-size:14px;color:#6b7280;">
            📍 ${job.location || 'PNG'}${job.job_type ? ` · ${job.job_type}` : ''}${job.salary_min ? ` · K${job.salary_min.toLocaleString()}${job.salary_max ? `–K${job.salary_max.toLocaleString()}` : '+'}` : ''}
          </p>
        </div>
        <h3 style="color:#111827;font-size:15px;margin:20px 0 10px;">Maximize your reach:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ Our AI is matching your job to relevant candidates right now
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ Jobseekers with matching alerts will be notified
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            📝 Add screening questions to filter applicants early
          </td></tr>
        </table>
        ${button('Manage My Jobs', `${BASE_URL}/dashboard/employer/jobs`)}
        ${button('View Live Listing', `${BASE_URL}/jobs/${job.id}`, true)}
      `,
    }),
  });
}

// ─── 9. Job Expiring Soon (to Employer) ─────────────────────────────

async function sendJobExpiringSoonEmail(employer, job, daysLeft) {
  return sendEmail({
    to: employer.email, toName: employer.name, tags: ['jobs'],
    subject: `⏰ Your job listing expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}: ${job.title}`,
    html: layout({
      preheader: `${job.title} will be removed in ${daysLeft} days. Renew or close it now.`,
      body: `
        ${greeting(employer.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Your job listing for <strong>${job.title}</strong> will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:16px 0;">
          <p style="margin:0;font-size:14px;color:#92400e;">
            ⏰ After expiration, the listing will no longer appear in search results and candidates will not be able to apply.
          </p>
        </div>
        <p style="font-size:14px;color:#374151;">
          If you've filled the position — great! You can close it early. If you're still looking, consider renewing it.
        </p>
        ${button('Manage My Jobs', `${BASE_URL}/dashboard/employer/jobs`)}
      `,
    }),
  });
}

// ─── 10. Job Alert Matches (to Jobseeker) ───────────────────────────

async function sendJobAlertEmail(user, jobs, alertKeywords) {
  const jobCards = jobs.slice(0, 10).map(j => `
    <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;background:#ffffff;">
      <h3 style="margin:0 0 6px;"><a href="${BASE_URL}/jobs/${j.id}" style="color:#16a34a;text-decoration:none;font-size:15px;">${j.title}</a></h3>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        ${j.company_name ? `🏢 ${j.company_name} · ` : ''}📍 ${j.location || 'PNG'}${j.job_type ? ` · ${j.job_type}` : ''}${j.salary_min ? ` · K${j.salary_min.toLocaleString()}+` : ''}
      </p>
    </div>
  `).join('');

  return sendEmail({
    to: user.email, toName: user.name, tags: ['alerts'],
    subject: `🔔 ${jobs.length} new job${jobs.length > 1 ? 's' : ''} matching "${alertKeywords}"`,
    html: layout({
      preheader: `${jobs.length} new jobs match your alert for "${alertKeywords}".`,
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          We found <strong>${jobs.length} new job${jobs.length > 1 ? 's' : ''}</strong> matching your alert for <strong>"${alertKeywords}"</strong>:
        </p>
        ${jobCards}
        ${jobs.length > 10 ? `<p style="text-align:center;font-size:14px;color:#6b7280;">... and ${jobs.length - 10} more</p>` : ''}
        ${button('View All Matches', `${BASE_URL}/jobs?keyword=${encodeURIComponent(alertKeywords)}`)}
      `,
      footerExtra: `
        <p style="text-align:center;margin:0 0 8px;">
          <a href="${BASE_URL}/dashboard/jobseeker/job-alerts" style="font-size:12px;color:#6b7280;text-decoration:underline;">Manage your alerts</a>
        </p>
      `,
    }),
  });
}

// ─── 11. Incomplete Profile Nudge (to Jobseeker) ────────────────────

async function sendProfileNudgeEmail(user, completionPercent) {
  return sendEmail({
    to: user.email, toName: user.name, tags: ['engagement'],
    subject: `Your profile is ${completionPercent}% complete — finish it to get noticed!`,
    html: layout({
      preheader: `Complete profiles get 3x more views from employers. Yours is ${completionPercent}% done.`,
      body: `
        ${greeting(user.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Your WantokJobs profile is <strong>${completionPercent}% complete</strong>. 
          Employers are searching for candidates right now — a complete profile makes a big difference.
        </p>
        <!-- Progress bar -->
        <div style="background:#e5e7eb;border-radius:999px;height:12px;margin:20px 0;overflow:hidden;">
          <div style="background:#16a34a;height:100%;width:${completionPercent}%;border-radius:999px;"></div>
        </div>
        <h3 style="color:#111827;font-size:15px;margin:20px 0 10px;">Complete profiles get:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">👀 <strong>3x more views</strong> from employers</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🤖 <strong>Better AI matches</strong> — we need your skills and experience to match accurately</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">⭐ <strong>Priority in search</strong> — complete profiles rank higher</td></tr>
        </table>
        ${button('Complete My Profile', `${BASE_URL}/dashboard/jobseeker/profile`)}
      `,
    }),
  });
}

// ─── 12. Order Confirmation (to Employer) ───────────────────────────

async function sendOrderConfirmationEmail(employer, order, plan) {
  return sendEmail({
    to: employer.email, toName: employer.name, tags: ['billing'],
    subject: `Order Confirmed: ${plan.name} Plan — Invoice #${order.invoice_number}`,
    html: layout({
      preheader: `Your ${plan.name} plan is confirmed. Invoice #${order.invoice_number}.`,
      body: `
        ${greeting(employer.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Thank you for your order! Here are the details:
        </p>
        <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:16px 0;background:#f9fafb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Plan</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;"><strong>${plan.name}</strong></td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Job postings</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${plan.job_limit === -1 ? 'Unlimited' : plan.job_limit}</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Amount</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;"><strong>K${order.amount?.toLocaleString() || plan.price?.toLocaleString()}</strong></td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Invoice</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">#${order.invoice_number}</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Payment</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${order.payment_method?.replace('_', ' ') || 'Bank transfer'}</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;">Status</td><td style="padding:4px 0;font-size:14px;color:#d97706;text-align:right;"><strong>${order.status || 'Pending'}</strong></td></tr>
          </table>
        </div>
        ${order.payment_method === 'bank_transfer' ? `
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
            <p style="margin:0 0 10px;font-size:14px;color:#1e40af;"><strong>💳 Bank Transfer Details:</strong></p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e40af;">
              <tr><td style="padding:3px 0;width:100px;">Bank</td><td style="padding:3px 0;"><strong>Bank of South Pacific (BSP)</strong></td></tr>
              <tr><td style="padding:3px 0;">Account</td><td style="padding:3px 0;"><strong>WantokJobs Ltd</strong></td></tr>
              <tr><td style="padding:3px 0;">Account No.</td><td style="padding:3px 0;"><strong>1234-5678-9012</strong></td></tr>
              <tr><td style="padding:3px 0;">Branch</td><td style="padding:3px 0;">Port Moresby</td></tr>
              <tr><td style="padding:3px 0;">Reference</td><td style="padding:3px 0;"><strong style="color:#dc2626;">${order.invoice_number}</strong></td></tr>
            </table>
            <p style="margin:10px 0 0;font-size:12px;color:#1e40af;">
              ⚠️ <strong>Important:</strong> Use your invoice number as the payment reference. Your plan will be activated within 24 hours of payment verification.
            </p>
          </div>
        ` : ''}
        ${button('View My Orders', `${BASE_URL}/dashboard/employer/orders-billing`)}
      `,
    }),
  });
}

// ─── 13. Contact Form Received (to Admin) ───────────────────────────

async function sendContactFormAdminEmail(contact) {
  return sendEmail({
    to: SUPPORT_EMAIL, tags: ['admin'],
    subject: `[Contact Form] ${contact.subject} — from ${contact.name}`,
    replyTo: contact.email,
    html: layout({
      preheader: `New contact form submission from ${contact.name} (${contact.email})`,
      body: `
        <h2 style="color:#111827;font-size:18px;margin:0 0 16px;">New Contact Form Submission</h2>
        <div class="card" style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:16px 0;background:#f9fafb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;width:80px;vertical-align:top;">From</td><td style="padding:4px 0;font-size:14px;color:#111827;"><strong>${contact.name}</strong></td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;vertical-align:top;">Email</td><td style="padding:4px 0;font-size:14px;color:#111827;"><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#6b7280;vertical-align:top;">Subject</td><td style="padding:4px 0;font-size:14px;color:#111827;">${contact.subject}</td></tr>
          </table>
          ${divider()}
          <p style="font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${contact.message}</p>
        </div>
        <p style="font-size:13px;color:#6b7280;">Reply directly to this email to respond to ${contact.name}.</p>
      `,
    }),
  });
}

// ─── 14. Contact Form Auto-Reply (to Sender) ────────────────────────

async function sendContactFormAutoReply(contact) {
  return sendEmail({
    to: contact.email, toName: contact.name, tags: ['contact'],
    subject: `We received your message — ${contact.subject}`,
    replyTo: SUPPORT_EMAIL,
    html: layout({
      preheader: `Thanks for reaching out. We'll get back to you within 24–48 hours.`,
      body: `
        ${greeting(contact.name)}
        <p style="font-size:15px;color:#374151;line-height:1.7;">
          Thank you for contacting WantokJobs. We've received your message about <strong>"${contact.subject}"</strong> and our team will get back to you within <strong>24–48 hours</strong>.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#6b7280;">
            <strong>Your message:</strong><br>
            <span style="color:#374151;">${contact.message.length > 200 ? contact.message.substring(0, 200) + '...' : contact.message}</span>
          </p>
        </div>
        <p style="font-size:14px;color:#374151;">
          In the meantime, you might find answers on our <a href="${BASE_URL}/faq">FAQ page</a>.
        </p>
      `,
    }),
  });
}

// ─── 15. Weekly Admin Digest ─────────────────────────────────────────

async function sendAdminDigestEmail(adminEmail, stats) {
  return sendEmail({
    to: adminEmail, tags: ['admin'],
    subject: `📊 WantokJobs Weekly Digest — ${stats.newUsers} new users, ${stats.newJobs} new jobs`,
    html: layout({
      preheader: `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${stats.newUsers} signups, ${stats.newJobs} jobs posted, ${stats.newApplications} applications.`,
      body: `
        <h2 style="color:#111827;font-size:18px;margin:0 0 20px;">📊 Weekly Platform Summary</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:33%;text-align:center;padding:12px;">
              <div style="background:#f0fdf4;border-radius:10px;padding:16px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${stats.newUsers}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">New Users</p>
              </div>
            </td>
            <td style="width:33%;text-align:center;padding:12px;">
              <div style="background:#eff6ff;border-radius:10px;padding:16px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb;">${stats.newJobs}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Jobs Posted</p>
              </div>
            </td>
            <td style="width:33%;text-align:center;padding:12px;">
              <div style="background:#fefce8;border-radius:10px;padding:16px;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;">${stats.newApplications}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Applications</p>
              </div>
            </td>
          </tr>
        </table>
        ${divider()}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
          <tr><td style="padding:6px 0;color:#6b7280;">Total users</td><td style="padding:6px 0;text-align:right;color:#111827;"><strong>${stats.totalUsers?.toLocaleString()}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Active jobs</td><td style="padding:6px 0;text-align:right;color:#111827;"><strong>${stats.activeJobs?.toLocaleString()}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Total applications</td><td style="padding:6px 0;text-align:right;color:#111827;"><strong>${stats.totalApplications?.toLocaleString()}</strong></td></tr>
          ${stats.revenue ? `<tr><td style="padding:6px 0;color:#6b7280;">Revenue this week</td><td style="padding:6px 0;text-align:right;color:#16a34a;"><strong>K${stats.revenue.toLocaleString()}</strong></td></tr>` : ''}
        </table>
        ${button('Open Admin Dashboard', `${BASE_URL}/dashboard/admin`)}
      `,
    }),
  });
}

// ─── Convenience Wrapper ─────────────────────────────────────────────

async function sendWelcomeEmail(user) {
  return user.role === 'employer' ? sendWelcomeEmployer(user) : sendWelcomeJobseeker(user);
}

// ─── 16. Newsletter Digest (Weekly) ──────────────────────────────────

async function sendNewsletterDigest(subscriber, jobs, stats, personalizedJobs) {
  const { newsletterDigest } = require('./email-templates');
  const unsubToken = Buffer.from(`${subscriber.email}:${Date.now()}`).toString('base64');
  
  return sendEmail({
    to: subscriber.email,
    toName: subscriber.name || subscriber.email,
    subject: `WantokJobs Weekly — ${jobs.length} New Jobs This Week`,
    html: newsletterDigest({
      subscriberName: subscriber.name,
      jobs,
      stats,
      personalizedJobs,
      unsubscribeToken: unsubToken,
    }),
    tags: ['newsletter', 'weekly'],
  });
}

// ─── 17. Welcome to Newsletter ───────────────────────────────────────

async function sendWelcomeNewsletter(email, name) {
  const { welcomeToNewsletter } = require('./email-templates');
  
  return sendEmail({
    to: email,
    toName: name || email,
    subject: 'Welcome to WantokJobs Weekly! 🎉',
    html: welcomeToNewsletter(name, email),
    tags: ['newsletter', 'welcome'],
  });
}

// ─── 18. New Job Posted → Alert Matching Subscribers ─────────────────

async function sendNewJobAlerts(job, employerProfile) {
  const db = require('../database');
  
  try {
    // Find subscribers with matching job alerts (if they have accounts)
    const alerts = db.prepare(`
      SELECT DISTINCT ja.*, u.email, u.name
      FROM job_alerts ja
      JOIN users u ON ja.user_id = u.id
      WHERE ja.active = 1
        AND ja.channel = 'email'
        AND (
          ja.keywords IS NULL 
          OR ? LIKE '%' || ja.keywords || '%'
          OR ? LIKE '%' || ja.keywords || '%'
        )
        AND (ja.location IS NULL OR ? LIKE '%' || ja.location || '%')
        AND (ja.job_type IS NULL OR ? = ja.job_type)
    `).all(
      job.title.toLowerCase(),
      (job.description || '').toLowerCase(),
      job.location || '',
      job.job_type || ''
    );

    if (alerts.length === 0) return { sent: 0 };

    let sent = 0;
    for (const alert of alerts) {
      try {
        // Check if alert was sent recently (avoid spam)
        const lastSent = alert.last_sent ? new Date(alert.last_sent) : null;
        const hoursSinceLastSent = lastSent ? (Date.now() - lastSent.getTime()) / (1000 * 60 * 60) : 999;

        if (alert.frequency === 'instant' || hoursSinceLastSent >= 24) {
          await sendJobAlertEmail(
            { email: alert.email, name: alert.name },
            [job],
            alert.keywords || 'your job alert'
          );

          // Update last_sent
          db.prepare("UPDATE job_alerts SET last_sent = datetime('now') WHERE id = ?").run(alert.id);
          sent++;
        }
      } catch (e) {
        logger.error('error', { detail: `Failed to send job alert to ${alert.email}:`, message: e.message });
      }
    }

    logger.info('log', { detail: `📧 Sent ${sent} job alert emails for new job: ${job.title}` });
    return { sent };
  } catch (error) {
    logger.error('Send new job alerts error', { error: error.message });
    return { sent: 0, error: error.message };
  }
}

// ─── 19. Generic Notification Email ──────────────────────────────────

async function sendNotificationEmail({ to, toName, subject, body, actionUrl, actionText, notificationType, digestData }) {
  try {
    const html = layout({
      preheader: body.substring(0, 100),
      body: `
        ${greeting(toName)}
        <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">${body}</p>
        ${actionUrl && actionText ? button(actionText, actionUrl) : ''}
        ${digestData ? `
          <div class="card">
            <p style="font-size:14px;color:#6b7280;margin:0 0 12px;"><strong>Notification Summary:</strong></p>
            ${Object.entries(digestData).map(([type, notifs]) => `
              <p style="font-size:14px;color:#374151;margin:4px 0;">
                <strong>${notifs.length}</strong> ${type.replace(/_/g, ' ')}
              </p>
            `).join('')}
          </div>
        ` : ''}
        <p style="font-size:14px;color:#6b7280;margin:24px 0 0;">
          Best wishes,<br>
          <strong>The WantokJobs Team</strong>
        </p>
      `,
    });

    return sendEmail({
      to,
      toName,
      subject,
      html,
      text: body,
      tags: ['notification', notificationType || 'general'],
    });
  } catch (error) {
    logger.error('Send notification email error', { error: error.message });
    return { error: error.message };
  }
}

// ─── 20. Interview Invitation ────────────────────────────────────────

async function sendInterviewInviteEmail(user, job, companyName, interview) {
  const dateObj = new Date(interview.scheduled_at);
  const dateStr = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const timeStr = dateObj.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', hour12: true 
  });

  const typeEmoji = {
    'in-person': '🏢',
    'phone': '📞',
    'video': '🎥'
  };

  const typeLabel = {
    'in-person': 'In-Person Interview',
    'phone': 'Phone Interview',
    'video': 'Video Interview'
  };

  // Generate Google Calendar link
  const calendarTitle = encodeURIComponent(`Interview: ${job.title} at ${companyName}`);
  const calendarDetails = encodeURIComponent(
    `Interview for ${job.title}\n\n` +
    `Type: ${typeLabel[interview.type]}\n` +
    (interview.location ? `Location: ${interview.location}\n` : '') +
    (interview.video_link ? `Video Link: ${interview.video_link}\n` : '') +
    (interview.notes ? `\nNotes:\n${interview.notes}` : '')
  );
  const startTime = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endTime = new Date(dateObj.getTime() + interview.duration_minutes * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calendarTitle}&dates=${startTime}/${endTime}&details=${calendarDetails}&location=${encodeURIComponent(interview.location || '')}`;

  return sendEmail({
    to: user.email, toName: user.name, tags: ['interview'],
    subject: `🎤 Interview Scheduled: ${job.title} at ${companyName}`,
    html: layout({
      preheader: `Interview scheduled for ${dateStr} at ${timeStr}`,
      body: `
        ${greeting(user.name)}
        <div style="text-align:center;margin:0 0 24px;">
          <span style="display:inline-block;background:#7c3aed;color:#ffffff;padding:8px 20px;border-radius:24px;font-size:15px;font-weight:600;">
            ${typeEmoji[interview.type] || '🎤'} ${typeLabel[interview.type] || 'Interview Scheduled'}
          </span>
        </div>
        <p style="font-size:16px;color:#374151;line-height:1.7;">
          Great news! You've been invited for an interview for <strong>${job.title}</strong> at <strong>${companyName}</strong>.
        </p>
        <div class="card" style="border:2px solid #7c3aed;border-radius:12px;padding:20px;margin:20px 0;background:#faf5ff;">
          <h3 style="margin:0 0 14px;color:#111827;font-size:17px;">📅 Interview Details</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr><td style="padding:6px 0;color:#6b7280;width:100px;">Date</td><td style="padding:6px 0;color:#111827;"><strong>${dateStr}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;color:#111827;"><strong>${timeStr}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Duration</td><td style="padding:6px 0;color:#111827;">${interview.duration_minutes} minutes</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Type</td><td style="padding:6px 0;color:#111827;">${typeLabel[interview.type]}</td></tr>
            ${interview.location ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Location</td><td style="padding:6px 0;color:#111827;">${interview.location}</td></tr>` : ''}
            ${interview.video_link ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Video Link</td><td style="padding:6px 0;color:#111827;"><a href="${interview.video_link}" style="color:#7c3aed;word-break:break-all;">${interview.video_link}</a></td></tr>` : ''}
            ${interview.interviewer_name ? `<tr><td style="padding:6px 0;color:#6b7280;">Interviewer</td><td style="padding:6px 0;color:#111827;">${interview.interviewer_name}</td></tr>` : ''}
          </table>
          ${interview.notes ? `
            <div style="margin-top:14px;padding-top:14px;border-top:1px solid #e9d5ff;">
              <p style="margin:0;font-size:13px;color:#6b7280;"><strong>Notes:</strong></p>
              <p style="margin:6px 0 0;font-size:14px;color:#374151;line-height:1.6;">${interview.notes}</p>
            </div>
          ` : ''}
        </div>
        ${button('Add to Google Calendar', gcalLink)}
        <h3 style="color:#111827;font-size:15px;margin:24px 0 10px;">💡 How to prepare:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ Review the job description and company background
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ Prepare examples of your experience relevant to the role
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ Have questions ready to ask the interviewer
          </td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
            ✅ ${interview.type === 'video' ? 'Test your camera and microphone ahead of time' : interview.type === 'phone' ? 'Make sure you\'re in a quiet place with good reception' : 'Plan your route and arrive 10 minutes early'}
          </td></tr>
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#166534;">
            🌟 <strong>You've got this!</strong> Remember, the interview is also your chance to learn if this role is right for you. Be yourself and ask questions.
          </p>
        </div>
      `,
    }),
  });
}

// ─── Exports ─────────────────────────────────────────────────────────

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendWelcomeJobseeker,
  sendWelcomeEmployer,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendApplicationConfirmationEmail,
  sendApplicationStatusEmail,
  sendNewApplicationEmail,
  sendJobPostedEmail,
  sendJobExpiringSoonEmail,
  sendJobAlertEmail,
  sendProfileNudgeEmail,
  sendOrderConfirmationEmail,
  sendContactFormAdminEmail,
  sendContactFormAutoReply,
  sendAdminDigestEmail,
  sendNewsletterDigest,
  sendWelcomeNewsletter,
  sendNewJobAlerts,
  sendNotificationEmail,
  sendInterviewInviteEmail,
};
