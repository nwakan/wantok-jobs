/**
 * Account Security Routes
 * 
 * Provides account security features:
 * - Password strength validation
 * - Account lockout after failed attempts
 * - Login history tracking
 * - Suspicious login detection
 * 
 * GET /api/account/security — Get security info, login history
 * POST /api/account/security/clear-sessions — Clear suspicious sessions
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const logger = require('../utils/logger');

// Initialize tables
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ip TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 1,
      failure_reason TEXT,
      country TEXT,
      city TEXT,
      suspicious INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip);
    
    CREATE TABLE IF NOT EXISTS account_lockouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
  `);
  logger.info('Account security tables initialized');
} catch (error) {
  logger.error('Error initializing account security tables', { error: error.message });
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // Length
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20; // Special chars
  
  return Math.min(score, 100);
}

/**
 * Check if account is locked
 */
function checkAccountLockout(userId) {
  const lockout = db.prepare(`
    SELECT * FROM account_lockouts WHERE user_id = ?
  `).get(userId);
  
  if (!lockout) return { locked: false };
  
  if (lockout.locked_until) {
    const lockedUntil = new Date(lockout.locked_until);
    if (lockedUntil > new Date()) {
      return {
        locked: true,
        until: lockedUntil,
        attempts: lockout.failed_attempts,
      };
    } else {
      // Lockout expired, reset
      db.prepare('UPDATE account_lockouts SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?')
        .run(userId);
      return { locked: false };
    }
  }
  
  return { locked: false, attempts: lockout.failed_attempts };
}

/**
 * Record failed login attempt
 */
function recordFailedLogin(userId, ip, userAgent, reason) {
  // Record in login history
  db.prepare(`
    INSERT INTO login_history (user_id, ip, user_agent, success, failure_reason)
    VALUES (?, ?, ?, 0, ?)
  `).run(userId, ip, userAgent, reason);
  
  // Update lockout counter
  const lockout = db.prepare('SELECT * FROM account_lockouts WHERE user_id = ?').get(userId);
  
  if (!lockout) {
    db.prepare(`
      INSERT INTO account_lockouts (user_id, failed_attempts, updated_at)
      VALUES (?, 1, datetime('now'))
    `).run(userId);
  } else {
    const newAttempts = lockout.failed_attempts + 1;
    
    // Lock account after 5 failed attempts (15 minutes)
    if (newAttempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.prepare(`
        UPDATE account_lockouts 
        SET failed_attempts = ?, locked_until = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newAttempts, lockedUntil, userId);
      
      logger.warn('Account locked due to failed login attempts', {
        userId,
        attempts: newAttempts,
        lockedUntil,
      });
    } else {
      db.prepare(`
        UPDATE account_lockouts 
        SET failed_attempts = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newAttempts, userId);
    }
  }
}

/**
 * Record successful login
 */
function recordSuccessfulLogin(userId, ip, userAgent) {
  // Reset failed attempts
  db.prepare(`
    UPDATE account_lockouts 
    SET failed_attempts = 0, locked_until = NULL, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(userId);
  
  // Detect suspicious login (different IP/location)
  const recentLogins = db.prepare(`
    SELECT ip, user_agent FROM login_history
    WHERE user_id = ? AND success = 1
    ORDER BY created_at DESC LIMIT 5
  `).all(userId);
  
  let suspicious = 0;
  if (recentLogins.length > 0) {
    const knownIps = new Set(recentLogins.map(l => l.ip));
    if (!knownIps.has(ip)) {
      suspicious = 1;
      logger.warn('Suspicious login detected - new IP', {
        userId,
        ip,
        knownIps: Array.from(knownIps),
      });
    }
  }
  
  // Record login
  db.prepare(`
    INSERT INTO login_history (user_id, ip, user_agent, success, suspicious)
    VALUES (?, ?, ?, 1, ?)
  `).run(userId, ip, userAgent, suspicious);
}

/**
 * GET /api/account/security
 * Get account security information
 */
router.get('/security', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get recent login history (last 20)
    const loginHistory = db.prepare(`
      SELECT 
        id,
        ip,
        user_agent,
        success,
        failure_reason,
        suspicious,
        created_at
      FROM login_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(userId);
    
    // Get account lockout status
    const lockout = checkAccountLockout(userId);
    
    // Get stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_logins,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins,
        SUM(CASE WHEN suspicious = 1 THEN 1 ELSE 0 END) as suspicious_logins
      FROM login_history
      WHERE user_id = ?
    `).get(userId);
    
    // Get unique IPs
    const uniqueIps = db.prepare(`
      SELECT DISTINCT ip, MAX(created_at) as last_seen
      FROM login_history
      WHERE user_id = ? AND success = 1
      GROUP BY ip
      ORDER BY last_seen DESC
      LIMIT 10
    `).all(userId);
    
    res.json({
      success: true,
      data: {
        loginHistory,
        lockout,
        stats,
        uniqueIps,
      },
    });
  } catch (error) {
    logger.error('Error fetching account security', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security information',
    });
  }
});

/**
 * POST /api/account/security/clear-suspicious
 * Clear suspicious login flags
 */
router.post('/security/clear-suspicious', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE login_history
      SET suspicious = 0
      WHERE user_id = ? AND suspicious = 1
    `).run(req.user.id);
    
    res.json({
      success: true,
      message: 'Suspicious login flags cleared',
    });
  } catch (error) {
    logger.error('Error clearing suspicious logins', {
      error: error.message,
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to clear suspicious logins',
    });
  }
});

module.exports = router;
module.exports.validatePasswordStrength = validatePasswordStrength;
module.exports.checkAccountLockout = checkAccountLockout;
module.exports.recordFailedLogin = recordFailedLogin;
module.exports.recordSuccessfulLogin = recordSuccessfulLogin;
