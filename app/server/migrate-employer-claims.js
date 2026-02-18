#!/usr/bin/env node
/**
 * Migration: Add employer claim/verification fields
 * Run: node server/migrate-employer-claims.js
 */

const db = require('./database');
const logger = require('./utils/logger');

function migrate() {
  try {
    logger.info('Starting employer claims migration...');

    // Add columns to profiles_employer
    const employerColumns = [
      'claimed INTEGER DEFAULT 0',
      'claimed_by INTEGER',
      'claimed_at TEXT',
      'claim_method TEXT',
      'official_email_domain TEXT',
      'official_phone TEXT',
      'social_facebook TEXT',
      'social_linkedin TEXT',
      'social_twitter TEXT'
    ];

    for (const column of employerColumns) {
      try {
        const columnName = column.split(' ')[0];
        db.exec(`ALTER TABLE profiles_employer ADD COLUMN ${column}`);
        logger.info(`Added column: profiles_employer.${columnName}`);
      } catch (err) {
        if (err.message.includes('duplicate column name')) {
          logger.info(`Column already exists: ${column.split(' ')[0]}`);
        } else {
          throw err;
        }
      }
    }

    // Create employer_claims table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS employer_claims (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employer_profile_id INTEGER NOT NULL,
          user_id INTEGER,
          claim_method TEXT NOT NULL CHECK(claim_method IN ('email', 'phone', 'admin_override')),
          verification_value TEXT NOT NULL,
          verification_code TEXT,
          code_expires_at TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected', 'expired')),
          admin_notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          verified_at TEXT,
          ip_address TEXT,
          FOREIGN KEY (employer_profile_id) REFERENCES profiles_employer(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      logger.info('Created employer_claims table');
    } catch (err) {
      if (err.message.includes('already exists')) {
        logger.info('employer_claims table already exists');
      } else {
        throw err;
      }
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_employer_claims_profile ON employer_claims(employer_profile_id)',
      'CREATE INDEX IF NOT EXISTS idx_employer_claims_status ON employer_claims(status)',
      'CREATE INDEX IF NOT EXISTS idx_employer_claims_user ON employer_claims(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_profiles_employer_claimed ON profiles_employer(claimed)',
      'CREATE INDEX IF NOT EXISTS idx_profiles_employer_official_domain ON profiles_employer(official_email_domain)'
    ];

    for (const indexSql of indexes) {
      try {
        db.exec(indexSql);
        logger.info(`Created index: ${indexSql.match(/idx_[a-z_]+/)[0]}`);
      } catch (err) {
        logger.info(`Index already exists or error: ${err.message}`);
      }
    }

    logger.info('✅ Employer claims migration completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  const success = migrate();
  process.exit(success ? 0 : 1);
}

module.exports = { migrate };
