const express = require('express');
const db = require('../database');
const router = express.Router();

// GET /api/salary-estimates?industry=&experience=&location=
router.get('/salary-estimates', (req, res) => {
  try {
    const { industry, experience, location } = req.query;

    let where = ["status = 'active'", "salary_min IS NOT NULL", "salary_max IS NOT NULL"];
    let params = [];

    if (industry) {
      where.push("LOWER(industry) = LOWER(?)");
      params.push(industry);
    }
    if (experience) {
      where.push("LOWER(experience_level) = LOWER(?)");
      params.push(experience);
    }
    if (location) {
      where.push("LOWER(location) LIKE LOWER(?)");
      params.push(`%${location}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Get salary stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as job_count,
        ROUND(AVG(salary_min), 0) as avg_min,
        ROUND(AVG(salary_max), 0) as avg_max,
        ROUND(AVG((salary_min + salary_max) / 2), 0) as avg_salary,
        MIN(salary_min) as lowest,
        MAX(salary_max) as highest
      FROM jobs ${whereClause}
    `).get(...params);

    // Get industry average (no experience/location filter) for comparison
    let industryAvg = null;
    if (industry) {
      industryAvg = db.prepare(`
        SELECT ROUND(AVG((salary_min + salary_max) / 2), 0) as avg_salary, COUNT(*) as job_count
        FROM jobs
        WHERE status = 'active' AND salary_min IS NOT NULL AND salary_max IS NOT NULL
          AND LOWER(industry) = LOWER(?)
      `).get(industry);
    }

    // Get related jobs
    const jobs = db.prepare(`
      SELECT id, title, company_name, location, salary_min, salary_max, salary_currency, experience_level, industry
      FROM jobs ${whereClause}
      ORDER BY created_at DESC
      LIMIT 10
    `).all(...params);

    // Get available filter options
    const industries = db.prepare(`
      SELECT DISTINCT industry FROM jobs 
      WHERE status = 'active' AND industry IS NOT NULL AND industry != ''
      ORDER BY industry
    `).all().map(r => r.industry);

    const locations = db.prepare(`
      SELECT DISTINCT location FROM jobs 
      WHERE status = 'active' AND location IS NOT NULL AND location != ''
      ORDER BY location
    `).all().map(r => r.location);

    res.json({
      stats: stats || { job_count: 0, avg_min: 0, avg_max: 0, avg_salary: 0, lowest: 0, highest: 0 },
      industryAvg: industryAvg || { avg_salary: 0, job_count: 0 },
      jobs,
      filters: { industries, locations }
    });
  } catch (err) {
    console.error('Salary estimates error:', err);
    res.status(500).json({ error: 'Failed to fetch salary estimates' });
  }
});

module.exports = router;
