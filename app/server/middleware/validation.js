/**
 * Input Validation & Sanitization Middleware
 * Prevents XSS, SQL injection, and other attacks
 * 
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-22
 */

const validator = require('validator');

/**
 * Sanitize string input
 * Removes potentially dangerous characters while preserving functionality
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;

  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Escape HTML to prevent XSS
  str = validator.escape(str);

  // Trim whitespace
  str = str.trim();

  return str;
}

/**
 * Validate and sanitize Jean AI chat message
 */
function validateChatMessage(req, res, next) {
  const { message, conversationHistory } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid message format' });
  }

  // Check message length (prevent abuse)
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
  }

  if (message.length < 1) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  // Sanitize message (preserve formatting for AI)
  req.body.message = message.trim();

  // Validate conversation history if present
  if (conversationHistory) {
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'Invalid conversation history format' });
    }

    // Limit history length (prevent memory abuse)
    if (conversationHistory.length > 50) {
      req.body.conversationHistory = conversationHistory.slice(-20);
    }
  }

  next();
}

/**
 * Validate phone number for WhatsApp
 */
function validatePhoneNumber(req, res, next) {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Basic phone number validation (international format)
  if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  next();
}

/**
 * General input sanitization middleware
 * Sanitizes all string inputs in req.body, req.query, req.params
 */
function sanitizeInputs(req, res, next) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  // Sanitize query params
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }

  // Sanitize URL params
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeString(req.params[key]);
      }
    }
  }

  next();
}

module.exports = {
  validateChatMessage,
  validatePhoneNumber,
  sanitizeInputs,
  sanitizeString,
};
