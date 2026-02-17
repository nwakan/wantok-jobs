// Request logging middleware with structured logging
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const logFile = path.join(dataDir, 'api-requests.log');

// Ensure log file exists
if (!fs.existsSync(logFile)) {
  try { fs.writeFileSync(logFile, '', 'utf8'); } catch(e) {}
}

// Paths to skip logging (reduce noise)
const SKIP_PATHS = new Set(['/health', '/favicon.ico']);
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|map)$/;

function requestLogger(req, res, next) {
  // Skip health checks and static files
  if (SKIP_PATHS.has(req.path) || STATIC_EXTENSIONS.test(req.path)) {
    return next();
  }

  // Generate request ID
  req.requestId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? req.query : undefined,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };

    // Log to file (async, don't block)
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFile(logFile, logLine, (err) => {
      if (err) logger.error('Log file write error', { error: err.message });
    });

    // Structured console logging
    const logData = {
      requestId: req.requestId,
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, logData);
    } else if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path} ${duration}ms`, logData);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.debug(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, logData);
    }
  });

  next();
}

module.exports = requestLogger;
