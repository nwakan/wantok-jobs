const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / - Public company directory with pagination and job counts
router.get('/', (req, res) => {
  try {
    const { limit = 20, offset = 0, industry, country, featured, search, location } = req.query;

    let query = `
      SELECT u.id, u.name, pe.company_name, pe.industry, pe.company_size, 
             pe.location, pe.country, pe.logo_url, pe.verified, pe.featured,
             (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs_count,
             (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id) as total_jobs_count
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.role = 'employer' AND u.id NOT IN (1, 11)
    `;

    const params = [];

    if (search) {
      query += ' AND (pe.company_name LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (industry) {
      query += ' AND pe.industry = ?';
      params.push(industry);
    }

    if (location) {
      query += ' AND pe.location LIKE ?';
      params.push(`%${location}%`);
    }

    if (country) {
      query += ' AND pe.country = ?';
      params.push(country);
    }

    if (featured === 'true') {
      query += ' AND pe.featured = 1';
    }

    query += ' ORDER BY pe.featured DESC, pe.verified DESC, u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const companies = db.prepare(query).all(...params);

    // Also include agency-managed clients
    let agencyQuery = `
      SELECT ac.id as id, NULL as name, ac.company_name, ac.industry, NULL as company_size,
             ac.location, NULL as country, ac.logo_url, 0 as verified, 0 as featured,
             (SELECT COUNT(*) FROM jobs WHERE client_id = ac.id AND status = 'active') as active_jobs_count,
             (SELECT COUNT(*) FROM jobs WHERE client_id = ac.id) as total_jobs_count,
             1 as is_agency_managed,
             (SELECT u.name FROM users u WHERE u.id = ac.agency_id) as managed_by_agency
      FROM agency_clients ac
      WHERE ac.deleted_at IS NULL
    `;
    const agencyParams = [];
    if (search) {
      agencyQuery += ' AND ac.company_name LIKE ?';
      agencyParams.push(`%${search}%`);
    }
    if (industry) {
      agencyQuery += ' AND ac.industry = ?';
      agencyParams.push(industry);
    }
    if (location) {
      agencyQuery += ' AND ac.location LIKE ?';
      agencyParams.push(`%${location}%`);
    }
    agencyQuery += ' LIMIT 20';
    const agencyCompanies = db.prepare(agencyQuery).all(...agencyParams);
    companies.push(...agencyCompanies.map(c => ({ ...c, is_agency_managed: true })));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM users u INNER JOIN profiles_employer pe ON u.id = pe.user_id WHERE u.role = ?';
    const countParams = ['employer'];
    if (industry) {
      countQuery += ' AND pe.industry = ?';
      countParams.push(industry);
    }
    if (country) {
      countQuery += ' AND pe.country = ?';
      countParams.push(country);
    }
    if (featured === 'true') {
      countQuery += ' AND pe.featured = 1';
    }

    const total = db.prepare(countQuery).get(...countParams);

    res.json({ data: companies, total: total.count });
  } catch (error) {
    logger.error('Error fetching companies', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /agency-client/:id - Public agency client profile
router.get('/agency-client/:id', (req, res) => {
  try {
    const { id } = req.params;
    const client = db.prepare(`
      SELECT ac.*, u.name as agency_name
      FROM agency_clients ac
      JOIN users u ON ac.agency_id = u.id
      WHERE ac.id = ? AND ac.deleted_at IS NULL
    `).get(id);
    if (!client) return res.status(404).json({ error: 'Company not found' });

    const jobs = db.prepare(`
      SELECT id, title, location, job_type, salary_min, salary_max, salary_currency, created_at, status
      FROM jobs WHERE client_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 20
    `).all(id);

    res.json({ company: { ...client, is_agency_managed: true }, jobs, stats: { active_jobs: jobs.length } });
  } catch (error) {
    logger.error('Error fetching agency client profile', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// GET /:id - Public company profile with full details, active jobs, and reviews
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get company profile
    const company = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at, pe.*
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.id = ? AND u.role = 'employer'
    `).get(id);

    if (!company || [1, 11].includes(parseInt(id))) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get active jobs
    const jobs = db.prepare(`
      SELECT id, title, location, job_type, salary_min, salary_max, 
             salary_currency, created_at, views_count, experience_level,
             industry, status
      FROM jobs
      WHERE employer_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);

    // Get company stats
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM jobs WHERE employer_id = ? AND status = 'active') as active_jobs,
        (SELECT COUNT(*) FROM jobs WHERE employer_id = ?) as total_jobs,
        (SELECT COUNT(*) FROM applications a INNER JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?) as total_applications
    `).get(id, id, id);

    // Get company reviews (approved only for public view)
    const reviews = db.prepare(`
      SELECT cr.*, u.name as reviewer_name
      FROM company_reviews cr
      LEFT JOIN users u ON cr.reviewer_id = u.id
      WHERE cr.company_id = ? AND cr.approved = 1
      ORDER BY cr.created_at DESC
      LIMIT 10
    `).all(id);

    // Calculate average rating
    const avgRating = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM company_reviews
      WHERE company_id = ? AND approved = 1
    `).get(id);

    res.json({ 
      company, 
      jobs, 
      stats,
      reviews,
      average_rating: avgRating?.avg_rating || 0,
      review_count: avgRating?.review_count || 0
    });
  } catch (error) {
    logger.error('Error fetching company', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

module.exports = router;
