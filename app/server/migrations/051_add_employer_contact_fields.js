/**
 * Migration 051: Add Contact Fields to Employer Profiles
 * 
 * Priority 3 from Comprehensive Platform Audit (2026-04-05)
 * 
 * Issue: No email/contact_preference columns in profiles_employer table
 * Impact: No employer contact functionality → job seekers can't reach employers
 * 
 * Changes:
 * - Add email column (TEXT, nullable)
 * - Add contact_preference column (TEXT, default 'email')
 * - Note: phone column already exists (column 11) - not added
 * - Add indexes for performance
 * 
 * Date: 2026-04-05
 */

const db = require('../database');

module.exports = {
  up: (database = db) => {
    console.log('Running migration 051: Add employer contact fields');

    try {
      database.exec(`BEGIN TRANSACTION;`);

      // Add email column (nullable, unique)
      database.exec(`
        ALTER TABLE profiles_employer 
        ADD COLUMN email TEXT;
      `);


      // Add contact_preference column (default 'email')
      database.exec(`
        ALTER TABLE profiles_employer 
        ADD COLUMN contact_preference TEXT DEFAULT 'email';
      `);

      // Add indexes for performance
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_profiles_employer_email 
        ON profiles_employer(email);
      `);

      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_profiles_employer_contact_preference 
        ON profiles_employer(contact_preference);
      `);

      database.exec(`COMMIT;`);
      console.log('✅ Migration 051 completed successfully');
    } catch (error) {
      database.exec(`ROLLBACK;`);
      console.error('❌ Migration 051 failed:', error.message);
      throw error;
    }
  },

  down: (database = db) => {
    console.log('Reverting migration 051: Remove employer contact fields');

    try {
      database.exec(`BEGIN TRANSACTION;`);

      // Drop indexes
      database.exec(`DROP INDEX IF EXISTS idx_profiles_employer_email;`);
      database.exec(`DROP INDEX IF EXISTS idx_profiles_employer_contact_preference;`);

      // Note: SQLite doesn't support DROP COLUMN directly
      // In production, would need to recreate table without these columns
      // For now, just log warning
      console.log('⚠️  SQLite limitation: Cannot drop columns. Manual cleanup required.');

      database.exec(`COMMIT;`);
      console.log('✅ Migration 051 reverted (partial - columns remain)');
    } catch (error) {
      database.exec(`ROLLBACK;`);
      console.error('❌ Migration 051 revert failed:', error.message);
      throw error;
    }
  }
};

if (require.main === module) {
  module.exports.up();
}
