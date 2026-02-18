/**
 * WantokJobs Email Templates
 * Reusable HTML email components with PNG branding
 */

const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';
const UNSUBSCRIBE_URL = `${BASE_URL}/newsletter/unsubscribe`;

// ─── Theme Colors ────────────────────────────────────────────────────
const COLORS = {
  green: '#10B981',
  greenDark: '#059669',
  gold: '#F59E0B',
  dark: '#1F2937',
  darkLight: '#374151',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
};

// ─── Layout Wrapper ──────────────────────────────────────────────────
function emailLayout({ preheader, body, footerText, showUnsubscribe = false, unsubscribeToken }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${preheader ? `<!--[if !mso]><!--><span style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}</span><!--<![endif]-->` : ''}
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding: 20px 16px !important; }
      .mobile-text { font-size: 14px !important; }
      .mobile-hide { display: none !important; }
    }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLORS.lightGray};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji';">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.lightGray};">
    <tr><td align="center" style="padding:32px 16px;">
      <!-- Main Container -->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLORS.white};border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        
        <!-- Header with PNG Cultural Touch -->
        <tr><td style="background:linear-gradient(135deg,${COLORS.green} 0%,${COLORS.greenDark} 100%);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
          <!-- Logo placeholder -->
          <div style="background:${COLORS.white};width:64px;height:64px;margin:0 auto 16px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <span style="font-size:32px;font-weight:800;color:${COLORS.green};">W</span>
          </div>
          <h1 style="color:${COLORS.white};margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">WantokJobs</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;font-weight:500;">Your Wantok in the Job Market</p>
          <!-- PNG Flag Colors Accent -->
          <div style="margin-top:16px;height:4px;background:linear-gradient(90deg,#CE1126 0%,#CE1126 33%,${COLORS.gold} 33%,${COLORS.gold} 66%,#000000 66%,#000000 100%);border-radius:2px;"></div>
        </td></tr>
        
        <!-- Body Content -->
        <tr><td class="mobile-padding" style="padding:40px 32px;">
          ${body}
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="background:${COLORS.lightGray};padding:32px 24px;border-radius:0 0 12px 12px;border-top:1px solid #E5E7EB;">
          ${footerText ? `<p style="margin:0 0 16px;font-size:13px;color:${COLORS.gray};text-align:center;line-height:1.6;">${footerText}</p>` : ''}
          
          <!-- Social Links -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="text-align:center;padding:12px 0;">
              <a href="${BASE_URL}" style="color:${COLORS.gray};text-decoration:none;font-size:13px;margin:0 8px;">Home</a>
              <span style="color:#D1D5DB;">·</span>
              <a href="${BASE_URL}/jobs" style="color:${COLORS.gray};text-decoration:none;font-size:13px;margin:0 8px;">Browse Jobs</a>
              <span style="color:#D1D5DB;">·</span>
              <a href="${BASE_URL}/contact" style="color:${COLORS.gray};text-decoration:none;font-size:13px;margin:0 8px;">Contact</a>
            </td></tr>
          </table>
          
          ${showUnsubscribe ? `
            <p style="margin:16px 0 0;text-align:center;font-size:12px;color:${COLORS.gray};">
              <a href="${UNSUBSCRIBE_URL}${unsubscribeToken ? `?token=${unsubscribeToken}` : ''}" style="color:${COLORS.gray};text-decoration:underline;">Unsubscribe from newsletter</a>
            </p>
          ` : ''}
          
          <!-- Wantok Spirit -->
          <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;text-align:center;font-style:italic;">
            "Wantok" — friend, connection, together. 🇵🇬
          </p>
          
          <p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;text-align:center;font-weight:600;">
            WantokJobs — The Pacific's #1 Job Board
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;text-align:center;">
            © ${new Date().getFullYear()} WantokJobs. Connecting Pacific talent with opportunity.
          </p>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Button Component ────────────────────────────────────────────────
function button(text, url, options = {}) {
  const { variant = 'primary', fullWidth = false } = options;
  
  const styles = {
    primary: `background:${COLORS.green};color:${COLORS.white};border:none;`,
    secondary: `background:transparent;color:${COLORS.green};border:2px solid ${COLORS.green};`,
    gold: `background:${COLORS.gold};color:${COLORS.dark};border:none;`,
  };
  
  return `
    <table role="presentation" width="${fullWidth ? '100%' : 'auto'}" cellpadding="0" cellspacing="0" border="0" style="margin:24px ${fullWidth ? '0' : 'auto'};">
      <tr><td align="center">
        <a href="${url}" style="display:inline-block;${styles[variant]}padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;text-align:center;min-width:180px;">
          ${text}
        </a>
      </td></tr>
    </table>
  `;
}

// ─── Job Card Component ──────────────────────────────────────────────
function jobCard(job) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px;background:${COLORS.white};">
      <tr><td style="padding:18px;">
        <h3 style="margin:0 0 8px;font-size:16px;line-height:1.4;">
          <a href="${BASE_URL}/jobs/${job.id}" style="color:${COLORS.green};text-decoration:none;font-weight:600;">${job.title}</a>
        </h3>
        <p style="margin:0;font-size:13px;color:${COLORS.gray};line-height:1.6;">
          ${job.company_name ? `🏢 <strong>${job.company_name}</strong> · ` : ''}
          📍 ${job.location || 'Papua New Guinea'}
          ${job.job_type ? ` · ${job.job_type}` : ''}
          ${job.salary_min ? ` · <span style="color:${COLORS.gold};font-weight:600;">K${job.salary_min.toLocaleString()}${job.salary_max ? `–${job.salary_max.toLocaleString()}` : '+'}</span>` : ''}
        </p>
        ${job.description ? `
          <p style="margin:10px 0 0;font-size:13px;color:${COLORS.darkLight};line-height:1.5;">
            ${job.description.substring(0, 120)}${job.description.length > 120 ? '...' : ''}
          </p>
        ` : ''}
      </td></tr>
    </table>
  `;
}

// ─── Stat Card Component ─────────────────────────────────────────────
function statCard(label, value, icon = '') {
  return `
    <td style="width:33%;padding:12px;text-align:center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.lightGray};border-radius:10px;padding:16px;">
        <tr><td align="center">
          ${icon ? `<div style="font-size:24px;margin-bottom:8px;">${icon}</div>` : ''}
          <p style="margin:0;font-size:32px;font-weight:700;color:${COLORS.green};line-height:1;">${value}</p>
          <p style="margin:8px 0 0;font-size:12px;color:${COLORS.gray};text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
        </td></tr>
      </table>
    </td>
  `;
}

// ─── Alert Box Component ─────────────────────────────────────────────
function alertBox(text, type = 'info') {
  const configs = {
    info: { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', icon: 'ℹ️' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', icon: '✅' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: '⚠️' },
    tip: { bg: '#F0FDF4', border: '#BBF7D0', color: '#166534', icon: '💡' },
  };
  
  const c = configs[type];
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;margin:20px 0;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:14px;color:${c.color};line-height:1.6;">
          ${c.icon} ${text}
        </p>
      </td></tr>
    </table>
  `;
}

// ─── Greeting ────────────────────────────────────────────────────────
function greeting(name) {
  return `<p style="font-size:16px;color:${COLORS.dark};margin:0 0 16px;font-weight:500;">Hi ${name || 'there'},</p>`;
}

// ─── Divider ─────────────────────────────────────────────────────────
function divider() {
  return `<hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;">`;
}

// ─── Newsletter Template ─────────────────────────────────────────────
function newsletterDigest({ subscriberName, jobs, stats, personalizedJobs, unsubscribeToken }) {
  const topJobs = jobs.slice(0, 8);
  const hasPersonalized = personalizedJobs && personalizedJobs.length > 0;
  
  return emailLayout({
    preheader: `${jobs.length} new jobs this week across PNG & the Pacific. ${hasPersonalized ? 'Plus personalized matches just for you!' : ''}`,
    body: `
      ${greeting(subscriberName)}
      
      <h2 style="color:${COLORS.dark};font-size:20px;margin:0 0 8px;font-weight:700;">Your Weekly Job Digest 📬</h2>
      <p style="font-size:15px;color:${COLORS.darkLight};margin:0 0 24px;line-height:1.6;">
        Here's what's new on WantokJobs this week — <strong>${jobs.length} fresh opportunities</strong> across PNG and the Pacific Islands.
      </p>
      
      ${stats ? `
        <!-- Weekly Stats -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
          <tr>
            ${statCard('New Jobs', stats.newJobs, '💼')}
            ${statCard('Hiring Now', stats.activeEmployers, '🏢')}
            ${statCard('Jobseekers', stats.totalJobseekers, '👥')}
          </tr>
        </table>
      ` : ''}
      
      ${hasPersonalized ? `
        ${divider()}
        <h3 style="color:${COLORS.green};font-size:18px;margin:0 0 16px;font-weight:700;">⭐ Recommended for You</h3>
        <p style="font-size:14px;color:${COLORS.gray};margin:0 0 16px;">Based on your profile and preferences:</p>
        ${personalizedJobs.slice(0, 3).map(job => jobCard(job)).join('')}
      ` : ''}
      
      ${divider()}
      <h3 style="color:${COLORS.dark};font-size:18px;margin:0 0 16px;font-weight:700;">Latest Job Listings</h3>
      ${topJobs.map(job => jobCard(job)).join('')}
      
      ${jobs.length > topJobs.length ? `
        <p style="text-align:center;font-size:14px;color:${COLORS.gray};margin:16px 0 0;">
          <em>+ ${jobs.length - topJobs.length} more jobs posted this week</em>
        </p>
      ` : ''}
      
      ${button('Browse All Jobs', `${BASE_URL}/jobs`, { fullWidth: true })}
      
      ${alertBox('Complete your profile to get personalized job matches every week. Profiles with skills and work experience get 3x more employer views!', 'tip')}
      
      ${divider()}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.lightGray};border-radius:10px;padding:20px;margin-top:24px;">
        <tr><td style="text-align:center;">
          <p style="margin:0 0 12px;font-size:14px;color:${COLORS.darkLight};font-weight:600;">Job hunting tips from WantokJobs:</p>
          <ul style="text-align:left;margin:0;padding:0 0 0 20px;font-size:13px;color:${COLORS.gray};line-height:1.8;">
            <li>Apply within 48 hours of a job posting for best visibility</li>
            <li>Customize your cover letter for each application</li>
            <li>Follow up 3-5 days after applying (politely!)</li>
            <li>Set up job alerts to never miss matching opportunities</li>
          </ul>
        </td></tr>
      </table>
    `,
    footerText: `You're receiving this weekly digest because you subscribed to WantokJobs updates. We send these once a week — no spam, just opportunities.`,
    showUnsubscribe: true,
    unsubscribeToken,
  });
}

// ─── Welcome to Newsletter ──────────────────────────────────────────
function welcomeToNewsletter(subscriberName, subscriberEmail) {
  return emailLayout({
    preheader: 'Welcome to WantokJobs Weekly Digest! Here\'s what to expect.',
    body: `
      ${greeting(subscriberName || subscriberEmail)}
      
      <h2 style="color:${COLORS.green};font-size:22px;margin:0 0 16px;font-weight:700;">Welcome to WantokJobs Weekly! 🎉</h2>
      
      <p style="font-size:15px;color:${COLORS.darkLight};line-height:1.7;margin:0 0 16px;">
        You're now subscribed to the <strong>WantokJobs Weekly Digest</strong> — your curated roundup of the latest jobs, hiring trends, and career opportunities across PNG and the Pacific Islands.
      </p>
      
      <h3 style="color:${COLORS.dark};font-size:16px;margin:24px 0 12px;font-weight:600;">What you'll get every week:</h3>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:8px 0;font-size:14px;color:${COLORS.darkLight};">
          💼 <strong>New job listings</strong> — fresh opportunities from top Pacific employers
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:${COLORS.darkLight};">
          🤖 <strong>Personalized matches</strong> — AI-powered recommendations (if you have a WantokJobs account)
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:${COLORS.darkLight};">
          📊 <strong>Market insights</strong> — hiring trends and job market stats
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:${COLORS.darkLight};">
          💡 <strong>Career tips</strong> — advice from the Pacific's top recruiters
        </td></tr>
      </table>
      
      ${alertBox('Have a WantokJobs account? Create a profile to receive personalized job recommendations every week!', 'tip')}
      
      ${button('Complete My Profile', `${BASE_URL}/register`)}
      ${button('Browse Jobs', `${BASE_URL}/jobs`, { variant: 'secondary' })}
      
      <p style="font-size:13px;color:${COLORS.gray};margin-top:28px;line-height:1.6;">
        We send one email every Sunday evening. No spam, no noise — just quality job opportunities.
      </p>
    `,
    footerText: `Subscribed with ${subscriberEmail}. You can update your preferences or unsubscribe anytime.`,
    showUnsubscribe: true,
  });
}

module.exports = {
  emailLayout,
  button,
  jobCard,
  statCard,
  alertBox,
  greeting,
  divider,
  newsletterDigest,
  welcomeToNewsletter,
  COLORS,
};
