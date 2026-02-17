#!/usr/bin/env node
/**
 * Transparency Framework Database Migration
 * Adds transparency tracking tables and employer_type columns
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('Starting Transparency Framework migration...');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // 1. Add columns to profiles_employer
  console.log('Adding employer_type columns...');
  try {
    db.exec(`ALTER TABLE profiles_employer ADD COLUMN employer_type TEXT DEFAULT 'private'`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  - employer_type column already exists');
  }
  
  try {
    db.exec(`ALTER TABLE profiles_employer ADD COLUMN transparency_required INTEGER DEFAULT 0`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  - transparency_required column already exists');
  }
  
  try {
    db.exec(`ALTER TABLE profiles_employer ADD COLUMN transparency_score INTEGER DEFAULT 0`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  - transparency_score column already exists');
  }

  // 2. Create hiring_transparency table
  console.log('Creating hiring_transparency table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS hiring_transparency (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      salary_band_min REAL,
      salary_band_max REAL,
      salary_currency TEXT DEFAULT 'PGK',
      selection_criteria TEXT,
      panel_size INTEGER,
      panel_independent INTEGER DEFAULT 0,
      internal_candidates_considered INTEGER DEFAULT 0,
      closing_date_enforced INTEGER DEFAULT 1,
      original_closing_date TEXT,
      extended_closing_date TEXT,
      extension_reason TEXT,
      application_count INTEGER DEFAULT 0,
      shortlist_count INTEGER DEFAULT 0,
      interview_count INTEGER DEFAULT 0,
      position_filled INTEGER DEFAULT 0,
      position_cancelled INTEGER DEFAULT 0,
      cancellation_reason TEXT,
      readvertised INTEGER DEFAULT 0,
      readvertise_reason TEXT,
      time_to_hire_days INTEGER,
      gender_stats TEXT,
      provincial_stats TEXT,
      outcome_published INTEGER DEFAULT 0,
      outcome_published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // 3. Create hiring_panel table
  console.log('Creating hiring_panel table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS hiring_panel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      member_name TEXT NOT NULL,
      member_role TEXT,
      member_title TEXT,
      is_independent INTEGER DEFAULT 0,
      conflict_declared INTEGER DEFAULT 0,
      conflict_details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // 4. Create hiring_decisions table
  console.log('Creating hiring_decisions table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS hiring_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      application_id INTEGER,
      stage TEXT NOT NULL,
      decision TEXT,
      reasoning TEXT,
      score REAL,
      criteria_scores TEXT,
      decided_by TEXT,
      decided_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
    )
  `);

  // 5. Create transparency_audits table
  console.log('Creating transparency_audits table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS transparency_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      auditor_id INTEGER,
      auditor_type TEXT DEFAULT 'platform',
      audit_period_start TEXT,
      audit_period_end TEXT,
      findings TEXT,
      overall_score INTEGER,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 6. Create conflict_declarations table
  console.log('Creating conflict_declarations table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS conflict_declarations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      panel_member_id INTEGER,
      declared_by TEXT NOT NULL,
      conflict_type TEXT,
      description TEXT,
      action_taken TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `);

  // Commit transaction
  db.exec('COMMIT');
  console.log('✓ Migration completed successfully!');

  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN (
      'hiring_transparency', 
      'hiring_panel', 
      'hiring_decisions', 
      'transparency_audits', 
      'conflict_declarations'
    )
  `).all();
  
  console.log(`\nCreated tables: ${tables.map(t => t.name).join(', ')}`);

} catch (error) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
