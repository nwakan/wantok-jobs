/**
 * Migration 046: Make event_type Nullable (FINAL - FK Bypass)
 * 
 * FIX FROM 045:
 * Migration 045 failed during RENAME with foreign key validation error:
 * "error in table jean_messages: no such column: user"
 * 
 * This is a pre-existing schema corruption in jean_messages unrelated to
 * application_events, but SQLite validates ALL foreign keys during DDL.
 * 
 * SOLUTION:
 * Temporarily disable foreign key constraints during migration.
 * This is safe because:
 * 1. We're not modifying foreign key relationships
 * 2. We're only changing event_type nullability
 * 3. Data integrity preserved (exact copy)
 * 4. Foreign keys re-enabled immediately after
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== 🔧 MIGRATION 046: Make event_type Nullable (FINAL) ===\n');

try {
  // Step 1: Verify current schema
  console.log('📋 Checking current production schema...');
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
  
  // Step 2: DISABLE FOREIGN KEY CONSTRAINTS
  console.log('\n🔓 Disabling foreign key constraints...');
  db.prepare('PRAGMA foreign_keys = OFF').run();
  console.log('  ✅ Foreign keys disabled');
  
  // Step 3: Begin transaction
  console.log('\n🔄 Starting table recreation...');
  db.prepare('BEGIN TRANSACTION').run();
  
  // Step 4: Create new table
  console.log('  Creating new table schema (11 columns)...');
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
      notes TEXT
    )
  `).run();
  console.log('  ✅ New table created');
  
  // Step 5: Copy data
  console.log('  Copying data (11 → 11 columns)...');
  const copyResult = db.prepare(`
    INSERT INTO application_events_new 
    (event_id, application_id, event_type, event_data, triggered_by, 
     triggered_by_id, event_timestamp, from_status, to_status, changed_by, notes)
    SELECT 
      event_id, application_id, event_type, event_data, triggered_by,
      triggered_by_id, event_timestamp, from_status, to_status, changed_by, notes
    FROM application_events
  `).run();
  console.log(`  ✅ Copied ${copyResult.changes} rows`);
  
  // Step 6: Drop old table
  console.log('  Dropping old table...');
  db.prepare('DROP TABLE application_events').run();
  console.log('  ✅ Old table dropped');
  
  // Step 7: Rename new table (with FK disabled, no validation error)
  console.log('  Renaming new table...');
  db.prepare('ALTER TABLE application_events_new RENAME TO application_events').run();
  console.log('  ✅ Table renamed');
  
  // Step 8: Recreate indexes
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
  
  // Step 9: Commit transaction
  db.prepare('COMMIT').run();
  console.log('\n✅ Transaction committed');
  
  // Step 10: RE-ENABLE FOREIGN KEY CONSTRAINTS
  console.log('\n🔒 Re-enabling foreign key constraints...');
  db.prepare('PRAGMA foreign_keys = ON').run();
  console.log('  ✅ Foreign keys re-enabled');
  
  // Step 11: Verify migration
  console.log('\n🔍 Verifying migration...');
  const newColumns = db.prepare(`PRAGMA table_info(application_events)`).all();
  const newEventType = newColumns.find(c => c.name === 'event_type');
  
  console.log(`  event_type notnull: ${newEventType.notnull} (0 = nullable ✅)`);
  console.log(`  Total columns: ${newColumns.length} (should be 11)`);
  
  if (newEventType.notnull === 0 && newColumns.length === 11) {
    console.log('  ✅ event_type is now nullable');
    console.log('  ✅ Schema validated');
  } else {
    console.error('  ❌ Verification failed');
    process.exit(1);
  }
  
  console.log('\n✅ Migration 046 completed successfully!\n');
  console.log('Summary:');
  console.log('  - event_type: NOW NULLABLE ✅');
  console.log('  - Foreign keys: BYPASSED SAFELY ✅');
  console.log('  - Data: PRESERVED ✅');
  console.log('  - Indexes: RECREATED ✅\n');
  console.log('Next Steps:');
  console.log('  1. Run Playwright tests: cd tests && npx playwright test');
  console.log('  2. Expected: 10/10 tests passing\n');
  
} catch (error) {
  console.error('\n❌ Migration 046 failed:', error.message);
  console.error(error.stack);
  
  try {
    db.prepare('ROLLBACK').run();
    console.log('✅ Transaction rolled back');
    db.prepare('PRAGMA foreign_keys = ON').run();
    console.log('✅ Foreign keys re-enabled');
  } catch (rollbackError) {
    console.error('❌ Rollback failed:', rollbackError.message);
  }
  
  process.exit(1);
} finally {
  db.close();
}
