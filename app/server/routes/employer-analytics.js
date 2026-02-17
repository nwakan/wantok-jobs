const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

/**
 * GET /api/employer/analytics
 * Get comprehensive analytics for employer's job postings
 */
router.get('/', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const employerId = req.user.id;
    const { period = '30' } = req.query; // 7 or 30 days

    // Calculate date threshold
    const daysAgo = parseInt(period) || 30;
    const thresholdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    // 1. Overall stats
    const totalJobs = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE employer_id = ? AND status = 'active'
    `).get(employerId).count;

    const totalViews = db.prepare(`
      SELECT COALESCE(SUM(views_count), 0) as total 
      FROM jobs WHERE employer_id = ?
    `).get(employerId).total;

    const totalApplications = db.prepare(`
      SELECT COUNT(*) as count 
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = ?
    `).get(employerId).count;

    // 2. Views in time period
    const recentViews = db.prepare(`
      SELECT COUNT(*) as count
      FROM job_views jv
      INNER JOIN jobs j ON jv.job_id = j.id
      WHERE j.employer_id = ? AND jv.viewed_at > ?
    `).get(employerId, thresholdDate).count;

    // 3. Applications in time period
    const recentApplications = db.prepare(`
      SELECT COUNT(*) as count
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = ? AND a.applied_at > ?
    `).get(employerId, thresholdDate).count;

    // 4. Per-job metrics
    const jobMetrics = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.status,
        j.created_at,
        j.views_count as total_views,
        (SELECT COUNT(*) FROM job_views WHERE job_id = j.id AND viewed_at > ?) as recent_views,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as total_applications,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id AND applied_at > ?) as recent_applications,
        CASE 
          WHEN j.views_count > 0 THEN 
            ROUND(CAST((SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS FLOAT) / j.views_count * 100, 2)
          ELSE 0 
        END as conversion_rate
      FROM jobs j
      WHERE j.employer_id = ?
      ORDER BY j.created_at DESC
      LIMIT 50
    `).all(thresholdDate, thresholdDate, employerId);

    // 5. Top performing jobs (by views)
    const topPerformingJobs = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.views_count,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications
      FROM jobs j
      WHERE j.employer_id = ? AND j.status = 'active'
      ORDER BY j.views_count DESC
      LIMIT 5
    `).all(employerId);

    // 6. Application status breakdown
    const applicationsByStatus = db.prepare(`
      SELECT 
        a.status,
        COUNT(*) as count
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      WHERE j.employer_id = ?
      GROUP BY a.status
      ORDER BY count DESC
    `).all(employerId);

    // 7. Overall conversion rate
    const conversionRate = totalViews > 0 
      ? ((totalApplications / totalViews) * 100).toFixed(2) 
      : 0;

    res.json({
      overview: {
        totalJobs,
        totalViews,
        totalApplications,
        conversionRate: parseFloat(conversionRate),
        recentViews,
        recentApplications
      },
      jobMetrics,
      topPerformingJobs,
      applicationsByStatus,
      period: daysAgo
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
