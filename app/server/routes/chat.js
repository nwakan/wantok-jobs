/**
 * Jean Chat API Routes
 * POST /api/chat           — Send a text message to Jean
 * POST /api/chat/upload    — Send a message with file attachment
 * GET  /api/chat/history   — Get chat history
 * GET  /api/chat/settings  — Get Jean's public settings (greeting, enabled, etc.)
 * 
 * Admin routes:
 * GET    /api/chat/admin/settings    — Get all Jean settings
 * PUT    /api/chat/admin/settings    — Update Jean settings
 * GET    /api/chat/admin/stats       — Chat analytics
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jean = require('../utils/jean/index');
const actions = require('../utils/jean/actions');
const { runAutoApply } = require('../utils/jean/automations');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const logger = require('../utils/logger');
const db = require('../database');

// File upload config for document parsing
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const uploadDir = path.join(dataDir, 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const chatUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx)$/i;
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.test(path.extname(file.originalname)) || allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are supported'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─── Optional auth middleware (doesn't reject if no token) ────────
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  // Use the real auth middleware but catch failures
  authenticateToken(req, res, (err) => {
    if (err) req.user = null;
    next();
  });
}

// ─── Public Settings ─────────────────────────────────────

/**
 * GET /api/chat/settings
 * Returns Jean's public-facing config for the widget
 */
router.get('/settings', (req, res) => {
  try {
    const enabled = actions.isFeatureEnabled(db, 'jean_enabled');
    const voiceEnabled = actions.isFeatureEnabled(db, 'voice_enabled');
    const greeting = actions.getSetting(db, 'jean_greeting');
    const offlineMessage = actions.getSetting(db, 'jean_offline_message');
    const proactive = actions.isFeatureEnabled(db, 'proactive_triggers_enabled');
    const guestChat = actions.isFeatureEnabled(db, 'guest_chat_enabled');

    res.json({
      enabled,
      voiceEnabled,
      greeting,
      offlineMessage,
      proactive,
      guestChat,
    });
  } catch (error) {
    logger.error('Chat settings error', { error: error.message });
    res.status(500).json({ error: 'Failed to load chat settings' });
  }
});

// ─── Chat Message ────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { message, sessionToken?, pageContext? }
 */
router.post('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { message, sessionToken, pageContext } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const user = req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    } : null;

    const response = await jean.processMessage(message.trim(), {
      userId: req.user?.id || null,
      user,
      sessionToken,
      pageContext,
    });

    res.json({
      message: response.message,
      quickReplies: response.quickReplies || null,
      sessionToken: response.sessionToken,
      intent: response.intent || null,
    });
  } catch (error) {
    logger.error('Chat error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ─── File Upload Chat ────────────────────────────────────

/**
 * POST /api/chat/upload
 * Multipart: file + message? + sessionToken? + pageContext?
 */
router.post('/upload', optionalAuthMiddleware, chatUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    } : null;

    const response = await jean.processMessage(req.body.message || 'Uploaded document', {
      userId: req.user?.id || null,
      user,
      sessionToken: req.body.sessionToken,
      pageContext: req.body.pageContext ? JSON.parse(req.body.pageContext) : null,
      file: {
        path: req.file.path,
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    // Clean up temp file after processing
    setTimeout(() => {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }, 60000);

    res.json({
      message: response.message,
      quickReplies: response.quickReplies || null,
      sessionToken: response.sessionToken,
    });
  } catch (error) {
    logger.error('Chat upload error', { error: error.message });
    res.status(500).json({ error: 'Failed to process uploaded document' });
  }
});

// ─── Chat History ────────────────────────────────────────

/**
 * GET /api/chat/history?sessionToken=xxx
 */
router.get('/history', optionalAuthMiddleware, (req, res) => {
  try {
    const { sessionToken } = req.query;
    const session = jean.getSession(req.user?.id || null, sessionToken);
    if (!session) return res.json({ messages: [] });

    const messages = jean.getHistory(session.id, 50);
    res.json({ messages, sessionToken: session.session_token });
  } catch (error) {
    logger.error('Chat history error', { error: error.message });
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// ─── Admin: Settings ─────────────────────────────────────

/**
 * GET /api/chat/admin/settings
 */
router.get('/admin/settings', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const settings = actions.getSettings(db);
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /api/chat/admin/settings
 * Body: { key, value }
 */
router.put('/admin/settings', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value required' });
    }

    // Validate key exists
    const existing = db.prepare('SELECT key FROM jean_settings WHERE key = ?').get(key);
    if (!existing) {
      return res.status(404).json({ error: `Unknown setting: ${key}` });
    }

    // Validate boolean settings
    const boolSettings = [
      'jean_enabled', 'voice_enabled', 'auto_apply_enabled', 'auto_post_enabled',
      'linkedin_import_enabled', 'document_parse_enabled', 'guest_chat_enabled',
      'proactive_triggers_enabled',
    ];
    if (boolSettings.includes(key) && !['true', 'false'].includes(String(value))) {
      return res.status(400).json({ error: `${key} must be 'true' or 'false'` });
    }

    // Validate numeric settings
    const numSettings = ['max_auto_apply_daily', 'max_linkedin_scrapes_hourly', 'auto_apply_min_match_score'];
    if (numSettings.includes(key)) {
      const num = parseInt(value);
      if (isNaN(num) || num < 0) return res.status(400).json({ error: `${key} must be a positive number` });
    }

    actions.updateSetting(db, key, String(value));
    logger.info('Jean setting updated', { key, value, admin: req.user.id });
    res.json({ success: true, key, value: String(value) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * PUT /api/chat/admin/settings/bulk
 * Body: { settings: { key: value, ... } }
 */
router.put('/admin/settings/bulk', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const existing = db.prepare('SELECT key FROM jean_settings WHERE key = ?').get(key);
      if (existing) {
        actions.updateSetting(db, key, String(value));
        results.push({ key, value: String(value), updated: true });
      } else {
        results.push({ key, error: 'unknown setting' });
      }
    }

    logger.info('Jean bulk settings update', { count: results.length, admin: req.user.id });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─── Admin: Stats ────────────────────────────────────────

/**
 * GET /api/chat/admin/stats
 */
router.get('/admin/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const totalSessions = db.prepare('SELECT COUNT(*) as c FROM jean_sessions').get().c;
    const totalMessages = db.prepare('SELECT COUNT(*) as c FROM jean_messages').get().c;
    const todaySessions = db.prepare(
      "SELECT COUNT(*) as c FROM jean_sessions WHERE date(created_at) = date('now')"
    ).get().c;
    const todayMessages = db.prepare(
      "SELECT COUNT(*) as c FROM jean_messages WHERE date(created_at) = date('now')"
    ).get().c;
    const uniqueUsers = db.prepare(
      'SELECT COUNT(DISTINCT user_id) as c FROM jean_sessions WHERE user_id IS NOT NULL'
    ).get().c;
    const guestSessions = db.prepare(
      'SELECT COUNT(*) as c FROM jean_sessions WHERE user_id IS NULL'
    ).get().c;

    // Auto-apply stats
    const autoApplyRules = db.prepare('SELECT COUNT(*) as c FROM jean_auto_apply WHERE active = 1').get().c;
    const autoApplyToday = db.prepare(
      "SELECT COUNT(*) as c FROM jean_auto_apply_log WHERE date(created_at) = date('now')"
    ).get().c;

    // Job drafts
    const pendingDrafts = db.prepare(
      "SELECT COUNT(*) as c FROM jean_job_drafts WHERE status = 'draft'"
    ).get().c;

    // Popular intents (from message metadata)
    const recentIntents = db.prepare(`
      SELECT json_extract(metadata, '$.intent') as intent, COUNT(*) as count
      FROM jean_messages
      WHERE role = 'jean' AND metadata IS NOT NULL
      AND created_at >= datetime('now', '-7 days')
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({
      sessions: { total: totalSessions, today: todaySessions, uniqueUsers, guest: guestSessions },
      messages: { total: totalMessages, today: todayMessages },
      autoApply: { activeRules: autoApplyRules, applicationsToday: autoApplyToday },
      drafts: { pending: pendingDrafts },
      topIntents: recentIntents,
    });
  } catch (error) {
    logger.error('Chat admin stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ─── Admin: Trigger Auto-Apply Run ───────────────────────

/**
 * POST /api/chat/admin/run-auto-apply
 */
router.post('/admin/run-auto-apply', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const results = runAutoApply(db);
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Manual auto-apply run error', { error: error.message });
    res.status(500).json({ error: 'Auto-apply run failed' });
  }
});

module.exports = router;
