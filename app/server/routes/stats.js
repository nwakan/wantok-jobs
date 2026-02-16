const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /dashboard - Admin dashboard statistics
router.get('/dashboard', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    // Get date 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    // New users this week
    const newUsers = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= ?
    `).get(weekAgoStr);

    // New jobseekers this week
    const newJobseekers = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'jobseeker' AND created_at >= ?
    `).get(weekAgoStr);

    // New employers this week
    const newEmployers = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'employer' AND created_at >= ?
    `).get(weekAgoStr);

    // New jobs this week
    const newJobs = db.prepare(`
      SELECT COUNT(*) as count
      FROM jobs
      WHERE created_at >= ?
    `).get(weekAgoStr);

    // New applications this week
    const newApplications = db.prepare(`
      SELECT COUNT(*) as count
      FROM applications
      WHERE applied_at >= ?
    `).get(weekAgoStr);

    // Total stats
    const totalUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get();
    const totalJobseekers = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker'`).get();
    const totalEmployers = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'employer'`).get();
    const totalJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs`).get();
    const activeJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE status = 'active'`).get();
    const totalApplications = db.prepare(`SELECT COUNT(*) as count FROM applications`).get();

    // Revenue stats (from orders)
    const pendingRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM orders
      WHERE status = 'pending'
    `).get();

    const approvedRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM orders
      WHERE status = 'approved'
    `).get();

    const weekRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM orders
      WHERE created_at >= ? AND status = 'approved'
    `).get(weekAgoStr);

    // Top employers by jobs posted
    const topEmployers = db.prepare(`
      SELECT 
        u.id,
        u.name,
        pe.company_name,
        COUNT(j.id) as jobs_count,
        pe.featured,
        pe.verified
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      LEFT JOIN jobs j ON u.id = j.employer_id
      WHERE u.role = 'employer'
      GROUP BY u.id
      ORDER BY jobs_count DESC
      LIMIT 10
    `).all();

    // Recent activity
    const recentJobs = db.prepare(`
      SELECT 
        j.id,
        j.title,
        j.created_at,
        pe.company_name
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      ORDER BY j.created_at DESC
      LIMIT 5
    `).all();

    const recentApplications = db.prepare(`
      SELECT 
        a.id,
        a.applied_at,
        j.title as job_title,
        u.name as applicant_name
      FROM applications a
      INNER JOIN jobs j ON a.job_id = j.id
      INNER JOIN users u ON a.jobseeker_id = u.id
      ORDER BY a.applied_at DESC
      LIMIT 5
    `).all();

    // Job type distribution
    const jobTypeStats = db.prepare(`
      SELECT 
        job_type,
        COUNT(*) as count
      FROM jobs
      WHERE status = 'active'
      GROUP BY job_type
      ORDER BY count DESC
    `).all();

    // Application status distribution
    const applicationStatusStats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM applications
      GROUP BY status
      ORDER BY count DESC
    `).all();

    res.json({
      weekly: {
        new_users: newUsers?.count || 0,
        new_jobseekers: newJobseekers?.count || 0,
        new_employers: newEmployers?.count || 0,
        new_jobs: newJobs?.count || 0,
        new_applications: newApplications?.count || 0,
        revenue: weekRevenue?.total || 0
      },
      totals: {
        users: totalUsers?.count || 0,
        jobseekers: totalJobseekers?.count || 0,
        employers: totalEmployers?.count || 0,
        jobs: totalJobs?.count || 0,
        active_jobs: activeJobs?.count || 0,
        applications: totalApplications?.count || 0
      },
      revenue: {
        pending: pendingRevenue?.total || 0,
        approved: approvedRevenue?.total || 0,
        weekly: weekRevenue?.total || 0
      },
      top_employers: topEmployers,
      recent_jobs: recentJobs,
      recent_applications: recentApplications,
      job_types: jobTypeStats,
      application_statuses: applicationStatusStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;
