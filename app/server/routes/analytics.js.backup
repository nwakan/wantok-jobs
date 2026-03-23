const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const cache = require('../lib/cache');

// GET /popular-searches - Top 10 searches in last 7 days (public)
router.get('/popular-searches', (req, res) => {
  try {
    const cached = cache.get('analytics:popular-searches');
    if (cached) return res.json(cached);

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

    const result = { data: searches };
    cache.set('analytics:popular-searches', result, 300);
    res.json(result);
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

// GET /jobseeker - Jobseeker application analytics
router.get('/jobseeker', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;

    // Application funnel
    const funnel = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM applications
      WHERE jobseeker_id = ?
      GROUP BY status
    `).all(userId);

    const funnelMap = {};
    funnel.forEach(r => { funnelMap[r.status] = r.count; });
    const funnelStages = ['pending', 'reviewed', 'shortlisted', 'interviewed', 'offered', 'hired'];
    const funnelData = funnelStages.map(s => ({ stage: s, count: funnelMap[s] || 0 }));

    // Timeline - applications per week (last 8 weeks)
    const timeline = db.prepare(`
      SELECT strftime('%Y-%W', applied_at) as week,
             MIN(date(applied_at, 'weekday 0', '-6 days')) as week_start,
             COUNT(*) as count
      FROM applications
      WHERE jobseeker_id = ?
        AND applied_at >= datetime('now', '-56 days')
      GROUP BY week
      ORDER BY week ASC
    `).all(userId);

    // Response rate
    const totalApps = db.prepare(`SELECT COUNT(*) as c FROM applications WHERE jobseeker_id = ?`).get(userId).c;
    const reviewedApps = db.prepare(`
      SELECT COUNT(*) as c FROM applications 
      WHERE jobseeker_id = ? AND status NOT IN ('pending', 'withdrawn')
    `).get(userId).c;
    const responseRate = totalApps > 0 ? Math.round((reviewedApps / totalApps) * 100) : 0;

    // Average response time (days between applied_at and status_updated_at for non-pending)
    const avgResponse = db.prepare(`
      SELECT AVG(julianday(status_updated_at) - julianday(applied_at)) as avg_days
      FROM applications
      WHERE jobseeker_id = ? AND status NOT IN ('pending', 'withdrawn')
        AND status_updated_at IS NOT NULL AND applied_at IS NOT NULL
    `).get(userId);
    const avgResponseDays = avgResponse?.avg_days ? Math.round(avgResponse.avg_days * 10) / 10 : null;

    // Top categories
    const topCategories = db.prepare(`
      SELECT j.category_slug as category, COUNT(*) as count
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.jobseeker_id = ?
      GROUP BY j.category_slug
      ORDER BY count DESC
      LIMIT 10
    `).all(userId);

    // All categories for tips
    const allCategories = topCategories.map(c => ({ name: c.category || 'Uncategorized', count: c.count }));

    // Generate tips
    const tips = [];
    if (totalApps === 0) {
      tips.push("You haven't applied to any jobs yet. Start browsing and apply to roles that match your skills!");
    } else {
      if (responseRate < 30) {
        tips.push('Your response rate is low. Try tailoring your cover letter to each job for better results.');
      }
      if (allCategories.length === 1) {
        tips.push(`All your applications are in ${allCategories[0].name}. Consider diversifying across categories.`);
      } else if (allCategories.length > 0) {
        const top = allCategories[0];
        if (top.count > totalApps * 0.7) {
          tips.push(`You've applied to ${top.count} ${top.name} jobs. Try exploring other categories to increase your chances.`);
        }
      }
      if (totalApps < 5) {
        tips.push('Applying to more jobs increases your chances. Aim for at least 10 applications.');
      }
      if (avgResponseDays && avgResponseDays > 14) {
        tips.push('Employers are taking a while to respond. Follow up on applications older than 2 weeks.');
      }
    }

    res.json({
      funnel: funnelData,
      timeline,
      responseRate,
      avgResponseDays,
      totalApplications: totalApps,
      reviewedApplications: reviewedApps,
      topCategories: allCategories,
      tips
    });
  } catch (error) {
    logger.error('Error fetching jobseeker analytics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
