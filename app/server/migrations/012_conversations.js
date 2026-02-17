const logger = require('../utils/logger');

module.exports = {
  name: '012_conversations',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employer_id INTEGER NOT NULL REFERENCES users(id),
        jobseeker_id INTEGER NOT NULL REFERENCES users(id),
        job_id INTEGER REFERENCES jobs(id),
        last_message_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversation_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        sender_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_employer ON conversations(employer_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_jobseeker ON conversations(jobseeker_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation ON conversation_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conv_messages_sender ON conversation_messages(sender_id);
    `);
    logger.info('Created conversations and conversation_messages tables');
  }
};
