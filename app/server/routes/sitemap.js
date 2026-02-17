/**
 * Sitemap Generation Routes
 * Generates dynamic XML sitemaps for search engine crawling
 */

const logger = require('../utils/logger');
const { Router } = require('express');
const db = require('../database.js');

const router = Router();

// Cache configuration
const CACHE_DURATION = 3600000; // 1 hour
let sitemapCache = {};
let cacheTimestamps = {};

/**
 * Clear cache for a specific sitemap type
 */
function clearCache(type) {
  delete sitemapCache[type];
  delete cacheTimestamps[type];
}

/**
 * Get cached sitemap or generate new one
 */
function getCachedOrGenerate(type, generator) {
  const now = Date.now();
  if (!sitemapCache[type] || !cacheTimestamps[type] || now - cacheTimestamps[type] > CACHE_DURATION) {
    sitemapCache[type] = generator();
    cacheTimestamps[type] = now;
  }
  return sitemapCache[type];
}

/**
 * XML header for sitemaps
 */
const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

const xmlFooter = `
</urlset>`;

/**
 * Format URL entry for sitemap
 */
function formatUrl(loc, lastmod, changefreq = 'weekly', priority = '0.5') {
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * GET /sitemap.xml - Index sitemap (points to sub-sitemaps)
 */
router.get('/sitemap.xml', (req, res) => {
  try {
    const sitemap = getCachedOrGenerate('index', () => {
      const now = new Date().toISOString().split('T')[0];
      
      return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://wantokjobs.com/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://wantokjobs.com/sitemap-jobs.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://wantokjobs.com/sitemap-companies.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://wantokjobs.com/sitemap-categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
    });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Sitemap index error', { error: error.message });
    res.status(500).send('Sitemap generation failed');
  }
});

/**
 * GET /sitemap-static.xml - Static pages
 */
router.get('/sitemap-static.xml', (req, res) => {
  try {
    const sitemap = getCachedOrGenerate('static', () => {
      const now = new Date().toISOString().split('T')[0];
      const baseUrl = 'https://wantokjobs.com';
      
      const pages = [
        { path: '/', priority: '1.0', changefreq: 'daily' },
        { path: '/jobs', priority: '0.9', changefreq: 'hourly' },
        { path: '/categories', priority: '0.8', changefreq: 'weekly' },
        { path: '/companies', priority: '0.7', changefreq: 'weekly' },
        { path: '/pricing', priority: '0.6', changefreq: 'monthly' },
        { path: '/about', priority: '0.5', changefreq: 'monthly' },
        { path: '/blog', priority: '0.6', changefreq: 'weekly' },
        { path: '/contact', priority: '0.4', changefreq: 'monthly' },
      ];

      let xml = xmlHeader;
      pages.forEach(page => {
        xml += formatUrl(`${baseUrl}${page.path}`, now, page.changefreq, page.priority);
      });
      xml += xmlFooter;

      return xml;
    });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Static sitemap error', { error: error.message });
    res.status(500).send('Sitemap generation failed');
  }
});

/**
 * GET /sitemap-jobs.xml - Active job listings
 */
router.get('/sitemap-jobs.xml', (req, res) => {
  try {
    const sitemap = getCachedOrGenerate('jobs', () => {
      // Get all active jobs with last modified date
      const jobs = db.prepare(`
        SELECT 
          id, 
          slug, 
          title,
          updated_at,
          created_at
        FROM jobs 
        WHERE status = 'active'
          AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY created_at DESC
        LIMIT 5000
      `).all();

      const baseUrl = 'https://wantokjobs.com';
      let xml = xmlHeader;

      jobs.forEach(job => {
        const slug = job.slug || `${job.id}/${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const lastmod = (job.updated_at || job.created_at).split('T')[0];
        xml += formatUrl(`${baseUrl}/jobs/${slug}`, lastmod, 'weekly', '0.8');
      });

      xml += xmlFooter;
      return xml;
    });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Jobs sitemap error', { error: error.message });
    res.status(500).send('Sitemap generation failed');
  }
});

/**
 * GET /sitemap-companies.xml - Company profiles
 */
router.get('/sitemap-companies.xml', (req, res) => {
  try {
    const sitemap = getCachedOrGenerate('companies', () => {
      // Get all companies with at least 1 active job
      const companies = db.prepare(`
        SELECT DISTINCT
          pe.id,
          pe.company_display_name,
          pe.updated_at,
          pe.created_at,
          COUNT(DISTINCT j.id) as job_count
        FROM profiles_employer pe
        INNER JOIN jobs j ON j.employer_id = pe.user_id
        WHERE j.status = 'active'
          AND (j.expires_at IS NULL OR j.expires_at > datetime('now'))
        GROUP BY pe.id
        HAVING job_count > 0
        ORDER BY job_count DESC
        LIMIT 2000
      `).all();

      const baseUrl = 'https://wantokjobs.com';
      let xml = xmlHeader;

      companies.forEach(company => {
        const lastmod = (company.updated_at || company.created_at).split('T')[0];
        // Priority based on job count (more jobs = higher priority)
        const priority = Math.min(0.9, 0.5 + (company.job_count * 0.05)).toFixed(1);
        xml += formatUrl(`${baseUrl}/companies/${company.id}`, lastmod, 'weekly', priority);
      });

      xml += xmlFooter;
      return xml;
    });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Companies sitemap error', { error: error.message });
    res.status(500).send('Sitemap generation failed');
  }
});

/**
 * GET /sitemap-categories.xml - Category landing pages
 */
router.get('/sitemap-categories.xml', (req, res) => {
  try {
    const sitemap = getCachedOrGenerate('categories', () => {
      // Get all categories with job counts
      const categories = db.prepare(`
        SELECT 
          c.slug,
          c.name,
          COUNT(DISTINCT j.id) as job_count,
          MAX(j.created_at) as latest_job
        FROM categories c
        LEFT JOIN jobs j ON j.category_id = c.id 
          AND j.status = 'active'
          AND (j.expires_at IS NULL OR j.expires_at > datetime('now'))
        GROUP BY c.id
        ORDER BY job_count DESC
      `).all();

      const baseUrl = 'https://wantokjobs.com';
      let xml = xmlHeader;

      categories.forEach(cat => {
        const lastmod = cat.latest_job 
          ? cat.latest_job.split('T')[0] 
          : new Date().toISOString().split('T')[0];
        // Priority based on job count
        const priority = cat.job_count > 50 ? '0.8' : cat.job_count > 10 ? '0.7' : '0.6';
        xml += formatUrl(`${baseUrl}/category/${cat.slug}`, lastmod, 'daily', priority);
      });

      xml += xmlFooter;
      return xml;
    });

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    logger.error('Categories sitemap error', { error: error.message });
    res.status(500).send('Sitemap generation failed');
  }
});

/**
 * POST /sitemap/clear-cache - Admin endpoint to force regeneration
 * (Optional: for use after bulk job imports or major content changes)
 */
router.post('/sitemap/clear-cache', (req, res) => {
  try {
    sitemapCache = {};
    cacheTimestamps = {};
    res.json({ success: true, message: 'Sitemap cache cleared' });
  } catch (error) {
    logger.error('Cache clear error', { error: error.message });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
