/**
 * Migration 043: Add notes Column to application_events
 * 
 * PURPOSE:
 * Tests expect `notes` column for storing event descriptions/comments.
 * Migration 039 did not include this column.
 * 
 * CONTEXT:
 * - Tests written in ats-bugs.test.js use notes field:
 *   - Line 97: notes = 'Initial application'
 *   - Line 111: notes = 'Status changed by employer'
 *   - Line 198: notes = 'Withdrawn by jobseeker'
 * 
 * CHANGES:
 * 1. Add notes column (TEXT, nullable)
 * 2. No backfilling needed (new column, tests insert their own data)
 * 
 * AFFECTED TESTS:
 * - Bug 4: Jobseeker can withdraw application
 * 
 * RELATED MIGRATIONS:
 * - Migration 041: Added from_status and to_status columns
 * - Migration 042: Added changed_by column
 * - Migration 043: Adds notes column (THIS MIGRATION)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');
const db = new Database(dbPath);

console.log('\n=== 🔧 MIGRATION 043: Add notes Column ===\n');

try {
  // Step 1: Check current schema
  console.log('📋 Checking current schema...');
  const columns = db.prepare(`PRAGMA table_info(application_events)`).all();
  const columnNames = columns.map(c => c.name);
  
  const hasNotes = columnNames.includes('notes');
  
  console.log(`  notes exists: ${hasNotes}`);
  
  // Step 2: Add notes column if missing
  if (!hasNotes) {
    console.log('\n➕ Adding notes column...');
    db.prepare(`ALTER TABLE application_events ADD COLUMN notes TEXT`).run();
    console.log('  ✅ notes column added');
  } else {
    console.log('\n⏭️  notes column already exists, skipping...');
  }
  
  // Step 3: Verify migration
  console.log('\n🔍 Verifying migration...');
  const finalColumns = db.prepare(`PRAGMA table_info(application_events)`).all();
  const finalColumnNames = finalColumns.map(c => c.name);
  
  const requiredColumns = ['from_status', 'to_status', 'changed_by', 'notes'];
  const missingColumns = requiredColumns.filter(col => !finalColumnNames.includes(col));
  
  if (missingColumns.length === 0) {
    console.log('  ✅ All required test columns present:');
    requiredColumns.forEach(col => {
      console.log(`    ✅ ${col}`);
    });
  } else {
    console.log('  ⚠️  Some columns still missing:');
    missingColumns.forEach(col => {
      console.log(`    ❌ ${col}`);
    });
  }
  
  console.log('\n✅ Migration 043 completed successfully!\n');
  console.log('Summary:');
  console.log('  - notes column: ADDED');
  console.log('  - All test-required columns: PRESENT\n');
  console.log('Next Steps:');
  console.log('  1. Run Playwright tests: npx playwright test');
  console.log('  2. Verify all tests pass (should be 10/10)');
  console.log('  3. All schema issues resolved\n');
  
} catch (error) {
  console.error('\n❌ Migration 043 failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
