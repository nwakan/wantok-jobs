/**
 * Database migration: Add onboarding_checklists and reference_checks tables
 */
const Database = require('better-sqlite3');
const path = require('path');

const dataDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR) : path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'wantokjobs.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

console.log('Running migration: Add onboarding_checklists and reference_checks tables...');

// Create onboarding_checklists table
db.exec(`
  CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    completed_by INTEGER,
    due_date DATE,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_onboarding_application ON onboarding_checklists(application_id);
  CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_checklists(is_completed);
`);

console.log('✓ Created onboarding_checklists table');

// Create reference_checks table
db.exec(`
  CREATE TABLE IF NOT EXISTS reference_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    referee_name TEXT NOT NULL,
    referee_email TEXT NOT NULL,
    referee_phone TEXT,
    referee_company TEXT,
    referee_relationship TEXT,
    status TEXT DEFAULT 'pending',
    token TEXT UNIQUE,
    questions TEXT,
    responses TEXT,
    overall_rating INTEGER,
    recommendation TEXT,
    sent_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_references_application ON reference_checks(application_id);
  CREATE INDEX IF NOT EXISTS idx_references_token ON reference_checks(token);
  CREATE INDEX IF NOT EXISTS idx_references_status ON reference_checks(status);
`);

console.log('✓ Created reference_checks table');

// Add 'hired' status to applications if not already present (SQLite doesn't have enum alteration)
try {
  // Test if hired status works by attempting an update
  const testApp = db.prepare('SELECT id FROM applications LIMIT 1').get();
  if (testApp) {
    db.prepare("UPDATE applications SET status = 'hired' WHERE id = ?").run(testApp.id);
    db.prepare("UPDATE applications SET status = 'applied' WHERE id = ?").run(testApp.id);
  }
  console.log('✓ Verified "hired" status is available');
} catch (e) {
  console.log('⚠ Note: May need to manually recreate applications table to add "hired" status');
}

console.log('Migration completed successfully!');
db.close();
