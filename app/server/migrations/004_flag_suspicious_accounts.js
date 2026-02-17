/**
 * 004: Flag suspicious accounts
 */

module.exports = {
  up(db) {
    const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!cols.includes('account_status')) {
      db.exec("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'");
    }

    let flagged = 0;

    // 1. Multiple accounts from same email domain (>5, excluding common providers)
    const commonDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','yahoo.co.uk','googlemail.com','live.com','aol.com','icloud.com','mail.com'];
    const domainCounts = db.prepare(`
      SELECT LOWER(SUBSTR(email, INSTR(email, '@') + 1)) as domain, COUNT(*) as cnt
      FROM users
      GROUP BY domain
      HAVING cnt > 5
    `).all();

    for (const { domain, cnt } of domainCounts) {
      if (commonDomains.includes(domain)) continue;
      const r = db.prepare(`
        UPDATE users SET account_status = 'flagged'
        WHERE LOWER(SUBSTR(email, INSTR(email, '@') + 1)) = ?
          AND account_status = 'active'
      `).run(domain);
      flagged += r.changes;
    }

    // 2. Test/gibberish names
    const testPatterns = db.prepare(`
      UPDATE users SET account_status = 'flagged'
      WHERE account_status = 'active'
        AND (
          LOWER(name) LIKE 'test%'
          OR LOWER(name) LIKE '%test user%'
          OR LOWER(name) IN ('test', 'asdf', 'qwerty', 'aaa', 'xxx', 'zzz', 'foo', 'bar', 'baz', 'admin', 'user')
          OR LOWER(name) LIKE 'user%' AND LENGTH(name) < 8
          OR name GLOB '*[0-9][0-9][0-9][0-9]*' AND LENGTH(name) < 10
        )
    `).run();
    flagged += testPatterns.changes;

    // 3. Bulk-created accounts (>10 in same minute)
    const bulkMinutes = db.prepare(`
      SELECT SUBSTR(created_at, 1, 16) as minute, COUNT(*) as cnt
      FROM users
      GROUP BY minute
      HAVING cnt > 10
    `).all();

    for (const { minute } of bulkMinutes) {
      const r = db.prepare(`
        UPDATE users SET account_status = 'flagged'
        WHERE SUBSTR(created_at, 1, 16) = ?
          AND account_status = 'active'
      `).run(minute);
      flagged += r.changes;
    }

    console.log(`    → Flagged ${flagged} suspicious accounts`);
  },

  down(db) {
    const r = db.prepare("UPDATE users SET account_status = 'active' WHERE account_status = 'flagged'").run();
    console.log(`    → Reset ${r.changes} flagged accounts to active`);
  }
};
