const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);

    // Token expiry is handled by jwt.verify (throws TokenExpiredError)

    // Check if password was changed after token was issued (iat = issued at)
    if (user.iat) {
      try {
        const db = require('../database');
        const dbUser = db.prepare('SELECT password_changed_at FROM users WHERE id = ?').get(user.id);
        if (dbUser && dbUser.password_changed_at) {
          const changedAt = Math.floor(new Date(dbUser.password_changed_at).getTime() / 1000);
          if (changedAt > user.iat) {
            logger.warn('Token used after password change', { userId: user.id, requestId: req.requestId });
            return res.status(401).json({ error: 'Token invalidated by password change. Please log in again.', code: 'TOKEN_INVALIDATED' });
          }
        }
      } catch (e) {
        // Column might not exist yet — that's fine, skip the check
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

/**
 * Middleware to check if user must reset their password (force_password_reset flag).
 * Allows auth routes through, blocks everything else.
 */
function checkForcePasswordReset(req, res, next) {
  // Always allow auth routes
  if (req.path.startsWith('/auth')) return next();
  // Only check if user is authenticated
  if (!req.user) return next();
  
  try {
    const db = require('../database');
    const user = db.prepare('SELECT force_password_reset FROM users WHERE id = ?').get(req.user.id);
    if (user && user.force_password_reset) {
      return res.status(403).json({ 
        error: 'You must reset your password before continuing.', 
        code: 'FORCE_PASSWORD_RESET' 
      });
    }
  } catch (e) {
    // Column might not exist — skip
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticateToken, JWT_SECRET, checkForcePasswordReset, requireRole };
