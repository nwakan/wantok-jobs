/**
 * WhatsApp Web.js Service
 * 
 * Handles WhatsApp integration via whatsapp-web.js library (QR code-based)
 * Alternative to Meta Cloud API integration
 * 
 * Features:
 * - QR code generation for phone scanning
 * - Session persistence across restarts
 * - Message handling (send/receive)
 * - Connection status tracking
 * - Jean AI integration for automated responses
 * 
 * Created: 2026-04-05
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('../database');
const logger = require('../utils/logger');
const jean = require('../utils/jean/index');

let client = null;
let qrCodeData = null;
let isInitializing = false;
let isConnected = false;

/**
 * Get current WhatsApp Web.js configuration from database
 */
function getConfig() {
  const stmt = db.prepare('SELECT key, value FROM whatsapp_config WHERE key LIKE "web_%"');
  const rows = stmt.all();
  
  const config = {};
  rows.forEach(row => {
    config[row.key] = row.value;
  });
  
  return config;
}

/**
 * Update configuration value in database
 */
function setConfig(key, value) {
  db.prepare('UPDATE whatsapp_config SET value=? WHERE key=?').run(value, key);
}

/**
 * Log integration event
 */
function logEvent(eventType, eventData = null, adminUserId = null) {
  try {
    db.prepare(`
      INSERT INTO whatsapp_integration_log (integration_type, event_type, event_data, admin_user_id)
      VALUES (?, ?, ?, ?)
    `).run('web', eventType, eventData ? JSON.stringify(eventData) : null, adminUserId);
  } catch (e) {
    logger.error('Failed to log WhatsApp Web event', { error: e.message });
  }
}

/**
 * Initialize WhatsApp Web.js client
 */
async function initWebClient() {
  if (client || isInitializing) {
    logger.warn('WhatsApp Web client already initializing or initialized');
    return { success: false, message: 'Client already active' };
  }
  
  isInitializing = true;
  
  try {
    logger.info('Initializing WhatsApp Web client...');
    
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'wantokjobs-web',
        dataPath: './whatsapp-web-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });
    
    // QR Code event
    client.on('qr', async (qr) => {
      try {
        qrCodeData = await qrcode.toDataURL(qr);
        setConfig('web_qr_code', qrCodeData);
        logger.info('WhatsApp Web QR code generated');
        logEvent('qr_generated');
      } catch (e) {
        logger.error('Failed to generate QR code', { error: e.message });
      }
    });
    
    // Ready event
    client.on('ready', () => {
      isConnected = true;
      setConfig('web_connected', '1');
      setConfig('web_last_connected', new Date().toISOString());
      setConfig('web_qr_code', ''); // Clear QR code after connection
      qrCodeData = null;
      
      logger.info('WhatsApp Web client ready and connected');
      logEvent('connected', { timestamp: new Date().toISOString() });
    });
    
    // Authenticated event
    client.on('authenticated', () => {
      logger.info('WhatsApp Web client authenticated');
      logEvent('authenticated');
    });
    
    // Authentication failure event
    client.on('auth_failure', (error) => {
      logger.error('WhatsApp Web authentication failed', { error: error.message });
      logEvent('auth_failure', { error: error.message });
      
      setConfig('web_connected', '0');
      isConnected = false;
    });
    
    // Message event (incoming messages)
    client.on('message', async (msg) => {
      try {
        await handleIncomingMessage(msg);
      } catch (e) {
        logger.error('Failed to handle incoming WhatsApp message', { error: e.message });
      }
    });
    
    // Disconnected event
    client.on('disconnected', (reason) => {
      setConfig('web_connected', '0');
      isConnected = false;
      
      logger.warn('WhatsApp Web client disconnected', { reason });
      logEvent('disconnected', { reason });
      
      // Cleanup
      client = null;
      qrCodeData = null;
      isInitializing = false;
    });
    
    // Initialize client
    await client.initialize();
    
    isInitializing = false;
    
    return { success: true, message: 'Client initializing' };
  } catch (e) {
    logger.error('Failed to initialize WhatsApp Web client', { error: e.message, stack: e.stack });
    logEvent('init_error', { error: e.message });
    
    isInitializing = false;
    client = null;
    
    return { success: false, message: e.message };
  }
}

/**
 * Disconnect WhatsApp Web.js client
 */
async function disconnectWebClient() {
  if (!client) {
    return { success: false, message: 'No active client' };
  }
  
  try {
    await client.destroy();
    
    setConfig('web_connected', '0');
    setConfig('web_qr_code', '');
    
    client = null;
    qrCodeData = null;
    isConnected = false;
    isInitializing = false;
    
    logger.info('WhatsApp Web client disconnected successfully');
    logEvent('manual_disconnect');
    
    return { success: true, message: 'Disconnected successfully' };
  } catch (e) {
    logger.error('Failed to disconnect WhatsApp Web client', { error: e.message });
    return { success: false, message: e.message };
  }
}

/**
 * Get current QR code for display
 */
function getQRCode() {
  const config = getConfig();
  return config.web_qr_code || null;
}

/**
 * Get connection status
 */
function getStatus() {
  const config = getConfig();
  
  return {
    connected: config.web_connected === '1',
    enabled: config.web_enabled === '1',
    lastConnected: config.web_last_connected || null,
    hasQRCode: !!(config.web_qr_code),
    isInitializing
  };
}

/**
 * Send message via WhatsApp Web.js
 */
async function sendMessage(phoneNumber, messageText) {
  if (!client || !isConnected) {
    throw new Error('WhatsApp Web client not connected');
  }
  
  try {
    // Format phone number for WhatsApp (remove non-digits, add @c.us)
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '') + '@c.us';
    
    // Send message
    const sentMsg = await client.sendMessage(formattedPhone, messageText);
    
    // Log to database
    db.prepare(`
      INSERT INTO whatsapp_web_messages (chat_id, phone_number, message_text, direction, message_id, timestamp)
      VALUES (?, ?, ?, 'outbound', ?, ?)
    `).run(
      formattedPhone,
      phoneNumber,
      messageText,
      sentMsg.id.id,
      sentMsg.timestamp
    );
    
    logger.info('WhatsApp Web message sent', { phone: phoneNumber, messageId: sentMsg.id.id });
    
    return { success: true, messageId: sentMsg.id.id };
  } catch (e) {
    logger.error('Failed to send WhatsApp Web message', { error: e.message, phone: phoneNumber });
    throw e;
  }
}

/**
 * Handle incoming WhatsApp message
 */
async function handleIncomingMessage(msg) {
  try {
    // Extract phone number
    const phoneNumber = msg.from.replace('@c.us', '');
    
    // Log to database
    db.prepare(`
      INSERT INTO whatsapp_web_messages (chat_id, phone_number, message_text, direction, message_id, timestamp)
      VALUES (?, ?, ?, 'inbound', ?, ?)
    `).run(
      msg.from,
      phoneNumber,
      msg.body,
      msg.id.id,
      msg.timestamp
    );
    
    logger.info('WhatsApp Web message received', { phone: phoneNumber, messageId: msg.id.id });
    
    // Check if message is from a broadcast or group (ignore)
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) {
      logger.info('Ignoring group/broadcast message');
      return;
    }
    
    // Get or create Jean AI session for this phone number
    let jeanSession = db.prepare('SELECT * FROM jean_sessions WHERE phone_number = ?').get(phoneNumber);
    
    if (!jeanSession) {
      const result = db.prepare(`
        INSERT INTO jean_sessions (phone_number, platform, context)
        VALUES (?, 'whatsapp_web', '{}')
      `).run(phoneNumber);
      
      jeanSession = db.prepare('SELECT * FROM jean_sessions WHERE id = ?').get(result.lastInsertRowid);
    }
    
    // Get conversation history
    const history = db.prepare(`
      SELECT message_text as content, direction as role
      FROM whatsapp_web_messages
      WHERE phone_number = ?
      ORDER BY timestamp DESC
      LIMIT 10
    `).all(phoneNumber).reverse();
    
    // Map direction to role (inbound = user, outbound = assistant)
    const conversationHistory = history.map(h => ({
      role: h.role === 'inbound' ? 'user' : 'assistant',
      content: h.content
    }));
    
    // Process message with Jean AI
    const jeanResponse = await jean.processMessage(msg.body, {
      conversationHistory,
      sessionId: jeanSession.id,
      userId: jeanSession.user_id,
      context: `WhatsApp Web conversation with ${phoneNumber}`,
      platform: 'whatsapp_web'
    });
    
    // Send response back to user
    if (jeanResponse && jeanResponse.response) {
      await sendMessage(phoneNumber, jeanResponse.response);
    }
    
    // Mark message as processed
    db.prepare('UPDATE whatsapp_web_messages SET processed=1 WHERE message_id=?').run(msg.id.id);
    
  } catch (e) {
    logger.error('Failed to handle incoming WhatsApp Web message', { error: e.message, stack: e.stack });
  }
}

/**
 * Get recent messages for a phone number
 */
function getMessages(phoneNumber, limit = 50) {
  return db.prepare(`
    SELECT *
    FROM whatsapp_web_messages
    WHERE phone_number = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(phoneNumber, limit).reverse();
}

/**
 * Get message statistics
 */
function getStats() {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_messages,
      SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END) as inbound,
      SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END) as outbound,
      COUNT(DISTINCT phone_number) as unique_contacts,
      SUM(CASE WHEN processed=1 THEN 1 ELSE 0 END) as processed,
      SUM(CASE WHEN processed=0 THEN 1 ELSE 0 END) as pending
    FROM whatsapp_web_messages
  `).get();
  
  return stats;
}

module.exports = {
  initWebClient,
  disconnectWebClient,
  getQRCode,
  getStatus,
  sendMessage,
  getMessages,
  getStats
};
