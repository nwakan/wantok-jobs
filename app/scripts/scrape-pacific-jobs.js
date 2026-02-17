#!/usr/bin/env node
/**
 * Scrape Pacific Island jobs from ReliefWeb for Fiji, Solomon Islands,
 * Vanuatu, Samoa, and Tonga.
 *
 * ReliefWeb is the most reliable, scrapeable source of Pacific regional jobs.
 * Country codes: Fiji=C90, Solomon Islands=C215, Vanuatu=C249, Samoa=C204, Tonga=C233
 *
 * Usage: node scripts/scrape-pacific-jobs.js [--dry-run]
 */

const https = require('https');
const db = require('../server/database');

const DRY_RUN = process.argv.includes('--dry-run');

const COUNTRIES = [
  { name: 'Fiji',            code: 'FJ', rwFilter: 'C90',  rwLabel: 'Fiji' },
  { name: 'Solomon Islands', code: 'SB', rwFilter: 'C215', rwLabel: 'Solomon Islands' },
  { name: 'Vanuatu',         code: 'VU', rwFilter: 'C249', rwLabel: 'Vanuatu' },
  { name: 'Samoa',           code: 'WS', rwFilter: 'C204', rwLabel: 'Samoa' },
  { name: 'Tonga',           code: 'TO', rwFilter: 'C233', rwLabel: 'Tonga' },
];

// ── helpers ────────────────────────────────────────────────

function fetch(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : require('http').get;
    get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (WantokJobs/1.0)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function stripHtml(html) {
  if (!html) return '';
  let t = html;
  t = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<li[^>]*>/gi, '• ');
  t = t.replace(/<\/h[1-6]>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  t = t.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
  t = t.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rsquo;/g, "'");
  t = t.replace(/&lsquo;/g, "'").replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"');
  t = t.replace(/&#\d+;/g, '');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 5000) t = t.substring(0, 5000) + '...';
  return t;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/ict|it |tech|software|developer|data|digital/.test(t)) return 'ict-and-technology';
  if (/law|legal|justice|solicitor/.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture|recruitment/.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior|executive|head of|chief|coordinator/.test(t)) return 'management-and-executive';
  if (/education|training|teacher|learner|curriculum|assessment/.test(t)) return 'education-and-training';
  if (/engineer|construction/.test(t)) return 'engineering';
  if (/communicat|marketing|media/.test(t)) return 'marketing-and-sales';
  if (/finance|accountant|budget|procurement/.test(t)) return 'accounting';
  if (/health|nurse|medical|doctor|nutrition/.test(t)) return 'health-and-medical';
  if (/admin|assistant|secretary|office|support/.test(t)) return 'administration';
  if (/ngo|volunteer|humanitarian|relief|aid|development|program/.test(t)) return 'ngo-and-volunteering';
  if (/environment|climate|conservation|biodiversity/.test(t)) return 'community-and-development';
  return 'other';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── scrape a single ReliefWeb job page ─────────────────────

async function scrapeJobPage(url, country) {
  try {
    const html = await fetch(url);

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<title>([^|<]+)/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s*[-–|].*$/, '') : null;
    if (!title) return null;

    const orgMatch = html.match(/Organization[^<]*<[^>]*>[^<]*<a[^>]*>([^<]+)/i) ||
                     html.match(/source[^<]*<[^>]*>([^<]+)/i);
    const company_name = orgMatch ? orgMatch[1].trim() : 'International Organization';

    const closingMatch = html.match(/Closing date[^<]*<[^>]*>([^<]+)/i);
    const application_deadline = closingMatch ? closingMatch[1].trim() : null;

    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    let description = bodyMatch ? stripHtml(bodyMatch[1]) : '';
    if (description.length < 100) {
      description = `${title}\n\nPosition in ${country.name} with ${company_name}.\nFor full details visit ReliefWeb.`;
    }

    return {
      title,
      description,
      company_name,
      location: country.name,
      country: country.code,
      job_type: 'full-time',
      experience_level: 'Mid Level',
      source: 'reliefweb-pacific',
      external_url: url,
      category_slug: categorizeJob(title),
      application_deadline,
      status: 'active',
    };
  } catch (e) {
    console.error(`  ✗ Error scraping ${url}: ${e.message}`);
    return null;
  }
}

// ── scrape listing for one country ─────────────────────────

async function scrapeCountry(country) {
  const listUrl = `https://reliefweb.int/jobs?advanced-search=%28${country.rwFilter}%29`;
  console.log(`\n🌊 ${country.name} — ${listUrl}`);

  let html;
  try {
    html = await fetch(listUrl);
  } catch (e) {
    console.error(`  ✗ Failed to fetch listing: ${e.message}`);
    return 0;
  }

  // Extract job URLs
  const urls = [...new Set(
    (html.match(/https:\/\/reliefweb\.int\/job\/[0-9]+\/[^"'<\s]+/g) || [])
  )];

  console.log(`  Found ${urls.length} job URL(s)`);
  if (!urls.length) return 0;

  let added = 0;
  for (const url of urls) {
    if (existing.has(url)) {
      console.log(`  ⏭  Skip (exists): ${url.split('/').pop()}`);
      continue;
    }

    const job = await scrapeJobPage(url, country);
    if (!job) { console.log(`  ✗ Failed: ${url}`); continue; }

    if (DRY_RUN) {
      console.log(`  🔍 [dry-run] ${job.title} @ ${job.company_name}`);
      added++;
      continue;
    }

    const catId = slugToId[job.category_slug] || null;
    insertJob.run(
      job.title, job.description, job.company_name, job.location, job.country,
      job.job_type, job.experience_level, job.source, job.external_url,
      job.category_slug, catId, job.application_deadline, job.status,
    );
    console.log(`  ✓ Added: ${job.title} [${job.category_slug}]`);
    added++;

    await sleep(800); // polite delay
  }

  return added;
}

// ── DB setup ───────────────────────────────────────────────

const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

const insertJob = db.prepare(`
  INSERT INTO jobs (employer_id, title, description, company_name, location, country, job_type, experience_level,
    source, external_url, category_slug, category_id, application_deadline, status, created_at, updated_at)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const existing = new Set(
  db.prepare("SELECT external_url FROM jobs WHERE source IN ('reliefweb-pacific', 'reliefweb')").all().map(r => r.external_url)
);

// ── main ───────────────────────────────────────────────────

async function main() {
  console.log(`🏝️  Pacific Islands Job Scraper${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`   Existing ReliefWeb jobs in DB: ${existing.size}`);

  const results = {};
  let total = 0;

  for (const country of COUNTRIES) {
    const added = await scrapeCountry(country);
    results[country.name] = added;
    total += added;
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Results:');
  for (const [name, count] of Object.entries(results)) {
    console.log(`   ${name}: ${count} new job(s)`);
  }
  console.log(`   TOTAL: ${total} new job(s)${DRY_RUN ? ' (dry run)' : ' added'}`);
}

main().catch(console.error);
