/**
 * Migration: notification_preferences table
 */

exports.up = function(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      email_new_application INTEGER DEFAULT 1,
      email_status_change INTEGER DEFAULT 1,
      email_new_message INTEGER DEFAULT 1,
      email_job_alert INTEGER DEFAULT 1,
      email_newsletter INTEGER DEFAULT 1,
      push_enabled INTEGER DEFAULT 0,
      sms_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id)`);
};

exports.down = function(db) {
  db.exec(`DROP TABLE IF EXISTS notification_preferences`);
};
