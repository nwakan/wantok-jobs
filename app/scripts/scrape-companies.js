#!/usr/bin/env node
/**
 * Multi-source company career page scraper for PNG & Pacific employers.
 * Each company has its own scraper function — easy to add more.
 *
 * Usage: node scripts/scrape-companies.js
 */

const https = require('https');
const http = require('http');
const db = require('../server/database');

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetch(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (WantokJobs/1.0; +https://wantokjobs.com)',
        'Accept': 'application/json, text/html, */*',
      },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetch(loc, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode >= 400) {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}`)));
        return;
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('Timeout')); });
  });
}

function stripHtml(html) {
  if (!html) return '';
  let t = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<li[^>]*>/gi, '• ');
  t = t.replace(/<\/h[1-6]>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  t = t.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 5000) t = t.substring(0, 5000) + '...';
  return t;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/pilot|aviat|cabin crew|flight|traffic.*porter|dispatch/i.test(t)) return 'transport-and-logistics';
  if (/ict|it |software|developer|data|cyber|network/i.test(t)) return 'ict-and-technology';
  if (/account|finance|budget|audit|tax/i.test(t)) return 'accounting-and-finance';
  if (/law|legal|justice|solicitor|compliance/i.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture|recruitment/i.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior|executive|ceo|cfo/i.test(t)) return 'management-and-executive';
  if (/education|training|teacher|lecturer/i.test(t)) return 'education-and-training';
  if (/engineer|construction|mechanic|electrician|technical/i.test(t)) return 'engineering';
  if (/communicat|marketing|sales|brand/i.test(t)) return 'marketing-and-sales';
  if (/health|nurse|medical|doctor|nutrition|safety/i.test(t)) return 'healthcare';
  if (/admin|assistant|secretary|office|clerk/i.test(t)) return 'admin-and-office-support';
  if (/mine|mining|geolog|drill/i.test(t)) return 'mining-and-resources';
  if (/store|inventor|warehouse|supply|logistics/i.test(t)) return 'transport-and-logistics';
  if (/ngo|volunteer|humanitarian|program/i.test(t)) return 'ngo-and-volunteering';
  return 'general';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Company Scrapers ─────────────────────────────────────────────────────────
// Each returns an array of job objects (may be empty).

/**
 * Air Niugini — Oracle HCM Cloud recruitment API
 * 6 active positions found via their REST API.
 */
async function scrapeAirNiugini() {
  const SOURCE = 'airniugini';
  const API_URL = 'https://iaahnf.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=50,sortBy=POSTING_DATES_DESC';
  const JOB_BASE = 'https://iaahnf.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/';

  try {
    const raw = await fetch(API_URL);
    const data = JSON.parse(raw);
    const jobs = [];

    const reqList = data.items?.[0]?.requisitionList || [];
    for (const req of reqList) {
      const location = req.secondaryLocations?.[0]?.Name || req.PrimaryLocation || 'Papua New Guinea';
      const description = [
        req.ShortDescriptionStr,
        req.ExternalResponsibilitiesStr,
        req.ExternalQualificationsStr,
      ].filter(Boolean).join('\n\n') || `${req.Title} — Position at Air Niugini, ${location}.`;

      jobs.push({
        title: req.Title,
        company_name: 'Air Niugini',
        location,
        country: 'PG',
        description: stripHtml(description),
        external_url: `${JOB_BASE}${req.Id}`,
        source: SOURCE,
        posted_date: req.PostedDate,
      });
    }

    return jobs;
  } catch (e) {
    console.error(`  [Air Niugini] Error: ${e.message}`);
    return [];
  }
}

/**
 * Ok Tedi Mining — SAP SuccessFactors (JS-rendered, limited scraping)
 * Falls back to HTML parsing; portal at career10.successfactors.com
 */
async function scrapeOkTedi() {
  const SOURCE = 'oktedi';
  const BASE = 'https://career10.successfactors.com';
  const URL = `${BASE}/career?company=oktedimini&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&_s.crb=`;
  try {
    const html = await fetch(URL);
    const jobs = [];

    // SuccessFactors is fully JS-rendered; try to find job links in the HTML
    const links = html.match(/career_job_req_id=(\d+)[^"']*/gi) || [];
    const seen = new Set();
    for (const link of links) {
      const idMatch = link.match(/career_job_req_id=(\d+)/);
      if (!idMatch || seen.has(idMatch[1])) continue;
      seen.add(idMatch[1]);
      // We can't get titles from JS-rendered page, skip silently
    }

    // If we find nothing (expected), log it
    if (jobs.length === 0) {
      console.log('  [Ok Tedi] SuccessFactors portal is JS-rendered; no jobs extractable via HTTP.');
      console.log('  [Ok Tedi] Portal: https://career10.successfactors.com/career?company=oktedimini');
    }

    return jobs;
  } catch (e) {
    console.error(`  [Ok Tedi] Error: ${e.message}`);
    return [];
  }
}

/**
 * Santos (formerly Oil Search) — corporate careers page.
 * Job search requires external ATS; we check main page for PNG-specific links.
 */
async function scrapeSantos() {
  const SOURCE = 'santos';
  const URL = 'https://www.santos.com/careers/';
  try {
    const html = await fetch(URL);
    const jobs = [];

    // Look for job links on the careers page
    const jobLinks = [...new Set(
      (html.match(/href="([^"]*(?:job|position|vacanc|opportunit)[^"]*)"/gi) || [])
        .map(m => m.match(/href="([^"]*)"/)[1])
        .filter(h => !h.includes('#') && h.length > 10)
        .map(h => h.startsWith('http') ? h : `https://www.santos.com${h}`)
    )];

    for (const jobUrl of jobLinks.slice(0, 10)) {
      try {
        const jobHtml = await fetch(jobUrl);
        const titleMatch = jobHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (!titleMatch) continue;
        const title = stripHtml(titleMatch[1]).trim();
        // Only include if PNG-related
        if (!/papua|png|port moresby|lae|tabubil/i.test(jobHtml)) continue;
        jobs.push({
          title,
          company_name: 'Santos (formerly Oil Search)',
          location: 'Papua New Guinea',
          country: 'PG',
          description: stripHtml(jobHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] || '').substring(0, 3000) || title,
          external_url: jobUrl,
          source: SOURCE,
        });
        await sleep(500);
      } catch (_) { /* skip */ }
    }

    if (jobs.length === 0) {
      console.log('  [Santos] No PNG-specific job links found on careers page.');
    }
    return jobs;
  } catch (e) {
    console.error(`  [Santos] Error: ${e.message}`);
    return [];
  }
}

/**
 * PNG Power — careers page at pngpower.com.pg/careers
 */
async function scrapePNGPower() {
  const SOURCE = 'pngpower';
  const URL = 'https://www.pngpower.com.pg/careers/';
  try {
    const html = await fetch(URL);
    const jobs = [];

    // Look for PDF links to job advertisements
    const pdfLinks = [...new Set(
      (html.match(/href="([^"]*\.pdf[^"]*)"/gi) || []).map(m => m.match(/href="([^"]*)"/)[1])
    )];
    for (const href of pdfLinks) {
      const filename = decodeURIComponent(href.split('/').pop().replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ')).trim();
      if (filename.length > 5) {
        const fullUrl = href.startsWith('http') ? href : `https://www.pngpower.com.pg${href}`;
        jobs.push({
          title: filename,
          company_name: 'PNG Power Ltd',
          location: 'Papua New Guinea',
          country: 'PG',
          description: `${filename} — Job vacancy at PNG Power Ltd, Papua New Guinea.`,
          external_url: fullUrl,
          source: SOURCE,
        });
      }
    }

    // Also look for job-specific links (non-PDF)
    const jobLinks = html.match(/href="([^"]*(?:vacanc|job|position|career)[^"]*)"[^>]*>[^<]+/gi) || [];
    for (const link of jobLinks) {
      const href = link.match(/href="([^"]*)"/)?.[1];
      const text = link.match(/>([^<]+)/)?.[1]?.trim();
      if (href && text && text.length > 5 && !/careers?\/?$/i.test(href)) {
        const fullUrl = href.startsWith('http') ? href : `https://www.pngpower.com.pg${href}`;
        jobs.push({
          title: text,
          company_name: 'PNG Power Ltd',
          location: 'Papua New Guinea',
          country: 'PG',
          description: `${text} — Position at PNG Power Ltd.`,
          external_url: fullUrl,
          source: SOURCE,
        });
      }
    }

    if (jobs.length === 0) {
      console.log('  [PNG Power] No current job listings found on careers page.');
    }
    return jobs;
  } catch (e) {
    console.error(`  [PNG Power] Error: ${e.message}`);
    return [];
  }
}

/**
 * NAC — National Airports Corporation vacancies page
 */
async function scrapeNAC() {
  const SOURCE = 'nac';
  const URL = 'https://nac.com.pg/current-vacancies/';
  try {
    const html = await fetch(URL);
    if (/no vacanc|currently no/i.test(stripHtml(html))) {
      console.log('  [NAC] No current vacancies listed.');
      return [];
    }

    const jobs = [];
    const articles = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
    for (const article of articles) {
      const titleMatch = article.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i);
      if (titleMatch) {
        const title = stripHtml(titleMatch[1]).trim();
        const linkMatch = article.match(/href="([^"]*)"/i);
        jobs.push({
          title,
          company_name: 'National Airports Corporation',
          location: 'Papua New Guinea',
          country: 'PG',
          description: stripHtml(article),
          external_url: linkMatch ? linkMatch[1] : URL,
          source: SOURCE,
        });
      }
    }
    return jobs;
  } catch (e) {
    console.error(`  [NAC] Error: ${e.message}`);
    return [];
  }
}

/**
 * NASFUND — career opportunities (often blocked by WAF)
 */
async function scrapeNasfund() {
  const SOURCE = 'nasfund';
  const URL = 'https://www.nasfund.com.pg/careers';
  try {
    const html = await fetch(URL);
    const jobs = [];

    const blocks = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) ||
                   html.match(/<div[^>]*class="[^"]*(?:vacancy|career|job)[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];

    for (const block of blocks) {
      const titleMatch = block.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i);
      if (titleMatch) {
        const title = stripHtml(titleMatch[1]).trim();
        if (title.length > 5) {
          const linkMatch = block.match(/href="([^"]*)"/i);
          jobs.push({
            title,
            company_name: 'NASFUND',
            location: 'Port Moresby, Papua New Guinea',
            country: 'PG',
            description: stripHtml(block),
            external_url: linkMatch ? linkMatch[1] : URL,
            source: SOURCE,
          });
        }
      }
    }

    if (jobs.length === 0) {
      console.log('  [NASFUND] No job listings found (site may block automated access).');
    }
    return jobs;
  } catch (e) {
    console.error(`  [NASFUND] Error: ${e.message}`);
    return [];
  }
}

/**
 * Solomon Star News — vacancies section (WordPress)
 */
async function scrapeSolomonStar() {
  const SOURCE = 'solomonstar';
  const URL = 'https://www.solomonstarnews.com/vacancies/';
  try {
    const html = await fetch(URL);
    const jobs = [];

    const articles = html.match(/<article[^>]*>[\s\S]*?<\/article>/gi) || [];
    for (const article of articles) {
      const titleMatch = article.match(/<h[2-4][^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/i);
      if (titleMatch) {
        const jobUrl = titleMatch[1];
        const title = stripHtml(titleMatch[2]).trim();
        if (title.length > 5) {
          jobs.push({
            title,
            company_name: 'Various (Solomon Islands)',
            location: 'Solomon Islands',
            country: 'SB',
            description: stripHtml(article).substring(0, 3000),
            external_url: jobUrl,
            source: SOURCE,
          });
        }
      }
    }

    if (jobs.length === 0) {
      console.log('  [Solomon Star] No vacancy listings found on page.');
    }
    return jobs;
  } catch (e) {
    console.error(`  [Solomon Star] Error: ${e.message}`);
    return [];
  }
}

// ── Registry of all scrapers ─────────────────────────────────────────────────
// Add new companies here — just create a function and add to this array.

const SCRAPERS = [
  { name: 'Air Niugini', fn: scrapeAirNiugini },
  { name: 'Ok Tedi Mining', fn: scrapeOkTedi },
  { name: 'Santos (Oil Search)', fn: scrapeSantos },
  { name: 'PNG Power', fn: scrapePNGPower },
  { name: 'NAC', fn: scrapeNAC },
  { name: 'NASFUND', fn: scrapeNasfund },
  { name: 'Solomon Star', fn: scrapeSolomonStar },
];

// ── Database setup ───────────────────────────────────────────────────────────

const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

const checkDuplicate = db.prepare(
  "SELECT id FROM jobs WHERE title = ? AND company_name = ? AND source = ?"
);

const insertJob = db.prepare(`
  INSERT INTO jobs (employer_id, title, description, company_name, location, country, job_type,
    experience_level, source, external_url, category_slug, category_id, status, salary_currency,
    created_at, updated_at)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== WantokJobs Multi-Source Company Scraper ===\n');
  console.log('Sources checked:');
  console.log('  ✓ Air Niugini (Oracle HCM API)');
  console.log('  ○ Ok Tedi Mining (SuccessFactors — JS only)');
  console.log('  ○ Santos/Oil Search (external ATS)');
  console.log('  ○ PNG Power (static careers page)');
  console.log('  ○ NAC (vacancies page)');
  console.log('  ○ NASFUND (WAF-protected)');
  console.log('  ○ Solomon Star (WordPress vacancies)');
  console.log('  ✗ BSP Financial Group (DNS unreachable)');
  console.log('  ✗ Digicel PNG (redirects to region selector)');
  console.log('  ✗ Kumul Petroleum (DNS unreachable)');
  console.log('  ✗ Steamships Trading (site blocks extraction)');
  console.log('  ✗ careers.gov.fj (DNS unreachable)');
  console.log('');

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const results = [];

  for (const scraper of SCRAPERS) {
    console.log(`▸ Scraping ${scraper.name}...`);
    let added = 0, skipped = 0;

    try {
      const jobs = await scraper.fn();
      if (jobs.length > 0) {
        console.log(`  Found ${jobs.length} listing(s).`);
      }

      for (const job of jobs) {
        // Duplicate check by title + company + source
        const exists = checkDuplicate.get(job.title, job.company_name, job.source);
        if (exists) {
          console.log(`  Skip (exists): ${job.title}`);
          skipped++;
          continue;
        }

        const catSlug = categorizeJob(job.title);
        const catId = slugToId[catSlug] || null;

        insertJob.run(
          job.title,
          job.description || `${job.title} — Position at ${job.company_name}.`,
          job.company_name,
          job.location || 'Papua New Guinea',
          job.country || 'PG',
          'full-time',
          'Mid Level',
          job.source,
          job.external_url,
          catSlug,
          catId,
          'active',
          job.country === 'SB' ? 'SBD' : 'PGK'
        );

        console.log(`  ✓ Added: ${job.title} [${catSlug}]`);
        added++;
      }
    } catch (e) {
      console.error(`  ✗ Scraper failed: ${e.message}`);
      totalErrors++;
    }

    results.push({ name: scraper.name, added, skipped });
    totalAdded += added;
    totalSkipped += skipped;

    await sleep(1000); // polite delay between companies
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    if (r.added > 0 || r.skipped > 0) {
      console.log(`  ${r.name}: +${r.added} new, ${r.skipped} skipped`);
    }
  }
  console.log(`\nTotal: ${totalAdded} added, ${totalSkipped} skipped, ${totalErrors} errors`);
}

main().catch(console.error);
