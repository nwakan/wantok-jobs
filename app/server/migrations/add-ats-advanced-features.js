/**
 * ATS Advanced Features Migration
 * Adds offer_letters and application_reviews tables
 */
const db = require('../database');

function migrate() {
  console.log('Running ATS Advanced Features migration...');

  // 1. Offer Letters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offer_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL UNIQUE,
      job_title TEXT NOT NULL,
      candidate_name TEXT NOT NULL,
      salary REAL,
      salary_currency TEXT DEFAULT 'PGK',
      salary_period TEXT DEFAULT 'annual', -- annual, monthly, weekly
      start_date DATE,
      employment_type TEXT, -- full-time, part-time, contract
      probation_months INTEGER DEFAULT 3,
      benefits TEXT, -- JSON array
      additional_terms TEXT,
      status TEXT DEFAULT 'draft', -- draft, sent, accepted, declined, expired
      sent_at DATETIME,
      responded_at DATETIME,
      expires_at DATETIME,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_offer_letters_application ON offer_letters(application_id);
    CREATE INDEX IF NOT EXISTS idx_offer_letters_status ON offer_letters(status);
  `);

  // 2. Application Reviews table (hiring team collaboration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS application_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      recommendation TEXT CHECK(recommendation IN ('hire', 'maybe', 'no-hire')),
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      strengths TEXT,
      concerns TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_application_reviews_application ON application_reviews(application_id);
    CREATE INDEX IF NOT EXISTS idx_application_reviews_reviewer ON application_reviews(reviewer_id);
  `);

  // 3. Add ai_score column to applications if it doesn't exist
  try {
    db.exec(`ALTER TABLE applications ADD COLUMN ai_score REAL`);
    console.log('✅ Added ai_score column to applications');
  } catch (e) {
    // Column already exists
    console.log('   ai_score column already exists');
  }

  // 4. Add rating column to applications if it doesn't exist
  try {
    db.exec(`ALTER TABLE applications ADD COLUMN rating INTEGER CHECK(rating >= 0 AND rating <= 5)`);
    console.log('✅ Added rating column to applications');
  } catch (e) {
    console.log('   rating column already exists');
  }

  // 5. Add tags column to applications if it doesn't exist
  try {
    db.exec(`ALTER TABLE applications ADD COLUMN tags TEXT`);
    console.log('✅ Added tags column to applications');
  } catch (e) {
    console.log('   tags column already exists');
  }

  // 6. Add employer_notes column to applications if it doesn't exist
  try {
    db.exec(`ALTER TABLE applications ADD COLUMN employer_notes TEXT`);
    console.log('✅ Added employer_notes column to applications');
  } catch (e) {
    console.log('   employer_notes column already exists');
  }

  console.log('✅ ATS Advanced Features migration complete');
}

// Run if executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
