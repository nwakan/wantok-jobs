/**
 * Migration 011: WhatsApp session management
 */
module.exports = {
  name: '011_whatsapp',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        user_id INTEGER,
        session_token TEXT,
        flow_state TEXT,
        last_message_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
    `);
  }
};
