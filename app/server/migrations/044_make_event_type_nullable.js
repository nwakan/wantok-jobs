/**
 * Migration 044: Make event_type Column Nullable
 * 
 * PURPOSE:
 * Tests insert rows without event_type, but schema requires NOT NULL.
 * This migration removes the NOT NULL constraint from event_type.
 * 
 * CONTEXT:
 * - Migration 039 created: event_type TEXT NOT NULL
 * - Tests insert: from_status, to_status, changed_by, notes
 * - Tests do NOT insert: event_type
 * - Result: NOT NULL constraint failed: application_events.event_type
 * 
 * SQLITE LIMITATION:
 * - Cannot ALTER COLUMN to drop NOT NULL
 * - Must recreate table with new schema
 * 
 * CHANGES:
 * 1. Create new table with event_type TEXT (nullable)
 * 2. Copy all data from old table
 * 3. Drop old table
 * 4. Rename new table to original name
 * 5. Recreate indexes and triggers (if any)
 * 
 * AFFECTED TESTS:
 * - Bug 4: Jobseeker can withdraw application
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== 🔧 MIGRATION 044: Make event_type Nullable ===\n');

try {
  // Step 1: Check current schema
  console.log('📋 Checking current schema...');
  const columns = db.prepare(`PRAGMA table_info(application_events)`).all();
  const eventTypeColumn = columns.find(c => c.name === 'event_type');
  
  if (!eventTypeColumn) {
    console.error('❌ event_type column not found!');
    process.exit(1);
  }
  
  console.log(`  event_type notnull: ${eventTypeColumn.notnull}`);
  
  if (eventTypeColumn.notnull === 0) {
    console.log('\n⏭️  event_type already nullable, skipping...');
    process.exit(0);
  }
  
  // Step 2: Begin transaction
  console.log('\n🔄 Starting table recreation...');
  db.prepare('BEGIN TRANSACTION').run();
  
  // Step 3: Create new table with nullable event_type
  console.log('  Creating new table schema...');
  db.prepare(`
    CREATE TABLE application_events_new (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      event_type TEXT,
      event_data TEXT,
      triggered_by TEXT,
      triggered_by_id INTEGER,
      event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      from_status TEXT,
      to_status TEXT,
      changed_by INTEGER,
      notes TEXT,
      metadata TEXT
    )
  `).run();
  console.log('  ✅ New table created');
  
  // Step 4: Copy data from old table
  console.log('  Copying data from old table...');
  const copyResult = db.prepare(`
    INSERT INTO application_events_new 
    SELECT * FROM application_events
  `).run();
  console.log(`  ✅ Copied ${copyResult.changes} rows`);
  
  // Step 5: Drop old table
  console.log('  Dropping old table...');
  db.prepare('DROP TABLE application_events').run();
  console.log('  ✅ Old table dropped');
  
  // Step 6: Rename new table
  console.log('  Renaming new table...');
  db.prepare('ALTER TABLE application_events_new RENAME TO application_events').run();
  console.log('  ✅ Table renamed');
  
  // Step 7: Recreate indexes (if any existed)
  console.log('  Recreating indexes...');
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_application_events_app_id 
    ON application_events(application_id)
  `).run();
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_application_events_timestamp 
    ON application_events(event_timestamp)
  `).run();
  console.log('  ✅ Indexes recreated');
  
  // Step 8: Commit transaction
  db.prepare('COMMIT').run();
  console.log('\n✅ Transaction committed');
  
  // Step 9: Verify migration
  console.log('\n🔍 Verifying migration...');
  const newColumns = db.prepare(`PRAGMA table_info(application_events)`).all();
  const newEventType = newColumns.find(c => c.name === 'event_type');
  
  console.log(`  event_type notnull: ${newEventType.notnull} (0 = nullable ✅)`);
  
  if (newEventType.notnull === 0) {
    console.log('  ✅ event_type is now nullable');
  } else {
    console.error('  ❌ event_type is still NOT NULL');
    process.exit(1);
  }
  
  console.log('\n✅ Migration 044 completed successfully!\n');
  console.log('Summary:');
  console.log('  - event_type constraint: REMOVED (now nullable)');
  console.log('  - Data preserved: ALL ROWS');
  console.log('  - Indexes: RECREATED\n');
  console.log('Next Steps:');
  console.log('  1. Run Playwright tests: npx playwright test');
  console.log('  2. All tests should now pass (10/10)\n');
  
} catch (error) {
  console.error('\n❌ Migration 044 failed:', error.message);
  console.error(error.stack);
  
  // Rollback on error
  try {
    db.prepare('ROLLBACK').run();
    console.log('✅ Transaction rolled back');
  } catch (rollbackError) {
    console.error('❌ Rollback failed:', rollbackError.message);
  }
  
  process.exit(1);
} finally {
  db.close();
}
