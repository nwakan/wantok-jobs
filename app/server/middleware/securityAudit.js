/**
 * Security Audit Logger Middleware
 * 
 * Logs security-relevant events to a separate audit log:
 * - Authentication events (login, logout, failed attempts)
 * - Admin actions
 * - Claim attempts
 * - File uploads
 * - Detected attack patterns
 * 
 * Logs written to: server/data/security-audit.log
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const AUDIT_LOG_PATH = path.join(dataDir, 'security-audit.log');

// Ensure log file exists
if (!fs.existsSync(AUDIT_LOG_PATH)) {
  fs.writeFileSync(AUDIT_LOG_PATH, '');
}

/**
 * Risk levels
 */
const RISK_LEVELS = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Write to audit log (synchronous to ensure it's written even if process crashes)
 */
function writeAuditLog(entry) {
  try {
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({
      timestamp,
      ...entry,
    }) + '\n';
    
    fs.appendFileSync(AUDIT_LOG_PATH, logLine);
  } catch (error) {
    logger.error('Failed to write security audit log', { error: error.message });
  }
}

/**
 * Log security event
 */
function logSecurityEvent(type, details, riskLevel = RISK_LEVELS.INFO, userId = null, ip = null) {
  writeAuditLog({
    type,
    details,
    riskLevel,
    userId,
    ip,
  });
}

/**
 * Security Audit Middleware
 * Captures security events from requests
 */
function securityAudit(req, res, next) {
  // Capture response to log after it's sent
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseLogged = false;
  
  const logResponse = () => {
    if (responseLogged) return;
    responseLogged = true;
    
    // Log security events attached to request
    if (req.securityEvent) {
      logSecurityEvent(
        req.securityEvent.type,
        req.securityEvent.details || {},
        req.securityEvent.riskLevel || RISK_LEVELS.INFO,
        req.user?.id,
        req.ip
      );
    }
    
    // Log authentication events
    if (req.path.includes('/auth/login')) {
      if (res.statusCode === 200) {
        logSecurityEvent(
          'AUTH_LOGIN_SUCCESS',
          {
            path: req.path,
            userAgent: req.headers['user-agent'],
          },
          RISK_LEVELS.INFO,
          req.user?.id,
          req.ip
        );
      } else {
        logSecurityEvent(
          'AUTH_LOGIN_FAILED',
          {
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent'],
          },
          RISK_LEVELS.MEDIUM,
          req.body?.email,
          req.ip
        );
      }
    }
    
    // Log logout
    if (req.path.includes('/auth/logout')) {
      logSecurityEvent(
        'AUTH_LOGOUT',
        {
          path: req.path,
        },
        RISK_LEVELS.INFO,
        req.user?.id,
        req.ip
      );
    }
    
    // Log admin actions
    if (req.path.startsWith('/api/admin') && req.method !== 'GET') {
      logSecurityEvent(
        'ADMIN_ACTION',
        {
          path: req.path,
          method: req.method,
          body: req.body,
        },
        RISK_LEVELS.MEDIUM,
        req.user?.id,
        req.ip
      );
    }
    
    // Log claim attempts
    if (req.path.includes('/claim') && req.method === 'POST') {
      logSecurityEvent(
        'CLAIM_ATTEMPT',
        {
          path: req.path,
          success: res.statusCode === 200,
          statusCode: res.statusCode,
        },
        RISK_LEVELS.MEDIUM,
        req.user?.id,
        req.ip
      );
    }
    
    // Log file uploads
    if (req.path.includes('/upload') && req.file) {
      logSecurityEvent(
        'FILE_UPLOAD',
        {
          path: req.path,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          success: res.statusCode === 200,
        },
        RISK_LEVELS.LOW,
        req.user?.id,
        req.ip
      );
    }
    
    // Log failed authentication
    if (res.statusCode === 401 || res.statusCode === 403) {
      logSecurityEvent(
        'AUTH_FAILED',
        {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
        },
        RISK_LEVELS.LOW,
        req.user?.id,
        req.ip
      );
    }
    
    // Log rate limit hits
    if (res.statusCode === 429) {
      logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        {
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
        },
        RISK_LEVELS.MEDIUM,
        req.user?.id,
        req.ip
      );
    }
  };
  
  // Intercept response methods
  res.send = function(data) {
    logResponse();
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse();
    return originalJson.call(this, data);
  };
  
  // Also log on response finish (in case send/json not called)
  res.on('finish', logResponse);
  
  next();
}

/**
 * Export audit log reader (for admin dashboard)
 */
function readAuditLog(options = {}) {
  const { limit = 100, offset = 0, riskLevel = null, userId = null } = options;
  
  try {
    const content = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8');
    let lines = content.trim().split('\n').filter(Boolean);
    
    // Parse and filter
    let events = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    // Apply filters
    if (riskLevel) {
      events = events.filter(e => e.riskLevel === riskLevel);
    }
    if (userId) {
      events = events.filter(e => e.userId === userId);
    }
    
    // Sort by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply pagination
    const total = events.length;
    events = events.slice(offset, offset + limit);
    
    return {
      events,
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error('Error reading audit log', { error: error.message });
    return {
      events: [],
      total: 0,
      limit,
      offset,
    };
  }
}

module.exports = securityAudit;
module.exports.logSecurityEvent = logSecurityEvent;
module.exports.readAuditLog = readAuditLog;
module.exports.RISK_LEVELS = RISK_LEVELS;
