#!/usr/bin/env node
/**
 * Advanced Search Filters Migration
 * Adds experience level, company size, benefits, and remote work columns to jobs table
 * Part of Phase 4 Task 22: Advanced Search Filters
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('Starting Advanced Search Filters migration...');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // 1. Add experience_level column
  console.log('Adding experience_level column...');
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN experience_level TEXT`);
    console.log('  ✅ experience_level column added');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  ⏭️  experience_level column already exists');
  }

  // 2. Add company_size column
  console.log('Adding company_size column...');
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN company_size TEXT`);
    console.log('  ✅ company_size column added');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  ⏭️  company_size column already exists');
  }

  // 3. Add benefits column (JSON array stored as TEXT)
  console.log('Adding benefits column...');
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN benefits TEXT`);
    console.log('  ✅ benefits column added');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  ⏭️  benefits column already exists');
  }

  // 4. Add remote_work_option column
  console.log('Adding remote_work_option column...');
  try {
    db.exec(`ALTER TABLE jobs ADD COLUMN remote_work_option INTEGER DEFAULT 0`);
    console.log('  ✅ remote_work_option column added (default: 0=onsite)');
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
    console.log('  ⏭️  remote_work_option column already exists');
  }

  // 5. Create indexes for performance
  console.log('Creating indexes for filter performance...');
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_experience_level ON jobs(experience_level)`);
  console.log('  ✅ idx_jobs_experience_level created');
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_company_size ON jobs(company_size)`);
  console.log('  ✅ idx_jobs_company_size created');
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_remote_work_option ON jobs(remote_work_option)`);
  console.log('  ✅ idx_jobs_remote_work_option created');

  // 6. Create composite index for common filter combinations
  console.log('Creating composite indexes...');
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_filters_combo 
    ON jobs(experience_level, company_size, remote_work_option, status)`);
  console.log('  ✅ idx_jobs_filters_combo created');

  // Commit transaction
  db.exec('COMMIT');
  console.log('');
  console.log('✅ Advanced Search Filters migration completed successfully!');
  console.log('');
  console.log('New filter fields added:');
  console.log('  - experience_level: TEXT (entry|mid|senior|executive)');
  console.log('  - company_size: TEXT (startup|SME|enterprise)');
  console.log('  - benefits: TEXT (JSON array: ["health_insurance", "housing", ...])');
  console.log('  - remote_work_option: INTEGER (0=onsite, 1=remote, 2=hybrid)');
  console.log('');
  console.log('Performance indexes created:');
  console.log('  - idx_jobs_experience_level');
  console.log('  - idx_jobs_company_size');
  console.log('  - idx_jobs_remote_work_option');
  console.log('  - idx_jobs_filters_combo (composite)');
  console.log('');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}
