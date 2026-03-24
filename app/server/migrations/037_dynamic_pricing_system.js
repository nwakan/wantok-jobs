/**
 * Migration 037: Dynamic Pricing Configuration System
 * 
 * PURPOSE:
 * - Admin-configurable pricing for ALL platform features
 * - No more hardcoded prices in application code
 * - Support for multiple currencies (PGK, USD)
 * - Volume discounts and tiered pricing
 * - Easy price updates without code changes
 * 
 * CRITICAL USER REQUIREMENT:
 * "all pricing should be dynamic so app admin can set/change"
 * 
 * FEATURES:
 * - Job posting credits (Micro, Standard, Business, Enterprise)
 * - Premium subscriptions (Jobseekers & Employers)
 * - Notification credits (SMS, WhatsApp, Email)
 * - Feature add-ons (Featured jobs, AI screening)
 * 
 * Author: Agent Zero
 * Date: 2026-03-24
 * Phase: 1 of 5 (Smart Matching System)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('Starting Dynamic Pricing System migration...');

try {
  // Begin transaction
  db.exec('BEGIN');

  // Create pricing_config table
  console.log('Creating pricing_config table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_type TEXT NOT NULL CHECK(feature_type IN (
        'job_post_credit',
        'featured_job',
        'ai_screening',
        'jobseeker_premium_match',
        'jobseeker_premium_alerts',
        'jobseeker_premium_plus',
        'employer_premium_match',
        'employer_pro',
        'employer_recruiter_pro',
        'notification_credit_sms',
        'notification_credit_whatsapp',
        'notification_credit_email'
      )),
      tier_name TEXT,
      price_pgk REAL NOT NULL,
      price_usd REAL,
      quantity INTEGER DEFAULT 1,
      discount_percentage REAL DEFAULT 0,
      description TEXT,
      is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
      display_order INTEGER DEFAULT 0,
      metadata_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      created_by INTEGER,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(feature_type, tier_name)
    )
  `);
  console.log('  ✅ pricing_config table created');

  // Create indexes
  console.log('Creating indexes...');
  db.exec('CREATE INDEX IF NOT EXISTS idx_pricing_feature ON pricing_config(feature_type)');
  console.log('  ✅ idx_pricing_feature created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_config(is_active)');
  console.log('  ✅ idx_pricing_active created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_pricing_display ON pricing_config(display_order)');
  console.log('  ✅ idx_pricing_display created');

  // Seed current WantokJobs pricing from PHASE4-ROADMAP.md
  console.log('');
  console.log('Seeding current WantokJobs pricing...');
  
  const insertPricing = db.prepare(`
    INSERT INTO pricing_config (
      feature_type, tier_name, price_pgk, price_usd, quantity, description, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Job posting credits (current pricing from production)
  insertPricing.run('job_post_credit', 'Micro', 150, 42, 3, '3 job posting credits', 1);
  insertPricing.run('job_post_credit', 'Standard', 400, 112, 10, '10 job posting credits', 2);
  insertPricing.run('job_post_credit', 'Business', 875, 245, 25, '25 job posting credits', 3);
  insertPricing.run('job_post_credit', 'Enterprise', 2000, 560, 60, '60 job posting credits', 4);
  console.log('  ✅ Seeded 4 job credit packages');

  // Feature add-ons
  insertPricing.run('featured_job', null, 100, 28, 1, 'Featured job listing (highlighted at top)', 10);
  insertPricing.run('ai_screening', null, 50, 14, 1, 'AI-powered candidate screening per job', 11);
  console.log('  ✅ Seeded 2 feature add-ons');

  // Jobseeker premium subscriptions (from attachment proposal)
  insertPricing.run('jobseeker_premium_match', null, 19, 5.30, 1, 'Monthly - See match %, filters, profile tips', 20);
  insertPricing.run('jobseeker_premium_alerts', null, 15, 4.20, 1, 'Monthly - Instant SMS/WhatsApp alerts (20/month)', 21);
  insertPricing.run('jobseeker_premium_plus', null, 29, 8.10, 1, 'Monthly - All features bundled (BEST VALUE)', 22);
  console.log('  ✅ Seeded 3 jobseeker subscription tiers');

  // Employer premium subscriptions (from attachment proposal)
  insertPricing.run('employer_premium_match', null, 69, 19.30, 1, 'Per job - AI ranking + custom scoring', 30);
  insertPricing.run('employer_pro', null, 149, 41.70, 1, 'Monthly - Multiple jobs + templates + analytics', 31);
  insertPricing.run('employer_recruiter_pro', null, 399, 111.70, 1, 'Monthly - Team access + advanced tools', 32);
  console.log('  ✅ Seeded 3 employer subscription tiers');

  // Notification credits (from attachment proposal)
  insertPricing.run('notification_credit_sms', 'Trial', 10, 2.80, 50, '50 SMS alerts', 40);
  insertPricing.run('notification_credit_sms', 'Business', 25, 7.00, 150, '150 SMS alerts', 41);
  insertPricing.run('notification_credit_whatsapp', 'Trial', 10, 2.80, 50, '50 WhatsApp alerts', 42);
  insertPricing.run('notification_credit_whatsapp', 'Business', 25, 7.00, 150, '150 WhatsApp alerts', 43);
  console.log('  ✅ Seeded 4 notification credit packages');

  // Commit transaction
  db.exec('COMMIT');

  console.log('');
  console.log('✅ Dynamic Pricing System migration completed successfully!');
  console.log('');
  console.log('New table created:');
  console.log('  - pricing_config (admin-configurable pricing for ALL features)');
  console.log('');
  console.log('Indexes created:');
  console.log('  - idx_pricing_feature');
  console.log('  - idx_pricing_active');
  console.log('  - idx_pricing_display');
  console.log('');
  console.log('Seeded pricing data:');
  console.log('  - 4 job credit packages (Micro K150, Standard K400, Business K875, Enterprise K2000)');
  console.log('  - 2 feature add-ons (Featured job, AI screening)');
  console.log('  - 3 jobseeker subscriptions (Premium Match K19, Premium Alerts K15, Premium Plus K29)');
  console.log('  - 3 employer subscriptions (Premium Match K69, Employer Pro K149, Recruiter Pro K399)');
  console.log('  - 4 notification credit packages (SMS/WhatsApp trials and business)');
  console.log('');
  console.log('Total: 16 pricing configurations ready for admin management');
  console.log('');

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
