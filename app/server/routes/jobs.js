const { validate, schemas } = require("../middleware/validate");
const { sendJobPostedEmail, sendNewJobAlerts } = require('../lib/email');
const { canPostJob, consumeEmployerServiceCredit } = require('../lib/billing');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');

const router = express.Router();

// GET /suggestions - Autocomplete for keywords and companies
router.get('/suggestions', (req, res) => {
  try {
    const { q, type = 'keyword' } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ data: [] });
    }

    let suggestions = [];
    const searchTerm = `%${q}%`;

    if (type === 'keyword') {
      // Get job title suggestions
      const titles = db.prepare(`
        SELECT DISTINCT title FROM jobs 
        WHERE status = 'active' AND title LIKE ? 
        ORDER BY views_count DESC 
        LIMIT 10
      `).all(searchTerm);
      suggestions = titles.map(t => t.title);
    } else if (type === 'company') {
      // Get company name suggestions
      const companies = db.prepare(`
        SELECT DISTINCT COALESCE(j.company_display_name, pe.company_name) as company_name
        FROM jobs j
        LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
        WHERE j.status = 'active' AND COALESCE(j.company_display_name, pe.company_name) LIKE ?
        ORDER BY (SELECT COUNT(*) FROM jobs WHERE employer_id = j.employer_id) DESC
        LIMIT 10
      `).all(searchTerm);
      suggestions = companies.map(c => c.company_name).filter(Boolean);
    }

    res.json({ data: suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.json({ data: [] });
  }
});

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
      date_posted,
      remote,
      company,
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
      // Support multiple job types (comma-separated or single value)
      const types = job_type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length === 1) {
        query += ' AND j.job_type = ?';
        params.push(types[0]);
      } else if (types.length > 1) {
        const placeholders = types.map(() => '?').join(',');
        query += ` AND j.job_type IN (${placeholders})`;
        params.push(...types);
      }
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

    if (date_posted) {
      // Filter by days since posting (e.g., '1', '7', '30')
      const days = parseInt(date_posted);
      if (!isNaN(days) && days > 0) {
        query += ` AND j.created_at >= datetime('now', '-${days} days')`;
      }
    }

    if (remote) {
      // Filter for remote jobs (location contains 'remote' or job_type indicates remote)
      query += ` AND (j.location LIKE '%remote%' OR j.location LIKE '%Remote%' OR j.location LIKE '%REMOTE%')`;
    }

    if (company) {
      // Filter by company name
      query += ` AND (COALESCE(j.company_display_name, pe.company_name) LIKE ? OR u.name LIKE ?)`;
      const companyParam = `%${company}%`;
      params.push(companyParam, companyParam);
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
    // Check plan limits (only for active jobs, not drafts)
    const status = req.body.status || 'active';
    if (status === 'active') {
      const planCheck = canPostJob(req.user.id);
      if (!planCheck.allowed) {
        return res.status(403).json({
          error: planCheck.reason || 'Job posting limit reached',
          plan: planCheck.plan?.name || 'Free',
          usage: planCheck.usage,
          upgradeUrl: '/pricing',
        });
      }
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
      category_slug,
      skills,
      remote_work,
      salary_min,
      salary_max,
      salary_currency,
      application_deadline,
      application_method,
      application_url,
      application_email,
      screening_questions,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description required' });
    }
    if (!category_slug) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Get category_id from slug
    const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category_slug);
    const category_id = category?.id || null;

    const result = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, country,
        job_type, experience_level, industry, category_slug, category_id, 
        skills, remote_work, salary_min, salary_max, salary_currency, 
        application_deadline, application_method, application_url, 
        application_email, screening_questions, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      title,
      description,
      requirements || null,
      location || null,
      country || 'Papua New Guinea',
      job_type || 'full-time',
      experience_level || null,
      industry || null,
      category_slug,
      category_id,
      skills || null,
      remote_work ? 1 : 0,
      salary_min || null,
      salary_max || null,
      salary_currency || 'PGK',
      application_deadline || null,
      application_method || 'internal',
      application_url || null,
      application_email || null,
      screening_questions || null,
      status
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);

    // Consume a job posting credit ONLY if publishing active job (not drafts, not editing)
    if (status === 'active') {
      const planCheck = canPostJob(req.user.id);
      if (!planCheck.trial && !planCheck.freeSlot) {
        consumeEmployerServiceCredit(req.user.id, 'job_posting');
      }
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
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)').run(req.user.id, 'job_posted', 'job', job.id, JSON.stringify({ title, status })); } catch(e) {}

    res.status(201).json({ data: job, id: job.id });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job: ' + error.message });
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
      category_slug,
      skills,
      remote_work,
      salary_min,
      salary_max,
      salary_currency,
      application_deadline,
      application_method,
      application_url,
      application_email,
      screening_questions,
      status
    } = req.body;

    // Get category_id from slug if provided
    let category_id = job.category_id;
    if (category_slug) {
      const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category_slug);
      category_id = category?.id || job.category_id;
    }

    db.prepare(`
      UPDATE jobs SET
        title = ?, description = ?, requirements = ?, location = ?, country = ?,
        job_type = ?, experience_level = ?, industry = ?, category_slug = ?, category_id = ?,
        skills = ?, remote_work = ?, salary_min = ?, salary_max = ?,
        salary_currency = ?, application_deadline = ?, application_method = ?, 
        application_url = ?, application_email = ?, screening_questions = ?,
        status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title || job.title,
      description || job.description,
      requirements !== undefined ? requirements : job.requirements,
      location !== undefined ? location : job.location,
      country !== undefined ? country : job.country,
      job_type || job.job_type,
      experience_level !== undefined ? experience_level : job.experience_level,
      industry !== undefined ? industry : job.industry,
      category_slug !== undefined ? category_slug : job.category_slug,
      category_id,
      skills !== undefined ? skills : job.skills,
      remote_work !== undefined ? (remote_work ? 1 : 0) : job.remote_work,
      salary_min !== undefined ? salary_min : job.salary_min,
      salary_max !== undefined ? salary_max : job.salary_max,
      salary_currency || job.salary_currency,
      application_deadline !== undefined ? application_deadline : job.application_deadline,
      application_method !== undefined ? application_method : job.application_method,
      application_url !== undefined ? application_url : job.application_url,
      application_email !== undefined ? application_email : job.application_email,
      screening_questions !== undefined ? screening_questions : job.screening_questions,
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

// GET /:id/skills-match - Check which job skills match user's profile
router.get('/:id/skills-match', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'jobseeker') {
      return res.json([]);
    }

    const jobId = req.params.id;

    // Get job skills
    const jobSkills = db.prepare(`
      SELECT s.id, s.name, js.required
      FROM job_skills js
      JOIN skills s ON js.skill_id = s.id
      WHERE js.job_id = ?
    `).all(jobId);

    if (jobSkills.length === 0) {
      return res.json([]);
    }

    // Get user's skills
    const userSkillIds = db.prepare(`
      SELECT skill_id FROM user_skills WHERE user_id = ?
    `).all(req.user.id).map(us => us.skill_id);

    // Mark which skills match
    const matchedSkills = jobSkills.map(skill => ({
      name: skill.name,
      required: skill.required === 1,
      matched: userSkillIds.includes(skill.id)
    }));

    res.json(matchedSkills);
  } catch (error) {
    console.error('Get skills match error:', error);
    res.status(500).json({ error: 'Failed to fetch skills match' });
  }
});

// POST /report - Report a job
router.post('/report', async (req, res) => {
  try {
    const { job_id, reason } = req.body;

    if (!job_id || !reason) {
      return res.status(400).json({ error: 'job_id and reason are required' });
    }

    // Check if job exists
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Log the report in contact_messages table (repurposing for reports)
    db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      req.user ? req.user.name : 'Anonymous',
      req.user ? req.user.email : 'anonymous@wantokjobs.com',
      `Job Report: ${job.title} (ID: ${job_id})`,
      `Reason: ${reason}\n\nJob Details:\n- Title: ${job.title}\n- Company: ${job.company_name}\n- Posted: ${job.created_at}\n- Employer ID: ${job.employer_id}`
    );

    // Optionally notify admin via notifications table
    const adminUsers = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    adminUsers.forEach(admin => {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, link, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(
          admin.id,
          'report',
          'Job Reported',
          `Job "${job.title}" has been reported for: ${reason}`,
          `/admin/jobs/${job_id}`
        );
      } catch (e) {
        console.error('Failed to create admin notification:', e);
      }
    });

    res.json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Report job error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
