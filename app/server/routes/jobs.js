const { validate, schemas } = require("../middleware/validate");
const { sendJobPostedEmail, sendNewJobAlerts } = require('../lib/email');
const { canPostJob, consumeEmployerServiceCredit } = require('../lib/billing');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');

const router = express.Router();

// GET /featured - Top 6 most-viewed active jobs (public)
router.get('/featured', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.status = 'active'
      ORDER BY j.views_count DESC, j.created_at DESC
      LIMIT 6
    `).all();

    res.json({ data: jobs });
  } catch (error) {
    console.error('Get featured jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch featured jobs' });
  }
});

// Get all jobs (public, with enhanced filters)
router.get('/', (req, res) => {
  try {
    const {
      keyword,
      category,
      location,
      job_type,
      industry,
      experience,
      salary_min,
      salary_max,
      sort = 'date',
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT j.*, 
             u.name as employer_name,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url,
             pe.industry as company_industry
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.status = 'active'
    `;
    const params = [];

    if (keyword) {
      // Use FTS5 full-text search for keywords (falls back to LIKE if FTS fails)
      try {
        const ftsIds = db.prepare('SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ?').all(keyword.replace(/[^\w\s]/g, ' '));
        if (ftsIds.length > 0) {
          const idList = ftsIds.map(r => r.rowid).join(',');
          query += ` AND j.id IN (${idList})`;
        } else {
          query += ' AND 0'; // No FTS matches
        }
      } catch {
        // Fallback to LIKE if FTS fails
        query += ' AND (j.title LIKE ? OR j.description LIKE ?)';
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam);
      }
    }

    if (category) {
      // Support category filter via job_categories join
      query += ` AND EXISTS (
        SELECT 1 FROM job_categories jc 
        INNER JOIN categories c ON jc.category_id = c.id 
        WHERE jc.job_id = j.id AND (c.slug = ? OR c.name LIKE ?)
      )`;
      params.push(category, `%${category}%`);
    }

    if (location) {
      query += ' AND (j.location LIKE ? OR j.country LIKE ?)';
      const locationParam = `%${location}%`;
      params.push(locationParam, locationParam);
    }

    if (job_type) {
      query += ' AND j.job_type = ?';
      params.push(job_type);
    }

    if (industry) {
      query += ' AND (j.industry LIKE ? OR pe.industry LIKE ?)';
      const industryParam = `%${industry}%`;
      params.push(industryParam, industryParam);
    }

    if (experience) {
      query += ' AND j.experience_level = ?';
      params.push(experience);
    }

    if (salary_min) {
      query += ' AND (j.salary_max >= ? OR j.salary_max IS NULL)';
      params.push(parseFloat(salary_min));
    }

    if (salary_max) {
      query += ' AND (j.salary_min <= ? OR j.salary_min IS NULL)';
      params.push(parseFloat(salary_max));
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT j.id) as total FROM');
    const countResult = params.length > 0 ? db.prepare(countQuery).get(...params) : db.prepare(countQuery).get();
    const total = countResult ? countResult.total : 0;

    // Sorting
    let orderBy = 'j.created_at DESC';
    if (sort === 'salary') {
      orderBy = 'j.salary_max DESC, j.created_at DESC';
    } else if (sort === 'relevance' && keyword) {
      orderBy = 'j.views_count DESC, j.created_at DESC';
    }

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    const paginatedParams = [...params, limitNum, offset];

    const jobs = db.prepare(query).all(...paginatedParams);

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

// Get my jobs (employer only)
router.get('/my', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url,
             (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.employer_id = ?
      ORDER BY j.created_at DESC
    `).all(req.user.id);

    res.json({ data: jobs, total: jobs.length });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job (enhanced with company info and similar jobs)
router.get('/:id', (req, res) => {
  try {
    const job = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             u.email as employer_email,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             pe.company_size,
             pe.industry as company_industry,
             pe.website,
             COALESCE(j.logo_url, pe.logo_url) as logo_url,
             pe.description as company_description,
             pe.location as company_location,
             pe.verified as company_verified
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.id = ?
    `).get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get categories for this job
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug 
      FROM categories c
      INNER JOIN job_categories jc ON c.id = jc.category_id
      WHERE jc.job_id = ?
    `).all(req.params.id);
    job.categories = categories;

    // Get similar jobs (3-5 jobs with same industry OR location, excluding current)
    const similarJobs = db.prepare(`
      SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max, 
             j.salary_currency, j.created_at, 
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE j.status = 'active' 
        AND j.id != ?
        AND (j.industry = ? OR j.location = ?)
      ORDER BY j.created_at DESC
      LIMIT 5
    `).all(req.params.id, job.industry || '', job.location || '');
    job.similar_jobs = similarJobs;

    // Increment view count
    db.prepare('UPDATE jobs SET views_count = views_count + 1 WHERE id = ?').run(req.params.id);

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// GET /:id/similar - Get similar jobs for a specific job
router.get('/:id/similar', (req, res) => {
  try {
    const job = db.prepare('SELECT industry, location FROM jobs WHERE id = ?').get(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const similarJobs = db.prepare(`
      SELECT j.id, j.title, j.location, j.job_type, j.salary_min, j.salary_max, 
             j.salary_currency, j.created_at, j.views_count,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url
      FROM jobs j
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE j.status = 'active' 
        AND j.id != ?
        AND (j.industry = ? OR j.location = ?)
      ORDER BY 
        CASE 
          WHEN j.industry = ? AND j.location = ? THEN 1
          WHEN j.industry = ? THEN 2
          WHEN j.location = ? THEN 3
          ELSE 4
        END,
        j.created_at DESC
      LIMIT 5
    `).all(
      req.params.id, 
      job.industry || '', 
      job.location || '',
      job.industry || '',
      job.location || '',
      job.industry || '',
      job.location || ''
    );

    res.json({ data: similarJobs });
  } catch (error) {
    console.error('Get similar jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch similar jobs' });
  }
});

// PATCH /:id/status - Quick status change (employer or admin)
router.patch('/:id/status', authenticateToken, requireRole('employer', 'admin'), validate(schemas.jobStatus), (req, res) => {
  try {
    const { status } = req.body;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`
      UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, req.params.id);

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    
    res.json(updated);
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Create job (employer only)
router.post('/', authenticateToken, requireRole('employer'), validate(schemas.postJob), (req, res) => {
  try {
    // Check plan limits
    const planCheck = canPostJob(req.user.id);
    if (!planCheck.allowed) {
      return res.status(403).json({
        error: planCheck.reason || 'Job posting limit reached',
        plan: planCheck.plan?.name || 'Free',
        usage: planCheck.usage,
        upgradeUrl: '/pricing',
      });
    }

    const {
      title,
      description,
      requirements,
      location,
      country,
      job_type,
      experience_level,
      industry,
      salary_min,
      salary_max,
      salary_currency,
      application_deadline,
      status
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }

    const result = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, country,
        job_type, experience_level, industry, salary_min, salary_max,
        salary_currency, application_deadline, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      title,
      description,
      JSON.stringify(requirements || []),
      location,
      country,
      job_type,
      experience_level,
      industry,
      salary_min,
      salary_max,
      salary_currency || 'PGK',
      application_deadline,
      status || 'active'
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);

    // Consume a job posting credit (unless on trial or free slot)
    if (!planCheck.trial && !planCheck.freeSlot) {
      consumeEmployerServiceCredit(req.user.id, 'job_posting');
    }

    // Notify admins about new job
    const employer = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(req.user.id);
    notifEvents.onJobPosted(job, employer || { name: req.user.name || 'Unknown' });
    sendJobPostedEmail({ email: req.user.email, name: req.user.name || employer?.name }, job).catch(() => {});

    // Send job alerts to matching subscribers (async, don't block response)
    if (status === 'active') {
      sendNewJobAlerts(job, employer).catch(e => console.error('Job alerts error:', e.message));
    }

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)').run(req.user.id, 'job_posted', 'job', job.id, JSON.stringify({ title })); } catch(e) {}

    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job (owner only)
router.put('/:id', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      title,
      description,
      requirements,
      location,
      country,
      job_type,
      experience_level,
      industry,
      salary_min,
      salary_max,
      salary_currency,
      application_deadline,
      status
    } = req.body;

    db.prepare(`
      UPDATE jobs SET
        title = ?, description = ?, requirements = ?, location = ?, country = ?,
        job_type = ?, experience_level = ?, industry = ?, salary_min = ?, salary_max = ?,
        salary_currency = ?, application_deadline = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title || job.title,
      description || job.description,
      requirements ? JSON.stringify(requirements) : job.requirements,
      location !== undefined ? location : job.location,
      country !== undefined ? country : job.country,
      job_type || job.job_type,
      experience_level || job.experience_level,
      industry || job.industry,
      salary_min !== undefined ? salary_min : job.salary_min,
      salary_max !== undefined ? salary_max : job.salary_max,
      salary_currency || job.salary_currency,
      application_deadline || job.application_deadline,
      status || job.status,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job (owner or admin)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;
