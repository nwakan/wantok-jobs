const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');

const router = express.Router();

/**
 * GET /api/stats/public
 * Public-facing stats for the homepage/about page
 */
router.get('/', (req, res) => {
  try {
    // Basic counts
    const activeJobs = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE status = 'active'
    `).get().count;

    const totalEmployers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'employer'
    `).get().count;

    const totalJobseekers = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker'
    `).get().count;

    // Jobs posted this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const jobsThisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE created_at > ?
    `).get(oneWeekAgo).count;

    // Jobs posted this month
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const jobsThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE created_at > ?
    `).get(oneMonthAgo).count;

    // Top categories by job count
    const topCategories = db.prepare(`
      SELECT 
        c.name,
        c.slug,
        COUNT(jc.job_id) as job_count
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id AND j.status = 'active'
      GROUP BY c.id
      HAVING job_count > 0
      ORDER BY job_count DESC
      LIMIT 8
    `).all();

    // Top locations by job count
    const topLocations = db.prepare(`
      SELECT 
        location,
        COUNT(*) as job_count
      FROM jobs
      WHERE status = 'active' AND location IS NOT NULL AND location != ''
      GROUP BY location
      ORDER BY job_count DESC
      LIMIT 10
    `).all();

    // Total applications (for social proof)
    const totalApplications = db.prepare(`
      SELECT COUNT(*) as count FROM applications
    `).get().count;

    // Average jobs per employer (active employers only)
    const avgJobsPerEmployer = db.prepare(`
      SELECT AVG(job_count) as avg
      FROM (
        SELECT employer_id, COUNT(*) as job_count
        FROM jobs
        WHERE status = 'active'
        GROUP BY employer_id
      )
    `).get().avg || 0;

    res.json({
      activeJobs,
      totalEmployers,
      totalJobseekers,
      jobsThisWeek,
      jobsThisMonth,
      totalApplications,
      avgJobsPerEmployer: Math.round(avgJobsPerEmployer * 10) / 10, // 1 decimal place
      topCategories,
      topLocations
    });

  } catch (error) {
    logger.error('Public stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
