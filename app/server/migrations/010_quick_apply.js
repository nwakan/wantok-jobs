/**
 * Migration 010: Quick Apply (apply without account)
 * Adds guest applicant fields to applications table
 */

exports.up = function (db) {
  db.exec(`ALTER TABLE applications ADD COLUMN applicant_type TEXT DEFAULT 'registered'`);
  db.exec(`ALTER TABLE applications ADD COLUMN guest_name TEXT`);
  db.exec(`ALTER TABLE applications ADD COLUMN guest_email TEXT`);
  db.exec(`ALTER TABLE applications ADD COLUMN guest_phone TEXT`);
  db.exec(`ALTER TABLE applications ADD COLUMN resume_path TEXT`);
};

exports.down = function (db) {
  // SQLite doesn't support DROP COLUMN in older versions; these are safe to leave
};
