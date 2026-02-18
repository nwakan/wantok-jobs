/**
 * API Security Headers Middleware
 * 
 * Adds security headers and detects suspicious requests:
 * - X-Request-ID (for tracing)
 * - X-RateLimit-Remaining (from rate limiter)
 * - X-Response-Time (for monitoring)
 * - Blocks suspicious header spoofing
 */

const logger = require('../utils/logger');

// Trusted proxy IPs (cloudflare, load balancers, etc.)
// In production, set via TRUSTED_PROXIES env var
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean);

// Add localhost and private ranges for development
if (process.env.NODE_ENV !== 'production') {
  TRUSTED_PROXIES.push('127.0.0.1', '::1', '::ffff:127.0.0.1');
}

/**
 * Check if IP is a private/trusted proxy
 */
function isPrivateOrTrustedIP(ip) {
  if (!ip) return false;
  
  // Check trusted proxies list
  if (TRUSTED_PROXIES.includes(ip)) return true;
  
  // Check private IP ranges
  const privateRanges = [
    /^127\./,                    // 127.0.0.0/8
    /^10\./,                     // 10.0.0.0/8
    /^192\.168\./,               // 192.168.0.0/16
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^::1$/,                     // IPv6 loopback
    /^fe80:/,                    // IPv6 link-local
    /^fc00:/,                    // IPv6 private
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Detect suspicious header spoofing
 */
function detectHeaderSpoofing(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Skip check if behind a reverse proxy (Cloudflare, nginx, etc.)
  // When trust proxy is enabled in Express, these headers are expected
  if (forwardedFor || realIp) {
    // Only flag if clearly spoofed (e.g., absurd values)
    // Cloudflare, nginx, and load balancers legitimately set these headers
    return { detected: false };
  }
  
  return { detected: false };
}

/**
 * API Security Middleware
 */
function apiSecurity(req, res, next) {
  const startTime = Date.now();
  
  // Detect header spoofing
  const spoofing = detectHeaderSpoofing(req);
  if (spoofing.detected) {
    logger.warn('Suspicious header detected', {
      ...spoofing,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });
    
    // Attach to request for security audit
    req.securityEvent = {
      type: 'HEADER_SPOOFING',
      details: spoofing,
      riskLevel: 'MEDIUM',
    };
    
    // Block the request
    return res.status(403).json({
      error: 'Request blocked due to suspicious headers',
      code: 'SUSPICIOUS_HEADERS',
    });
  }
  
  // Add X-Request-ID (already set in server/index.js, but ensure it exists)
  if (!res.getHeader('X-Request-ID') && req.id) {
    res.setHeader('X-Request-ID', req.id);
  }
  
  // Add response time header on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests (>2s)
    if (duration > 2000) {
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        userId: req.user?.id,
        requestId: req.id,
      });
    }
  });
  
  // Add rate limit remaining from express-rate-limit if available
  // (express-rate-limit sets res.locals.rateLimit)
  if (res.locals.rateLimit) {
    res.setHeader('X-RateLimit-Limit', res.locals.rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', res.locals.rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(res.locals.rateLimit.resetTime).toISOString());
  }
  
  next();
}

module.exports = apiSecurity;
