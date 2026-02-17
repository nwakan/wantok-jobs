/**
 * Migration: Application Status Workflow
 * - Add status_updated_at column
 * - Migrate status values: applied→pending, screening→reviewed, interview→interviewed
 */

module.exports = {
  up(db) {
    // Add status_updated_at column
    try {
      db.exec(`ALTER TABLE applications ADD COLUMN status_updated_at TEXT DEFAULT (datetime('now'))`);
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
    }

    // Migrate old status values to new workflow
    const migrations = [
      ['applied', 'pending'],
      ['screening', 'reviewed'],
      ['interview', 'interviewed'],
    ];

    for (const [oldStatus, newStatus] of migrations) {
      db.prepare(`UPDATE applications SET status = ? WHERE status = ?`).run(newStatus, oldStatus);
      db.prepare(`UPDATE application_events SET from_status = ? WHERE from_status = ?`).run(newStatus, oldStatus);
      db.prepare(`UPDATE application_events SET to_status = ? WHERE to_status = ?`).run(newStatus, oldStatus);
    }

    // Set status_updated_at from updated_at for existing rows
    db.prepare(`UPDATE applications SET status_updated_at = updated_at WHERE status_updated_at IS NULL`).run();
  },

  down(db) {
    const rollbacks = [
      ['pending', 'applied'],
      ['reviewed', 'screening'],
      ['interviewed', 'interview'],
    ];
    for (const [oldStatus, newStatus] of rollbacks) {
      db.prepare(`UPDATE applications SET status = ? WHERE status = ?`).run(newStatus, oldStatus);
      db.prepare(`UPDATE application_events SET from_status = ? WHERE from_status = ?`).run(newStatus, oldStatus);
      db.prepare(`UPDATE application_events SET to_status = ? WHERE to_status = ?`).run(newStatus, oldStatus);
    }
  }
};
