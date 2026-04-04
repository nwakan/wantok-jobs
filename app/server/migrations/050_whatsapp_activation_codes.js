/**
 * Migration 050: Create whatsapp_activation_codes table
 * 
 * This migration creates the infrastructure for WhatsApp account activation codes.
 * Users generate unique activation codes to link their WhatsApp number to their account.
 * 
 * Flow:
 * 1. User clicks "Connect WhatsApp" in dashboard
 * 2. System generates unique activation code (e.g., B44-8N2MOZBC)
 * 3. User clicks WhatsApp button with pre-filled message containing code
 * 4. WhatsApp webhook receives message, validates code, links phone number
 * 5. Status updated to 'activated', user confirmed
 * 
 * Features:
 * - Unique activation codes with 48-hour expiry
 * - Status tracking (pending/activated/expired)
 * - Foreign key to users table for account linking
 * - Phone number storage for WhatsApp account identification
 * - Indexes for fast lookups by code, user, status, phone
 */

const up = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create whatsapp_activation_codes table
      db.run(
        `CREATE TABLE IF NOT EXISTS whatsapp_activation_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          activation_code TEXT NOT NULL UNIQUE,
          phone_number TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'activated', 'expired')),
          created_at TEXT DEFAULT (datetime('now')),
          expires_at TEXT DEFAULT (datetime('now', '+48 hours')),
          activated_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        (err) => {
          if (err) {
            console.error('❌ Error creating whatsapp_activation_codes table:', err.message);
            return reject(err);
          }
          console.log('✅ Created whatsapp_activation_codes table');
        }
      );

      // Create index on user_id for fast user lookups
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_whatsapp_activation_codes_user_id 
         ON whatsapp_activation_codes(user_id)`,
        (err) => {
          if (err) {
            console.error('❌ Error creating user_id index:', err.message);
            return reject(err);
          }
          console.log('✅ Created index on user_id');
        }
      );

      // Create index on activation_code for fast code validation
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_whatsapp_activation_codes_code 
         ON whatsapp_activation_codes(activation_code)`,
        (err) => {
          if (err) {
            console.error('❌ Error creating activation_code index:', err.message);
            return reject(err);
          }
          console.log('✅ Created index on activation_code');
        }
      );

      // Create index on status for filtering pending/active codes
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_whatsapp_activation_codes_status 
         ON whatsapp_activation_codes(status)`,
        (err) => {
          if (err) {
            console.error('❌ Error creating status index:', err.message);
            return reject(err);
          }
          console.log('✅ Created index on status');
        }
      );

      // Create index on phone_number for account lookup by phone
      db.run(
        `CREATE INDEX IF NOT EXISTS idx_whatsapp_activation_codes_phone 
         ON whatsapp_activation_codes(phone_number)`,
        (err) => {
          if (err) {
            console.error('❌ Error creating phone_number index:', err.message);
            return reject(err);
          }
          console.log('✅ Created index on phone_number');
          console.log('✅ Migration 050 completed successfully');
          resolve();
        }
      );
    });
  });
};

const down = (db) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop indexes first
      db.run('DROP INDEX IF EXISTS idx_whatsapp_activation_codes_phone', (err) => {
        if (err) console.error('❌ Error dropping phone index:', err.message);
      });

      db.run('DROP INDEX IF EXISTS idx_whatsapp_activation_codes_status', (err) => {
        if (err) console.error('❌ Error dropping status index:', err.message);
      });

      db.run('DROP INDEX IF EXISTS idx_whatsapp_activation_codes_code', (err) => {
        if (err) console.error('❌ Error dropping code index:', err.message);
      });

      db.run('DROP INDEX IF EXISTS idx_whatsapp_activation_codes_user_id', (err) => {
        if (err) console.error('❌ Error dropping user_id index:', err.message);
      });

      // Drop table
      db.run('DROP TABLE IF EXISTS whatsapp_activation_codes', (err) => {
        if (err) {
          console.error('❌ Error dropping whatsapp_activation_codes table:', err.message);
          return reject(err);
        }
        console.log('✅ Dropped whatsapp_activation_codes table and indexes');
        console.log('✅ Migration 050 rollback completed');
        resolve();
      });
    });
  });
};

module.exports = { up, down };
