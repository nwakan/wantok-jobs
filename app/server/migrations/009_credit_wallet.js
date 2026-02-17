/**
 * Migration 009: Unified Credit Wallet System
 * - credit_wallets table (unified balance per user)
 * - Idempotency, direction, running_balance on credit_transactions
 * - deposit_intents for bank transfer matching
 * - credit_refunds for refund tracking
 * - Backfill wallets from existing profile credit columns
 */

exports.up = function (db) {
  // 1. Create credit_wallets
  db.exec(`
    CREATE TABLE credit_wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance INTEGER DEFAULT 0,
      reserved_balance INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'PGK',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX idx_credit_wallets_user ON credit_wallets(user_id);
  `);

  // 2. Add new columns to credit_transactions
  db.exec(`
    ALTER TABLE credit_transactions ADD COLUMN idempotency_key TEXT;
    ALTER TABLE credit_transactions ADD COLUMN direction TEXT;
    ALTER TABLE credit_transactions ADD COLUMN running_balance INTEGER;
    ALTER TABLE credit_transactions ADD COLUMN description TEXT;
  `);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_tx_idempotency ON credit_transactions(idempotency_key);`);

  // 3. Deposit intents
  db.exec(`
    CREATE TABLE deposit_intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount_expected REAL NOT NULL,
      unique_reference TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'awaiting_payment',
      package_id INTEGER,
      matched_order_id INTEGER,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX idx_deposit_intents_user ON deposit_intents(user_id);
    CREATE INDEX idx_deposit_intents_status ON deposit_intents(status);
    CREATE INDEX idx_deposit_intents_ref ON deposit_intents(unique_reference);
  `);

  // 4. Refunds
  db.exec(`
    CREATE TABLE credit_refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      original_transaction_id INTEGER NOT NULL,
      refund_amount INTEGER NOT NULL,
      refund_percentage REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approved_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX idx_credit_refunds_user ON credit_refunds(user_id);
    CREATE INDEX idx_credit_refunds_status ON credit_refunds(status);
  `);

  // 5. Backfill: set direction on existing transactions
  db.exec(`
    UPDATE credit_transactions SET direction = 'CREDIT' WHERE amount > 0 AND direction IS NULL;
    UPDATE credit_transactions SET direction = 'DEBIT' WHERE amount < 0 AND direction IS NULL;
    UPDATE credit_transactions SET direction = 'CREDIT' WHERE amount = 0 AND direction IS NULL;
  `);

  // 6. Backfill wallets from employer profiles
  const employers = db.prepare(`
    SELECT user_id,
           COALESCE(current_job_posting_credits, 0) AS jpc,
           COALESCE(current_ai_matching_credits, 0) AS amc,
           COALESCE(current_candidate_search_credits, 0) AS csc
    FROM profiles_employer
  `).all();

  const insertWallet = db.prepare(`
    INSERT OR IGNORE INTO credit_wallets (user_id, balance, reserved_balance)
    VALUES (?, ?, 0)
  `);

  for (const emp of employers) {
    insertWallet.run(emp.user_id, emp.jpc + emp.amc + emp.csc);
  }

  // 7. Backfill wallets from jobseeker profiles
  const jobseekers = db.prepare(`
    SELECT user_id, COALESCE(current_alert_credits, 0) AS ac
    FROM profiles_jobseeker
  `).all();

  for (const js of jobseekers) {
    insertWallet.run(js.user_id, js.ac);
  }

  // 8. Set running_balance on existing transactions (best-effort, per user ordered by id)
  const users = db.prepare(`SELECT DISTINCT user_id FROM credit_transactions ORDER BY user_id`).all();
  const getTxs = db.prepare(`SELECT id, amount FROM credit_transactions WHERE user_id = ? ORDER BY id`);
  const updateRb = db.prepare(`UPDATE credit_transactions SET running_balance = ? WHERE id = ?`);

  for (const u of users) {
    let running = 0;
    for (const tx of getTxs.all(u.user_id)) {
      running += tx.amount;
      updateRb.run(running, tx.id);
    }
  }
};

exports.down = function (db) {
  db.exec(`
    DROP TABLE IF EXISTS credit_refunds;
    DROP TABLE IF EXISTS deposit_intents;
    DROP TABLE IF EXISTS credit_wallets;
    DROP INDEX IF EXISTS idx_credit_tx_idempotency;
  `);
  // Note: cannot remove columns in SQLite without table rebuild; leaving them as-is
};
