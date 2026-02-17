#!/usr/bin/env node
/**
 * Scrape ReliefWeb PNG jobs via HTML pages (API requires registered appname)
 * Fetches job listings from reliefweb.int for Papua New Guinea
 */

const https = require('https');
const db = require('../server/database');

const JOB_URLS = [
  'https://reliefweb.int/job/4198622/program-and-communications-coordinator',
  'https://reliefweb.int/job/4197654/ict-coordinator-png',
  'https://reliefweb.int/job/4197653/learners-wellbeing-and-support-officer-png',
  'https://reliefweb.int/job/4196613/director-law-and-justice',
  'https://reliefweb.int/job/4196606/rtn09-consultancy-services-kokoda-highway-scoping-study',
  'https://reliefweb.int/job/4196410/provincial-facilitator-wnb',
  'https://reliefweb.int/job/4195120/senior-coordinator-people-and-culture',
  'https://reliefweb.int/job/4195118/people-culture-specialist',
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'WantokJobs/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function extractText(html) {
  // Remove scripts, styles
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Convert common tags
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function extractField(html, label) {
  // Look for structured data in ReliefWeb job pages
  const regex = new RegExp(label + '\\s*[:\\-]?\\s*</[^>]+>\\s*<[^>]+>([^<]+)', 'i');
  const m = html.match(regex);
  return m ? m[1].trim() : null;
}

function categorizeJob(title) {
  const t = title.toLowerCase();
  if (/ngo|volunteer|humanitarian|relief|aid|development officer|facilitator|program/.test(t)) return 'ngo-and-volunteering';
  if (/ict|it |tech|software|developer|coordinator.*ict/.test(t)) return 'ict-and-technology';
  if (/law|legal|justice|solicitor/.test(t)) return 'legal-and-law';
  if (/hr|human resource|people.*culture/.test(t)) return 'hr-and-recruitment';
  if (/director|manager|senior coordinator|executive/.test(t)) return 'management-and-executive';
  if (/education|training|teacher|learner|wellbeing/.test(t)) return 'education-and-training';
  if (/engineer|construction|highway|consult/.test(t)) return 'engineering';
  if (/communicat|marketing/.test(t)) return 'marketing-and-sales';
  return 'ngo-and-volunteering'; // Default for ReliefWeb jobs
}

async function scrapeJob(url) {
  try {
    const html = await fetch(url);
    
    // Extract title from <h1> or <title>
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^|<]+)/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s*\|.*$/, '') : null;
    if (!title) return null;
    
    // Extract organization
    const orgMatch = html.match(/Organization[^<]*<[^>]*>[^<]*<a[^>]*>([^<]+)/i) || 
                     html.match(/source[^<]*<[^>]*>([^<]+)/i);
    const org = orgMatch ? orgMatch[1].trim() : 'International Organization';
    
    // Extract closing date
    const closingMatch = html.match(/Closing date[^<]*<[^>]*>([^<]+)/i);
    const closing = closingMatch ? closingMatch[1].trim() : null;
    
    // Try to extract body content
    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      html.match(/class="[^"]*body[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    let description = bodyMatch ? extractText(bodyMatch[1]) : `${title} - Position based in Papua New Guinea. Visit ReliefWeb for full details.`;
    
    // Limit description length
    if (description.length > 5000) description = description.substring(0, 5000) + '...';
    if (description.length < 100) description = `${title}\n\nThis is an international development/humanitarian position based in Papua New Guinea. The role is with ${org}.\n\nFor full details, please visit the original posting on ReliefWeb.`;
    
    const slug = categorizeJob(title);
    
    return {
      title,
      description,
      company_name: org,
      location: 'Papua New Guinea',
      country: 'PG',
      job_type: 'full-time',
      experience_level: 'Mid Level',
      source: 'reliefweb',
      external_url: url,
      category_slug: slug,
      application_deadline: closing,
      status: 'active',
      salary_currency: 'PGK',
    };
  } catch (e) {
    console.error(`Error scraping ${url}:`, e.message);
    return null;
  }
}

// Get category slug → id map
const categories = db.prepare('SELECT id, slug FROM categories').all();
const slugToId = {};
categories.forEach(c => { slugToId[c.slug] = c.id; });

const insertJob = db.prepare(`
  INSERT INTO jobs (title, description, company_name, location, country, job_type, experience_level, 
    source, external_url, category_slug, category_id, application_deadline, status, salary_currency, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

async function main() {
  console.log('Scraping ReliefWeb PNG jobs...');
  
  // Check existing to avoid duplicates
  const existing = new Set(
    db.prepare("SELECT external_url FROM jobs WHERE source = 'reliefweb'").all().map(r => r.external_url)
  );
  
  let added = 0;
  for (const url of JOB_URLS) {
    if (existing.has(url)) {
      console.log(`  Skip (exists): ${url}`);
      continue;
    }
    
    const job = await scrapeJob(url);
    if (!job) {
      console.log(`  Failed: ${url}`);
      continue;
    }
    
    const catId = slugToId[job.category_slug] || null;
    
    insertJob.run(
      job.title, job.description, job.company_name, job.location, job.country,
      job.job_type, job.experience_level, job.source, job.external_url,
      job.category_slug, catId, job.application_deadline, job.status, job.salary_currency
    );
    
    console.log(`  Added: ${job.title} [${job.category_slug}]`);
    added++;
    
    // Be polite
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nDone. Added ${added} jobs from ReliefWeb.`);
}

main().catch(console.error);
