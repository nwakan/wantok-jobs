/**
 * Rate Limiting Middleware for WantokJobs
 * Prevents abuse and controls costs for Jean AI and other endpoints
 * 
 * Author: Agent Zero (Top-notch Developer Mode)
 * Date: 2026-03-22
 */

const rateLimit = require('express-rate-limit');

/**
 * Aggressive rate limit for Jean AI endpoints
 * Prevents abuse and cost explosion from AI API calls
 */
const jeanAILimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  message: {
    error: 'Too many AI requests. Please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated premium users (optional)
  skip: (req) => {
    // TODO: Add premium user detection
    return false;
  },
});

/**
 * Standard rate limit for general API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limit for authentication endpoints
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Moderate rate limit for WhatsApp webhook
 * Allows high volume but prevents spam
 */
const whatsappLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: {
    error: 'WhatsApp rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  jeanAILimiter,
  apiLimiter,
  authLimiter,
  whatsappLimiter,
};
