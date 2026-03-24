/**
 * Migration: 036_verification_system.js
 * Task 17: Candidate Verification Automation
 * 
 * Creates tables for verification checks, fraud flags, and IP blocks
 * to support automated verification and fraud detection systems.
 * 
 * Tables:
 * - verification_checks: Track verification status of jobs, employers, jobseekers
 * - fraud_flags: Store fraud detection alerts with severity levels
 * - ip_blocks: Maintain blocked IP addresses with expiry dates
 * 
 * Author: Agent Zero
 * Date: 2026-03-24
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('Starting Verification System migration...');

try {
  // Begin transaction
  db.exec('BEGIN');

  // 1. Create verification_checks table
  console.log('Creating verification_checks table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('job', 'employer', 'jobseeker')),
      entity_id INTEGER NOT NULL,
      check_type TEXT NOT NULL CHECK(check_type IN ('company_registry', 'email', 'phone', 'website', 'business_registration', 'domain_ownership')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'failed', 'flagged')),
      confidence_score INTEGER DEFAULT 0 CHECK(confidence_score >= 0 AND confidence_score <= 100),
      details TEXT,
      checked_at TEXT DEFAULT (datetime('now')),
      checked_by TEXT DEFAULT 'system' CHECK(checked_by IN ('system', 'admin', 'agent')),
      UNIQUE(entity_type, entity_id, check_type)
    )
  `);
  console.log('  ✅ verification_checks table created');

  // 2. Create fraud_flags table
  console.log('Creating fraud_flags table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS fraud_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('job', 'employer', 'jobseeker', 'application')),
      entity_id INTEGER NOT NULL,
      flag_type TEXT NOT NULL CHECK(flag_type IN ('duplicate_account', 'fake_employer', 'mass_apply_bot', 'scam_posting', 'suspicious_activity', 'payment_fraud')),
      severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      details TEXT,
      flagged_at TEXT DEFAULT (datetime('now')),
      resolved INTEGER DEFAULT 0 CHECK(resolved IN (0, 1)),
      resolved_at TEXT,
      resolved_by INTEGER,
      resolution_notes TEXT,
      FOREIGN KEY (resolved_by) REFERENCES users(id)
    )
  `);
  console.log('  ✅ fraud_flags table created');

  // 3. Create ip_blocks table
  console.log('Creating ip_blocks table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      blocked_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      permanent INTEGER DEFAULT 0 CHECK(permanent IN (0, 1)),
      block_count INTEGER DEFAULT 1
    )
  `);
  console.log('  ✅ ip_blocks table created');

  // 4. Create performance indexes
  console.log('Creating indexes for verification system...');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_verification_checks_entity ON verification_checks(entity_type, entity_id)');
  console.log('  ✅ idx_verification_checks_entity created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_verification_checks_status ON verification_checks(status)');
  console.log('  ✅ idx_verification_checks_status created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_verification_checks_type ON verification_checks(check_type)');
  console.log('  ✅ idx_verification_checks_type created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_fraud_flags_entity ON fraud_flags(entity_type, entity_id)');
  console.log('  ✅ idx_fraud_flags_entity created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_fraud_flags_resolved ON fraud_flags(resolved)');
  console.log('  ✅ idx_fraud_flags_resolved created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON fraud_flags(severity)');
  console.log('  ✅ idx_fraud_flags_severity created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_ip_blocks_address ON ip_blocks(ip_address)');
  console.log('  ✅ idx_ip_blocks_address created');
  
  db.exec('CREATE INDEX IF NOT EXISTS idx_ip_blocks_expires ON ip_blocks(expires_at)');
  console.log('  ✅ idx_ip_blocks_expires created');

  // Commit transaction
  db.exec('COMMIT');

  console.log('');
  console.log('✅ Verification System migration completed successfully!');
  console.log('');
  console.log('New tables created:');
  console.log('  - verification_checks (tracks verification status)');
  console.log('  - fraud_flags (stores fraud detection alerts)');
  console.log('  - ip_blocks (maintains blocked IP addresses)');
  console.log('');
  console.log('Performance indexes created:');
  console.log('  - idx_verification_checks_entity');
  console.log('  - idx_verification_checks_status');
  console.log('  - idx_verification_checks_type');
  console.log('  - idx_fraud_flags_entity');
  console.log('  - idx_fraud_flags_resolved');
  console.log('  - idx_fraud_flags_severity');
  console.log('  - idx_ip_blocks_address');
  console.log('  - idx_ip_blocks_expires');
  console.log('');

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
