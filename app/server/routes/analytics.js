const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /popular-searches - Top 10 searches in last 7 days (public)
router.get('/popular-searches', (req, res) => {
  try {
    const searches = db.prepare(`
      SELECT query, COUNT(*) as search_count, 
             MAX(results_count) as avg_results
      FROM search_analytics
      WHERE query IS NOT NULL 
        AND query != ''
        AND created_at >= datetime('now', '-7 days')
      GROUP BY LOWER(TRIM(query))
      ORDER BY search_count DESC
      LIMIT 10
    `).all();

    res.json({ data: searches });
  } catch (error) {
    logger.error('Error fetching popular searches', { error: error.message });
    res.json({ data: [] });
  }
});

// GET /employer/overview - Employer's job stats
router.get('/employer/overview', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const employer_id = req.user.id;

    // Total stats
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = ?').get(employer_id);
    const activeJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE employer_id = ? AND status = ?').get(employer_id, 'active');
    const totalApplications = db.prepare(`
      SELECT COUNT(*) as count FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = ?
    `).get(employer_id);
    const totalViews = db.prepare('SELECT SUM(views_count) as total FROM jobs WHERE employer_id = ?').get(employer_id);

    // Recent applications by status
    const applicationsByStatus = db.prepare(`
      SELECT a.status, COUNT(*) as count
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = ?
      GROUP BY a.status
    `).all(employer_id);

    // Top performing jobs
    const topJobs = db.prepare(`
      SELECT j.id, j.title, j.views_count,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count
      FROM jobs j
      WHERE j.employer_id = ?
      ORDER BY application_count DESC, j.views_count DESC
      LIMIT 5
    `).all(employer_id);

    res.json({
      overview: {
        total_jobs: totalJobs.count,
        active_jobs: activeJobs.count,
        total_applications: totalApplications.count,
        total_views: totalViews.total || 0
      },
      applications_by_status: applicationsByStatus,
      top_jobs: topJobs
    });
  } catch (error) {
    logger.error('Error fetching employer analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch employer analytics' });
  }
});

// GET /admin/overview - Platform-wide stats with monthly trends
router.get('/admin/overview', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    // Total counts
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalJobseekers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('jobseeker');
    const totalEmployers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('employer');
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    const activeJobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('active');
    const totalApplications = db.prepare('SELECT COUNT(*) as count FROM applications').get();

    // Monthly trends (last 6 months)
    const monthlyUsers = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `).all();

    const monthlyJobs = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM jobs
      WHERE created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `).all();

    const monthlyApplications = db.prepare(`
      SELECT strftime('%Y-%m', applied_at) as month, COUNT(*) as count
      FROM applications
      WHERE applied_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month
    `).all();

    // Recent activity
    const recentJobs = db.prepare(`
      SELECT j.id, j.title, u.name as employer_name, j.created_at
      FROM jobs j
      INNER JOIN users u ON j.employer_id = u.id
      ORDER BY j.created_at DESC
      LIMIT 10
    `).all();

    const recentApplications = db.prepare(`
      SELECT a.id, j.title as job_title, u.name as jobseeker_name, a.applied_at
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      INNER JOIN users u ON a.jobseeker_id = u.id
      ORDER BY a.applied_at DESC
      LIMIT 10
    `).all();

    // Top categories
    const topCategories = db.prepare(`
      SELECT c.name, COUNT(jc.job_id) as job_count
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      GROUP BY c.id
      ORDER BY job_count DESC
      LIMIT 10
    `).all();

    res.json({
      overview: {
        total_users: totalUsers.count,
        total_jobseekers: totalJobseekers.count,
        total_employers: totalEmployers.count,
        total_jobs: totalJobs.count,
        active_jobs: activeJobs.count,
        total_applications: totalApplications.count
      },
      trends: {
        monthly_users: monthlyUsers,
        monthly_jobs: monthlyJobs,
        monthly_applications: monthlyApplications
      },
      recent_activity: {
        recent_jobs: recentJobs,
        recent_applications: recentApplications
      },
      top_categories: topCategories
    });
  } catch (error) {
    logger.error('Error fetching admin analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch admin analytics' });
  }
});

module.exports = router;
