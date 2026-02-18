/**
 * CSRF Protection Middleware
 * 
 * Generates CSRF tokens per session and validates them on state-changing requests.
 * - Tokens stored in secure cookies
 * - Validated via X-CSRF-Token header
 * - Exempt: webhook endpoints
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Store tokens in memory (keyed by session ID from cookie)
// For production, consider Redis or database storage
const tokenStore = new Map();

// Token expiry (1 hour)
const TOKEN_EXPIRY = 60 * 60 * 1000;

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      tokenStore.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate a CSRF token for the session
 */
function generateToken(sessionId) {
  const token = crypto.randomBytes(32).toString('base64url');
  tokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Get or create session ID from cookie
 */
function getSessionId(req, res) {
  let sessionId = req.cookies?.csrf_session;
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    // Set secure cookie (httpOnly, sameSite)
    res.cookie('csrf_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY,
    });
  }
  
  return sessionId;
}

/**
 * Validate CSRF token from request header
 */
function validateToken(sessionId, token) {
  const stored = tokenStore.get(sessionId);
  if (!stored) return false;
  
  // Check expiry
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    tokenStore.delete(sessionId);
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(token, 'base64url'),
    Buffer.from(stored.token, 'base64url')
  );
}

/**
 * CSRF Protection Middleware
 * Validates token on all POST/PUT/DELETE/PATCH requests except webhooks
 */
function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  
  // Only validate state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return next();
  }
  
  // Exempt webhook endpoints
  if (req.path.startsWith('/api/whatsapp') || req.path.startsWith('/api/webhook')) {
    return next();
  }
  
  const sessionId = req.cookies?.csrf_session;
  const token = req.headers['x-csrf-token'];
  
  if (!sessionId || !token) {
    logger.warn('CSRF validation failed - missing token or session', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasSession: !!sessionId,
      hasToken: !!token,
    });
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_INVALID',
    });
  }
  
  try {
    if (!validateToken(sessionId, token)) {
      logger.warn('CSRF validation failed - invalid token', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        sessionId,
      });
      return res.status(403).json({
        error: 'CSRF token validation failed',
        code: 'CSRF_INVALID',
      });
    }
    
    next();
  } catch (error) {
    logger.error('CSRF validation error', {
      error: error.message,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
    });
  }
}

/**
 * Endpoint to fetch CSRF token
 */
function getCsrfToken(req, res) {
  const sessionId = getSessionId(req, res);
  const token = generateToken(sessionId);
  
  res.json({ token });
}

module.exports = {
  csrfProtection,
  getCsrfToken,
};
