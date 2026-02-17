#!/usr/bin/env node
/**
 * Scrape ReliefWeb PNG jobs by fetching the listing page + individual job pages.
 * Country 185 = Papua New Guinea on ReliefWeb.
 */

const https = require('https');
const db = require('../server/database');

const LISTING_URL = 'https://reliefweb.int/jobs?country=185';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (WantokJobs/1.0)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function stripHtml(html) {
  if (!html) return '';
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > 5000) text = text.substring(0, 5000) + '...';
  return text;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/ict|it |tech|software|developer|coordinator.*ict/.test(t)) return 'ict-and-technology';
  if (/law|legal|justice|solicitor/.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture/.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior coordinator|executive/.test(t)) return 'management-and-executive';
  if (/education|training|teacher|learner|wellbeing/.test(t)) return 'education-and-training';
  if (/engineer|construction|highway|consult/.test(t)) return 'engineering';
  if (/communicat|marketing/.test(t)) return 'marketing-and-sales';
  if (/finance|accountant|budget/.test(t)) return 'accounting-and-finance';
  if (/health|nurse|medical|doctor|nutrition/.test(t)) return 'healthcare';
  if (/admin|assistant|secretary|office/.test(t)) return 'admin-and-office-support';
  if (/ngo|volunteer|humanitarian|relief|aid|development officer|facilitator|program/.test(t)) return 'ngo-and-volunteering';
  return 'ngo-and-volunteering';
}

async function scrapeJob(url) {
  try {
    const html = await fetch(url);
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^|<]+)/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|.*$/, '') : null;
    if (!title) return null;

    const orgMatch = html.match(/Organization[^<]*<[^>]*>[^<]*<a[^>]*>([^<]+)/i) ||
                     html.match(/source[^<]*<[^>]*>([^<]+)/i);
    const org = orgMatch ? orgMatch[1].trim() : 'International Organization';

    const closingMatch = html.match(/Closing date[^<]*<[^>]*>([^<]+)/i);
    const closing = closingMatch ? closingMatch[1].trim() : null;

    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    let description = bodyMatch ? stripHtml(bodyMatch[1]) : `${title} - Position in Papua New Guinea with ${org}.`;
    if (description.length < 100) description = `${title}\n\nPosition in Papua New Guinea with ${org}.\nFor full details, visit ReliefWeb.`;

    return {
      title, description, company_name: org, location: 'Papua New Guinea', country: 'PG',
      job_type: 'full-time', experience_level: 'Mid Level', source: 'reliefweb',
      external_url: url, category_slug: categorizeJob(title),
      application_deadline: closing, status: 'active', salary_currency: 'PGK',
    };
  } catch (e) {
    console.error(`  Error scraping ${url}: ${e.message}`);
    return null;
  }
}

// DB setup
const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

const insertJob = db.prepare(`
  INSERT INTO jobs (title, description, company_name, location, country, job_type, experience_level,
    source, external_url, category_slug, category_id, application_deadline, status, salary_currency, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

async function main() {
  console.log('Fetching ReliefWeb PNG job listing...');
  const listingHtml = await fetch(LISTING_URL);

  // Extract all job URLs
  const urls = [...new Set(
    (listingHtml.match(/https:\/\/reliefweb\.int\/job\/[0-9]+\/[^"'<\s]+/g) || [])
  )];

  console.log(`Found ${urls.length} job URLs on listing page.`);
  if (!urls.length) { console.log('No jobs found.'); return; }

  const existing = new Set(
    db.prepare("SELECT external_url FROM jobs WHERE source = 'reliefweb'").all().map(r => r.external_url)
  );

  let added = 0;
  for (const url of urls) {
    if (existing.has(url)) { console.log(`  Skip (exists): ${url.split('/').pop()}`); continue; }

    const job = await scrapeJob(url);
    if (!job) { console.log(`  Failed: ${url}`); continue; }

    const catId = slugToId[job.category_slug] || null;
    insertJob.run(job.title, job.description, job.company_name, job.location, job.country,
      job.job_type, job.experience_level, job.source, job.external_url,
      job.category_slug, catId, job.application_deadline, job.status, job.salary_currency);

    console.log(`  Added: ${job.title} [${job.category_slug}]`);
    added++;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone. Added ${added} new jobs (${urls.length} total on ReliefWeb).`);
}

main().catch(console.error);
