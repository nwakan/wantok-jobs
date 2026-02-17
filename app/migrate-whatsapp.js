/**
 * Migration: Add WhatsApp columns to whatsapp_sessions
 */

const db = require('./server/database');

console.log('📦 Running WhatsApp migration...\n');

// Add missing columns
const addColumn = (table, col, type) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    console.log(`✅ Added column: ${table}.${col}`);
    return true;
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`ℹ️  Column already exists: ${table}.${col}`);
      return true;
    }
    console.error(`❌ Failed to add ${table}.${col}:`, e.message);
    return false;
  }
};

console.log('Adding columns to whatsapp_sessions...');
addColumn('whatsapp_sessions', 'otp', 'TEXT');
addColumn('whatsapp_sessions', 'otp_expires', 'TEXT');
addColumn('whatsapp_sessions', 'last_search_results', 'TEXT');

console.log('\n✅ Migration complete!\n');

// Verify columns exist
const session = db.prepare('SELECT * FROM whatsapp_sessions LIMIT 1').get();
if (session) {
  console.log('Columns present:', Object.keys(session));
} else {
  console.log('Table structure ready (no sessions yet)');
}
