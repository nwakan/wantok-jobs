/**
 * Achievement badges for jobseekers
 */
exports.up = function(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_type TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      earned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, badge_type)
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id)`);
};

exports.down = function(db) {
  db.exec(`DROP TABLE IF EXISTS badges`);
};
