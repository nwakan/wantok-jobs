/**
 * Migration: Referral System
 * Adds referrals table and referral_code to users
 */

module.exports = {
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER NOT NULL,
        referred_email TEXT,
        referred_user_id INTEGER,
        referral_code TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','credited')),
        credits_earned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (referrer_id) REFERENCES users(id),
        FOREIGN KEY (referred_user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
      CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
      CREATE INDEX IF NOT EXISTS idx_referrals_referred_email ON referrals(referred_email);
      CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
    `);

    // Add referral_code column to users
    try {
      db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT`);
    } catch (e) {
      // Column may already exist
    }

    try {
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)`);
    } catch (e) {}

    // Generate referral codes for existing users
    const users = db.prepare('SELECT id, name FROM users WHERE referral_code IS NULL').all();
    const update = db.prepare('UPDATE users SET referral_code = ? WHERE id = ?');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (const user of users) {
      const prefix = (user.name || 'USR').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
      let code, attempts = 0;
      do {
        let rand = '';
        for (let i = 0; i < 5; i++) rand += chars[Math.floor(Math.random() * chars.length)];
        code = `WJ-${prefix}-${rand}`;
        attempts++;
      } while (attempts < 100 && db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code));
      update.run(code, user.id);
    }
  },

  down(db) {
    db.exec('DROP TABLE IF EXISTS referrals');
    // Can't drop columns in SQLite easily, leave referral_code
  }
};
