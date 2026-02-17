#!/usr/bin/env node
/**
 * Scrape latest jobs from pngworkforce.com
 * Only adds jobs not already in DB (checks title + company_name uniqueness)
 */
const https = require('https');
const db = require('../server/database');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractText(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ').trim();
}

function guessCategory(title) {
  const t = title.toLowerCase();
  if (/engineer|mechanic|electrical/i.test(t)) return { slug: 'engineering', id: 8 };
  if (/accountant|financ|audit/i.test(t)) return { slug: 'accounting', id: 1 };
  if (/admin|secretary|clerk/i.test(t)) return { slug: 'administration', id: 2 };
  if (/manag|director|executive|ceo/i.test(t)) return { slug: 'management-and-executive', id: 15 };
  if (/health|nurse|doctor|medical/i.test(t)) return { slug: 'health-and-medical', id: 10 };
  if (/teach|education|lecturer|trainer/i.test(t)) return { slug: 'education-and-training', id: 7 };
  if (/driver|logistics|warehouse|supply/i.test(t)) return { slug: 'manufacturing-and-logistics', id: 16 };
  if (/security|guard/i.test(t)) return { slug: 'security', id: 20 };
  if (/mining|geolog/i.test(t)) return { slug: 'mining-and-resources', id: 18 };
  if (/sale|marketing/i.test(t)) return { slug: 'marketing-and-sales', id: 17 };
  if (/it |software|developer|tech/i.test(t)) return { slug: 'ict-and-technology', id: 12 };
  if (/legal|law/i.test(t)) return { slug: 'legal-and-law', id: 14 };
  if (/hotel|tourism|hospitality|chef|cook/i.test(t)) return { slug: 'hospitality-and-tourism', id: 11 };
  if (/hr|human resource|recruit/i.test(t)) return { slug: 'hr-and-recruitment', id: 13 };
  if (/construct|building|carpenter|plumber/i.test(t)) return { slug: 'construction-and-trades', id: 6 };
  if (/bank/i.test(t)) return { slug: 'banking-and-finance', id: 3 };
  return { slug: 'administration', id: 2 };
}

async function scrapeListings() {
  console.log('Fetching pngworkforce.com job listings...');
  const html = await fetch('https://www.pngworkforce.com/search/jobs');

  // Extract job links - try multiple patterns
  const links = [];
  const linkRegex = /href="(\/job\/[^"]+)"/g;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const url = 'https://www.pngworkforce.com' + m[1];
    if (!links.includes(url)) links.push(url);
  }

  // Also try /jobs/ pattern
  const linkRegex2 = /href="(\/jobs\/[^"]+)"/g;
  while ((m = linkRegex2.exec(html)) !== null) {
    const url = 'https://www.pngworkforce.com' + m[1];
    if (!links.includes(url)) links.push(url);
  }

  console.log(`Found ${links.length} job links`);

  // Get existing jobs from pngworkforce source
  const existing = new Set();
  db.prepare("SELECT title, company_name FROM jobs WHERE source='pngworkforce'").all()
    .forEach(j => existing.add((j.title + '||' + (j.company_name || '')).toLowerCase()));

  const insert = db.prepare(`
    INSERT INTO jobs (title, description, requirements, location, country, job_type, experience_level,
      salary_currency, status, source, external_url, employer_id, company_name,
      category_slug, category_id, created_at, updated_at)
    VALUES (@title, @description, @requirements, @location, 'Papua New Guinea', @job_type, 'Mid-level',
      'PGK', 'active', 'pngworkforce', @external_url, 11, @company_name,
      @category_slug, @category_id, datetime('now'), datetime('now'))
  `);

  let added = 0, skipped = 0;

  for (const url of links.slice(0, 30)) { // Limit to 30 to be polite
    try {
      await new Promise(r => setTimeout(r, 1500)); // Rate limit
      const page = await fetch(url);

      // Extract title
      const titleMatch = page.match(/<h1[^>]*>(.*?)<\/h1>/is);
      const title = titleMatch ? extractText(titleMatch[1]) : null;
      if (!title) { skipped++; continue; }

      // Extract company
      const companyMatch = page.match(/company[^>]*>([^<]+)/i) ||
                           page.match(/employer[^>]*>([^<]+)/i) ||
                           page.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);
      const company_name = companyMatch ? extractText(companyMatch[1]) : 'PNG Workforce Listing';

      // Check duplicate
      const key = (title + '||' + company_name).toLowerCase();
      if (existing.has(key)) { skipped++; continue; }

      // Extract description
      const descMatch = page.match(/description[^>]*>([\s\S]*?)<\/div>/i) ||
                         page.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const description = descMatch ? extractText(descMatch[1]).slice(0, 3000) : title;

      // Extract location
      const locMatch = page.match(/location[^>]*>([^<]+)/i);
      const location = locMatch ? extractText(locMatch[1]) : 'Papua New Guinea';

      // Job type
      const ftMatch = page.match(/(full[- ]?time|part[- ]?time|contract|casual)/i);
      const job_type = ftMatch ? ftMatch[1].toLowerCase().replace(/\s+/g, '-') : 'full-time';

      const cat = guessCategory(title);

      insert.run({
        title, description, requirements: '', location, job_type,
        external_url: url, company_name,
        category_slug: cat.slug, category_id: cat.id,
      });
      existing.add(key);
      added++;
      console.log(`  + ${title} (${company_name})`);
    } catch (err) {
      console.error(`  ✗ Error fetching ${url}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}`);
}

scrapeListings().catch(err => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
