/**
 * Migration 056: Add employer specialties feature
 * 
 * Purpose: Allow employers to specify areas of expertise/specialization
 * Impact: Improves employer profile discoverability and matching
 * 
 * Changes:
 * - Add specialties column to profiles_employer table (JSON array)
 * - Create index for filtering by specialties
 * 
 * Rollback: DROP INDEX, ALTER TABLE DROP COLUMN
 */

const Database = require('better-sqlite3');
const path = require('path');

function up(db) {
  console.log('Migration 056: Adding employer specialties...');
  
  // Add specialties column to profiles_employer table
  db.exec(`
    ALTER TABLE profiles_employer 
    ADD COLUMN specialties TEXT;
  `);
  
  console.log('✓ Added specialties column to profiles_employer');
  
  // Create index for filtering by specialties
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_profiles_employer_specialties 
    ON profiles_employer(specialties);
  `);
  
  console.log('✓ Created index idx_profiles_employer_specialties');
  
  console.log('Migration 056: Complete');
}

function down(db) {
  console.log('Migration 056 Rollback: Removing employer specialties...');
  
  // Drop index
  db.exec(`DROP INDEX IF EXISTS idx_profiles_employer_specialties;`);
  console.log('✓ Dropped index idx_profiles_employer_specialties');
  
  // Note: SQLite does not support DROP COLUMN in ALTER TABLE
  // To rollback, you would need to recreate the table without the column
  console.log('⚠ Manual rollback required: profiles_employer.specialties column cannot be dropped in SQLite');
  console.log('⚠ To fully rollback, recreate profiles_employer table without specialties column');
  
  console.log('Migration 056 Rollback: Partial (index dropped, column remains)');
}

module.exports = { up, down };
