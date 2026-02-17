const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const ALLOWED_FIELDS = [
  'email_new_application', 'email_status_change', 'email_new_message',
  'email_job_alert', 'email_newsletter', 'push_enabled', 'sms_enabled'
];

const DEFAULTS = {
  email_new_application: 1,
  email_status_change: 1,
  email_new_message: 1,
  email_job_alert: 1,
  email_newsletter: 1,
  push_enabled: 0,
  sms_enabled: 0,
};

function ensurePreferences(userId) {
  let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
  if (!prefs) {
    db.prepare(`INSERT INTO notification_preferences (user_id) VALUES (?)`).run(userId);
    prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
  }
  return prefs;
}

// GET /api/notification-preferences
router.get('/', authenticateToken, (req, res) => {
  try {
    const prefs = ensurePreferences(req.user.id);
    res.json(prefs);
  } catch (error) {
    logger.error('Failed to get notification preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// PATCH /api/notification-preferences
router.patch('/', authenticateToken, (req, res) => {
  try {
    ensurePreferences(req.user.id);

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] ? 1 : 0;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE notification_preferences SET ${setClauses}, updated_at = datetime('now') WHERE user_id = ?`)
      .run(...values, req.user.id);

    const prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(req.user.id);
    res.json(prefs);
  } catch (error) {
    logger.error('Failed to update notification preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/notification-preferences/unsubscribe?token=X&type=newsletter
router.get('/unsubscribe', (req, res) => {
  try {
    const { token, type } = req.query;
    if (!token || !type) {
      return res.status(400).send('Invalid unsubscribe link');
    }

    const fieldMap = {
      newsletter: 'email_newsletter',
      new_application: 'email_new_application',
      status_change: 'email_status_change',
      new_message: 'email_new_message',
      job_alert: 'email_job_alert',
    };

    const field = fieldMap[type];
    if (!field) {
      return res.status(400).send('Invalid notification type');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).send('Invalid or expired unsubscribe link');
    }

    if (!decoded.userId || decoded.purpose !== 'unsubscribe') {
      return res.status(400).send('Invalid unsubscribe token');
    }

    ensurePreferences(decoded.userId);
    db.prepare(`UPDATE notification_preferences SET ${field} = 0, updated_at = datetime('now') WHERE user_id = ?`)
      .run(decoded.userId);

    const BASE_URL = process.env.APP_URL || 'https://wantokjobs.com';
    res.send(`
      <!DOCTYPE html>
      <html><head><title>Unsubscribed — WantokJobs</title>
      <style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb;}
      .card{background:#fff;border-radius:12px;padding:40px;max-width:400px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.1);}
      h1{color:#059669;margin-bottom:8px;}p{color:#6b7280;margin-bottom:24px;}
      a{color:#059669;text-decoration:none;font-weight:600;}</style></head>
      <body><div class="card">
        <h1>✅ Unsubscribed</h1>
        <p>You've been unsubscribed from ${type.replace('_', ' ')} emails.</p>
        <p>You can manage all notification preferences in your <a href="${BASE_URL}/dashboard/settings">account settings</a>.</p>
      </div></body></html>
    `);
  } catch (error) {
    logger.error('Unsubscribe error', { error: error.message });
    res.status(500).send('Something went wrong');
  }
});

// Helper: generate unsubscribe token for a user
function generateUnsubscribeToken(userId) {
  return jwt.sign({ userId, purpose: 'unsubscribe' }, JWT_SECRET, { expiresIn: '90d' });
}

// Helper: check if user has a specific email preference enabled
function isEmailEnabled(userId, preferenceField) {
  try {
    const prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
    if (!prefs) return true; // Default to enabled if no preferences set
    return prefs[preferenceField] === 1;
  } catch {
    return true; // Default to enabled on error
  }
}

module.exports = router;
module.exports.generateUnsubscribeToken = generateUnsubscribeToken;
module.exports.isEmailEnabled = isEmailEnabled;
module.exports.ensurePreferences = ensurePreferences;
