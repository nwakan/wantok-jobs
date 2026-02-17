/**
 * Migration: saved_searches table
 */
exports.up = function (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      query TEXT DEFAULT '',
      category TEXT DEFAULT '',
      location TEXT DEFAULT '',
      experience_level TEXT DEFAULT '',
      salary_min INTEGER DEFAULT NULL,
      salary_max INTEGER DEFAULT NULL,
      notify INTEGER DEFAULT 1,
      last_notified_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_searches_notify ON saved_searches(notify);
  `);
};

exports.down = function (db) {
  db.exec(`DROP TABLE IF EXISTS saved_searches`);
};
