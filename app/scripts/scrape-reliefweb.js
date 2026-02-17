#!/usr/bin/env node
/**
 * Scrape ReliefWeb PNG jobs via API v1
 */

const https = require('https');
const db = require('../server/database');

const API_URL = 'https://api.reliefweb.int/v1/jobs?appname=wantokjobs&filter[field]=country.name&filter[value]=Papua%20New%20Guinea&limit=50&fields[include][]=title&fields[include][]=body&fields[include][]=source.name&fields[include][]=date.closing&fields[include][]=url';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'WantokJobs/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(d);
        else reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 200)}`));
      });
    }).on('error', reject);
  });
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
  if (/finance|accountant|budget/.test(t)) return 'accounting-and-finance';
  if (/health|nurse|medical|doctor|nutrition/.test(t)) return 'healthcare';
  if (/admin|assistant|secretary|office/.test(t)) return 'admin-and-office-support';
  return 'ngo-and-volunteering';
}

function stripHtml(html) {
  if (!html) return '';
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > 5000) text = text.substring(0, 5000) + '...';
  return text;
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
  console.log('Fetching ReliefWeb PNG jobs via API...');
  
  const raw = await fetch(API_URL);
  const data = JSON.parse(raw);
  
  if (!data.data || !data.data.length) {
    console.log('No jobs returned from API.');
    return;
  }
  
  console.log(`API returned ${data.data.length} jobs.`);
  
  // Check existing to avoid duplicates
  const existing = new Set(
    db.prepare("SELECT external_url FROM jobs WHERE source = 'reliefweb'").all().map(r => r.external_url)
  );
  
  let added = 0;
  for (const item of data.data) {
    const f = item.fields;
    const url = f.url || `https://reliefweb.int/job/${item.id}`;
    
    if (existing.has(url)) {
      continue;
    }
    
    const title = f.title || 'Untitled';
    const body = stripHtml(f.body || '');
    const org = (f.source && f.source.length > 0) ? f.source[0].name : 'International Organization';
    const closing = f['date'] && f['date'].closing ? f['date'].closing.substring(0, 10) : null;
    const slug = categorizeJob(title);
    const catId = slugToId[slug] || null;
    
    insertJob.run(
      title, body || `${title} - Position in Papua New Guinea with ${org}.`,
      org, 'Papua New Guinea', 'PG', 'full-time', 'Mid Level',
      'reliefweb', url, slug, catId, closing, 'active', 'PGK'
    );
    
    console.log(`  Added: ${title} (${org})`);
    added++;
  }
  
  console.log(`\nDone. Added ${added} new jobs from ReliefWeb (${data.data.length} total from API).`);
}

main().catch(console.error);
