/**
 * Migration 051: WhatsApp Dual Integration System
 * 
 * Adds support for two WhatsApp integration types:
 * 1. Web.js (whatsapp-web.js) - QR code-based browser automation
 * 2. WhatsApp API (Meta Cloud API) - Official Business API
 * 
 * Features:
 * - Integration type selector (web or api)
 * - Mutual exclusivity (only one can be active at a time)
 * - Separate configuration for each integration type
 * - Admin settings toggle
 * 
 * Created: 2026-04-05
 */

const db = require('../database');

module.exports = {
  up: () => {
    console.log('Running Migration 051: WhatsApp Dual Integration System...');
    
    // Add integration type configuration keys to whatsapp_config
    const configs = [
      // Integration type selector
      ['integration_type', 'api'], // 'web' or 'api' (default: api)
      ['web_enabled', '0'],         // 0 or 1 (Web.js enabled flag)
      ['api_enabled', '1'],         // 0 or 1 (API enabled flag - default active)
      
      // Web.js specific configuration
      ['web_session_data', ''],     // Encrypted session data for persistence
      ['web_qr_code', ''],          // Current QR code (base64 data URL)
      ['web_connected', '0'],       // Connection status (0 or 1)
      ['web_last_connected', ''],   // ISO timestamp of last connection
      
      // API configuration (already exist, keeping for reference)
      // ['api_token', ''],            // Already exists
      // ['phone_number_id', ''],      // Already exists
      // ['webhook_verify_token', ''], // Already exists
    ];
    
    // Insert or update configuration keys
    const stmt = db.prepare(`
      INSERT INTO whatsapp_config (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `);
    
    for (const [key, value] of configs) {
      try {
        stmt.run(key, value);
        console.log(`  ✅ Added/Updated whatsapp_config: ${key}`);
      } catch (e) {
        console.error(`  ❌ Failed to add ${key}: ${e.message}`);
      }
    }
    
    // Create whatsapp_web_messages table for Web.js message logging
    db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_web_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        message_text TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
        message_id TEXT,
        timestamp INTEGER NOT NULL,
        processed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('  ✅ Created whatsapp_web_messages table');
    
    // Create index for efficient querying
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_web_messages_phone 
      ON whatsapp_web_messages(phone_number)
    `);
    console.log('  ✅ Created index on whatsapp_web_messages.phone_number');
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_web_messages_timestamp 
      ON whatsapp_web_messages(timestamp DESC)
    `);
    console.log('  ✅ Created index on whatsapp_web_messages.timestamp');
    
    // Create whatsapp_integration_log table for tracking switches and events
    db.exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_integration_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_type TEXT NOT NULL CHECK(integration_type IN ('web', 'api')),
        event_type TEXT NOT NULL,
        event_data TEXT,
        admin_user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('  ✅ Created whatsapp_integration_log table');
    
    // Create index for log queries
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_integration_log_created 
      ON whatsapp_integration_log(created_at DESC)
    `);
    console.log('  ✅ Created index on whatsapp_integration_log.created_at');
    
    console.log('✅ Migration 051 completed successfully!');
  },
  
  down: () => {
    console.log('Rolling back Migration 051: WhatsApp Dual Integration System...');
    
    // Remove added configuration keys
    const keys = [
      'integration_type',
      'web_enabled',
      'api_enabled',
      'web_session_data',
      'web_qr_code',
      'web_connected',
      'web_last_connected'
    ];
    
    const stmt = db.prepare('DELETE FROM whatsapp_config WHERE key = ?');
    for (const key of keys) {
      try {
        stmt.run(key);
        console.log(`  ✅ Removed whatsapp_config: ${key}`);
      } catch (e) {
        console.error(`  ❌ Failed to remove ${key}: ${e.message}`);
      }
    }
    
    // Drop tables
    db.exec('DROP TABLE IF EXISTS whatsapp_web_messages');
    console.log('  ✅ Dropped whatsapp_web_messages table');
    
    db.exec('DROP TABLE IF EXISTS whatsapp_integration_log');
    console.log('  ✅ Dropped whatsapp_integration_log table');
    
    console.log('✅ Migration 051 rollback completed!');
  }
};
