/**
 * Structured Logger for WantokJobs
 * 
 * JSON lines format in production, pretty-printed in development.
 * Each log line includes: timestamp, level, message, requestId, userId, and extra data.
 * 
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Job created', { jobId: 123 });
 *   logger.error('Database error', { error: err.message });
 *   logger.withReq(req).info('Request started');
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL || 'debug'] || 0;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function formatEntry(level, message, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (data) {
    // Pull out known fields
    if (data.requestId) entry.requestId = data.requestId;
    if (data.userId) entry.userId = data.userId;
    // Merge rest
    const { requestId, userId, ...rest } = data;
    if (Object.keys(rest).length > 0) {
      entry.data = rest;
    }
  }

  return entry;
}

function output(entry) {
  const stream = entry.level === 'error' || entry.level === 'warn' ? process.stderr : process.stdout;

  if (IS_PRODUCTION) {
    stream.write(JSON.stringify(entry) + '\n');
  } else {
    // Pretty format for development
    const levelColors = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' };
    const color = levelColors[entry.level] || '';
    const reset = '\x1b[0m';
    const ts = entry.timestamp.slice(11, 23); // HH:MM:SS.mmm
    let line = `${color}[${ts}] ${entry.level.toUpperCase().padEnd(5)}${reset} ${entry.message}`;

    if (entry.requestId) line += ` ${'\x1b[90m'}rid=${entry.requestId}${reset}`;
    if (entry.userId) line += ` ${'\x1b[90m'}uid=${entry.userId}${reset}`;
    if (entry.data) {
      const extra = JSON.stringify(entry.data);
      if (extra.length < 200) {
        line += ` ${'\x1b[90m'}${extra}${reset}`;
      } else {
        line += `\n  ${'\x1b[90m'}${extra}${reset}`;
      }
    }
    stream.write(line + '\n');
  }
}

function log(level, message, data) {
  if (LEVELS[level] < LOG_LEVEL) return;
  output(formatEntry(level, message, data));
}

const logger = {
  debug: (message, data) => log('debug', message, data),
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data),

  /**
   * Create a child logger with request context pre-filled
   */
  withReq(req) {
    const ctx = {};
    if (req.requestId) ctx.requestId = req.requestId;
    if (req.user?.id) ctx.userId = req.user.id;
    return {
      debug: (msg, data) => log('debug', msg, { ...ctx, ...data }),
      info: (msg, data) => log('info', msg, { ...ctx, ...data }),
      warn: (msg, data) => log('warn', msg, { ...ctx, ...data }),
      error: (msg, data) => log('error', msg, { ...ctx, ...data }),
    };
  },
};

module.exports = logger;
