/**
 * WhatsApp Service Router
 * 
 * Routes WhatsApp messages between two integration types:
 * 1. Web.js (whatsapp-web.js) - QR code-based browser automation
 * 2. WhatsApp API (Meta Cloud API) - Official Business API
 * 
 * Features:
 * - Mutual exclusivity enforcement (only one integration active at a time)
 * - Automatic routing based on configuration
 * - Unified message sending interface
 * - Integration switching with validation
 * - Status monitoring across both systems
 * 
 * Created: 2026-04-05
 */

const db = require('../database');
const logger = require('../utils/logger');
const webService = require('../services/whatsapp-web-service');

/**
 * Get current integration configuration
 */
function getIntegrationConfig() {
  const stmt = db.prepare(`
    SELECT key, value 
    FROM whatsapp_config 
    WHERE key IN ('integration_type', 'web_enabled', 'api_enabled')
  `);
  const rows = stmt.all();
  
  const config = {};
  rows.forEach(row => {
    config[row.key] = row.value;
  });
  
  return {
    type: config.integration_type || 'api',
    webEnabled: config.web_enabled === '1',
    apiEnabled: config.api_enabled === '1'
  };
}

/**
 * Set integration type and enforce mutual exclusivity
 */
function setIntegrationType(type, adminUserId = null) {
  if (!['web', 'api'].includes(type)) {
    throw new Error('Invalid integration type. Must be "web" or "api".');
  }
  
  const transaction = db.transaction(() => {
    // Update integration type
    db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?')
      .run(type, 'integration_type');
    
    // Enforce mutual exclusivity
    if (type === 'web') {
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('1', 'web_enabled');
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('0', 'api_enabled');
    } else {
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('0', 'web_enabled');
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('1', 'api_enabled');
    }
    
    // Log the change
    db.prepare(`
      INSERT INTO whatsapp_integration_log (integration_type, event_type, event_data, admin_user_id)
      VALUES (?, 'integration_switched', ?, ?)
    `).run(type, JSON.stringify({ from: type === 'web' ? 'api' : 'web', to: type }), adminUserId);
  });
  
  transaction();
  
  logger.info('WhatsApp integration type switched', { type, adminUserId });
  
  return { success: true, type };
}

/**
 * Validate that only one integration is enabled
 */
function validateMutualExclusivity() {
  const config = getIntegrationConfig();
  
  if (config.webEnabled && config.apiEnabled) {
    logger.error('CRITICAL: Both WhatsApp integrations are enabled simultaneously!');
    
    // Auto-fix: disable the one that's not set as primary
    const primaryType = config.type;
    if (primaryType === 'api') {
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('0', 'web_enabled');
      logger.info('Auto-fixed: Disabled Web.js integration (API is primary)');
    } else {
      db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run('0', 'api_enabled');
      logger.info('Auto-fixed: Disabled API integration (Web.js is primary)');
    }
    
    return false;
  }
  
  if (!config.webEnabled && !config.apiEnabled) {
    logger.warn('Neither WhatsApp integration is enabled');
    return false;
  }
  
  return true;
}

/**
 * Get active integration type
 */
function getActiveIntegration() {
  const config = getIntegrationConfig();
  
  if (!validateMutualExclusivity()) {
    return null;
  }
  
  return config.type;
}

/**
 * Send message via active integration
 */
async function sendMessage(phoneNumber, messageText) {
  const activeIntegration = getActiveIntegration();
  
  if (!activeIntegration) {
    throw new Error('No WhatsApp integration is currently active');
  }
  
  logger.info('Routing WhatsApp message', { integration: activeIntegration, phone: phoneNumber });
  
  try {
    if (activeIntegration === 'web') {
      // Send via Web.js
      return await webService.sendMessage(phoneNumber, messageText);
    } else {
      // Send via API (enqueue to whatsapp_outbox)
      const result = db.prepare(`
        INSERT INTO whatsapp_outbox (phone, message, status, created_at)
        VALUES (?, ?, 'queued', datetime('now'))
      `).run(phoneNumber, messageText);
      
      logger.info('Message queued for Meta Cloud API delivery', { 
        messageId: result.lastInsertRowid, 
        phone: phoneNumber 
      });
      
      return { success: true, messageId: result.lastInsertRowid, queued: true };
    }
  } catch (e) {
    logger.error('Failed to send WhatsApp message', { 
      error: e.message, 
      integration: activeIntegration,
      phone: phoneNumber 
    });
    throw e;
  }
}

/**
 * Get status of both integrations
 */
function getIntegrationStatus() {
  const config = getIntegrationConfig();
  
  // Get Web.js status
  const webStatus = webService.getStatus();
  
  // Get API status (check if credentials exist)
  const apiConfig = db.prepare(`
    SELECT key, value 
    FROM whatsapp_config 
    WHERE key IN ('api_token', 'phone_number_id', 'webhook_verify_token')
  `).all();
  
  const apiCredentials = {};
  apiConfig.forEach(row => {
    apiCredentials[row.key] = row.value;
  });
  
  const apiConfigured = !!(apiCredentials.api_token && apiCredentials.phone_number_id);
  
  // Get message statistics
  const webStats = webService.getStats();
  
  const apiStats = db.prepare(`
    SELECT
      COUNT(*) as total_messages,
      SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) as failed
    FROM whatsapp_outbox
  `).get();
  
  return {
    current: config.type,
    web: {
      enabled: config.webEnabled,
      connected: webStatus.connected,
      lastConnected: webStatus.lastConnected,
      hasQRCode: webStatus.hasQRCode,
      isInitializing: webStatus.isInitializing,
      stats: webStats
    },
    api: {
      enabled: config.apiEnabled,
      configured: apiConfigured,
      hasToken: !!apiCredentials.api_token,
      hasPhoneId: !!apiCredentials.phone_number_id,
      stats: apiStats
    },
    isValid: validateMutualExclusivity()
  };
}

/**
 * Switch to Web.js integration
 */
async function switchToWebIntegration(adminUserId = null) {
  logger.info('Switching to Web.js integration', { adminUserId });
  
  // Set integration type to 'web'
  setIntegrationType('web', adminUserId);
  
  // Check if Web.js client is already running
  const webStatus = webService.getStatus();
  
  if (!webStatus.connected && !webStatus.isInitializing) {
    // Initialize Web.js client
    const result = await webService.initWebClient();
    
    if (!result.success) {
      logger.error('Failed to initialize Web.js client', { error: result.message });
      return { success: false, message: result.message };
    }
  }
  
  return { success: true, message: 'Switched to Web.js integration' };
}

/**
 * Switch to API integration
 */
async function switchToAPIIntegration(adminUserId = null) {
  logger.info('Switching to API integration', { adminUserId });
  
  // Set integration type to 'api'
  setIntegrationType('api', adminUserId);
  
  // Check if Web.js client is running and disconnect it
  const webStatus = webService.getStatus();
  
  if (webStatus.connected) {
    await webService.disconnectWebClient();
    logger.info('Disconnected Web.js client');
  }
  
  return { success: true, message: 'Switched to API integration' };
}

/**
 * Get recent integration events
 */
function getIntegrationHistory(limit = 50) {
  return db.prepare(`
    SELECT *
    FROM whatsapp_integration_log
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Health check for active integration
 */
async function healthCheck() {
  const activeIntegration = getActiveIntegration();
  
  if (!activeIntegration) {
    return {
      healthy: false,
      message: 'No integration is active',
      details: null
    };
  }
  
  if (activeIntegration === 'web') {
    const webStatus = webService.getStatus();
    
    return {
      healthy: webStatus.connected,
      integration: 'web',
      message: webStatus.connected ? 'Web.js client connected' : 'Web.js client not connected',
      details: webStatus
    };
  } else {
    const apiConfig = db.prepare(`
      SELECT key, value 
      FROM whatsapp_config 
      WHERE key IN ('api_token', 'phone_number_id')
    `).all();
    
    const hasToken = apiConfig.some(row => row.key === 'api_token' && row.value);
    const hasPhoneId = apiConfig.some(row => row.key === 'phone_number_id' && row.value);
    
    const healthy = hasToken && hasPhoneId;
    
    return {
      healthy,
      integration: 'api',
      message: healthy ? 'API configured with credentials' : 'API missing credentials',
      details: {
        hasToken,
        hasPhoneId
      }
    };
  }
}

module.exports = {
  getIntegrationConfig,
  setIntegrationType,
  validateMutualExclusivity,
  getActiveIntegration,
  sendMessage,
  getIntegrationStatus,
  switchToWebIntegration,
  switchToAPIIntegration,
  getIntegrationHistory,
  healthCheck
};
