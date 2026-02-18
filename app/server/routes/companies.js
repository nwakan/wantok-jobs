const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');

const cache = require('../lib/cache');

// GET /countries - Get employer counts by country
router.get('/countries', (req, res) => {
  try {
    const countries = db.prepare(`
      SELECT pe.country, COUNT(*) as count
      FROM users u
      INNER JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.role = 'employer' AND u.id NOT IN (1, 11) AND pe.country IS NOT NULL AND pe.country != ''
      GROUP BY pe.country
      ORDER BY count DESC
    `).all();

    res.json({ data: countries });
  } catch (error) {
    logger.error('Error fetching country stats', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch country stats' });
  }
});

// GET / - Public company directory with pagination and job counts
router.get('/', (req, res) => {
  try {
    const cacheKey = 'companies:list:' + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { limit = 24, offset = 0, industry, country, featured, search, location, employer_type, transparency_only } = req.query;

    let query = `
      SELECT u.id, u.name, pe.company_name, pe.industry, pe.company_size, 
             pe.location, pe.country, pe.logo_url, pe.verified, pe.featured,
             pe.transparency_score, pe.transparency_required, pe.employer_type,
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

    if (employer_type) {
      query += ' AND pe.employer_type = ?';
      params.push(employer_type);
    }

    if (transparency_only === 'true') {
      query += ' AND pe.transparency_required = 1';
    }

    if (featured === 'true') {
      query += ' AND pe.featured = 1';
    }

    // Sort: featured first, then verified, then those with active jobs, then by name
    query += ' ORDER BY pe.featured DESC, pe.verified DESC, active_jobs_count DESC, pe.company_name ASC LIMIT ? OFFSET ?';
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

    // Get total count (mirror all filters)
    let countQuery = 'SELECT COUNT(*) as count FROM users u INNER JOIN profiles_employer pe ON u.id = pe.user_id WHERE u.role = ? AND u.id NOT IN (1, 11)';
    const countParams = ['employer'];
    if (search) {
      countQuery += ' AND (pe.company_name LIKE ? OR u.name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (industry) {
      countQuery += ' AND pe.industry = ?';
      countParams.push(industry);
    }
    if (location) {
      countQuery += ' AND pe.location LIKE ?';
      countParams.push(`%${location}%`);
    }
    if (country) {
      countQuery += ' AND pe.country = ?';
      countParams.push(country);
    }
    if (employer_type) {
      countQuery += ' AND pe.employer_type = ?';
      countParams.push(employer_type);
    }
    if (transparency_only === 'true') {
      countQuery += ' AND pe.transparency_required = 1';
    }
    if (featured === 'true') {
      countQuery += ' AND pe.featured = 1';
    }

    const total = db.prepare(countQuery).get(...countParams);

    // Add transparency badges to companies
    const getTransparencyBadge = require('./transparency').getTransparencyBadge || function(score, required) {
      if (!required) return null;
      if (score >= 80) return { emoji: '✅', label: 'Transparency Verified', level: 'high', color: 'green' };
      if (score >= 50) return { emoji: '🟡', label: 'Partially Transparent', level: 'medium', color: 'yellow' };
      if (score >= 1) return { emoji: '🔴', label: 'Low Transparency', level: 'low', color: 'red' };
      return { emoji: '⚫', label: 'No Transparency Data', level: 'none', color: 'black' };
    };
    
    const enrichedCompanies = companies.map(company => ({
      ...company,
      transparency_badge: getTransparencyBadge(company.transparency_score || 0, company.transparency_required || 0),
    }));

    const result = { data: enrichedCompanies, total: total.count };
    cache.set(cacheKey, result, 120);
    res.json(result);
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

// GET /:id - Public company profile with full details, active jobs, reviews, and related companies
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Set cache control header
    res.setHeader('Cache-Control', 'no-cache');

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

    // Construct Google Maps embed URL (free, no API key needed)
    let mapEmbedUrl = null;
    if (company.location || company.country) {
      const query = encodeURIComponent([company.location, company.country].filter(Boolean).join(', '));
      // Using the embed API approach that doesn't require a key for basic embeds
      mapEmbedUrl = `https://maps.google.com/maps?q=${query}&output=embed`;
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

    // Get related companies (same industry, excluding current company, limit 4)
    let relatedCompanies = [];
    if (company.industry) {
      relatedCompanies = db.prepare(`
        SELECT u.id, pe.company_name, pe.industry, pe.location, pe.logo_url, pe.verified,
               (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id AND status = 'active') as active_jobs_count
        FROM users u
        INNER JOIN profiles_employer pe ON u.id = pe.user_id
        WHERE u.role = 'employer' 
          AND u.id != ? 
          AND u.id NOT IN (1, 11)
          AND pe.industry = ?
        ORDER BY pe.verified DESC, active_jobs_count DESC, pe.company_name ASC
        LIMIT 4
      `).all(id, company.industry);
    }

    res.json({ 
      company: {
        ...company,
        map_embed_url: mapEmbedUrl
      },
      jobs, 
      stats,
      reviews,
      average_rating: avgRating?.avg_rating || 0,
      review_count: avgRating?.review_count || 0,
      related_companies: relatedCompanies
    });
  } catch (error) {
    logger.error('Error fetching company', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

module.exports = router;
