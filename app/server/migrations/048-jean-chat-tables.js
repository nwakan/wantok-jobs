/**
 * Migration 048: Jean AI Chat Tables (Fixed - No Triggers)
 * Creates tables for Jean AI chat persistence and conversation management
 * Date: 2026-04-01
 * Author: Agent Zero
 * Note: updated_at timestamps handled in application code (chat-persistence.js)
 */

const db = require('../database');

function up() {
  console.log('Running Migration 048: Creating Jean AI chat tables...');

  // Jean AI Sessions Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS jean_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_token TEXT UNIQUE NOT NULL,
      current_flow TEXT,
      flow_state TEXT,
      platform TEXT DEFAULT 'web',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run();

  // Jean AI Messages Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS jean_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      intent TEXT,
      confidence REAL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES jean_sessions(id) ON DELETE CASCADE
    )
  `).run();

  // Indexes for performance
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_jean_sessions_user_id ON jean_sessions(user_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_jean_sessions_token ON jean_sessions(session_token)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_jean_sessions_updated ON jean_sessions(updated_at DESC)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_jean_messages_session ON jean_messages(session_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_jean_messages_created ON jean_messages(created_at DESC)`).run();

  console.log('✅ Migration 048 complete: Jean AI tables created');
}

function down() {
  console.log('Rolling back Migration 048: Dropping Jean AI chat tables...');

  // Drop indexes
  db.prepare(`DROP INDEX IF EXISTS idx_jean_messages_created`).run();
  db.prepare(`DROP INDEX IF EXISTS idx_jean_messages_session`).run();
  db.prepare(`DROP INDEX IF EXISTS idx_jean_sessions_updated`).run();
  db.prepare(`DROP INDEX IF EXISTS idx_jean_sessions_token`).run();
  db.prepare(`DROP INDEX IF EXISTS idx_jean_sessions_user_id`).run();

  // Drop tables
  db.prepare(`DROP TABLE IF EXISTS jean_messages`).run();
  db.prepare(`DROP TABLE IF EXISTS jean_sessions`).run();

  console.log('✅ Migration 048 rollback complete');
}

module.exports = { up, down };
