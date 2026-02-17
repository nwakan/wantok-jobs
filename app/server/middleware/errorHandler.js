/**
 * Global Error Handler Middleware
 * 
 * Catches all thrown errors (including AppError subclasses and SQLite errors)
 * and returns consistent JSON error responses.
 * 
 * Usage: app.use(errorHandler) — must be the LAST middleware registered.
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

// Map SQLite error codes to user-friendly messages
const SQLITE_ERRORS = {
  SQLITE_CONSTRAINT: { status: 409, message: 'A record with this data already exists', code: 'CONFLICT' },
  SQLITE_CONSTRAINT_UNIQUE: { status: 409, message: 'A record with this data already exists', code: 'CONFLICT' },
  SQLITE_CONSTRAINT_FOREIGNKEY: { status: 400, message: 'Referenced record does not exist', code: 'INVALID_REFERENCE' },
  SQLITE_CONSTRAINT_NOTNULL: { status: 400, message: 'A required field is missing', code: 'MISSING_FIELD' },
  SQLITE_BUSY: { status: 503, message: 'Database is temporarily busy, please retry', code: 'DB_BUSY' },
  SQLITE_LOCKED: { status: 503, message: 'Database is temporarily locked, please retry', code: 'DB_LOCKED' },
  SQLITE_READONLY: { status: 503, message: 'Database is in read-only mode', code: 'DB_READONLY' },
};

function errorHandler(err, req, res, next) {
  // Already sent response
  if (res.headersSent) {
    return next(err);
  }

  const logData = {
    requestId: req.requestId,
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    error: err.message,
  };

  // 1. Handle our custom AppError hierarchy
  if (err instanceof AppError) {
    logger.warn(`${err.code}: ${err.message}`, logData);
    const response = { error: err.message, code: err.code };
    if (err.details) response.details = err.details;
    return res.status(err.statusCode).json(response);
  }

  // 2. Handle SQLite errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    const mapped = SQLITE_ERRORS[err.code] || { status: 500, message: 'Database error', code: 'DB_ERROR' };
    logger.error(`SQLite ${err.code}: ${err.message}`, logData);
    return res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
  }

  // 3. Handle Zod validation errors (from validate middleware bypass)
  if (err.name === 'ZodError') {
    logger.warn('Zod validation error', { ...logData, issues: err.issues?.length });
    return res.status(400).json({
      error: err.issues?.[0]?.message || 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
  }

  // 4. Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn(`JWT error: ${err.message}`, logData);
    return res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_ERROR' });
  }

  // 5. Handle multer errors
  if (err.name === 'MulterError') {
    logger.warn(`Upload error: ${err.message}`, logData);
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: err.message, code: 'UPLOAD_ERROR' });
  }

  // 6. CORS errors
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS blocked', logData);
    return res.status(403).json({ error: 'Not allowed by CORS', code: 'CORS_ERROR' });
  }

  // 7. Unknown / unhandled errors
  const isProduction = process.env.NODE_ENV === 'production';
  logger.error(`Unhandled error: ${err.message}`, {
    ...logData,
    stack: isProduction ? undefined : err.stack,
  });

  res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;
