// Migration 030: Job Sourcing Infrastructure
// Created: 2026-03-23
// Purpose: Add tables and fields for AI job sourcing agents (Scout + Headhunter)

const Database = require('better-sqlite3');
const path = require('path');

function up(db) {
  console.log('Running migration 030: Job Sourcing Infrastructure...');

  // 1. Create job_sources table - track all job scraping sources
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,              -- 'PNGJobSeek', 'PNG IPA', 'LinkedIn'
      type TEXT NOT NULL CHECK(type IN ('scraper', 'api', 'manual', 'scout')),
      url TEXT,                                -- Base URL for the source
      active INTEGER DEFAULT 1,
      last_scraped TEXT,                       -- Last successful scrape timestamp
      jobs_found INTEGER DEFAULT 0,            -- Total jobs found from this source
      success_rate REAL DEFAULT 0,             -- % of successful scrapes
      avg_quality_score INTEGER DEFAULT 0,     -- Average quality of jobs from this source
      config TEXT,                             -- JSON config for scraper settings
      credentials_key TEXT,                    -- Reference to encrypted credentials if needed
      rate_limit_per_hour INTEGER DEFAULT 100, -- Rate limiting
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 2. Create employer_leads table - Scout agent discoveries
  db.exec(`
    CREATE TABLE IF NOT EXISTS employer_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      website TEXT,
      career_page_url TEXT,
      facebook_url TEXT,
      linkedin_url TEXT,
      email TEXT,
      phone TEXT,
      location TEXT,
      province TEXT,
      industry TEXT,
      company_size TEXT CHECK(company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
      source TEXT NOT NULL,                    -- 'PNG IPA', 'Facebook', 'Google'
      source_url TEXT,                         -- URL where lead was discovered
      discovery_date TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'registered', 'declined', 'invalid')),
      contact_attempted INTEGER DEFAULT 0,     -- Number of outreach attempts
      last_contact_date TEXT,
      notes TEXT,
      confidence_score REAL DEFAULT 0,         -- AI confidence in lead quality (0-1)
      metadata TEXT,                           -- JSON for additional data
      created_by TEXT DEFAULT 'scout_agent',   -- Which agent discovered this
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 3. Add indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_job_sources_active ON job_sources(active, last_scraped);
    CREATE INDEX IF NOT EXISTS idx_job_sources_type ON job_sources(type, active);

    CREATE INDEX IF NOT EXISTS idx_employer_leads_status ON employer_leads(status, discovery_date);
    CREATE INDEX IF NOT EXISTS idx_employer_leads_company ON employer_leads(company_name);
    CREATE INDEX IF NOT EXISTS idx_employer_leads_source ON employer_leads(source, status);
    CREATE INDEX IF NOT EXISTS idx_employer_leads_province ON employer_leads(province);
    CREATE INDEX IF NOT EXISTS idx_employer_leads_confidence ON employer_leads(confidence_score DESC);
  `);

  // 4. Add job deduplication fields to jobs table (if not exist)
  db.exec(`
    -- Add content fingerprint for deduplication
    ALTER TABLE jobs ADD COLUMN content_hash TEXT;
    CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON jobs(content_hash);

    -- Add source tracking fields
    ALTER TABLE jobs ADD COLUMN source_id INTEGER REFERENCES job_sources(id);
    CREATE INDEX IF NOT EXISTS idx_jobs_source_id ON jobs(source_id);

    -- Add scraping metadata
    ALTER TABLE jobs ADD COLUMN scraped_at TEXT;
    ALTER TABLE jobs ADD COLUMN last_verified TEXT;
  `);

  // 5. Seed initial job sources
  const seedSources = db.prepare(`
    INSERT OR IGNORE INTO job_sources (name, type, url, active, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sources = [
    ['PNGJobSeek', 'scraper', 'https://pngjobseek.com', 1, 'Primary PNG job board competitor'],
    ['PNGWorkforce', 'scraper', 'https://pngworkforce.com', 1, 'PNG government job listings'],
    ['Pacific Jobs', 'scraper', 'https://pacificjobs.net', 1, 'Regional Pacific job board'],
    ['PNG IPA Registry', 'scout', 'https://ipa.gov.pg', 1, 'PNG Investment Promotion Authority business registry'],
    ['LinkedIn PNG', 'api', 'https://linkedin.com/jobs/search/?location=Papua%20New%20Guinea', 0, 'LinkedIn API (requires credentials)'],
    ['Facebook Jobs PNG', 'scout', 'https://facebook.com', 1, 'Facebook business pages and job posts'],
    ['Post Courier Jobs', 'scraper', 'https://postcourier.com.pg', 1, 'PNG newspaper job listings'],
    ['The National Jobs', 'scraper', 'https://thenational.com.pg', 1, 'PNG newspaper job listings'],
    ['Manual Entry', 'manual', null, 1, 'Jobs posted directly by employers'],
  ];

  for (const source of sources) {
    seedSources.run(...source);
  }

  console.log('✅ Migration 030 complete: Job sourcing infrastructure created');
  console.log('  - job_sources table created with 9 initial sources');
  console.log('  - employer_leads table created');
  console.log('  - Added deduplication fields to jobs table');
  console.log('  - Created performance indexes');
}

function down(db) {
  console.log('Rolling back migration 030: Job Sourcing Infrastructure...');

  // Remove indexes
  db.exec(`
    DROP INDEX IF EXISTS idx_job_sources_active;
    DROP INDEX IF EXISTS idx_job_sources_type;
    DROP INDEX IF EXISTS idx_employer_leads_status;
    DROP INDEX IF EXISTS idx_employer_leads_company;
    DROP INDEX IF EXISTS idx_employer_leads_source;
    DROP INDEX IF EXISTS idx_employer_leads_province;
    DROP INDEX IF EXISTS idx_employer_leads_confidence;
    DROP INDEX IF EXISTS idx_jobs_content_hash;
    DROP INDEX IF EXISTS idx_jobs_source_id;
  `);

  // Drop tables
  db.exec(`
    DROP TABLE IF EXISTS employer_leads;
    DROP TABLE IF EXISTS job_sources;
  `);

  // Note: Cannot remove columns from SQLite easily, so we leave them
  console.log('✅ Migration 030 rollback complete');
}

module.exports = { up, down };
