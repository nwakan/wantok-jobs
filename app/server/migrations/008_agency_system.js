/**
 * Migration 008: Agency system — agency clients, company claims, account_type
 */

function up(db) {
  // Add account_type to users (employer vs agency)
  try {
    db.exec("ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'employer'");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  // Add client_id to jobs
  try {
    db.exec("ALTER TABLE jobs ADD COLUMN client_id INTEGER");
  } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }

  // Agency clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agency_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_id INTEGER NOT NULL,
      company_name TEXT NOT NULL,
      logo_url TEXT,
      industry TEXT,
      location TEXT,
      website TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      description TEXT,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (agency_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_agency_clients_agency ON agency_clients(agency_id);
  `);

  // Company claims table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_profile_id INTEGER NOT NULL,
      claimer_user_id INTEGER NOT NULL,
      claimer_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      evidence TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_profile_id) REFERENCES agency_clients(id),
      FOREIGN KEY (claimer_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_company_claims_status ON company_claims(status);
  `);

  console.log('Migration 008: Agency system tables created');
}

function down(db) {
  db.exec(`
    DROP TABLE IF EXISTS company_claims;
    DROP TABLE IF EXISTS agency_clients;
  `);
  // Note: Can't easily drop columns in SQLite
  console.log('Migration 008: Agency system tables dropped');
}

module.exports = { up, down };
