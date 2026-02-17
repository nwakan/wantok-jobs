/**
 * 002: Force password reset for legacy/weak password users
 */

module.exports = {
  up(db) {
    const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    
    if (!cols.includes('force_password_reset')) {
      db.exec("ALTER TABLE users ADD COLUMN force_password_reset INTEGER DEFAULT 0");
    }
    if (!cols.includes('password_format')) {
      db.exec("ALTER TABLE users ADD COLUMN password_format TEXT DEFAULT 'bcrypt'");
    }

    // Flag users with legacy passwords (not starting with $2 = not bcrypt)
    const result = db.prepare(`
      UPDATE users SET force_password_reset = 1
      WHERE password_hash NOT LIKE '$2%'
         OR password_format = 'legacy'
    `).run();

    console.log(`    → Flagged ${result.changes} users for forced password reset`);
  },

  down(db) {
    // Reset the flag
    db.prepare("UPDATE users SET force_password_reset = 0").run();
    console.log('    → Cleared all force_password_reset flags');
  }
};
