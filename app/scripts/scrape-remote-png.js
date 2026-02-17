#!/usr/bin/env node
/**
 * Remote Jobs Scraper for Papua New Guineans
 *
 * Scrapes remote/online jobs from multiple sources that PNG residents can do:
 *   1. RemoteOK API — worldwide remote jobs (JSON API)
 *   2. WeWorkRemotely RSS — "Anywhere in the World" region jobs
 *   3. ReliefWeb — remote/Pacific development sector jobs
 *   4. Devex — Pacific Islands development jobs
 *
 * Focuses on roles accessible to PNG residents: data entry, customer service,
 * virtual assistant, content writing, translation (Tok Pisin!), transcription,
 * development sector, and tech roles open worldwide.
 *
 * Usage: node scripts/scrape-remote-png.js
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
        'Accept': 'application/json, application/rss+xml, text/html, */*',
      },
      timeout: 20000,
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
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`)));
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
  // Remove spam text injected by RemoteOK
  t = t.replace(/Please mention the word.*$/s, '').trim();
  if (t.length > 5000) t = t.substring(0, 5000) + '...';
  return t;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/translat|interpret|tok pisin|language/.test(t)) return 'admin-and-office-support';
  if (/virtual assistant|va |data entry|transcri/.test(t)) return 'admin-and-office-support';
  if (/customer.*service|support.*agent|help.*desk/.test(t)) return 'admin-and-office-support';
  if (/content.*writ|copywriter|editor|blog/.test(t)) return 'marketing-and-sales';
  if (/ict|it |tech|software|developer|data.*engineer|devops|full.?stack|back.?end|front.?end|cyber|network/.test(t)) return 'ict-and-technology';
  if (/design|graphic|ui|ux|creative/.test(t)) return 'ict-and-technology';
  if (/law|legal|justice|solicitor|compliance/.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture|recruitment/.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior|executive|ceo|cfo|head of/.test(t)) return 'management-and-executive';
  if (/education|training|teacher|lecturer|tutor/.test(t)) return 'education-and-training';
  if (/engineer|construction|mechanic/.test(t)) return 'engineering';
  if (/communicat|marketing|sales|brand|seo|growth/.test(t)) return 'marketing-and-sales';
  if (/finance|account|budget|audit|tax|bookkeep/.test(t)) return 'accounting-and-finance';
  if (/health|nurse|medical|doctor|nutrition/.test(t)) return 'healthcare';
  if (/admin|assistant|secretary|office|clerk/.test(t)) return 'admin-and-office-support';
  if (/ngo|volunteer|humanitarian|program|development|pacific|aid/.test(t)) return 'ngo-and-volunteering';
  if (/project|coordinator|facilitator/.test(t)) return 'ngo-and-volunteering';
  return 'general';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── DB Setup ─────────────────────────────────────────────────────────────────

const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

const checkDuplicate = db.prepare(
  "SELECT id FROM jobs WHERE title = ? AND company_name = ? AND source = ?"
);
const checkDuplicateUrl = db.prepare(
  "SELECT id FROM jobs WHERE external_url = ? AND source = ?"
);

const insertJob = db.prepare(`
  INSERT INTO jobs (employer_id, title, description, company_name, location, country, job_type, experience_level,
    source, external_url, category_slug, category_id, status, salary_currency, salary_min, salary_max,
    remote_work, created_at, updated_at)
  VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'USD', ?, ?, 1, datetime('now'), datetime('now'))
`);

// ── Keywords for PNG-relevant remote jobs ────────────────────────────────────

const PNG_RELEVANT_KEYWORDS = [
  // Freelance/gig work accessible from PNG
  'data entry', 'virtual assistant', 'customer service', 'customer support',
  'content writ', 'copywriter', 'transcri', 'translat',
  // Pacific/development sector
  'pacific', 'oceania', 'tok pisin', 'pidgin',
  // General remote-friendly roles
  'remote', 'anywhere', 'worldwide',
];

// Roles that are typically accessible globally
const ACCESSIBLE_ROLE_PATTERNS = [
  /data.?entry/i, /virtual.?assistant/i, /customer.?(service|support)/i,
  /content.?writ/i, /copywriter/i, /transcri/i, /translat/i,
  /bookkeep/i, /social.?media/i, /community.?manager/i,
  /tutor/i, /teacher.*online/i, /graphic.?design/i,
  /web.?develop/i, /software/i, /developer/i, /qa|test/i,
  /project.?manage/i, /admin.*assist/i, /executive.*assist/i,
  /support.*agent/i, /help.*desk/i, /moderator/i,
];

function isRelevantForPNG(job) {
  const text = `${job.title} ${job.description || ''} ${job.location || ''}`.toLowerCase();

  // Direct Pacific/PNG mention = always relevant
  if (/papua|png|pacific.*island|oceania|melanesia|tok.?pisin/.test(text)) return true;

  // "Anywhere in the world" / worldwide + accessible role type
  if (/anywhere|worldwide|global|all.?countries/.test(text)) {
    return ACCESSIBLE_ROLE_PATTERNS.some(p => p.test(job.title));
  }

  return false;
}

// ── Source Scrapers ──────────────────────────────────────────────────────────

/**
 * RemoteOK JSON API — filter for worldwide jobs in PNG-accessible categories
 */
async function scrapeRemoteOK() {
  console.log('\n▸ Scraping RemoteOK API...');
  const raw = await fetch('https://remoteok.com/api');
  const data = JSON.parse(raw);

  // First item is legal notice
  const jobs = data.slice(1);
  console.log(`  Fetched ${jobs.length} total remote jobs`);

  const relevant = [];
  for (const j of jobs) {
    const job = {
      title: j.position || '',
      company_name: j.company || 'Unknown',
      description: stripHtml(j.description || ''),
      external_url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
      location: j.location || 'Remote — Worldwide',
      salary_min: j.salary_min || null,
      salary_max: j.salary_max || null,
      source: 'remoteok',
    };

    if (!job.title) continue;

    // Check if it's accessible from PNG
    if (isRelevantForPNG(job)) {
      job.location = 'Remote — Open to PNG';
      relevant.push(job);
    }
  }

  console.log(`  ${relevant.length} jobs relevant for PNG residents`);
  return relevant;
}

/**
 * WeWorkRemotely RSS — filter for "Anywhere in the World" region
 */
async function scrapeWeWorkRemotely() {
  console.log('\n▸ Scraping WeWorkRemotely RSS...');
  const xml = await fetch('https://weworkremotely.com/remote-jobs.rss');

  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };

    const region = get('region');
    const title = get('title');
    const link = block.match(/<link>\s*(https?[^\s<]+)/)?.[1] || '';
    const description = stripHtml(get('description'));
    const category = get('category');
    const type = get('type');

    // Extract company from title format "Company: Job Title"
    let company = 'Unknown';
    let jobTitle = title;
    const colonIdx = title.indexOf(':');
    if (colonIdx > 0) {
      company = title.substring(0, colonIdx).trim();
      jobTitle = title.substring(colonIdx + 1).trim();
    }

    items.push({
      title: jobTitle,
      company_name: company,
      description,
      external_url: link,
      location: region || 'Remote',
      source: 'weworkremotely',
      wwr_category: category,
      wwr_type: type,
      salary_min: null,
      salary_max: null,
    });
  }

  console.log(`  Fetched ${items.length} total jobs from RSS`);

  // Filter: "Anywhere in the World" + accessible roles
  const relevant = items.filter(j => {
    const loc = (j.location || '').toLowerCase();
    if (!/anywhere/.test(loc)) return false;
    return ACCESSIBLE_ROLE_PATTERNS.some(p => p.test(j.title));
  });

  for (const j of relevant) {
    j.location = 'Remote — Open to PNG';
  }

  console.log(`  ${relevant.length} jobs relevant for PNG residents`);
  return relevant;
}

/**
 * ReliefWeb API — remote jobs mentioning Pacific region
 */
async function scrapeReliefWebRemote() {
  console.log('\n▸ Scraping ReliefWeb for remote Pacific jobs...');

  // Scrape ReliefWeb search results page for remote Pacific jobs
  const searches = [
    'https://reliefweb.int/jobs?search=pacific+remote',
    'https://reliefweb.int/jobs?search=oceania+remote',
  ];

  try {
    const jobs = [];
    const seen = new Set();

    for (const searchUrl of searches) {
      const html = await fetch(searchUrl);
      // Extract job URLs
      const urls = [...new Set(
        (html.match(/https:\/\/reliefweb\.int\/job\/[0-9]+\/[^"'<\s]+/g) || [])
      )];
      console.log(`  Found ${urls.length} URLs from ${searchUrl.split('?')[1]}`);

      for (const url of urls.slice(0, 15)) { // limit to 15 per search
        if (seen.has(url)) continue;
        seen.add(url);

        try {
          const jobHtml = await fetch(url);
          const titleMatch = jobHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i) || jobHtml.match(/<title>([^|<]+)/i);
          const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|.*$/, '') : null;
          if (!title) continue;

          const orgMatch = jobHtml.match(/Organization[^<]*<[^>]*>\s*(?:<[^>]*>)*\s*([^<]+)/i) ||
                           jobHtml.match(/class="[^"]*source[^"]*"[^>]*>([^<]+)/i) ||
                           jobHtml.match(/<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i);
          const org = (orgMatch ? orgMatch[1].trim() : '') || 'International Organization';

          const bodyMatch = jobHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
          const desc = bodyMatch ? stripHtml(bodyMatch[1]) : `${title} — Remote Pacific region position with ${org}.`;

          jobs.push({
            title, company_name: org,
            description: desc.length > 50 ? desc : `${title} — Remote Pacific position with ${org}. Visit ReliefWeb for details.`,
            external_url: url,
            location: 'Remote — Pacific Region',
            source: 'reliefweb-remote',
            salary_min: null, salary_max: null,
          });

          await sleep(1000);
        } catch (e) {
          console.error(`    Failed: ${url.split('/').pop()} — ${e.message}`);
        }
      }
    }

    console.log(`  ${jobs.length} Pacific remote jobs found`);
    return jobs;
  } catch (e) {
    console.error(`  ReliefWeb error: ${e.message}`);
    return [];
  }
}

/**
 * Devex — Pacific Islands development jobs
 */
async function scrapeDevex() {
  console.log('\n▸ Scraping Devex for Pacific jobs...');

  try {
    const html = await fetch('https://www.devex.com/jobs/search?query=pacific+islands+remote');

    // Try to extract job listings from HTML
    const jobs = [];
    const linkRegex = /href="(\/jobs\/[^"]+)"/g;
    const titleRegex = /<a[^>]*href="\/jobs\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;

    let m;
    while ((m = titleRegex.exec(html)) !== null) {
      const url = `https://www.devex.com/jobs/${m[1]}`;
      const title = m[2].trim();
      if (title.length < 5 || /search|filter|page|post a job|sign|log in/i.test(title)) continue;

      jobs.push({
        title,
        company_name: 'Development Sector',
        description: `${title} — Pacific Islands development sector position. Visit Devex for full details.`,
        external_url: url,
        location: 'Remote — Pacific Region',
        source: 'devex',
        salary_min: null,
        salary_max: null,
      });
    }

    console.log(`  ${jobs.length} Devex jobs found`);
    return jobs;
  } catch (e) {
    console.error(`  Devex error: ${e.message}`);
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const SCRAPERS = [
  { name: 'RemoteOK', fn: scrapeRemoteOK },
  { name: 'WeWorkRemotely', fn: scrapeWeWorkRemotely },
  { name: 'ReliefWeb Remote', fn: scrapeReliefWebRemote },
  { name: 'Devex Pacific', fn: scrapeDevex },
];

async function main() {
  console.log('=== WantokJobs Remote Jobs Scraper for PNG Residents ===');
  console.log('Finding remote/online work accessible from Papua New Guinea\n');

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const results = [];

  for (const scraper of SCRAPERS) {
    let added = 0, skipped = 0;

    try {
      const jobs = await scraper.fn();

      for (const job of jobs) {
        // Dedup by URL first, then by title+company+source
        if (job.external_url && checkDuplicateUrl.get(job.external_url, job.source)) {
          skipped++;
          continue;
        }
        if (checkDuplicate.get(job.title, job.company_name, job.source)) {
          skipped++;
          continue;
        }

        const catSlug = categorizeJob(job.title);
        const catId = slugToId[catSlug] || null;

        insertJob.run(
          job.title,
          job.description,
          job.company_name,
          job.location,
          'PG',          // country — listed under PNG since targeted at PNG residents
          'contract',    // most remote jobs are contract/freelance
          'Entry Level', // accessible entry point
          job.source,
          job.external_url,
          catSlug,
          catId,
          job.salary_min || null,
          job.salary_max || null,
        );

        console.log(`  ✓ ${job.title} @ ${job.company_name} [${catSlug}]`);
        added++;
      }
    } catch (e) {
      console.error(`  ✗ ${scraper.name} failed: ${e.message}`);
      totalErrors++;
    }

    results.push({ name: scraper.name, added, skipped });
    totalAdded += added;
    totalSkipped += skipped;

    await sleep(2000); // polite delay between sources
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.name}: +${r.added} new, ${r.skipped} skipped`);
  }
  console.log(`\nTotal: ${totalAdded} added, ${totalSkipped} skipped, ${totalErrors} errors`);
  console.log('\n🌏 Remote jobs for PNG residents updated!');
}

main().catch(console.error);
