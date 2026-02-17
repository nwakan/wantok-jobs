/**
 * Migration: Add missing database indexes for performance
 * Date: 2026-02-17
 * Purpose: Optimize query performance for common search patterns
 */

const Database = require('better-sqlite3');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'wantokjobs.db');
const db = new Database(dbPath);

console.log('📊 Adding missing indexes for performance optimization...');

try {
  // Jobs table indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
    CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_industry ON jobs(industry);
    CREATE INDEX IF NOT EXISTS idx_jobs_featured_active ON jobs(is_featured, status) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_jobs_created_status ON jobs(created_at DESC, status);
    
    -- Applications indexes
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);
    
    -- Job views tracking (if table exists)
    CREATE TABLE IF NOT EXISTS job_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      ip_hash TEXT NOT NULL,
      viewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_job_views_job_ip ON job_views(job_id, ip_hash);
    CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
    
    -- CAPTCHA table for authentication
    CREATE TABLE IF NOT EXISTS captchas (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);
    
    -- User lockout columns
    ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN lockout_until TEXT;
    ALTER TABLE users ADD COLUMN verification_token TEXT;
    
    -- Categories indexes
    CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    
    -- Newsletter subscribers
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscribers(subscribed, frequency);
    
    -- Orders indexes
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_package_id ON orders(package_id);
    
    -- Contact messages
    CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status, created_at DESC);
    
    -- Credit transactions
    CREATE INDEX IF NOT EXISTS idx_credit_user_type ON credit_transactions(user_id, credit_type, created_at DESC);
    
    -- Saved jobs
    CREATE INDEX IF NOT EXISTS idx_saved_jobs_created ON saved_jobs(created_at DESC);
  `);
  
  console.log('✅ All indexes added successfully');
  console.log('✅ Database optimization complete');
  
} catch (error) {
  // Ignore errors for columns/indexes that already exist
  if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
    console.error('❌ Migration error:', error.message);
    throw error;
  } else {
    console.log('⚠️  Some indexes/columns already existed (skipped)');
  }
} finally {
  db.close();
}
