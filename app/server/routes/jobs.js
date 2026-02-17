const logger = require('../utils/logger');
const { validate, schemas } = require("../middleware/validate");
const { sendJobPostedEmail, sendNewJobAlerts } = require('../lib/email');
const { canPostJob, consumeEmployerServiceCredit } = require('../lib/billing');
const { addPaginationHeaders } = require('../utils/pagination');
const { containsPattern } = require('../utils/sanitize');
const { stripHtml, sanitizeEmail, isValidLength } = require('../utils/sanitizeHtml');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');

const cache = require('../lib/cache');

const router = express.Router();

// GET /suggestions - Autocomplete for keywords and companies
router.get('/suggestions', (req, res) => {
  try {
    const { q, type = 'keyword' } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ data: [] });
    }

    let suggestions = [];
    const searchTerm = containsPattern(q); // ✅ Sanitized LIKE pattern

    if (type === 'keyword') {
      // Get job title suggestions
      const titles = db.prepare(`
        SELECT DISTINCT title FROM jobs 
        WHERE status = 'active' AND title LIKE ? ESCAPE '\\'
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
        WHERE j.status = 'active' AND COALESCE(j.company_display_name, pe.company_name) LIKE ? ESCAPE '\\'
        ORDER BY (SELECT COUNT(*) FROM jobs WHERE employer_id = j.employer_id) DESC
        LIMIT 10
      `).all(searchTerm);
      suggestions = companies.map(c => c.company_name).filter(Boolean);
    }

    res.json({ data: suggestions });
  } catch (error) {
    logger.error('Get suggestions error', { error: error.message });
    res.json({ data: [] });
  }
});

// GET /featured - Featured jobs (is_featured=1 with valid featured_until) + top viewed (Task 3)
router.get('/featured', (req, res) => {
  try {
    const cached = cache.get('jobs:featured');
    if (cached) return res.json(cached);

    const jobs = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             u.is_verified as employer_verified,
             COALESCE(ac.company_name, j.company_display_name, pe.company_name) as company_name,
             COALESCE(ac.logo_url, j.logo_url, pe.logo_url) as logo_url,
             CASE WHEN j.client_id IS NOT NULL THEN u.name END as managed_by_agency
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      LEFT JOIN agency_clients ac ON j.client_id = ac.id
      WHERE j.status = 'active'
      ORDER BY 
        CASE WHEN (j.is_featured = 1 AND (j.featured_until IS NULL OR j.featured_until > datetime('now'))) THEN 0 ELSE 1 END,
        j.views_count DESC, 
        j.created_at DESC
      LIMIT 6
    `).all();

    const result = { data: jobs };
    cache.set('jobs:featured', result, 300);
    res.json(result);
  } catch (error) {
    logger.error('Get featured jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch featured jobs' });
  }
});

// Get all jobs (public, with enhanced filters)
router.get('/', (req, res) => {
  try {
    const cacheKey = 'jobs:search:' + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

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
      limit = 20,
      employer_id,
      company_size
    } = req.query;

    let query = `
      SELECT j.*, 
             u.name as employer_name,
             u.is_verified as employer_verified,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             COALESCE(j.logo_url, pe.logo_url) as logo_url,
             pe.industry as company_industry,
             pe.company_size as company_size
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
          const ftsPlaceholders = ftsIds.map(() => '?').join(',');
          query += ` AND j.id IN (${ftsPlaceholders})`;
          params.push(...ftsIds.map(r => r.rowid));
        } else {
          query += ' AND 0'; // No FTS matches
        }
      } catch {
        // Fallback to LIKE if FTS fails (✅ sanitized)
        query += ' AND (j.title LIKE ? ESCAPE \'\\\' OR j.description LIKE ? ESCAPE \'\\\')';
        const keywordParam = containsPattern(keyword);
        params.push(keywordParam, keywordParam);
      }
    }

    if (category) {
      // Support category filter via job_categories join (✅ sanitized)
      query += ` AND EXISTS (
        SELECT 1 FROM job_categories jc 
        INNER JOIN categories c ON jc.category_id = c.id 
        WHERE jc.job_id = j.id AND (c.slug = ? OR c.name LIKE ? ESCAPE '\\')
      )`;
      params.push(category, containsPattern(category));
    }

    if (location) {
      query += ' AND (j.location LIKE ? ESCAPE \'\\\' OR j.country LIKE ? ESCAPE \'\\\')';
      const locationParam = containsPattern(location);
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
      query += ' AND (j.industry LIKE ? ESCAPE \'\\\' OR pe.industry LIKE ? ESCAPE \'\\\')';
      const industryParam = containsPattern(industry);
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
      if (!isNaN(days) && days > 0 && days <= 365) {
        query += ` AND j.created_at >= datetime('now', ? || ' days')`;
        params.push(`-${days}`);
      }
    }

    if (remote) {
      // Filter for remote jobs via remote_work flag or location containing 'remote'
      query += ` AND (j.remote_work = 1 OR j.location LIKE '%remote%' OR j.location LIKE '%Remote%' OR j.location LIKE '%REMOTE%')`;
    }

    if (req.query.country) {
      const countryVal = req.query.country;
      // Map short codes to full names for flexible matching
      const countryMap = {
        'pg': 'Papua New Guinea', 'png': 'Papua New Guinea',
        'fj': 'Fiji', 'sb': 'Solomon Islands',
        'vu': 'Vanuatu', 'ws': 'Samoa', 'to': 'Tonga',
      };
      const mapped = countryMap[countryVal.toLowerCase()] || countryVal;
      if (countryVal.toLowerCase() === 'remote') {
        query += ` AND (j.remote_work = 1 OR j.location LIKE '%remote%')`;
      } else {
        query += ` AND (j.country LIKE ? ESCAPE '\\' OR j.location LIKE ? ESCAPE '\\')`;
        const countryParam = containsPattern(mapped);
        params.push(countryParam, countryParam);
      }
    }

    if (company) {
      // Filter by company name (✅ sanitized)
      query += ` AND (COALESCE(j.company_display_name, pe.company_name) LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')`;
      const companyParam = containsPattern(company);
      params.push(companyParam, companyParam);
    }

    if (employer_id) {
      // Filter by employer ID
      query += ' AND j.employer_id = ?';
      params.push(parseInt(employer_id));
    }

    if (company_size) {
      // Filter by company size category
      const sizeRanges = {
        'startup': [1, 10],
        'small': [11, 50],
        'medium': [51, 200],
        'large': [201, 1000],
        'enterprise': [1001, 999999]
      };
      const range = sizeRanges[company_size.toLowerCase()];
      if (range) {
        // Match normalized numeric company_size or text patterns
        query += ` AND (
          (CAST(pe.company_size AS INTEGER) BETWEEN ? AND ?)
          OR pe.company_size LIKE ? ESCAPE '\\'
        )`;
        params.push(range[0], range[1], containsPattern(company_size));
      }
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT j.id) as total FROM');
    const countResult = params.length > 0 ? db.prepare(countQuery).get(...params) : db.prepare(countQuery).get();
    const total = countResult ? countResult.total : 0;

    // Sorting - Task 3: Featured jobs always first (if featured_until > now)
    let orderBy = 'j.quality_score DESC, j.created_at DESC';
    if (sort === 'date') {
      orderBy = 'j.created_at DESC';
    } else if (sort === 'salary') {
      orderBy = 'j.salary_max DESC, j.created_at DESC';
    } else if (sort === 'relevance' && keyword) {
      orderBy = 'j.views_count DESC, j.created_at DESC';
    }

    // Prefix with featured sorting (featured jobs with valid featured_until first)
    orderBy = `CASE WHEN (j.is_featured = 1 AND (j.featured_until IS NULL OR j.featured_until > datetime('now'))) THEN 0 ELSE 1 END, ${orderBy}`;

    query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    const paginatedParams = [...params, limitNum, offset];

    const jobs = db.prepare(query).all(...paginatedParams);

    // Add pagination headers
    addPaginationHeaders(res, total, parseInt(page), limitNum, `${req.protocol}://${req.get('host')}${req.path}`);

    // Log search analytics (async, non-blocking)
    if (keyword || category || location) {
      try {
        const userId = req.headers.authorization ? (() => {
          try {
            const jwt = require('jsonwebtoken');
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wantokjobs-secret-key-2024');
            return decoded.id;
          } catch { return null; }
        })() : null;
        db.prepare(
          'INSERT INTO search_analytics (query, category, location, results_count, user_id, ip_address) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(keyword || null, category || null, location || null, total, userId, req.ip);
      } catch (e) {
        logger.error('Search analytics logging error', { error: e.message });
      }
    }

    const result = {
      data: jobs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum)
    };
    cache.set(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    logger.error('Get jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch jobs', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
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
             (SELECT COUNT(*) FROM applications WHERE job_id = j.id AND status != 'withdrawn') as applications_count
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.employer_id = ?
      ORDER BY j.created_at DESC
    `).all(req.user.id);

    res.json({ data: jobs, total: jobs.length });
  } catch (error) {
    logger.error('Get my jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job (enhanced with company info and similar jobs)
// GET /compare?ids=1,2,3 - Compare jobs side by side (max 5)
router.get('/compare', (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'ids parameter required' });
    
    const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (idList.length === 0) return res.status(400).json({ error: 'No valid IDs provided' });
    if (idList.length > 5) return res.status(400).json({ error: 'Maximum 5 jobs allowed' });
    
    const placeholders = idList.map(() => '?').join(',');
    const jobs = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             COALESCE(j.company_display_name, pe.company_name) as company_name,
             pe.industry as company_industry,
             pe.website,
             COALESCE(j.logo_url, pe.logo_url) as logo_url,
             pe.location as company_location
      FROM jobs j
      JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.id IN (${placeholders}) AND j.status = 'active'
    `).all(...idList);

    // Get categories for each job
    for (const job of jobs) {
      job.categories = db.prepare(`
        SELECT c.name FROM categories c
        INNER JOIN job_categories jc ON c.id = jc.category_id
        WHERE jc.job_id = ?
      `).all(job.id);
    }

    res.json(jobs);
  } catch (err) {
    logger.error('Compare jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs for comparison' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const job = db.prepare(`
      SELECT j.*, 
             u.name as employer_name,
             u.email as employer_email,
             u.is_verified as employer_verified,
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

    // Track view with IP-based debouncing (once per IP per 24h)
    const crypto = require('crypto');
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.socket.remoteAddress || 
                     'unknown';
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');
    
    try {
      // Check if this IP viewed this job in the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const existingView = db.prepare(`
        SELECT id FROM job_views 
        WHERE job_id = ? AND ip_hash = ? AND viewed_at > ?
      `).get(req.params.id, ipHash, yesterday);

      if (!existingView) {
        // Record new view
        db.prepare(`
          INSERT INTO job_views (job_id, ip_hash) VALUES (?, ?)
        `).run(req.params.id, ipHash);
        
        // Increment job view count
        db.prepare('UPDATE jobs SET views_count = views_count + 1 WHERE id = ?').run(req.params.id);
      }
    } catch (viewError) {
      // Don't fail the request if view tracking fails
      logger.error('View tracking error', { error: viewError.message });
    }

    res.json(job);
  } catch (error) {
    logger.error('Get job error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// GET /:id/similar - Get similar jobs for a specific job (Smart recommendations engine)
router.get('/:id/similar', (req, res) => {
  try {
    const { getSimilarJobs } = require('../lib/recommendations');
    const limit = Math.min(parseInt(req.query.limit) || 6, 12);
    const similarJobs = getSimilarJobs(parseInt(req.params.id), limit);

    if (similarJobs === null) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ data: similarJobs });
  } catch (error) {
    logger.error('Get similar jobs error', { error: error.message });
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
    
    cache.invalidate('jobs'); cache.invalidate('categories'); cache.invalidate('stats'); cache.invalidate('featured');
    res.json(updated);
  } catch (error) {
    logger.error('Update job status error', { error: error.message });
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

    // Sanitize all text inputs to prevent XSS
    const safeTitle = stripHtml(title);
    const safeDescription = stripHtml(description);
    const safeRequirements = requirements ? stripHtml(requirements) : null;
    const safeLocation = location ? stripHtml(location) : null;
    const safeCountry = country ? stripHtml(country) : 'Papua New Guinea';
    const safeIndustry = industry ? stripHtml(industry) : null;
    const safeSkills = skills ? stripHtml(skills) : null;
    const safeApplicationEmail = application_email ? sanitizeEmail(application_email) : null;
    const safeScreeningQuestions = screening_questions ? stripHtml(screening_questions) : null;

    if (!safeTitle || !safeDescription) {
      return res.status(400).json({ error: 'Title and description required' });
    }
    
    // Validate lengths
    if (!isValidLength(safeTitle, 200, 1)) {
      return res.status(400).json({ error: 'Title must be between 1 and 200 characters' });
    }
    if (!isValidLength(safeDescription, 10000, 10)) {
      return res.status(400).json({ error: 'Description must be between 10 and 10000 characters' });
    }
    
    if (!category_slug) {
      return res.status(400).json({ error: 'Category is required' });
    }

    // Validate category exists
    const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category_slug);
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const category_id = category.id;

    // Handle client_id for agency users
    const clientId = req.body.client_id || null;
    if (clientId) {
      const user = db.prepare('SELECT account_type FROM users WHERE id = ?').get(req.user.id);
      if (!user || user.account_type !== 'agency') {
        return res.status(403).json({ error: 'Only agency accounts can post for clients' });
      }
      const client = db.prepare('SELECT id FROM agency_clients WHERE id = ? AND agency_id = ? AND deleted_at IS NULL').get(clientId, req.user.id);
      if (!client) {
        return res.status(400).json({ error: 'Invalid client' });
      }
    }

    const result = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, requirements, location, country,
        job_type, experience_level, industry, category_slug, category_id, 
        skills, remote_work, salary_min, salary_max, salary_currency, 
        application_deadline, application_method, application_url, 
        application_email, screening_questions, status, client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      safeTitle,
      safeDescription,
      safeRequirements,
      safeLocation,
      safeCountry,
      job_type || 'full-time',
      experience_level || null,
      safeIndustry,
      category_slug,
      category_id,
      safeSkills,
      remote_work ? 1 : 0,
      salary_min || null,
      salary_max || null,
      salary_currency || 'PGK',
      application_deadline || null,
      application_method || 'internal',
      application_url || null,
      safeApplicationEmail,
      safeScreeningQuestions,
      status,
      clientId
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
      sendNewJobAlerts(job, employer).catch(e => logger.error('Job alerts error:', { error: e.message }));
    }

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)').run(req.user.id, 'job_posted', 'job', job.id, JSON.stringify({ title, status })); } catch(e) {}

    cache.invalidate('jobs'); cache.invalidate('categories'); cache.invalidate('stats'); cache.invalidate('featured');
    res.status(201).json({ data: job, id: job.id });
  } catch (error) {
    logger.error('Create job error', { error: error.message });
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

    // Sanitize all text inputs to prevent XSS
    const safeTitle = title ? stripHtml(title) : job.title;
    const safeDescription = description ? stripHtml(description) : job.description;
    const safeRequirements = requirements !== undefined ? (requirements ? stripHtml(requirements) : null) : job.requirements;
    const safeLocation = location !== undefined ? (location ? stripHtml(location) : null) : job.location;
    const safeCountry = country !== undefined ? (country ? stripHtml(country) : null) : job.country;
    const safeIndustry = industry !== undefined ? (industry ? stripHtml(industry) : null) : job.industry;
    const safeSkills = skills !== undefined ? (skills ? stripHtml(skills) : null) : job.skills;
    const safeApplicationEmail = application_email !== undefined ? (application_email ? sanitizeEmail(application_email) : null) : job.application_email;
    const safeScreeningQuestions = screening_questions !== undefined ? (screening_questions ? stripHtml(screening_questions) : null) : job.screening_questions;

    // Validate lengths
    if (title && !isValidLength(safeTitle, 200, 1)) {
      return res.status(400).json({ error: 'Title must be between 1 and 200 characters' });
    }
    if (description && !isValidLength(safeDescription, 10000, 10)) {
      return res.status(400).json({ error: 'Description must be between 10 and 10000 characters' });
    }

    // Get category_id from slug if provided
    let category_id = job.category_id;
    if (category_slug) {
      const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(category_slug);
      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      category_id = category.id;
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
      safeTitle,
      safeDescription,
      safeRequirements,
      safeLocation,
      safeCountry,
      job_type || job.job_type,
      experience_level !== undefined ? experience_level : job.experience_level,
      safeIndustry,
      category_slug !== undefined ? category_slug : job.category_slug,
      category_id,
      safeSkills,
      remote_work !== undefined ? (remote_work ? 1 : 0) : job.remote_work,
      salary_min !== undefined ? salary_min : job.salary_min,
      salary_max !== undefined ? salary_max : job.salary_max,
      salary_currency || job.salary_currency,
      application_deadline !== undefined ? application_deadline : job.application_deadline,
      application_method !== undefined ? application_method : job.application_method,
      application_url !== undefined ? application_url : job.application_url,
      safeApplicationEmail,
      safeScreeningQuestions,
      status || job.status,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    cache.invalidate('jobs'); cache.invalidate('categories'); cache.invalidate('stats'); cache.invalidate('featured');
    res.json(updated);
  } catch (error) {
    logger.error('Update job error', { error: error.message });
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

    cache.invalidate('jobs'); cache.invalidate('categories'); cache.invalidate('stats'); cache.invalidate('featured');
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    logger.error('Delete job error', { error: error.message });
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
    logger.error('Get skills match error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch skills match' });
  }
});

// POST /:id/click - Track job click-through
router.post('/:id/click', (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const source = req.body.source || 'search';
    let userId = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wantokjobs-secret-key-2024');
        userId = decoded.id;
      } catch {}
    }
    db.prepare('INSERT INTO job_clicks (job_id, user_id, source, ip_address) VALUES (?, ?, ?, ?)').run(jobId, userId, source, req.ip);
    res.json({ success: true });
  } catch (error) {
    logger.error('Click tracking error', { error: error.message });
    res.json({ success: false });
  }
});

// POST /report - Report a job or employer (Task 4)
router.post('/report', async (req, res) => {
  try {
    const { job_id, employer_id, reason, details } = req.body;

    if ((!job_id && !employer_id) || !reason) {
      return res.status(400).json({ error: 'Either job_id or employer_id is required, along with reason' });
    }

    const validReasons = ['scam', 'misleading', 'inappropriate', 'duplicate', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason. Must be one of: scam, misleading, inappropriate, duplicate, other' });
    }
    
    // Sanitize details input
    const safeDetails = details ? stripHtml(details) : null;

    // Check if job exists (if job_id provided)
    if (job_id) {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
    }

    // Check if employer exists (if employer_id provided)
    if (employer_id) {
      const employer = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(employer_id, 'employer');
      if (!employer) {
        return res.status(404).json({ error: 'Employer not found' });
      }
    }

    // Insert report into reports table
    const result = db.prepare(`
      INSERT INTO reports (reporter_id, job_id, employer_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(
      req.user ? req.user.id : null,
      job_id || null,
      employer_id || null,
      reason,
      safeDetails
    );

    // Notify admins
    const adminUsers = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const reportType = job_id ? 'Job' : 'Employer';
    const reportTarget = job_id ? `Job ID: ${job_id}` : `Employer ID: ${employer_id}`;
    
    adminUsers.forEach(admin => {
      try {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, link, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(
          admin.id,
          'report',
          `${reportType} Reported`,
          `${reportTarget} has been reported for: ${reason}`,
          `/admin/reports/${result.lastInsertRowid}`
        );
      } catch (e) {
        logger.error('Failed to create admin notification', { error: e.message });
      }
    });

    res.json({ message: 'Report submitted successfully', id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Report error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
