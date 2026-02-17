/**
 * 003: Deduplicate jobs (same title + company_name + location)
 * Keep newest, mark others as status='duplicate'
 */

module.exports = {
  up(db) {
    // First, allow 'duplicate' in status check — SQLite CHECK constraints
    // can't be altered, so we just set the value (SQLite doesn't enforce
    // CHECK constraints on existing rows by default with ALTER).
    // We need to ensure the CHECK allows 'duplicate'. Since we can't alter
    // the constraint, we'll use a different approach: set status to 'closed'
    // and add a 'duplicate_of' column to track the original.
    
    const cols = db.prepare("PRAGMA table_info(jobs)").all().map(c => c.name);
    if (!cols.includes('duplicate_of')) {
      db.exec("ALTER TABLE jobs ADD COLUMN duplicate_of INTEGER");
    }

    // Find duplicates: same title + company_name + location, keep newest (highest id)
    const dupes = db.prepare(`
      SELECT j.id, j.title, j.company_name, j.location, j.created_at,
        (SELECT MAX(j2.id) FROM jobs j2 
         WHERE j2.title = j.title 
           AND COALESCE(j2.company_name,'') = COALESCE(j.company_name,'')
           AND COALESCE(j2.location,'') = COALESCE(j.location,'')
        ) as keep_id
      FROM jobs j
      WHERE j.status != 'closed'
        AND j.title IS NOT NULL
        AND (j.company_name IS NOT NULL AND j.company_name != '')
      GROUP BY j.title, COALESCE(j.company_name,''), COALESCE(j.location,'')
      HAVING COUNT(*) > 1
    `).all();

    // Get all duplicate IDs (not the kept ones)
    const markDupe = db.prepare(`
      UPDATE jobs SET status = 'closed', duplicate_of = ?
      WHERE title = ? AND COALESCE(company_name,'') = ? AND COALESCE(location,'') = ?
        AND id != ? AND status != 'closed'
    `);

    let count = 0;
    for (const d of dupes) {
      const result = markDupe.run(
        d.keep_id,
        d.title,
        d.company_name || '',
        d.location || '',
        d.keep_id
      );
      count += result.changes;
    }

    console.log(`    → Marked ${count} duplicate jobs as closed`);
  },

  down(db) {
    // Reopen jobs that were marked as duplicates
    const result = db.prepare(`
      UPDATE jobs SET status = 'active', duplicate_of = NULL
      WHERE duplicate_of IS NOT NULL
    `).run();
    console.log(`    → Restored ${result.changes} duplicate jobs`);
  }
};
