/**
 * Input Sanitization Middleware
 * 
 * Sanitizes all request body/query/params to prevent:
 * - SQL injection attacks
 * - XSS attacks
 * 
 * Preserves legitimate special characters in user content (job descriptions, etc.)
 */

const logger = require('../utils/logger');

// SQL injection patterns to detect
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(-{2}|\/\*|\*\/)/g, // SQL comments
  /[';](\s)*(OR|AND)(\s)*['"]/gi, // Common injection patterns
  /\bOR\b\s+\d+\s*=\s*\d+/gi, // OR 1=1
  /\bAND\b\s+\d+\s*=\s*\d+/gi, // AND 1=1
  /UNION\s+SELECT/gi,
];

// XSS patterns to detect
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers: onclick=, onerror=, etc.
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,
  /eval\(/gi,
  /expression\(/gi, // CSS expression
];

// Path traversal patterns
const PATH_TRAVERSAL = /\.\.[\/\\]/g;

/**
 * Check if string contains SQL injection patterns
 */
function containsSqlInjection(str) {
  if (typeof str !== 'string') return false;
  return SQL_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check if string contains XSS patterns
 */
function containsXss(str) {
  if (typeof str !== 'string') return false;
  return XSS_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check if string contains path traversal
 */
function containsPathTraversal(str) {
  if (typeof str !== 'string') return false;
  return PATH_TRAVERSAL.test(str);
}

/**
 * Sanitize a string value
 * Returns sanitized string or null if attack detected
 */
function sanitizeString(str, fieldName = '', strictMode = false) {
  if (typeof str !== 'string') return str;
  
  // Check for attacks
  const hasSql = containsSqlInjection(str);
  const hasXss = containsXss(str);
  const hasPathTraversal = containsPathTraversal(str);
  
  if (hasSql || hasXss || hasPathTraversal) {
    return {
      sanitized: str,
      detected: {
        sql: hasSql,
        xss: hasXss,
        pathTraversal: hasPathTraversal,
        fieldName,
      },
    };
  }
  
  // In strict mode, escape HTML entities
  if (strictMode) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  return str;
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj, path = '') {
  const detected = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      // Don't be too strict on content fields (job descriptions, etc.)
      const isContentField = ['description', 'bio', 'summary', 'content', 'message', 'body'].includes(key);
      const result = sanitizeString(value, fieldPath, !isContentField);
      
      if (result && result.detected) {
        detected.push(result.detected);
        // Strip detected patterns but preserve the rest
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const arrayDetected = sanitizeObject(item, `${fieldPath}[${index}]`);
          detected.push(...arrayDetected);
        } else if (typeof item === 'string') {
          const result = sanitizeString(item, `${fieldPath}[${index}]`);
          if (result && result.detected) {
            detected.push(result.detected);
            value[index] = result.sanitized;
          }
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      const nestedDetected = sanitizeObject(value, fieldPath);
      detected.push(...nestedDetected);
    }
  }
  
  return detected;
}

/**
 * Input Sanitizer Middleware
 */
function inputSanitizer(req, res, next) {
  const detected = [];
  
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    const bodyDetected = sanitizeObject(req.body, 'body');
    detected.push(...bodyDetected);
  }
  
  // Sanitize query params
  if (req.query && typeof req.query === 'object') {
    const queryDetected = sanitizeObject(req.query, 'query');
    detected.push(...queryDetected);
  }
  
  // Sanitize URL params
  if (req.params && typeof req.params === 'object') {
    const paramsDetected = sanitizeObject(req.params, 'params');
    detected.push(...paramsDetected);
  }
  
  // Log detected attacks
  if (detected.length > 0) {
    logger.warn('Input sanitizer detected attack patterns', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      userAgent: req.headers['user-agent'],
      detected: detected.map(d => ({
        field: d.fieldName,
        sql: d.sql,
        xss: d.xss,
        pathTraversal: d.pathTraversal,
      })),
      requestId: req.id,
    });
    
    // Attach to request for security audit logger
    req.securityEvent = {
      type: 'INPUT_ATTACK',
      detected,
      riskLevel: 'HIGH',
    };
  }
  
  next();
}

module.exports = inputSanitizer;
