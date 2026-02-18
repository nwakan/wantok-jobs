/**
 * Market Insights API (Part 2.8)
 * Provides aggregated job market data for Career Insights page
 */

const express = require('express');
const db = require('../database');
const logger = require('../utils/logger');
const cache = require('../lib/cache');

const router = express.Router();

// GET /api/insights/market - Public market data
router.get('/market', (req, res) => {
  try {
    const cached = cache.get('insights:market');
    if (cached) return res.json(cached);

    const insights = {
      inDemandSkills: getInDemandSkills(),
      salaryRanges: getSalaryRangesByIndustry(),
      hiringTrends: getHiringTrends(),
      topCompanies: getTopHiringCompanies(),
      locationDistribution: getLocationDistribution(),
      lastUpdated: new Date().toISOString()
    };

    cache.set('insights:market', insights, 3600); // Cache for 1 hour
    res.json(insights);
  } catch (error) {
    logger.error('Market insights error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch market insights' });
  }
});

function getInDemandSkills() {
  try {
    // Get all job skills from the last 3 months
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const jobs = db.prepare(`
      SELECT skills FROM jobs 
      WHERE status = 'active' 
        AND created_at > ?
        AND skills IS NOT NULL
    `).all(threeMonthsAgo);

    const skillCounts = {};

    jobs.forEach(job => {
      try {
        let skills = [];
        if (job.skills) {
          const parsed = JSON.parse(job.skills);
          skills = Array.isArray(parsed) ? parsed : job.skills.split(',').map(s => s.trim());
        }
        skills.forEach(skill => {
          const normalized = skill.toLowerCase().trim();
          if (normalized) {
            skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
          }
        });
      } catch {}
    });

    // Convert to array and sort
    const sorted = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return sorted;
  } catch (error) {
    logger.error('In-demand skills error', { error: error.message });
    return [];
  }
}

function getSalaryRangesByIndustry() {
  try {
    const ranges = db.prepare(`
      SELECT 
        industry,
        COUNT(*) as job_count,
        AVG(salary_min) as avg_min,
        AVG(salary_max) as avg_max,
        MIN(salary_min) as min_salary,
        MAX(salary_max) as max_salary,
        salary_currency
      FROM jobs
      WHERE status = 'active'
        AND industry IS NOT NULL
        AND salary_max IS NOT NULL
        AND salary_max > 0
      GROUP BY industry, salary_currency
      HAVING job_count >= 3
      ORDER BY job_count DESC
      LIMIT 10
    `).all();

    return ranges.map(r => ({
      industry: r.industry,
      jobCount: r.job_count,
      averageMin: Math.round(r.avg_min || 0),
      averageMax: Math.round(r.avg_max || 0),
      range: `${r.salary_currency || 'PGK'} ${Math.round(r.min_salary || 0).toLocaleString()} - ${Math.round(r.max_salary || 0).toLocaleString()}`,
      currency: r.salary_currency || 'PGK'
    }));
  } catch (error) {
    logger.error('Salary ranges error', { error: error.message });
    return [];
  }
}

function getHiringTrends() {
  try {
    // Get job postings by month for the last 12 months
    const trends = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM jobs
      WHERE created_at >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    return trends.map(t => ({
      month: t.month,
      jobsPosted: t.count
    }));
  } catch (error) {
    logger.error('Hiring trends error', { error: error.message });
    return [];
  }
}

function getTopHiringCompanies() {
  try {
    const companies = db.prepare(`
      SELECT 
        COALESCE(j.company_display_name, pe.company_name, u.name) as company_name,
        COUNT(DISTINCT j.id) as active_jobs,
        pe.industry,
        pe.logo_url,
        pe.location
      FROM jobs j
      INNER JOIN users u ON j.employer_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE j.status = 'active'
      GROUP BY company_name
      HAVING active_jobs > 0
      ORDER BY active_jobs DESC, company_name ASC
      LIMIT 10
    `).all();

    return companies.map(c => ({
      name: c.company_name,
      activeJobs: c.active_jobs,
      industry: c.industry,
      logo: c.logo_url,
      location: c.location
    }));
  } catch (error) {
    logger.error('Top companies error', { error: error.message });
    return [];
  }
}

function getLocationDistribution() {
  try {
    const locations = db.prepare(`
      SELECT 
        COALESCE(location, 'Not specified') as location,
        COUNT(*) as count
      FROM jobs
      WHERE status = 'active'
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const total = locations.reduce((sum, l) => sum + l.count, 0);

    return locations.map(l => ({
      location: l.location,
      count: l.count,
      percentage: Math.round((l.count / total) * 100)
    }));
  } catch (error) {
    logger.error('Location distribution error', { error: error.message });
    return [];
  }
}

module.exports = router;
