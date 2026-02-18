const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Middleware: admin only
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/admin/analytics/overview
router.get('/overview', (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total users
    const totalJobseekers = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'jobseeker' AND COALESCE(account_status, 'active') != 'spam'
    `).get().count;

    const totalEmployers = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'employer' AND COALESCE(account_status, 'active') != 'spam'
    `).get().count;

    const newJobseekersWeek = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'jobseeker' 
      AND created_at >= ? 
      AND COALESCE(account_status, 'active') != 'spam'
    `).get(oneWeekAgo).count;

    const newEmployersWeek = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'employer' 
      AND created_at >= ? 
      AND COALESCE(account_status, 'active') != 'spam'
    `).get(oneWeekAgo).count;

    const newJobseekersMonth = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'jobseeker' 
      AND created_at >= ? 
      AND COALESCE(account_status, 'active') != 'spam'
    `).get(oneMonthAgo).count;

    const newEmployersMonth = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'employer' 
      AND created_at >= ? 
      AND COALESCE(account_status, 'active') != 'spam'
    `).get(oneMonthAgo).count;

    // Total jobs
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const activeJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get().count;
    const closedJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'closed'").get().count;

    const newJobsWeek = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE created_at >= ?').get(oneWeekAgo).count;
    const newJobsMonth = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE created_at >= ?').get(oneMonthAgo).count;

    // Total applications
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications').get().count;
    const applicationsWeek = db.prepare('SELECT COUNT(*) as count FROM applications WHERE created_at >= ?').get(oneWeekAgo).count;
    const applicationsMonth = db.prepare('SELECT COUNT(*) as count FROM applications WHERE created_at >= ?').get(oneMonthAgo).count;

    // Profile completion rates
    const completedProfiles = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'jobseeker' 
      AND profile_completed = 1
      AND COALESCE(account_status, 'active') != 'spam'
    `).get().count;

    const profileCompletionRate = totalJobseekers > 0 
      ? Math.round((completedProfiles / totalJobseekers) * 100) 
      : 0;

    // Most viewed jobs (using view_count if available, otherwise application count as proxy)
    const mostViewedJobs = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.location,
        u.company_name,
        COUNT(DISTINCT a.id) as applications,
        j.created_at
      FROM jobs j
      LEFT JOIN applications a ON j.id = a.job_id
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE j.status = 'active'
      GROUP BY j.id
      ORDER BY applications DESC, j.created_at DESC
      LIMIT 10
    `).all();

    // Top searched keywords (if search_logs table exists)
    let topKeywords = [];
    try {
      topKeywords = db.prepare(`
        SELECT 
          query,
          COUNT(*) as count
        FROM search_logs
        WHERE created_at >= ?
        GROUP BY LOWER(query)
        ORDER BY count DESC
        LIMIT 10
      `).all(oneMonthAgo);
    } catch (e) {
      // Table doesn't exist yet, skip
    }

    const overview = {
      users: {
        totalJobseekers,
        totalEmployers,
        newJobseekersWeek,
        newEmployersWeek,
        newJobseekersMonth,
        newEmployersMonth,
      },
      jobs: {
        totalJobs,
        activeJobs,
        closedJobs,
        newJobsWeek,
        newJobsMonth,
      },
      applications: {
        totalApplications,
        applicationsWeek,
        applicationsMonth,
      },
      profiles: {
        completedProfiles,
        totalJobseekers,
        profileCompletionRate,
      },
      mostViewedJobs,
      topKeywords,
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    logger.error('Analytics overview error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/admin/analytics/trends
router.get('/trends', (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Daily job postings (last 30 days)
    const dailyJobs = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM jobs
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(thirtyDaysAgo);

    // Daily applications (last 30 days)
    const dailyApplications = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM applications
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(thirtyDaysAgo);

    // Daily signups (last 30 days)
    const dailySignups = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      AND COALESCE(account_status, 'active') != 'spam'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(thirtyDaysAgo);

    res.json({
      success: true,
      data: {
        dailyJobs,
        dailyApplications,
        dailySignups,
      },
    });
  } catch (error) {
    logger.error('Analytics trends error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, error: 'Failed to fetch analytics trends' });
  }
});

// GET /api/admin/analytics/employers
router.get('/employers', (req, res) => {
  try {
    // Most active employers (by job postings)
    const activeEmployers = db.prepare(`
      SELECT 
        u.id,
        u.company_name,
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs,
        COUNT(DISTINCT a.id) as total_applications
      FROM users u
      LEFT JOIN jobs j ON u.id = j.employer_id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE u.role = 'employer'
      AND COALESCE(u.account_status, 'active') != 'spam'
      GROUP BY u.id
      HAVING total_jobs > 0
      ORDER BY total_jobs DESC, active_jobs DESC
      LIMIT 20
    `).all();

    // Response rates (employers who respond to applications)
    const responseRates = db.prepare(`
      SELECT 
        u.id,
        u.company_name,
        COUNT(DISTINCT a.id) as total_applications,
        COUNT(DISTINCT CASE WHEN a.status != 'pending' THEN a.id END) as responded_applications,
        ROUND(CAST(COUNT(DISTINCT CASE WHEN a.status != 'pending' THEN a.id END) AS FLOAT) / 
              NULLIF(COUNT(DISTINCT a.id), 0) * 100, 1) as response_rate
      FROM users u
      LEFT JOIN jobs j ON u.id = j.employer_id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE u.role = 'employer'
      AND COALESCE(u.account_status, 'active') != 'spam'
      GROUP BY u.id
      HAVING total_applications > 0
      ORDER BY response_rate DESC
      LIMIT 20
    `).all();

    // Average time to hire (pending -> accepted)
    const avgTimeToHire = db.prepare(`
      SELECT 
        u.id,
        u.company_name,
        COUNT(DISTINCT a.id) as hired_count,
        AVG(JULIANDAY(a.updated_at) - JULIANDAY(a.created_at)) as avg_days_to_hire
      FROM users u
      LEFT JOIN jobs j ON u.id = j.employer_id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE u.role = 'employer'
      AND a.status = 'accepted'
      AND COALESCE(u.account_status, 'active') != 'spam'
      GROUP BY u.id
      HAVING hired_count > 0
      ORDER BY hired_count DESC
      LIMIT 20
    `).all();

    res.json({
      success: true,
      data: {
        activeEmployers,
        responseRates,
        avgTimeToHire,
      },
    });
  } catch (error) {
    logger.error('Analytics employers error', { error: error.message, userId: req.user.id });
    res.status(500).json({ success: false, error: 'Failed to fetch employer analytics' });
  }
});

module.exports = router;
