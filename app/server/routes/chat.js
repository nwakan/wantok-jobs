/**
 * Jean AI Chat Routes - Production Grade
 * Integrates rate limiting, validation, persistence, and comprehensive error handling
 * 
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-22
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { jeanAILimiter } = require('../middleware/rate-limit');
const { validateChatMessage } = require('../middleware/validation');
const chatPersistence = require('../lib/chat-persistence');
const jean = require('../utils/jean/index');
const { v4: uuidv4 } = require('uuid');

/**
 * Health check endpoint
 * No authentication or rate limiting required
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'jean-chat',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main chat endpoint
 * POST /api/chat
 * 
 * Applies:
 * - Rate limiting (20 req/15min per IP)
 * - Input validation and sanitization
 * - Chat history persistence
 * - Jean AI processing
 */
router.post(
  '/',
  jeanAILimiter, // Rate limit: 20 requests per 15 minutes
  optionalAuth, // Optional user authentication
  validateChatMessage, // Validate and sanitize input
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { message, conversationHistory = [], sessionId } = req.body;
      const userId = req.user?.id || null;

      // Generate or use provided session ID
      const actualSessionId = sessionId || uuidv4();

      // Save user message to database
      await chatPersistence.saveMessage(
        actualSessionId,
        'user',
        message,
        {
          userId,
          platform: 'web',
          ip: req.ip,
        }
      );

      // Process with Jean AI
      const response = await jean.processMessage(message, {
        conversationHistory,
        userId,
        sessionId: actualSessionId,
      });

      const responseTime = Date.now() - startTime;

      // Save assistant response to database
      await chatPersistence.saveMessage(
        actualSessionId,
        'assistant',
        response.message || response.text || '',
        {
          intent: response.intent,
          confidence: response.confidence,
          tokensUsed: response.tokensUsed,
          model: response.model,
          responseTime,
        }
      );

      // Return response with session ID
      res.json({
        success: true,
        message: response.message || response.text || '',
        intent: response.intent,
        confidence: response.confidence,
        sessionId: actualSessionId,
        responseTime,
      });

    } catch (error) {
      console.error('Jean AI chat error:', error);

      // Log error but don't expose internals to client
      res.status(500).json({
        success: false,
        error: 'Failed to process message. Please try again.',
        code: 'JEAN_ERROR',
      });
    }
  }
);

/**
 * Streaming chat endpoint
 * POST /api/chat/stream
 * 
 * Same as above but returns Server-Sent Events stream
 */
router.post(
  '/stream',
  jeanAILimiter,
  optionalAuth,
  validateChatMessage,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { message, conversationHistory = [], sessionId } = req.body;
      const userId = req.user?.id || null;
      const actualSessionId = sessionId || uuidv4();

      // Save user message
      await chatPersistence.saveMessage(
        actualSessionId,
        'user',
        message,
        { userId, platform: 'web', ip: req.ip }
      );

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let intent = null;
      let confidence = null;

      // Process with Jean AI (streaming)
      const stream = await jean.processMessageStream(message, {
        conversationHistory,
        userId,
        sessionId: actualSessionId,
      });

      // Stream tokens to client
      for await (const chunk of stream) {
        if (chunk.token) {
          fullResponse += chunk.token;
          res.write(`data: ${JSON.stringify({ token: chunk.token })}

`);
        }
        if (chunk.intent) intent = chunk.intent;
        if (chunk.confidence) confidence = chunk.confidence;
      }

      const responseTime = Date.now() - startTime;

      // Save complete response
      await chatPersistence.saveMessage(
        actualSessionId,
        'assistant',
        fullResponse,
        { intent, confidence, responseTime }
      );

      // Send final event
      res.write(`data: ${JSON.stringify({ done: true, sessionId: actualSessionId })}

`);
      res.end();

    } catch (error) {
      console.error('Jean AI stream error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}

`);
      res.end();
    }
  }
);

/**
 * Get conversation history
 * GET /api/chat/history/:sessionId
 */
router.get(
  '/history/:sessionId',
  optionalAuth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const history = await chatPersistence.getHistory(sessionId, limit);

      res.json({
        success: true,
        sessionId,
        messages: history,
        count: history.length,
      });

    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history',
      });
    }
  }
);

/**
 * Get session statistics
 * GET /api/chat/stats/:sessionId
 */
router.get(
  '/stats/:sessionId',
  optionalAuth,
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const stats = await chatPersistence.getSessionStats(sessionId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.json({
        success: true,
        stats,
      });

    } catch (error) {
      console.error('Error fetching session stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session statistics',
      });
    }
  }
);

module.exports = router;
