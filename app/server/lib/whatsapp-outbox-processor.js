/**
 * WhatsApp Outbox Processor
 * Reads pending messages from whatsapp_outbox table and sends via Meta Cloud API.
 * Called by payment-cron.sh every 5 minutes, or on-demand via API.
 * 
 * Required env vars:
 *   WHATSAPP_TOKEN       - Meta permanent access token
 *   WHATSAPP_PHONE_ID    - Meta phone number ID
 */

const db = require('../database');
const logger = require('../utils/logger');

const META_API_VERSION = 'v19.0';
const MAX_BATCH = 50;
const RETRY_LIMIT = 3;

/**
 * Send a single message via Meta Cloud API
 */
async function sendViaMeta(phone, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    throw new Error('WHATSAPP_TOKEN and WHATSAPP_PHONE_ID must be set in .env');
  }

  // Normalize phone: must start with country code, no +
  const normalized = phone.replace(/[^0-9]/g, '');

  const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalized,
    type: 'text',
    text: { body: message, preview_url: false },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Meta API error ${res.status}: ${errMsg}`);
  }

  return data;
}

/**
 * Process all pending outbox messages
 * Returns { sent, failed, skipped }
 */
async function processOutbox() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    logger.warn('WhatsApp Outbox: WHATSAPP_TOKEN/WHATSAPP_PHONE_ID not configured. Messages will queue but not send.');
    return { sent: 0, failed: 0, skipped: 0, reason: 'not_configured' };
  }

  const pending = db.prepare(`
    SELECT * FROM whatsapp_outbox
    WHERE status = 'pending' AND (retry_count IS NULL OR retry_count < ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(RETRY_LIMIT, MAX_BATCH);

  if (!pending.length) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  logger.info(`WhatsApp Outbox: Processing ${pending.length} pending messages`);

  let sent = 0, failed = 0, skipped = 0;

  for (const msg of pending) {
    try {
      if (!msg.phone || msg.phone.length < 7) {
        db.prepare(`UPDATE whatsapp_outbox SET status = 'failed', error = 'Invalid phone number', sent_at = datetime('now') WHERE id = ?`).run(msg.id);
        skipped++;
        continue;
      }

      await sendViaMeta(msg.phone, msg.message);

      db.prepare(`
        UPDATE whatsapp_outbox
        SET status = 'sent', sent_at = datetime('now'), error = NULL
        WHERE id = ?
      `).run(msg.id);

      logger.info(`WhatsApp Outbox: Sent to ${msg.phone} (id=${msg.id})`);
      sent++;

      // Rate limit: Meta allows ~80 msg/sec, we stay conservative
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      const retryCount = (msg.retry_count || 0) + 1;
      const isFinal = retryCount >= RETRY_LIMIT;

      db.prepare(`
        UPDATE whatsapp_outbox
        SET status = ?, error = ?, retry_count = ?, sent_at = CASE WHEN ? THEN datetime('now') ELSE sent_at END
        WHERE id = ?
      `).run(
        isFinal ? 'failed' : 'pending',
        err.message,
        retryCount,
        isFinal ? 1 : 0,
        msg.id
      );

      logger.error(`WhatsApp Outbox: Failed id=${msg.id} (attempt ${retryCount}/${RETRY_LIMIT}): ${err.message}`);
      failed++;
    }
  }

  logger.info(`WhatsApp Outbox complete: sent=${sent} failed=${failed} skipped=${skipped}`);
  return { sent, failed, skipped };
}

/**
 * Get outbox stats
 */
function getOutboxStats() {
  try {
    return {
      pending: db.prepare(`SELECT COUNT(*) as c FROM whatsapp_outbox WHERE status = 'pending'`).get()?.c || 0,
      sent: db.prepare(`SELECT COUNT(*) as c FROM whatsapp_outbox WHERE status = 'sent'`).get()?.c || 0,
      failed: db.prepare(`SELECT COUNT(*) as c FROM whatsapp_outbox WHERE status = 'failed'`).get()?.c || 0,
      recent: db.prepare(`SELECT * FROM whatsapp_outbox ORDER BY created_at DESC LIMIT 10`).all(),
    };
  } catch (e) {
    return { pending: 0, sent: 0, failed: 0, recent: [] };
  }
}

module.exports = { processOutbox, sendViaMeta, getOutboxStats };