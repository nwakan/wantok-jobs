/**
 * WhatsApp Notification Queue
 * Queues WhatsApp messages to employers via the whatsapp_outbox table
 */

const logger = require('../logger');

/**
 * Send WhatsApp notification (queues to whatsapp_outbox)
 * @param {Object} db - Database instance
 * @param {string} phone - Phone number (international format)
 * @param {string} message - Message content
 * @returns {Object} - { success: true } or { error: 'message' }
 */
function sendWhatsAppNotification(db, phone, message) {
  try {
    if (!phone || !message) {
      return { error: 'Phone number and message are required' };
    }

    // Normalize phone number (remove spaces, ensure + prefix)
    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    
    db.prepare(`
      INSERT INTO whatsapp_outbox (phone, message, status, created_at)
      VALUES (?, ?, 'pending', datetime('now'))
    `).run(normalizedPhone, message);

    logger.info(`WhatsApp notification queued to ${normalizedPhone}`);
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to queue WhatsApp notification:', error.message);
    return { error: error.message };
  }
}

/**
 * Get pending outbox messages
 * @param {Object} db - Database instance
 * @param {number} limit - Max messages to retrieve
 * @returns {Array} - Pending messages
 */
function getPendingMessages(db, limit = 50) {
  try {
    return db.prepare(`
      SELECT * FROM whatsapp_outbox 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT ?
    `).all(limit);
  } catch (error) {
    logger.error('Failed to get pending WhatsApp messages:', error.message);
    return [];
  }
}

/**
 * Mark message as sent
 * @param {Object} db - Database instance
 * @param {number} id - Message ID
 * @returns {Object} - { success: true } or { error: 'message' }
 */
function markAsSent(db, id) {
  try {
    db.prepare(`
      UPDATE whatsapp_outbox 
      SET status = 'sent', sent_at = datetime('now')
      WHERE id = ?
    `).run(id);
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to mark message ${id} as sent:`, error.message);
    return { error: error.message };
  }
}

/**
 * Mark message as failed
 * @param {Object} db - Database instance
 * @param {number} id - Message ID
 * @param {string} errorMsg - Error message
 * @returns {Object} - { success: true } or { error: 'message' }
 */
function markAsFailed(db, id, errorMsg) {
  try {
    db.prepare(`
      UPDATE whatsapp_outbox 
      SET status = 'failed', error = ?, sent_at = datetime('now')
      WHERE id = ?
    `).run(errorMsg, id);
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to mark message ${id} as failed:`, error.message);
    return { error: error.message };
  }
}

module.exports = {
  sendWhatsAppNotification,
  getPendingMessages,
  markAsSent,
  markAsFailed,
};
