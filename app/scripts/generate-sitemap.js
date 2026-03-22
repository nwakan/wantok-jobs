#!/usr/bin/env node
/**
 * WantokJobs Sitemap Generator
 * Generates sitemap.xml with updated /employers URLs
 * Usage: node generate-sitemap.js > server/public/sitemap.xml
 */

const baseUrl = 'https://wantokjobs.com';
const now = new Date().toISOString().split('T')[0];

const urls = [
  // Main pages (daily updates)
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/jobs', changefreq: 'daily', priority: 0.9 },
  { loc: '/employers', changefreq: 'daily', priority: 0.9 },
  { loc: '/training', changefreq: 'weekly', priority: 0.8 },

  // Features
  { loc: '/features', changefreq: 'monthly', priority: 0.7 },
  { loc: '/pricing', changefreq: 'monthly', priority: 0.8 },
  { loc: '/transparency', changefreq: 'weekly', priority: 0.8 },

  // Information pages
  { loc: '/about', changefreq: 'monthly', priority: 0.6 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.6 },
  { loc: '/faq', changefreq: 'monthly', priority: 0.6 },
  { loc: '/help', changefreq: 'monthly', priority: 0.6 },

  // Resources
  { loc: '/blog', changefreq: 'weekly', priority: 0.7 },
  { loc: '/career-insights', changefreq: 'weekly', priority: 0.7 },
  { loc: '/success-stories', changefreq: 'monthly', priority: 0.6 },

  // Tools
  { loc: '/salary-calculator', changefreq: 'monthly', priority: 0.7 },
  { loc: '/resume-builder', changefreq: 'monthly', priority: 0.7 },

  // Legal
  { loc: '/terms', changefreq: 'yearly', priority: 0.3 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },

  // Auth pages (lower priority)
  { loc: '/login', changefreq: 'yearly', priority: 0.2 },
  { loc: '/register', changefreq: 'yearly', priority: 0.2 },
];

// Generate XML
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
];

urls.forEach(url => {
  xml.push('  <url>');
  xml.push(`    <loc>${baseUrl}${url.loc}</loc>`);
  xml.push(`    <lastmod>${now}</lastmod>`);
  xml.push(`    <changefreq>${url.changefreq}</changefreq>`);
  xml.push(`    <priority>${url.priority}</priority>`);
  xml.push('  </url>');
});

xml.push('</urlset>');

console.log(xml.join('\n'));
