// Request logging middleware
const fs = require('fs');
const path = require('path');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const logFile = path.join(dataDir, 'api-requests.log');

// Ensure log file exists
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '', 'utf8');
}

function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Capture response status
  const originalJson = res.json;
  res.json = function(data) {
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length ? req.query : undefined,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };
    
    // Log to file (async, don't block)
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFile(logFile, logLine, (err) => {
      if (err) console.error('Logging error:', err);
    });
    
    // Log to console for errors or slow requests
    if (res.statusCode >= 400 || duration > 1000) {
      console.log(`[${res.statusCode}] ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}

module.exports = requestLogger;
