#!/usr/bin/env node
/**
 * PNGJobSeek Scraper
 * Scrapes job listings from pngjobseek.com
 */

const Database = require('./app/node_modules/better-sqlite3');
const db = new Database('./app/server/data/wantokjobs.db');

// Job data from web_fetch results
const jobsFromPage1 = [
  {
    id: '229950',
    title: 'Localisation Consultant (CPP4)',
    company_name: 'Adventist Development and Relief Agency (ADRA) PNG',
    location: 'LAE, MO',
    url: 'https://www.pngjobseek.com/display-job/229950/Localisation-Consultant-(CPP4).html'
  },
  {
    id: '229927',
    title: '3 x CIRCULATION SALES REPS (POM BASED)',
    company_name: 'South Pacific Post (SPP) Limited',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229927/3-x-CIRCULATION-SALES-REPS-(POM-BASED).html'
  },
  {
    id: '229926',
    title: 'COMPLETE AUTO SERVICES -LAE',
    company_name: 'Datec',
    location: 'LAE, MO',
    url: 'https://www.pngjobseek.com/display-job/229926/COMPLETE-AUTO-SERVICES--LAE.html'
  },
  {
    id: '229925',
    title: 'Communications & Public Relations (PR) Manager',
    company_name: 'PNG Chamber of Resources and Energy',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229925/Communications-&-Public-Rlations-(PR)-Manager.html'
  },
  {
    id: '229915',
    title: 'Concrete Mixer Truck Driver',
    company_name: 'Curtain Bros (CB) Group',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229915/Concrete-Mixer-Truck-Driver.html'
  },
  {
    id: '229914',
    title: 'Batch Plant Operator',
    company_name: 'Curtain Bros (CB) Group',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229914/Batch-Plant-Operator.html'
  },
  {
    id: '229841',
    title: 'Prime Mover Drivers / Swinglift Operator (Port Moresby)',
    company_name: 'Swift agencies PNG ltd',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229841/Prime-Mover-Drivers---Swinglift-Operator-(Port-Moresby).html'
  },
  {
    id: '229827',
    title: 'Risk Analyst - Operational Risks',
    company_name: 'TISA Bank Ltd',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229827/Risk-Analyst---Operational-Risks.html'
  },
  {
    id: '229802',
    title: '1x Monitoring & Evaluation Supervisor – NCD, Port Moresby',
    company_name: 'ROTARIAN AGAINST MALARIA',
    location: 'Port Moresby, NCD',
    url: 'https://www.pngjobseek.com/display-job/229802/1x-Monitoring-&-Evaluation-Supervisor-–-NCD,-Port-Moresby.html'
  },
  {
    id: '229801',
    title: '2 x Home Malaria Management Officer',
    company_name: 'ROTARIAN AGAINST MALARIA',
    location: 'East New Britain & Oro Province',
    url: 'https://www.pngjobseek.com/display-job/229801/2-x-Home-Malaria-Management-Officer.html'
  }
];

function insertJob(jobData) {
  // Check if exists
  const exists = db.prepare('SELECT id FROM jobs WHERE external_url = ?').get(jobData.external_url);
  if (exists) {
    console.log(`⊘ Skipped (exists): ${jobData.title}`);
    return false;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO jobs (
        employer_id, title, description, location, country,
        job_type, status, source, external_url, company_name, application_method,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      1,
      jobData.title,
      jobData.description || `Job listing from ${jobData.company_name}. For full details, please visit the application link.`,
      jobData.location,
      'Papua New Guinea',
      'full-time',
      'active',
      'pngjobseek',
      jobData.external_url,
      jobData.company_name,
      'external'
    );

    console.log(`✓ Inserted: ${jobData.title}`);
    return true;
  } catch (err) {
    console.error(`✗ Failed: ${jobData.title} - ${err.message}`);
    return false;
  }
}

// Process page 1 jobs
let inserted = 0;
let skipped = 0;

for (const job of jobsFromPage1) {
  if (insertJob({ ...job, external_url: job.url })) {
    inserted++;
  } else {
    skipped++;
  }
}

console.log(`\n=== PNGJobSeek Page 1 Complete ===`);
console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);

// Stats
const total = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('active');
console.log(`Total active jobs now: ${total.count}`);

db.close();

module.exports = { insertJob };
