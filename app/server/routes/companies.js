const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / - Public company directory with pagination
router.get('/', (req, res) => {
  try {
    const { limit = 20, offset = 0, industry, country, featured } = req.query;

    let query = `
      SELECT u.id, u.name, pe.company_name, pe.industry, pe.company_size, 
             pe.location, pe.country, pe.logo_url, pe.verified, pe.featured,
             (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.role = 'employer'
    `;

    const params = [];

    if (industry) {
      query += ' AND pe.industry = ?';
      params.push(industry);
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
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /:id - Public company profile with active jobs
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const company = db.prepare(`
      SELECT u.id, u.name, u.created_at, pe.*
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.id = ? AND u.role = 'employer'
    `).get(id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get active jobs
    const jobs = db.prepare(`
      SELECT id, title, location, job_type, salary_min, salary_max, 
             salary_currency, created_at, views_count
      FROM jobs
      WHERE employer_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `).all(id);

    // Get company stats
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM jobs WHERE employer_id = ? AND status = 'active') as active_jobs,
        (SELECT COUNT(*) FROM jobs WHERE employer_id = ?) as total_jobs,
        (SELECT COUNT(*) FROM applications a INNER JOIN jobs j ON a.job_id = j.id WHERE j.employer_id = ?) as total_applications
    `).get(id, id, id);

    res.json({ company, jobs, stats });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

module.exports = router;
