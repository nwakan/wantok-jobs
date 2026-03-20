/**
 * Jean AI Chat Route
 * Connects /api/chat endpoints to the Jean AI engine (server/utils/jean/index.js)
 * Supports: SSE streaming (GET), JSON POST, conversation history, auth-aware responses
 */

const express = require('express');
const router = express.Router();
const jean = require('../utils/jean/index');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const debug = (...args) => process.env.DEBUG && console.log('[JeanChat]', ...args);

/**
 * Optional auth middleware — doesn't reject unauthenticated users,
 * just attaches user if token is valid (Jean handles guest vs. auth responses)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const { authenticateToken: auth, JWT_SECRET } = require('../middleware/auth');
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (e) {
    // Invalid token — continue as guest
  }
  next();
}

/**
 * POST /api/chat/stream
 * Main chat endpoint — calls Jean AI processMessage and returns JSON response
 * Also supports SSE streaming via Accept: text/event-stream header
 */
router.post('/stream', optionalAuth, express.json(), async (req, res) => {
  const isSSE = req.headers['accept'] === 'text/event-stream';

  try {
    const {
      message,
      sessionToken,
      pageContext = 'web',
      conversationHistory = [],
      file,
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.user?.id || null;
    const user = req.user || null;

    debug('Processing message:', { userId, pageContext, msgLen: message.length });

    // Call Jean AI engine
    const response = await jean.processMessage(message.trim(), {
      userId,
      user,
      pageContext,
      sessionToken,
      conversationHistory,
      file,
      channel: 'web',
    });

    if (isSSE) {
      // Server-Sent Events streaming format
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Stream the message word by word for a natural feel
      const words = (response.message || '').split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ chunk, type: 'token' })}

`);
        await new Promise(r => setTimeout(r, 18)); // ~55 words/sec
      }

      // Send final event with full response metadata
      res.write(`data: ${JSON.stringify({
        type: 'done',
        message: response.message,
        quickReplies: response.quickReplies || [],
        intent: response.intent,
        sessionToken: response.sessionToken,
        actions: response.actions || [],
      })}

`);
      res.end();

    } else {
      // Standard JSON response
      return res.json({
        message: response.message,
        quickReplies: response.quickReplies || [],
        intent: response.intent,
        sessionToken: response.sessionToken,
        actions: response.actions || [],
      });
    }

  } catch (err) {
    logger.error('[Jean Chat] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat service error. Please try again.' });
    }
  }
});

/**
 * GET /api/chat/stream
 * SSE GET endpoint — redirect to POST
 */
router.get('/stream', optionalAuth, (req, res) => {
  res.status(405).json({ error: 'Use POST /api/chat/stream for chat messages' });
});

/**
 * GET /api/chat/health
 * Health check for Jean AI
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'jean-chat', timestamp: new Date().toISOString() });
});

module.exports = router;
