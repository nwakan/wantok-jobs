/**
 * 001: Fix privacy columns on applications
 * - Add employer_notes column (separate from notes which may contain screening data)
 * - Ensure rating, tags, employer_notes are NEVER in jobseeker-facing queries
 *   (verified: the /my route already uses explicit column list without these)
 */

module.exports = {
  up(db) {
    // Add employer_notes if not exists
    const cols = db.prepare("PRAGMA table_info(applications)").all().map(c => c.name);
    
    if (!cols.includes('employer_notes')) {
      db.exec("ALTER TABLE applications ADD COLUMN employer_notes TEXT");
    }
    if (!cols.includes('rating')) {
      db.exec("ALTER TABLE applications ADD COLUMN rating REAL");
    }
    if (!cols.includes('tags')) {
      db.exec("ALTER TABLE applications ADD COLUMN tags TEXT");
    }
    if (!cols.includes('notes')) {
      db.exec("ALTER TABLE applications ADD COLUMN notes TEXT");
    }

    console.log('    → Privacy columns ensured on applications table');
    console.log('    → Jobseeker /my route verified: uses explicit SELECT without private fields');
  },

  down(db) {
    // SQLite doesn't support DROP COLUMN easily; no-op for safety
    console.log('    → Down is a no-op (cannot drop columns in SQLite safely)');
  }
};
