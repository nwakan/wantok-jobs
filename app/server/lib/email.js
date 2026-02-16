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

// ─── Shared HTML Layout ──────────────────────────────────────────────

function layout({ preheader, body, footerExtra }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${preheader ? `<span style="display:none!important;font-size:0;line-height:0;max-height:0;mso-hide:all;overflow:hidden">${preheader}</span>` : ''}
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; }
    .btn { background: #16a34a; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 15px; }
    .btn:hover { background: #15803d; }
    .btn-outline { background: transparent; color: #16a34a !important; border: 2px solid #16a34a; padding: 12px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 14px; }
    a { color: #16a34a; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 14px; background: #ffffff; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:28px 32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">WantokJobs</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Papua New Guinea's Smart Job Platform</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 32px 24px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;">
          ${footerExtra || ''}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center;padding-top:12px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${BASE_URL}" style="color:#6b7280;text-decoration:none;">WantokJobs</a> · 
                <a href="${BASE_URL}/jobs" style="color:#6b7280;text-decoration:none;">Browse Jobs</a> · 
                <a href="${BASE_URL}/contact" style="color:#6b7280;text-decoration:none;">Contact Us</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                WantokJobs — Connecting Papua New Guinea's talent with opportunity.<br>
                You're receiving this because you have an account at wantokjobs.com.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(text, url, outline = false) {
  return `<p style="text-align:center;margin:28px 0 8px;"><a href="${url}" class="${outline ? 'btn-outline' : 'btn'}" style="${outline ? `background:transparent;color:#16a34a;border:2px solid #16a34a;padding:12px 26px;` : `background:#16a34a;color:#ffffff;padding:14px 28px;`}text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:${outline ? '14' : '15'}px;">${text}</a></p>`;
}

function greeting(name) {
  return `<p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${name || 'there'},</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`;
}

// ─── Core Send Function ──────────────────────────────────────────────

async function sendEmail({ to, toName, subject, html, text, replyTo, tags }) {
  if (!BREVO_API_KEY) {
    console.log(`📧 [NO KEY] To: ${to} | ${subject}`);
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
      console.log(`📧 → ${to}: ${subject}`);
      return { success: true, messageId: data.messageId };
    } else {
      console.error(`📧 ✗ ${to}: ${data.message || JSON.stringify(data)}`);
      return { success: false, error: data.message };
    }
  } catch (err) {
    console.error(`📧 ✗ ${to}: ${err.message}`);
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

// ─── 3. Password Reset ──────────────────────────────────────────────

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

// ─── Exports ─────────────────────────────────────────────────────────

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendWelcomeJobseeker,
  sendWelcomeEmployer,
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
};
