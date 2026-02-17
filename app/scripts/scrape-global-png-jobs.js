#!/usr/bin/env node
/**
 * Global PNG Job Scraper — International Organizations & Mining
 *
 * Scrapes multiple international sources for jobs related to Papua New Guinea:
 *   - ReliefWeb (HTML listing + individual pages)
 *   - UNDP (HTML listing)
 *   - Devex (HTML listing)
 *   - UNJobs (HTML listing)
 *   - WHO Careers
 *   - Newmont (mining)
 *   - Santos/Oil Search (energy)
 *
 * Uses raw HTTP fetching and HTML parsing — no browser required.
 */

const https = require('https');
const http = require('http');
const db = require('../server/database');

// ─── Helpers ────────────────────────────────────────────────────────────────

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      ...opts.headers,
    };
    const req = mod.get(url, { headers, timeout: 15000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetch(loc, opts).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fetchJson(url) {
  return fetch(url, { headers: { Accept: 'application/json' } }).then(JSON.parse);
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
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  return t.length > 5000 ? t.substring(0, 5000) + '...' : t;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/ict|it |tech|software|developer|data\s|digital|cyber/.test(t)) return 'ict-and-technology';
  if (/law|legal|justice|solicitor|compliance/.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture|recruitment/.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior.*coordinator|executive|chief|head of/.test(t)) return 'management-and-executive';
  if (/education|training|teacher|lecturer|learner|wellbeing/.test(t)) return 'education-and-training';
  if (/engineer|construction|highway|infrastructure|surveyor/.test(t)) return 'engineering';
  if (/communicat|marketing|media|journalist/.test(t)) return 'marketing-and-sales';
  if (/finance|accountant|budget|audit|procurement/.test(t)) return 'accounting-and-finance';
  if (/health|nurse|medical|doctor|nutrition|wash|clinic/.test(t)) return 'healthcare';
  if (/admin|assistant|secretary|office|clerk/.test(t)) return 'admin-and-office-support';
  if (/mining|geolog|drill|explor|mineral|metallurg/.test(t)) return 'mining-and-resources';
  if (/oil|gas|petrol|energy|lng/.test(t)) return 'oil-and-gas';
  if (/ngo|volunteer|humanitarian|relief|aid|development|program|project|facilitator|coordinator|consultant/.test(t)) return 'ngo-and-volunteering';
  return 'ngo-and-volunteering';
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── DB Setup ───────────────────────────────────────────────────────────────

const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

// Default employer_id for scraped jobs (user 11 = "Various Employers")
const DEFAULT_EMPLOYER_ID = 11;

const insertJob = db.prepare(`
  INSERT INTO jobs (employer_id, title, description, company_name, location, country, job_type, experience_level,
    source, external_url, category_slug, category_id, application_deadline, status, salary_currency, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

// Dedup check: title + company_name (or title + source if company unknown)
const existsCheck = db.prepare(
  "SELECT id FROM jobs WHERE title = ? AND (company_name = ? OR source = ?) AND status = 'active' LIMIT 1"
);

function insertIfNew(job) {
  const existing = existsCheck.get(job.title, job.company_name, job.source);
  if (existing) return false;
  const catId = slugToId[job.category_slug] || null;
  insertJob.run(
    DEFAULT_EMPLOYER_ID,
    job.title, job.description, job.company_name, job.location, job.country || 'PG',
    job.job_type || 'full-time', job.experience_level || 'Mid Level',
    job.source, job.external_url, job.category_slug, catId,
    job.application_deadline || null, 'active', job.salary_currency || 'PGK'
  );
  return true;
}

// ─── Source: ReliefWeb (HTML listing + detail pages) ────────────────────────

async function scrapeReliefWeb() {
  const name = 'ReliefWeb';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://reliefweb.int/jobs?country=185');
    const urls = [...new Set(
      (html.match(/https:\/\/reliefweb\.int\/job\/[0-9]+\/[^"'<\s]+/g) || [])
    )];
    console.log(`  Found ${urls.length} job URLs`);
    let added = 0;

    for (const url of urls) {
      try {
        const page = await fetch(url);
        const titleMatch = page.match(/<h1[^>]*>([^<]+)<\/h1>/i) || page.match(/<title>([^|<]+)/i);
        const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|.*$/, '') : null;
        if (!title) continue;

        const orgMatch = page.match(/Organization[^<]*<[^>]*>[^<]*<a[^>]*>([^<]+)/i) ||
          page.match(/source[^<]*<[^>]*>([^<]+)/i);
        const org = orgMatch ? orgMatch[1].trim() : 'International Organization';

        const closingMatch = page.match(/Closing date[^<]*<[^>]*>([^<]+)/i);
        const closing = closingMatch ? closingMatch[1].trim() : null;

        const bodyMatch = page.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        let desc = bodyMatch ? stripHtml(bodyMatch[1]) : `${title} - Position in Papua New Guinea with ${org}.`;
        if (desc.length < 100) desc = `${title}\n\nPosition in Papua New Guinea with ${org}.\nApply via ReliefWeb.`;

        if (insertIfNew({
          title, description: desc, company_name: org, location: 'Papua New Guinea',
          source: 'reliefweb-global', external_url: url, category_slug: categorizeJob(title),
          application_deadline: closing,
        })) {
          console.log(`  + ${title} [${org}]`);
          added++;
        }
        await sleep(800);
      } catch (e) {
        console.error(`  ! Error on ${url}: ${e.message}`);
      }
    }
    return { name, found: urls.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: ReliefWeb API (as backup/supplement) ───────────────────────────

async function scrapeReliefWebAPI() {
  const name = 'ReliefWeb API';
  console.log(`\n── ${name} ──`);
  try {
    const data = await fetchJson(
      'https://api.reliefweb.int/v1/jobs?appname=wantokjobs-png&filter[field]=country.name&filter[value]=Papua New Guinea&limit=50' +
      '&fields[include][]=title&fields[include][]=body-html&fields[include][]=source.name&fields[include][]=date.closing&fields[include][]=url'
    );
    const jobs = data.data || [];
    console.log(`  Found ${jobs.length} jobs via API`);
    let added = 0;

    for (const item of jobs) {
      const f = item.fields || {};
      const title = f.title;
      if (!title) continue;
      const org = f['source'] ? f['source'][0]?.name || 'International Organization' : 'International Organization';
      const desc = stripHtml(f['body-html'] || '') || `${title} — PNG position with ${org}`;
      const closing = f['date']?.closing ? f['date'].closing.split('T')[0] : null;
      const url = f.url || `https://reliefweb.int/job/${item.id}`;

      if (insertIfNew({
        title, description: desc, company_name: org, location: 'Papua New Guinea',
        source: 'reliefweb-api', external_url: url, category_slug: categorizeJob(title),
        application_deadline: closing,
      })) {
        console.log(`  + ${title} [${org}]`);
        added++;
      }
    }
    return { name, found: jobs.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: UNDP Jobs ──────────────────────────────────────────────────────

async function scrapeUNDP() {
  const name = 'UNDP';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://jobs.undp.org/cj_view_jobs.cfm?cur_lang=en&cur_job_type_id=&post_type=0&cntry=114');
    // Extract job rows — UNDP uses table-based layout
    const jobMatches = [...html.matchAll(/<a[^>]*href="(cj_view_job\.cfm\?[^"]*)"[^>]*>\s*([^<]+)/gi)];
    console.log(`  Found ${jobMatches.length} job links`);
    let added = 0;

    for (const m of jobMatches) {
      const relUrl = m[1];
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = `https://jobs.undp.org/${relUrl}`;

      try {
        const page = await fetch(url);
        const descMatch = page.match(/duty\s*station[^<]*<[^>]*>([^<]+)/i);
        const location = descMatch ? descMatch[1].trim() : 'Papua New Guinea';

        const bodyMatch = page.match(/<div[^>]*class="[^"]*job[_-]?desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
          page.match(/<div[^>]*id="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        let desc = bodyMatch ? stripHtml(bodyMatch[1]) : `${title} — UNDP position in Papua New Guinea`;
        if (desc.length < 50) desc = `${title}\n\nUNDP position in Papua New Guinea.\nApply via UNDP Jobs portal.`;

        const deadlineMatch = page.match(/deadline[^<]*<[^>]*>([^<]+)/i) ||
          page.match(/closing[^<]*<[^>]*>([^<]+)/i);
        const deadline = deadlineMatch ? deadlineMatch[1].trim() : null;

        if (insertIfNew({
          title, description: desc, company_name: 'UNDP',
          location: location.includes('Papua') || location.includes('PNG') ? location : 'Papua New Guinea',
          source: 'undp', external_url: url, category_slug: categorizeJob(title),
          application_deadline: deadline,
        })) {
          console.log(`  + ${title}`);
          added++;
        }
        await sleep(1000);
      } catch (e) {
        console.error(`  ! Error fetching UNDP job: ${e.message}`);
      }
    }
    return { name, found: jobMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: UNJobs.org (aggregator) ────────────────────────────────────────

async function scrapeUNJobs() {
  const name = 'UNJobs';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://unjobs.org/duty_stations/papua-new-guinea');
    const jobMatches = [...html.matchAll(/<a[^>]*href="(\/[^"]*)"[^>]*class="[^"]*unjobs[^"]*"[^>]*>\s*([^<]+)/gi)];
    // Fallback: extract any links that look like job postings
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/<a[^>]*href="(https:\/\/unjobs\.org\/vacancies\/[^"]+)"[^>]*>([^<]+)/gi)];
    const matches = altMatches.length ? altMatches :
      [...html.matchAll(/<h\d[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)/gi)].filter(m => m[2].length > 10);

    console.log(`  Found ${matches.length} job links`);
    let added = 0;

    for (const m of matches.slice(0, 30)) {
      const relUrl = m[1];
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = relUrl.startsWith('http') ? relUrl : `https://unjobs.org${relUrl}`;

      if (insertIfNew({
        title, description: `${title}\n\nUN position in Papua New Guinea.\nView full details on UNJobs.org.`,
        company_name: 'United Nations', location: 'Papua New Guinea',
        source: 'unjobs', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: matches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: Devex ──────────────────────────────────────────────────────────

async function scrapeDevex() {
  const name = 'Devex';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://www.devex.com/jobs/search?query=papua+new+guinea');
    // Devex uses JSON-LD or structured data in the page
    const jobMatches = [...html.matchAll(/<a[^>]*href="(\/jobs\/[^"]+)"[^>]*>\s*<[^>]*>\s*([^<]+)/gi)];
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/"title"\s*:\s*"([^"]+)"[\s\S]*?"url"\s*:\s*"([^"]+)"/g)].map(m => [m[0], m[2], m[1]]);

    console.log(`  Found ${altMatches.length} job links`);
    let added = 0;

    for (const m of altMatches.slice(0, 30)) {
      const relUrl = m[1];
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = relUrl.startsWith('http') ? relUrl : `https://www.devex.com${relUrl}`;

      // Try to get company from the listing
      if (insertIfNew({
        title, description: `${title}\n\nDevelopment sector position related to Papua New Guinea.\nView full details on Devex.`,
        company_name: 'Development Organization', location: 'Papua New Guinea',
        source: 'devex', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: altMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: WHO Careers ────────────────────────────────────────────────────

async function scrapeWHO() {
  const name = 'WHO';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://www.who.int/careers/who-jobs?query=papua%20new%20guinea');
    const jobMatches = [...html.matchAll(/<a[^>]*href="([^"]*careers[^"]*)"[^>]*>\s*([^<]{10,})/gi)];
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/<h[23][^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)/gi)];

    console.log(`  Found ${altMatches.length} job links`);
    let added = 0;

    for (const m of altMatches.slice(0, 20)) {
      const relUrl = m[1];
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = relUrl.startsWith('http') ? relUrl : `https://www.who.int${relUrl}`;

      if (insertIfNew({
        title, description: `${title}\n\nWHO position in Papua New Guinea.\nApply via WHO Careers portal.`,
        company_name: 'World Health Organization', location: 'Papua New Guinea',
        source: 'who', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: altMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: ADB Careers ────────────────────────────────────────────────────

async function scrapeADB() {
  const name = 'ADB';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://www.adb.org/work-with-us/careers/current-vacancies');
    // ADB may list vacancies; search for PNG-related ones
    const allLinks = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)/gi)];
    const pngJobs = allLinks.filter(m => {
      const text = (m[2] + ' ' + m[1]).toLowerCase();
      const isPng = text.includes('papua') || text.includes('png');
      // Filter out navigation/info pages
      const isJob = m[1].includes('vacancy') || m[1].includes('career') || m[1].includes('job') || m[1].includes('recruitment');
      return isPng && isJob;
    });

    console.log(`  Found ${pngJobs.length} PNG-related links`);
    let added = 0;

    for (const m of pngJobs.slice(0, 20)) {
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = m[1].startsWith('http') ? m[1] : `https://www.adb.org${m[1]}`;

      if (insertIfNew({
        title, description: `${title}\n\nAsian Development Bank position related to Papua New Guinea / Pacific region.\nApply via ADB Careers.`,
        company_name: 'Asian Development Bank', location: 'Papua New Guinea',
        source: 'adb', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: pngJobs.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: Newmont Mining ─────────────────────────────────────────────────

async function scrapeNewmont() {
  const name = 'Newmont';
  console.log(`\n── ${name} ──`);
  try {
    // Try workday-based careers site (common for large mining companies)
    const html = await fetch('https://newmont.wd5.myworkdayjobs.com/Newmont_Careers?q=papua+new+guinea');
    const jobMatches = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*data-automation-id="jobTitle"[^>]*>([^<]+)/gi)];
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/<a[^>]*href="(\/[^"]*job[^"]*)"[^>]*>([^<]{10,})/gi)];

    console.log(`  Found ${altMatches.length} job links`);
    let added = 0;

    for (const m of altMatches.slice(0, 20)) {
      const title = m[2].trim();
      const url = m[1].startsWith('http') ? m[1] : `https://newmont.wd5.myworkdayjobs.com${m[1]}`;

      if (insertIfNew({
        title, description: `${title}\n\nNewmont Mining position in Papua New Guinea.\nApply via Newmont Careers.`,
        company_name: 'Newmont Corporation', location: 'Papua New Guinea',
        source: 'newmont', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: altMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: Santos Energy ──────────────────────────────────────────────────

async function scrapeSantos() {
  const name = 'Santos';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://careers.santos.com/en/listing/?q=PNG');
    const jobMatches = [...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>\s*<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/gi)];
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/<a[^>]*href="(\/en\/job\/[^"]+)"[^>]*>([^<]+)/gi)];

    console.log(`  Found ${altMatches.length} job links`);
    let added = 0;

    for (const m of altMatches.slice(0, 20)) {
      const title = m[2].trim();
      if (!title || title.length < 5) continue;
      const url = m[1].startsWith('http') ? m[1] : `https://careers.santos.com${m[1]}`;

      if (insertIfNew({
        title, description: `${title}\n\nSantos/Oil Search position — PNG Operations.\nApply via Santos Careers.`,
        company_name: 'Santos Limited', location: 'PNG Operations',
        source: 'santos', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: altMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: Indeed ──────────────────────────────────────────────────────────

async function scrapeIndeed() {
  const name = 'Indeed';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://www.indeed.com/jobs?q=papua+new+guinea');
    // Indeed uses data attributes and structured markup
    const jobMatches = [...html.matchAll(/class="[^"]*jobTitle[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>\s*<span[^>]*>([^<]+)/gi)];
    const altMatches = jobMatches.length ? jobMatches :
      [...html.matchAll(/<a[^>]*id="job_([^"]+)"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)/gi)]
        .map(m => [m[0], m[2], m[3]]);

    console.log(`  Found ${altMatches.length} job links`);
    let added = 0;

    for (const m of altMatches.slice(0, 20)) {
      const title = (m[2] || '').trim();
      if (!title || title.length < 5) continue;
      const relUrl = m[1];
      const url = relUrl.startsWith('http') ? relUrl : `https://www.indeed.com${relUrl}`;

      if (insertIfNew({
        title, description: `${title}\n\nPosition related to Papua New Guinea.\nView full details on Indeed.`,
        company_name: 'Various Employers', location: 'Papua New Guinea',
        source: 'indeed', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: altMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Source: UNICEF ─────────────────────────────────────────────────────────

async function scrapeUNICEF() {
  const name = 'UNICEF';
  console.log(`\n── ${name} ──`);
  try {
    const html = await fetch('https://www.unicef.org/careers/search?location=Papua+New+Guinea');
    const jobMatches = [...html.matchAll(/<a[^>]*href="(\/careers\/[^"]+)"[^>]*>([^<]{10,})/gi)];

    console.log(`  Found ${jobMatches.length} job links`);
    let added = 0;

    for (const m of jobMatches.slice(0, 20)) {
      const title = m[2].trim();
      if (!title || title.length < 5 || /search|career|about/i.test(title)) continue;
      const url = `https://www.unicef.org${m[1]}`;

      if (insertIfNew({
        title, description: `${title}\n\nUNICEF position in Papua New Guinea.\nApply via UNICEF Careers.`,
        company_name: 'UNICEF', location: 'Papua New Guinea',
        source: 'unicef', external_url: url, category_slug: categorizeJob(title),
      })) {
        console.log(`  + ${title}`);
        added++;
      }
    }
    return { name, found: jobMatches.length, added };
  } catch (e) {
    console.error(`  ! ${name} failed: ${e.message}`);
    return { name, found: 0, added: 0, error: e.message };
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Global PNG Job Scraper ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  // Run all scrapers sequentially to be respectful of rate limits
  const scrapers = [
    scrapeReliefWeb,
    scrapeReliefWebAPI,
    scrapeUNDP,
    scrapeUNJobs,
    scrapeDevex,
    scrapeWHO,
    scrapeADB,
    scrapeUNICEF,
    scrapeNewmont,
    scrapeSantos,
    scrapeIndeed,
  ];

  for (const scraper of scrapers) {
    try {
      const result = await scraper();
      results.push(result);
    } catch (e) {
      console.error(`Scraper crashed: ${e.message}`);
      results.push({ name: scraper.name, found: 0, added: 0, error: e.message });
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===');
  console.log('─'.repeat(50));
  let totalFound = 0, totalAdded = 0;
  for (const r of results) {
    const status = r.error ? ` (ERROR: ${r.error})` : '';
    console.log(`  ${(r.name || '?').padEnd(20)} Found: ${String(r.found).padStart(3)}  Added: ${String(r.added).padStart(3)}${status}`);
    totalFound += r.found || 0;
    totalAdded += r.added || 0;
  }
  console.log('─'.repeat(50));
  console.log(`  ${'TOTAL'.padEnd(20)} Found: ${String(totalFound).padStart(3)}  Added: ${String(totalAdded).padStart(3)}`);
  console.log(`\nFinished: ${new Date().toISOString()}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
