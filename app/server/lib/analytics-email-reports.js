/**
 * WantokJobs Analytics Email Reports
 * Admin Weekly Digest and platform statistics emails
 */

const db = require('../database');
const { emailLayout, statCard, button } = require('./email-templates');

/**
 * Send Admin Weekly Digest Email
 * @param {string} adminEmail - Admin email address
 * @returns {Promise<Object>} - Email send result
 */
async function sendAdminWeeklyDigest(adminEmail) {
  try {
    // Query platform statistics
    const stats = await getWeeklyStats();
    
    // Generate email HTML
    const emailHtml = generateAdminDigestHtml(stats);
    
    // Send email via Brevo
    const emailService = require('./email');
    const result = await emailService.sendEmail({
      to: adminEmail,
      subject: '📊 WantokJobs Weekly Platform Summary',
      html: emailHtml
    });
    
    return result;
  } catch (error) {
    console.error('Error sending admin weekly digest:', error);
    throw error;
  }
}

/**
 * Get weekly platform statistics from database
 * @returns {Promise<Object>} - Platform statistics
 */
async function getWeeklyStats() {
  const stats = {};
  
  try {
    // Total users (all time)
    const totalUsersQuery = db.prepare('SELECT COUNT(*) as count FROM users');
    stats.totalUsers = totalUsersQuery.get().count || 0;
    
    // Active jobs (currently active)
    const activeJobsQuery = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status='active'");
    stats.activeJobs = activeJobsQuery.get().count || 0;
    
    // Total applications (all time)
    const totalAppsQuery = db.prepare('SELECT COUNT(*) as count FROM applications');
    stats.totalApplications = totalAppsQuery.get().count || 0;
    
    // Revenue this week (from payments table)
    const revenueQuery = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as revenue 
      FROM payments 
      WHERE status='completed' 
      AND created_at >= date('now', '-7 days')
    `);
    const revenueResult = revenueQuery.get();
    stats.revenue = revenueResult?.revenue || 0;
    
    // New users this week
    const newUsersQuery = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= date('now', '-7 days')
    `);
    stats.newUsers = newUsersQuery.get().count || 0;
    
    // Jobs posted this week
    const jobsPostedQuery = db.prepare(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE created_at >= date('now', '-7 days')
    `);
    stats.jobsPosted = jobsPostedQuery.get().count || 0;
    
    // Applications this week
    const appsThisWeekQuery = db.prepare(`
      SELECT COUNT(*) as count 
      FROM applications 
      WHERE created_at >= date('now', '-7 days')
    `);
    stats.applicationsThisWeek = appsThisWeekQuery.get().count || 0;
    
    return stats;
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    // Return zeros if database query fails
    return {
      totalUsers: 0,
      activeJobs: 0,
      totalApplications: 0,
      revenue: 0,
      newUsers: 0,
      jobsPosted: 0,
      applicationsThisWeek: 0
    };
  }
}

/**
 * Generate Admin Weekly Digest HTML
 * @param {Object} stats - Platform statistics
 * @returns {string} - HTML email content
 */
function generateAdminDigestHtml(stats) {
  const COLORS = {
    green: '#10B981',
    gold: '#F59E0B',
    blue: '#3B82F6',
    orange: '#F97316',
    dark: '#1F2937',
    gray: '#6B7280',
  };
  
  const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';
  
  const body = `
    <h1 style="color:${COLORS.dark};margin:0 0 24px;font-size:24px;font-weight:700;">📊 Weekly Platform Summary</h1>
    
    <!-- Weekly Stats Cards -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:0 8px 16px 0;" width="33.33%">
          ${statCard('New Users', stats.newUsers.toLocaleString(), '👥', COLORS.green)}
        </td>
        <td style="padding:0 4px 16px;" width="33.33%">
          ${statCard('Jobs Posted', stats.jobsPosted.toLocaleString(), '💼', COLORS.blue)}
        </td>
        <td style="padding:0 0 16px 8px;" width="33.33%">
          ${statCard('Applications', stats.applicationsThisWeek.toLocaleString(), '📝', COLORS.orange)}
        </td>
      </tr>
    </table>
    
    <!-- Platform Totals -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;background:#F9FAFB;border-radius:8px;padding:20px;">
      <tr>
        <td style="padding:0 0 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="color:${COLORS.gray};font-size:14px;padding:8px 0;">Total users</td>
              <td style="color:${COLORS.dark};font-size:16px;font-weight:600;text-align:right;padding:8px 0;">${stats.totalUsers.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.gray};font-size:14px;padding:8px 0;border-top:1px solid #E5E7EB;">Active jobs</td>
              <td style="color:${COLORS.dark};font-size:16px;font-weight:600;text-align:right;padding:8px 0;border-top:1px solid #E5E7EB;">${stats.activeJobs.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.gray};font-size:14px;padding:8px 0;border-top:1px solid #E5E7EB;">Total applications</td>
              <td style="color:${COLORS.dark};font-size:16px;font-weight:600;text-align:right;padding:8px 0;border-top:1px solid #E5E7EB;">${stats.totalApplications.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color:${COLORS.gray};font-size:14px;padding:8px 0;border-top:1px solid #E5E7EB;">Revenue this week</td>
              <td style="color:${COLORS.green};font-size:18px;font-weight:700;text-align:right;padding:8px 0;border-top:1px solid #E5E7EB;">K${(stats.revenue / 100).toFixed(2)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    
    <!-- Admin Dashboard Button -->
    <div style="text-align:center;margin-top:32px;">
      ${button('Open Admin Dashboard', `${BASE_URL}/admin/dashboard`, 'primary')}
    </div>
    
    <p style="margin:24px 0 0;font-size:14px;color:${COLORS.gray};line-height:1.6;">
      This is your weekly platform summary. Login to the admin dashboard for detailed analytics and moderation tools.
    </p>
  `;
  
  return emailLayout({
    preheader: `Weekly stats: ${stats.newUsers} new users, ${stats.jobsPosted} jobs posted, K${(stats.revenue / 100).toFixed(2)} revenue`,
    body: body,
    footerText: 'You are receiving this as a platform administrator.'
  });
}

module.exports = {
  sendAdminWeeklyDigest,
  getWeeklyStats,
  generateAdminDigestHtml
};
