/**
 * Analytics, CAPTCHA, and Stats migration
 * Adds job_views table for IP debouncing and captchas table
 */
const db = require('../database');

function migrate() {
  console.log('Running analytics and CAPTCHA migration...');

  // 1. Job views tracking table (IP-based debouncing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      ip_hash TEXT NOT NULL,
      viewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(job_id, ip_hash, viewed_at)
    );
    
    CREATE INDEX IF NOT EXISTS idx_job_views_job_ip ON job_views(job_id, ip_hash);
    CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
  `);

  // 2. CAPTCHA challenges table
  db.exec(`
    CREATE TABLE IF NOT EXISTS captchas (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);
  `);

  console.log('✅ Analytics and CAPTCHA tables created');
}

// Run if executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
