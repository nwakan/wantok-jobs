/**
 * Migration 019: 2FA / TOTP support + WhatsApp outbox retry tracking
 */
module.exports = function(db) {
  // 2FA settings per user
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_2fa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      secret TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      backup_codes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON user_2fa(user_id);
  `);

  // Session tokens for remember-me / refresh
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
  `);

  // Add retry_count to whatsapp_outbox if not exists
  try {
    db.exec(`ALTER TABLE whatsapp_outbox ADD COLUMN retry_count INTEGER DEFAULT 0`);
  } catch(e) {
    if (!e.message.includes('duplicate column')) console.warn('whatsapp_outbox retry_count:', e.message);
  }

  // Add 2fa_enabled flag to users table
  try {
    db.exec(`ALTER TABLE users ADD COLUMN two_fa_enabled INTEGER DEFAULT 0`);
  } catch(e) {
    if (!e.message.includes('duplicate column')) console.warn('users two_fa_enabled:', e.message);
  }

  // Add 2fa_pending flag for login flow
  try {
    db.exec(`ALTER TABLE users ADD COLUMN two_fa_pending INTEGER DEFAULT 0`);
  } catch(e) {
    if (!e.message.includes('duplicate column')) console.warn('users two_fa_pending:', e.message);
  }

  console.log('Migration 019: 2FA tables + whatsapp_outbox retry_count applied');
};