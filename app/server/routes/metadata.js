const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /locations - Return distinct locations from active jobs with counts
router.get('/locations', (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT 
        location, 
        country,
        COUNT(*) as job_count
      FROM jobs
      WHERE status = 'active' AND location IS NOT NULL AND location != ''
      GROUP BY location, country
      ORDER BY job_count DESC, location
      LIMIT 100
    `).all();

    // Also get country-level counts
    const countries = db.prepare(`
      SELECT 
        country,
        COUNT(*) as job_count
      FROM jobs
      WHERE status = 'active' AND country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY job_count DESC
    `).all();

    res.json({ locations, countries });
  } catch (error) {
    logger.error('Error fetching locations', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /industries - Return distinct industries with counts
router.get('/industries', (req, res) => {
  try {
    // Get industries from jobs
    const jobIndustries = db.prepare(`
      SELECT 
        industry,
        COUNT(*) as job_count
      FROM jobs
      WHERE status = 'active' AND industry IS NOT NULL AND industry != ''
      GROUP BY industry
      ORDER BY job_count DESC
    `).all();

    // Get industries from employer profiles for completeness
    const companyIndustries = db.prepare(`
      SELECT 
        pe.industry,
        COUNT(DISTINCT pe.user_id) as company_count,
        (SELECT COUNT(*) FROM jobs WHERE employer_id = pe.user_id AND status = 'active') as active_jobs
      FROM profiles_employer pe
      WHERE pe.industry IS NOT NULL AND pe.industry != ''
      GROUP BY pe.industry
      ORDER BY company_count DESC
    `).all();

    // Merge and deduplicate
    const industriesMap = {};
    
    jobIndustries.forEach(item => {
      if (!industriesMap[item.industry]) {
        industriesMap[item.industry] = { industry: item.industry, job_count: 0, company_count: 0 };
      }
      industriesMap[item.industry].job_count = item.job_count;
    });

    companyIndustries.forEach(item => {
      if (!industriesMap[item.industry]) {
        industriesMap[item.industry] = { industry: item.industry, job_count: 0, company_count: 0 };
      }
      industriesMap[item.industry].company_count = item.company_count;
    });

    const industries = Object.values(industriesMap).sort((a, b) => b.job_count - a.job_count);

    res.json({ industries });
  } catch (error) {
    logger.error('Error fetching industries', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

module.exports = router;
