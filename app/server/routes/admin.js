const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// All routes require auth + admin role
router.use(authenticateToken, requireRole('admin'));

// Get platform stats
router.get("/stats", (req, res) => {
  try {
    const stats = {
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      totalJobseekers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker'").get().count,
      totalEmployers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employer'").get().count,
      totalJobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      activeJobs: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get().count,
      totalApplications: db.prepare('SELECT COUNT(*) as count FROM applications').get().count,
      recentUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-7 days')").get().count,
      recentJobs: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE created_at > datetime('now', '-7 days')").get().count,
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get("/users", (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;

    let query = 'SELECT id, email, role, name, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);

    // Pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    params.push(limitNum, offset);

    const users = db.prepare(query).all(...params);

    res.json({
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user
router.put('/users/:id', (req, res) => {
  try {
    const { role } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from changing their own role
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot modify your own account' });
    }

    if (role && ['jobseeker', 'employer', 'admin'].includes(role)) {
      db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?').run(role, req.params.id);
    }

    const updated = db.prepare('SELECT id, email, role, name, created_at FROM users WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all jobs (for management)
router.get("/jobs", (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT j.*, 
             u.name as employer_name,
             pe.company_name
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
    `;
    const params = [];

    if (status) {
      query += ' WHERE j.status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);

    // Pagination
    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    params.push(limitNum, offset);

    const jobs = db.prepare(query).all(...params);

    res.json({
      data: jobs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Delete job
router.delete("/jobs/:id", (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;
