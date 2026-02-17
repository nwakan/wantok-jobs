/**
 * Migration 006: Ensure spam accounts can't login
 * The auth route already checks account_status, but let's also
 * null out their passwords for safety
 */
module.exports = {
  id: '006-block-spam-login',
  description: 'Disable login for spam-flagged accounts',
  
  up(db) {
    // Count spam accounts
    const { count } = db.prepare("SELECT COUNT(*) as count FROM users WHERE account_status = 'spam'").get();
    console.log(`  Found ${count} spam accounts`);
    
    // Null their passwords so even if account_status check is bypassed, they can't login
    const result = db.prepare("UPDATE users SET password_hash = 'DISABLED' WHERE account_status = 'spam' AND password_hash != 'DISABLED'").run();
    console.log(`  Nulled ${result.changes} spam passwords`);
    
    return { spamAccounts: count, passwordsNulled: result.changes };
  },
  
  down(db) {
    // Can't restore passwords — this is a one-way migration
    console.log('  Warning: Cannot restore nulled passwords');
  }
};
