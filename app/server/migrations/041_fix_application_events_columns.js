/**
 * Migration: 041_fix_application_events_columns.js
 * 
 * CRITICAL FIX: Add missing from_status and to_status columns to application_events table
 * 
 * Root Cause:
 * - Migration 039 created application_events table without from_status/to_status columns
 * - Migration 013 expects these columns to exist
 * - Playwright tests failing with "table application_events has no column named from_status/to_status"
 * 
 * Impact:
 * - Application status change tracking broken
 * - Application withdrawal functionality broken
 * - 3 Playwright tests failing
 * 
 * Solution:
 * - Add from_status TEXT column (nullable for backward compatibility)
 * - Add to_status TEXT column (nullable for backward compatibility)
 * - Backfill existing rows with event_type data where possible
 * 
 * Author: Agent Zero
 * Date: 2026-03-26
 * Related: Migrations 013, 039
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== 🔧 MIGRATION 041: Fix application_events Columns ===\n');

try {
  // Begin transaction
  db.exec('BEGIN');

  // Check if columns already exist
  console.log('📋 Checking current schema...');
  const tableInfo = db.prepare('PRAGMA table_info(application_events)').all();
  const columnNames = tableInfo.map(col => col.name);
  
  const hasFromStatus = columnNames.includes('from_status');
  const hasToStatus = columnNames.includes('to_status');
  
  console.log(`  Current columns: ${columnNames.join(', ')}`);
  console.log(`  from_status exists: ${hasFromStatus}`);
  console.log(`  to_status exists: ${hasToStatus}`);
  console.log('');

  // Add from_status column if missing
  if (!hasFromStatus) {
    console.log('➕ Adding from_status column...');
    db.exec('ALTER TABLE application_events ADD COLUMN from_status TEXT');
    console.log('  ✅ from_status column added');
  } else {
    console.log('  ⏭️  from_status column already exists (skipping)');
  }

  // Add to_status column if missing
  if (!hasToStatus) {
    console.log('➕ Adding to_status column...');
    db.exec('ALTER TABLE application_events ADD COLUMN to_status TEXT');
    console.log('  ✅ to_status column added');
  } else {
    console.log('  ⏭️  to_status column already exists (skipping)');
  }

  // Backfill existing rows (best effort)
  if (!hasFromStatus || !hasToStatus) {
    console.log('');
    console.log('📝 Backfilling existing rows...');
    
    // For status change events, try to infer from event_type
    const statusChangeEvents = [
      'screening_completed', 'assessed', 'ranked', 'shortlisted',
      'reviewed', 'interview_scheduled', 'interview_completed',
      'offered', 'offer_accepted', 'offer_declined', 'rejected', 'withdrawn'
    ];
    
    // Set to_status = event_type for status change events
    const updateStmt = db.prepare(`
      UPDATE application_events 
      SET to_status = event_type 
      WHERE event_type IN (${statusChangeEvents.map(() => '?').join(',')})
        AND to_status IS NULL
    `);
    
    const result = updateStmt.run(...statusChangeEvents);
    console.log(`  ✅ Backfilled ${result.changes} rows with to_status from event_type`);
    
    // For 'applied' events, set to_status = 'applied'
    const appliedResult = db.prepare(`
      UPDATE application_events 
      SET to_status = 'applied'
      WHERE event_type = 'applied'
        AND to_status IS NULL
    `).run();
    console.log(`  ✅ Backfilled ${appliedResult.changes} 'applied' events`);
  }

  // Commit transaction
  db.exec('COMMIT');

  console.log('');
  console.log('✅ Migration 041 completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log('  - from_status column: ' + (hasFromStatus ? 'already existed' : 'ADDED'));
  console.log('  - to_status column: ' + (hasToStatus ? 'already existed' : 'ADDED'));
  console.log('  - Existing rows backfilled with event_type data');
  console.log('');
  console.log('Next Steps:');
  console.log('  1. Run Playwright tests: npx playwright test');
  console.log('  2. Verify all 3 failing tests now pass');
  console.log('  3. Test application status changes in production');
  console.log('');

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration 041 failed:', error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
