/**
 * WhatsApp Webhook Routes
 * Provider-agnostic adapter for Jean AI on WhatsApp.
 * Supports WhatsApp Cloud API, Twilio, 360dialog via env config.
 * 
 * GET  /api/whatsapp/webhook  — Verification (challenge response)
 * POST /api/whatsapp/webhook  — Incoming messages
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const jean = require('../utils/jean/index');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Ensure whatsapp_sessions table exists
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL UNIQUE,
      user_id INTEGER,
      session_token TEXT,
      flow_state TEXT,
      last_message_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
} catch (e) {
  // Table already exists
}

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'wantokjobs-verify';
const API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Get or create a WhatsApp session for a phone number
 */
function getOrCreateSession(phoneNumber) {
  let session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  
  if (!session) {
    const token = crypto.randomBytes(16).toString('hex');
    db.prepare(
      'INSERT INTO whatsapp_sessions (phone_number, session_token) VALUES (?, ?)'
    ).run(phoneNumber, token);
    session = db.prepare('SELECT * FROM whatsapp_sessions WHERE phone_number = ?').get(phoneNumber);
  } else {
    // Update last_message_at
    db.prepare("UPDATE whatsapp_sessions SET last_message_at = datetime('now') WHERE id = ?").run(session.id);
  }
  
  return session;
}

/**
 * Try to find a linked user account by phone number
 */
function findUserByPhone(phoneNumber) {
  // Normalize: try with and without country code prefix
  const normalized = phoneNumber.replace(/^\+/, '');
  return db.prepare(
    "SELECT * FROM users WHERE REPLACE(REPLACE(phone, '+', ''), ' ', '') = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ? LIMIT 1"
  ).get(normalized, `%${normalized.slice(-8)}`);
}

/**
 * Strip HTML tags and format for WhatsApp plain text
 */
function formatForWhatsApp(text) {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '_$1_')
    .replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert quick replies to WhatsApp interactive buttons or numbered list
 */
function buildQuickReplyPayload(to, text, quickReplies) {
  if (!quickReplies || quickReplies.length === 0) {
    return { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
  }

  // WhatsApp interactive buttons support max 3
  if (quickReplies.length <= 3) {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: quickReplies.slice(0, 3).map((qr, i) => ({
            type: 'reply',
            reply: {
              id: `qr_${i}`,
              title: (typeof qr === 'string' ? qr : qr.label || qr.text).slice(0, 20),
            },
          })),
        },
      },
    };
  }

  // More than 3: use numbered list in text body
  const listText = quickReplies
    .map((qr, i) => `${i + 1}. ${typeof qr === 'string' ? qr : qr.label || qr.text}`)
    .join('\n');
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: `${text}\n\n${listText}\n\n_Reply with a number to choose._` },
  };
}

/**
 * Send a message via the WhatsApp API
 */
async function sendWhatsAppMessage(to, payload) {
  if (!API_TOKEN || !PHONE_ID) {
    logger.warn('WhatsApp API not configured — message not sent', { to });
    return null;
  }

  const url = `${API_URL}/${PHONE_ID}/messages`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error('WhatsApp API error', { status: res.status, body: errBody, to });
      return null;
    }

    return await res.json();
  } catch (err) {
    logger.error('WhatsApp send failed', { error: err.message, to });
    return null;
  }
}

// ─── Webhook Verification ──────────────────────────────────────────

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token: token?.slice(0, 4) + '...' });
  res.sendStatus(403);
});

// ─── Incoming Messages ─────────────────────────────────────────────

router.post('/webhook', async (req, res) => {
  // Respond 200 immediately (WhatsApp requires fast ack)
  res.sendStatus(200);

  try {
    const messages = extractMessages(req.body);
    
    for (const msg of messages) {
      await handleIncomingMessage(msg);
    }
  } catch (err) {
    logger.error('WhatsApp webhook processing error', { error: err.message, stack: err.stack });
  }
});

/**
 * Extract messages from various provider formats
 */
function extractMessages(body) {
  const messages = [];

  // WhatsApp Cloud API format
  if (body?.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        const msgs = value.messages || [];
        for (const m of msgs) {
          messages.push({
            from: m.from,
            type: m.type,
            text: m.text?.body || '',
            // Interactive button reply
            buttonReplyId: m.interactive?.button_reply?.id,
            buttonReplyTitle: m.interactive?.button_reply?.title,
            // Media
            mediaId: m.image?.id || m.document?.id,
            mediaType: m.type === 'image' ? 'image' : m.type === 'document' ? 'document' : null,
            mediaMime: m.image?.mime_type || m.document?.mime_type,
            caption: m.image?.caption || m.document?.caption,
            timestamp: m.timestamp,
          });
        }
      }
    }
    return messages;
  }

  // Twilio format
  if (body?.From && body?.Body !== undefined) {
    messages.push({
      from: body.From.replace('whatsapp:', '').replace('+', ''),
      type: body.NumMedia > 0 ? 'document' : 'text',
      text: body.Body || '',
      mediaId: body.MediaUrl0 || null,
      mediaType: body.MediaContentType0 || null,
      timestamp: Math.floor(Date.now() / 1000),
    });
    return messages;
  }

  // 360dialog / generic format
  if (body?.messages?.length) {
    for (const m of body.messages) {
      messages.push({
        from: m.from || m.phone,
        type: m.type || 'text',
        text: m.text?.body || m.body || m.text || '',
        timestamp: m.timestamp,
      });
    }
  }

  return messages;
}

/**
 * Handle a single incoming message
 */
async function handleIncomingMessage(msg) {
  const phone = msg.from;
  if (!phone) return;

  logger.info('WhatsApp message received', { from: phone, type: msg.type });

  const session = getOrCreateSession(phone);
  const user = session.user_id
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
    : findUserByPhone(phone);

  // Link user if found but not yet linked
  if (user && !session.user_id) {
    db.prepare('UPDATE whatsapp_sessions SET user_id = ? WHERE id = ?').run(user.id, session.id);
  }

  // Handle button replies — treat as text
  let messageText = msg.text;
  if (msg.buttonReplyTitle) {
    messageText = msg.buttonReplyTitle;
  }

  // Handle numbered list selections
  if (/^\d+$/.test(messageText?.trim())) {
    // Could map to previous quick replies — Jean will handle context
  }

  if (!messageText && msg.type === 'text') {
    return; // Empty message
  }

  // Handle media (resume uploads)
  let file = null;
  if (msg.mediaId && (msg.mediaType === 'document' || msg.mediaType === 'image')) {
    // For Cloud API, we'd need to download the media via GET /{media-id}
    // For now, pass caption as text and note the upload
    messageText = messageText || msg.caption || 'I sent a document';
    logger.info('WhatsApp media received', { from: phone, type: msg.mediaType, mime: msg.mediaMime });
    // TODO: Download media and pass as file to Jean
  }

  // Process through Jean
  try {
    const response = await jean.processMessage(messageText, {
      userId: user?.id || null,
      user: user || null,
      sessionToken: session.session_token,
      pageContext: 'whatsapp',
    });

    const formattedText = formatForWhatsApp(response.message);
    const payload = buildQuickReplyPayload(phone, formattedText, response.quickReplies);

    await sendWhatsAppMessage(phone, payload);
  } catch (err) {
    logger.error('Jean processing error for WhatsApp', { error: err.message, phone });
    await sendWhatsAppMessage(phone, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: 'Sorry, I had trouble processing that. Please try again! 🙏' },
    });
  }
}

module.exports = router;
