/**
 * Migration 057: Restore agency_clients and company_claims tables
 * 
 * Context: These tables were deleted during database cleanup (May 12-15, 2026)
 * when reducing schema from 170 to 97 tables by eliminating 73 orphaned tables.
 * 
 * Impact: Featured Jobs API broken with "no such table: agency_clients" error.
 * 
 * Tables restored:
 * - agency_clients: Stores client companies managed by recruitment agencies
 * - company_claims: Tracks employer claims to agency client profiles
 * 
 * References: 
 * - Original schema from Migration 008 (server/migrations/008_agency_system.js)
 * - Used by: server/routes/jobs.js, agency.js, companies.js, claims.js
 */

function up(db) {
  // Restore agency_clients table (originally from Migration 008)
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

  // Restore company_claims table (originally from Migration 008)
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

  console.log('Migration 057: agency_clients and company_claims tables restored');
}

function down(db) {
  db.exec(`
    DROP TABLE IF EXISTS company_claims;
    DROP TABLE IF EXISTS agency_clients;
  `);
  console.log('Migration 057: agency_clients and company_claims tables dropped');
}

module.exports = { up, down };
