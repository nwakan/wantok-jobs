/**
 * Migration 018: Payment Workaround Features
 * - WhatsApp outbox for notification queue
 * - Receipt URL column for payment verification
 */
module.exports = {
  name: '018_payment_workaround',
  up(db) {
    db.exec(`
      -- WhatsApp outbox for queued notifications
      CREATE TABLE IF NOT EXISTS whatsapp_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        sent_at TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status ON whatsapp_outbox(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_phone ON whatsapp_outbox(phone);
      
      -- Add receipt_url column to sme_payments (if not exists)
      -- SQLite doesn't support IF NOT EXISTS on ALTER TABLE, so we try-catch in the runner
    `);

    // Try to add receipt_url column (will fail silently if already exists)
    try {
      db.exec(`ALTER TABLE sme_payments ADD COLUMN receipt_url TEXT`);
    } catch (e) {
      // Column already exists, ignore
    }
  }
};
