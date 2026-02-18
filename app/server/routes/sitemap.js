const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');

// Cache for sitemap data (1 hour)
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Main sitemap index
router.get('/sitemap.xml', (req, res) => {
  try {
    const cached = getCached('sitemap-index');
    if (cached) {
      return res.type('application/xml').send(cached);
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    const now = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-jobs.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-companies.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

    setCache('sitemap-index', xml);
    res.type('application/xml').send(xml);
  } catch (error) {
    logger.error('Sitemap index error', { error: error.message });
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
});

// Static pages sitemap
router.get('/sitemap-pages.xml', (req, res) => {
  try {
    const cached = getCached('sitemap-pages');
    if (cached) {
      return res.type('application/xml').send(cached);
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    const now = new Date().toISOString().split('T')[0];

    const pages = [
      { url: '/', changefreq: 'daily', priority: '1.0' },
      { url: '/jobs', changefreq: 'hourly', priority: '0.9' },
      { url: '/companies', changefreq: 'daily', priority: '0.8' },
      { url: '/categories', changefreq: 'weekly', priority: '0.7' },
      { url: '/about', changefreq: 'monthly', priority: '0.6' },
      { url: '/transparency', changefreq: 'monthly', priority: '0.6' },
      { url: '/career-insights', changefreq: 'weekly', priority: '0.7' },
      { url: '/features', changefreq: 'monthly', priority: '0.6' },
      { url: '/pricing', changefreq: 'monthly', priority: '0.7' },
      { url: '/blog', changefreq: 'daily', priority: '0.7' },
      { url: '/training', changefreq: 'weekly', priority: '0.6' },
      { url: '/salary-calculator', changefreq: 'monthly', priority: '0.6' },
      { url: '/success-stories', changefreq: 'weekly', priority: '0.6' },
      { url: '/contact', changefreq: 'monthly', priority: '0.5' },
      { url: '/faq', changefreq: 'monthly', priority: '0.5' },
      { url: '/help', changefreq: 'monthly', priority: '0.5' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const page of pages) {
      xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Add category pages
    const categories = db.prepare('SELECT slug FROM categories').all();
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${baseUrl}/category/${cat.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Add blog articles
    const articles = db.prepare(`
      SELECT slug, COALESCE(published_at, created_at) as last_mod 
      FROM articles 
      WHERE status = 'published' 
      ORDER BY created_at DESC 
      LIMIT 500
    `).all();

    for (const article of articles) {
      const lastmod = article.last_mod ? article.last_mod.split('T')[0] : now;
      xml += `
  <url>
    <loc>${baseUrl}/blog/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    setCache('sitemap-pages', xml);
    res.type('application/xml').send(xml);
  } catch (error) {
    logger.error('Sitemap pages error', { error: error.message });
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
});

// Jobs sitemap
router.get('/sitemap-jobs.xml', (req, res) => {
  try {
    const cached = getCached('sitemap-jobs');
    if (cached) {
      return res.type('application/xml').send(cached);
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    const now = new Date().toISOString().split('T')[0];

    const jobs = db.prepare(`
      SELECT id, title, updated_at 
      FROM jobs 
      WHERE status = 'active' 
      ORDER BY updated_at DESC 
      LIMIT 10000
    `).all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const job of jobs) {
      const lastmod = job.updated_at ? job.updated_at.split('T')[0] : now;
      xml += `
  <url>
    <loc>${baseUrl}/jobs/${job.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    setCache('sitemap-jobs', xml);
    res.type('application/xml').send(xml);
  } catch (error) {
    logger.error('Sitemap jobs error', { error: error.message });
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
});

// Companies sitemap
router.get('/sitemap-companies.xml', (req, res) => {
  try {
    const cached = getCached('sitemap-companies');
    if (cached) {
      return res.type('application/xml').send(cached);
    }

    const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
    const now = new Date().toISOString().split('T')[0];

    const companies = db.prepare(`
      SELECT id, updated_at 
      FROM users 
      WHERE role = 'employer' 
      AND COALESCE(account_status, 'active') = 'active'
      ORDER BY updated_at DESC 
      LIMIT 5000
    `).all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    for (const company of companies) {
      const lastmod = company.updated_at ? company.updated_at.split('T')[0] : now;
      xml += `
  <url>
    <loc>${baseUrl}/companies/${company.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    setCache('sitemap-companies', xml);
    res.type('application/xml').send(xml);
  } catch (error) {
    logger.error('Sitemap companies error', { error: error.message });
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
  }
});

module.exports = router;
