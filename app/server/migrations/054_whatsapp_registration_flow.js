/**
 * Migration 054: WhatsApp Registration Flow State Tracking
 * 
 * Adds columns to whatsapp_sessions for tracking multi-step registration flow:
 * - registration_flow_active: Boolean flag indicating active registration
 * - registration_step: Current step in flow (name, email, role, password, complete)
 * - registration_data: JSON storage for collected form data
 * - registration_started_at: Timestamp when flow began
 * - registration_completed_at: Timestamp when flow finished
 * 
 * Also adds location/timezone tracking for context awareness:
 * - province: PNG province (NCD, Morobe, etc.)
 * - timezone: User timezone (default: Pacific/Port_Moresby)
 * - latitude: GPS latitude (optional)
 * - longitude: GPS longitude (optional)
 * - location_updated_at: Last location update timestamp
 * 
 * Created: 2026-05-06
 */

const db = require('../database');

module.exports = {
  up: () => {
    console.log('Running Migration 054: WhatsApp Registration Flow State Tracking...');
    
    try {
      // Add registration flow tracking columns
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN registration_flow_active INTEGER DEFAULT 0;
      `);
      console.log('  ✅ Added registration_flow_active column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add registration_flow_active:', e.message);
        throw e;
      }
      console.log('  ⚠️  registration_flow_active column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN registration_step TEXT;
      `);
      console.log('  ✅ Added registration_step column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add registration_step:', e.message);
        throw e;
      }
      console.log('  ⚠️  registration_step column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN registration_data TEXT;
      `);
      console.log('  ✅ Added registration_data column (JSON storage)');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add registration_data:', e.message);
        throw e;
      }
      console.log('  ⚠️  registration_data column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN registration_started_at TEXT;
      `);
      console.log('  ✅ Added registration_started_at column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add registration_started_at:', e.message);
        throw e;
      }
      console.log('  ⚠️  registration_started_at column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN registration_completed_at TEXT;
      `);
      console.log('  ✅ Added registration_completed_at column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add registration_completed_at:', e.message);
        throw e;
      }
      console.log('  ⚠️  registration_completed_at column already exists');
    }
    
    // Add location/timezone tracking columns
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN province TEXT;
      `);
      console.log('  ✅ Added province column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add province:', e.message);
        throw e;
      }
      console.log('  ⚠️  province column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN timezone TEXT DEFAULT 'Pacific/Port_Moresby';
      `);
      console.log('  ✅ Added timezone column (default: Pacific/Port_Moresby)');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add timezone:', e.message);
        throw e;
      }
      console.log('  ⚠️  timezone column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN latitude REAL;
      `);
      console.log('  ✅ Added latitude column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add latitude:', e.message);
        throw e;
      }
      console.log('  ⚠️  latitude column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN longitude REAL;
      `);
      console.log('  ✅ Added longitude column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add longitude:', e.message);
        throw e;
      }
      console.log('  ⚠️  longitude column already exists');
    }
    
    try {
      db.exec(`
        ALTER TABLE whatsapp_sessions ADD COLUMN location_updated_at TEXT;
      `);
      console.log('  ✅ Added location_updated_at column');
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error('  ❌ Failed to add location_updated_at:', e.message);
        throw e;
      }
      console.log('  ⚠️  location_updated_at column already exists');
    }
    
    // Create indexes for performance
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_registration_flow 
        ON whatsapp_sessions(registration_flow_active) 
        WHERE registration_flow_active = 1;
      `);
      console.log('  ✅ Created index on registration_flow_active');
    } catch (e) {
      console.error('  ❌ Failed to create registration_flow_active index:', e.message);
    }
    
    try {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_province 
        ON whatsapp_sessions(province) 
        WHERE province IS NOT NULL;
      `);
      console.log('  ✅ Created index on province');
    } catch (e) {
      console.error('  ❌ Failed to create province index:', e.message);
    }
    
    console.log('✅ Migration 054 completed successfully!');
  },
  
  down: () => {
    console.log('Rolling back Migration 054: WhatsApp Registration Flow State Tracking...');
    
    // SQLite doesn't support DROP COLUMN, so we'd need to recreate the table
    // For now, just log a warning
    console.warn('  ⚠️  SQLite does not support DROP COLUMN. Manual rollback required if needed.');
    console.warn('  ⚠️  To rollback, you must recreate whatsapp_sessions table without these columns.');
  }
};
