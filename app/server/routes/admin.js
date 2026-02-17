const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const cache = require('../lib/cache');

const router = express.Router();

// All routes require auth + admin role
router.use(authenticateToken, requireRole('admin'));

// GET /cache-stats - Cache statistics
router.get('/cache-stats', (req, res) => {
  res.json(cache.stats);
});

// Dashboard stats — single endpoint for admin overview
router.get("/dashboard-stats", (req, res) => {
  try {
    // --- Quick stats (this week) ---
    const weeklyJobs = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE created_at > datetime('now', '-7 days')").get().c;
    const weeklyApplications = db.prepare("SELECT COUNT(*) as c FROM applications WHERE applied_at > datetime('now', '-7 days')").get().c;
    const weeklyUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE created_at > datetime('now', '-7 days')").get().c;
    const weeklyRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as c FROM orders WHERE status = 'completed' AND completed_at > datetime('now', '-7 days')").get().c;

    // --- System health ---
    const activeJobs = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'active'").get().c;
    const expiredJobs = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'closed'").get().c;
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const totalJobs = db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;

    // --- Pending items ---
    const pendingReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'").get().c;
    let pendingClaims = 0;
    try { pendingClaims = db.prepare("SELECT COUNT(*) as c FROM claims WHERE status = 'pending'").get().c; } catch(e) {}
    const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c;

    // --- Recent activity (last 10) ---
    // Union registrations, job posts, and applications
    const recentActivity = db.prepare(`
      SELECT * FROM (
        SELECT 'registration' as type, u.name as actor, u.role as detail, u.created_at as time
        FROM users u ORDER BY u.created_at DESC LIMIT 10
      )
      UNION ALL
      SELECT * FROM (
        SELECT 'job_posted' as type, COALESCE(pe.company_name, u.name) as actor, j.title as detail, j.created_at as time
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN profiles_employer pe ON u.id = pe.user_id
        ORDER BY j.created_at DESC LIMIT 10
      )
      UNION ALL
      SELECT * FROM (
        SELECT 'application' as type, u.name as actor, j.title as detail, a.applied_at as time
        FROM applications a
        JOIN users u ON a.jobseeker_id = u.id
        JOIN jobs j ON a.job_id = j.id
        ORDER BY a.applied_at DESC LIMIT 10
      )
      ORDER BY time DESC LIMIT 10
    `).all();

    res.json({
      weekly: { jobs: weeklyJobs, applications: weeklyApplications, users: weeklyUsers, revenue: weeklyRevenue },
      health: { activeJobs, expiredJobs, totalUsers, totalJobs },
      pending: { reports: pendingReports, claims: pendingClaims, refunds: pendingOrders },
      recentActivity,
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

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
      pendingOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as count FROM orders WHERE status = 'completed'").get().count,
      activeSubscriptions: db.prepare("SELECT COUNT(*) as count FROM profiles_employer WHERE subscription_plan_id IS NOT NULL AND (plan_expires_at IS NULL OR plan_expires_at > datetime('now'))").get().count,
    };

    res.json(stats);
  } catch (error) {
    logger.error('Get stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get("/users", (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const pageNum = Math.max(1, parseInt(page));

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
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum, offset);

    const users = db.prepare(query).all(...params);

    res.json({
      data: users,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message });
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
    logger.error('Update user error', { error: error.message });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all jobs (for management)
router.get("/jobs", (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const pageNum = Math.max(1, parseInt(page));

    let query = `
      SELECT j.id, j.title, j.status, j.job_type, j.location, j.created_at, j.views_count,
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
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);

    // Pagination
    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    const offset = (pageNum - 1) * limitNum;
    params.push(limitNum, offset);

    const jobs = db.prepare(query).all(...params);

    res.json({
      data: jobs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    logger.error('Get jobs error', { error: error.message });
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
    logger.error('Delete job error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ─── Banners ──────────────────────────────────────────────────────

// GET /banners — List all banners
router.get('/banners', (req, res) => {
  try {
    const banners = db.prepare('SELECT * FROM banners ORDER BY active DESC, id DESC').all();
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// POST /banners — Create banner
router.post('/banners', (req, res) => {
  try {
    const { title, image_url, link_url, placement, start_date, end_date } = req.body;
    if (!image_url || !placement) return res.status(400).json({ error: 'image_url and placement required' });
    
    const result = db.prepare(`
      INSERT INTO banners (employer_id, title, image_url, link_url, placement, start_date, end_date, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(req.user.id, title || '', image_url, link_url || '', placement, start_date || null, end_date || null);
    
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(banner);
  } catch (error) {
    logger.error('Create banner error', { error: error.message });
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// PUT /banners/:id — Update banner
router.put('/banners/:id', (req, res) => {
  try {
    const { title, image_url, link_url, placement, active, start_date, end_date } = req.body;
    db.prepare(`
      UPDATE banners SET title = COALESCE(?, title), image_url = COALESCE(?, image_url),
        link_url = COALESCE(?, link_url), placement = COALESCE(?, placement),
        active = COALESCE(?, active), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date)
      WHERE id = ?
    `).run(title, image_url, link_url, placement, active, start_date, end_date, req.params.id);
    
    res.json(db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// DELETE /banners/:id
router.delete('/banners/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// ─── Articles / Blog ──────────────────────────────────────────────

// GET /articles — List all articles
router.get('/articles', (req, res) => {
  try {
    const { status } = req.query;
    let where = '';
    const params = [];
    if (status) { where = ' WHERE a.status = ?'; params.push(status); }
    
    const articles = db.prepare(`
      SELECT a.*, u.name as author_name
      FROM articles a JOIN users u ON a.author_id = u.id
      ${where}
      ORDER BY a.created_at DESC
    `).all(...params);
    res.json({ articles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// POST /articles — Create article
router.post('/articles', (req, res) => {
  try {
    const { title, slug, content, excerpt, category, tags, featured_image, status } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    
    const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const publishedAt = status === 'published' ? new Date().toISOString() : null;
    
    const result = db.prepare(`
      INSERT INTO articles (author_id, title, slug, content, excerpt, category, tags, featured_image, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, title, articleSlug, content, excerpt || '', category || '', tags || '', featured_image || '', status || 'draft', publishedAt);
    
    res.status(201).json(db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    logger.error('Create article error', { error: error.message });
    res.status(500).json({ error: error.message?.includes('UNIQUE') ? 'Article slug already exists' : 'Failed to create article' });
  }
});

// PUT /articles/:id — Update article
router.put('/articles/:id', (req, res) => {
  try {
    const { title, content, excerpt, category, tags, featured_image, status } = req.body;
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    const publishedAt = status === 'published' && article.status !== 'published' ? new Date().toISOString() : article.published_at;
    
    db.prepare(`
      UPDATE articles SET title = COALESCE(?, title), content = COALESCE(?, content),
        excerpt = COALESCE(?, excerpt), category = COALESCE(?, category),
        tags = COALESCE(?, tags), featured_image = COALESCE(?, featured_image),
        status = COALESCE(?, status), published_at = COALESCE(?, published_at)
      WHERE id = ?
    `).run(title, content, excerpt, category, tags, featured_image, status, publishedAt, req.params.id);
    
    res.json(db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE /articles/:id
router.delete('/articles/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    res.json({ message: 'Article deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// ─── Newsletter Admin Routes ──────────────────────────────────────

// These are mounted at /api/admin/newsletter
router.use('/newsletter', require('./newsletter'));

// ─── Task 3: Featured Jobs Admin Routes ──────────────────────────

// PUT /jobs/:id/feature - Toggle featured status
router.put('/jobs/:id/feature', (req, res) => {
  try {
    const { is_featured, featured_until } = req.body;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isFeatured = is_featured !== undefined ? (is_featured ? 1 : 0) : (job.is_featured ? 0 : 1);
    const featuredUntil = featured_until || null;

    db.prepare(`
      UPDATE jobs SET is_featured = ?, featured_until = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(isFeatured, featuredUntil, req.params.id);

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    
    res.json({ 
      message: isFeatured ? 'Job featured successfully' : 'Job unfeatured successfully',
      job: updated 
    });
  } catch (error) {
    logger.error('Feature job error', { error: error.message });
    res.status(500).json({ error: 'Failed to update featured status' });
  }
});

// ─── Task 5: Employer Verification Admin Routes ──────────────────

// PUT /employers/:id/verify - Toggle employer verification status
router.put('/employers/:id/verify', (req, res) => {
  try {
    const { is_verified } = req.body;
    const employer = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(req.params.id, 'employer');

    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    const isVerified = is_verified !== undefined ? (is_verified ? 1 : 0) : (employer.is_verified ? 0 : 1);

    db.prepare(`
      UPDATE users SET is_verified = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(isVerified, req.params.id);

    const updated = db.prepare('SELECT id, email, name, role, is_verified FROM users WHERE id = ?').get(req.params.id);
    
    // Notify employer
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(
        req.params.id,
        'verification',
        isVerified ? 'Account Verified ✓' : 'Verification Removed',
        isVerified 
          ? 'Congratulations! Your employer account has been verified. Your jobs will now display a verification badge.'
          : 'Your verification status has been removed by an administrator.'
      );
    } catch (e) {}

    res.json({ 
      message: isVerified ? 'Employer verified successfully' : 'Employer unverified',
      employer: updated 
    });
  } catch (error) {
    logger.error('Verify employer error', { error: error.message });
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// GET /employers - List all employers with verification status
router.get('/employers', (req, res) => {
  try {
    const { page = 1, limit = 50, verified } = req.query;

    let query = `
      SELECT u.id, u.email, u.name, u.is_verified, u.created_at,
             pe.company_name, pe.industry, pe.total_jobs_posted
      FROM users u
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.role = 'employer'
    `;
    const params = [];

    if (verified !== undefined) {
      query += ' AND u.is_verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);

    // Pagination
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    params.push(limitNum, offset);

    const employers = db.prepare(query).all(...params);

    res.json({
      data: employers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    logger.error('Get employers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch employers' });
  }
});

// ─── Task 4: Report Admin Routes ──────────────────────────────────

// GET /reports - List all reports
router.get('/reports', (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    let query = `
      SELECT r.*,
             u.name as reporter_name,
             u.email as reporter_email,
             j.title as job_title,
             e.name as employer_name
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users e ON r.employer_id = e.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const { total } = db.prepare(countQuery).get(...params);

    // Pagination
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    params.push(limitNum, offset);

    const reports = db.prepare(query).all(...params);

    res.json({
      data: reports,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    logger.error('Get reports error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PUT /reports/:id - Update report status
router.put('/reports/:id', (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: pending, reviewed, dismissed' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    db.prepare(`
      UPDATE reports SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, req.params.id);

    const updated = db.prepare(`
      SELECT r.*,
             u.name as reporter_name,
             j.title as job_title,
             e.name as employer_name
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users e ON r.employer_id = e.id
      WHERE r.id = ?
    `).get(req.params.id);

    res.json({ 
      message: 'Report updated successfully',
      report: updated 
    });
  } catch (error) {
    logger.error('Update report error', { error: error.message });
    res.status(500).json({ error: 'Failed to update report' });
  }
});

module.exports = router;
