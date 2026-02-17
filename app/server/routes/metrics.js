const express = require('express');
const router = express.Router();
const os = require('os');
const logger = require('../utils/logger');

// ── Request tracking (in-memory) ──────────────────────────────
const requestStats = {
  totalRequests: 0,
  errorCount5xx: 0,
  responseTimes: [],      // last 5 min of { time, duration }
  lastReset: Date.now(),
};

/** Middleware — mount early in server/index.js */
function trackRequests(req, res, next) {
  const start = Date.now();
  const onFinish = () => {
    res.removeListener('finish', onFinish);
    const duration = Date.now() - start;
    requestStats.totalRequests++;
    const now = Date.now();
    requestStats.responseTimes.push({ time: now, duration });
    // Keep only last 5 min
    const cutoff = now - 5 * 60 * 1000;
    if (requestStats.responseTimes.length > 2000) {
      requestStats.responseTimes = requestStats.responseTimes.filter(r => r.time >= cutoff);
    }
    if (res.statusCode >= 500) {
      requestStats.errorCount5xx++;
    }
  };
  res.on('finish', onFinish);
  next();
}

// Hourly reset
setInterval(() => {
  requestStats.errorCount5xx = 0;
  requestStats.lastReset = Date.now();
}, 60 * 60 * 1000).unref();

// ── Auth: admin token or X-Metrics-Key ────────────────────────
function metricsAuth(req, res, next) {
  // Check API key first
  const apiKey = req.headers['x-metrics-key'];
  if (apiKey && process.env.METRICS_API_KEY && apiKey === process.env.METRICS_API_KEY) {
    return next();
  }
  // Fall back to admin JWT auth
  try {
    const { authenticateToken } = require('../middleware/auth');
    authenticateToken(req, res, (err) => {
      if (err) return res.status(401).json({ error: 'Unauthorized' });
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      next();
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ── GET /api/metrics ──────────────────────────────────────────
router.get('/', metricsAuth, async (req, res) => {
  try {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Request stats
    const recentRequests = requestStats.responseTimes.filter(r => r.time >= fiveMinAgo);
    const avgResponseTime = recentRequests.length
      ? Math.round(recentRequests.reduce((s, r) => s + r.duration, 0) / recentRequests.length)
      : 0;
    const requestsPerMinute = recentRequests.length / 5;

    // DB stats
    let dbStats = { status: 'unknown', jobs: 0, users: 0, applications: 0, walSize: null };
    try {
      const db = require('../database');
      const start = Date.now();
      db.prepare('SELECT 1').get();
      dbStats.status = 'connected';
      dbStats.latencyMs = Date.now() - start;
      dbStats.jobs = db.prepare('SELECT COUNT(*) as c FROM jobs').get()?.c || 0;
      dbStats.users = db.prepare('SELECT COUNT(*) as c FROM users').get()?.c || 0;
      dbStats.applications = db.prepare('SELECT COUNT(*) as c FROM applications').get()?.c || 0;
      try {
        const walPages = db.pragma('wal_checkpoint(PASSIVE)');
        dbStats.walPages = walPages;
      } catch {}
    } catch (e) {
      dbStats.status = 'error';
      dbStats.error = e.message;
    }

    // Cache stats
    let cacheStats = { size: 0 };
    try {
      const apiCache = require('../middleware/cache');
      cacheStats.size = apiCache.store?.size ?? apiCache.size ?? 0;
    } catch {}

    // Rate limit stats
    let rateLimitStats = {};
    try {
      const rateLimitMonitor = require('../lib/rate-limit-monitor');
      const blocks = rateLimitMonitor.blocks.filter(b => b.timestamp >= oneHourAgo);
      rateLimitStats = { blocksLastHour: blocks.length, totalBlocks24h: rateLimitMonitor.blocks.length };
    } catch {}

    const mem = process.memoryUsage();
    const totalMem = os.totalmem();

    res.json({
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        systemTotalMb: Math.round(totalMem / 1024 / 1024),
        usagePercent: Math.round((mem.rss / totalMem) * 100),
      },
      cpu: process.cpuUsage(),
      requests: {
        total: requestStats.totalRequests,
        requestsPerMinute: Math.round(requestsPerMinute * 10) / 10,
        avgResponseTimeMs: avgResponseTime,
        errors5xxLastHour: requestStats.errorCount5xx,
      },
      database: dbStats,
      cache: cacheStats,
      rateLimit: rateLimitStats,
    });
  } catch (err) {
    logger.error('Metrics error', { error: err.message });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// ── GET /api/metrics/health ───────────────────────────────────
router.get('/health', async (req, res) => {
  let status = 'ok';
  const checks = {};

  // DB check
  try {
    const db = require('../database');
    db.prepare('SELECT 1').get();
    checks.database = 'ok';
  } catch {
    checks.database = 'down';
    status = 'down';
  }

  // Memory check (<80% of system)
  const mem = process.memoryUsage();
  const usagePercent = (mem.rss / os.totalmem()) * 100;
  checks.memoryUsagePercent = Math.round(usagePercent);
  if (usagePercent >= 80) {
    status = status === 'down' ? 'down' : 'degraded';
    checks.memory = 'high';
  } else {
    checks.memory = 'ok';
  }

  // Error rate check (<5%)
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const recentRequests = requestStats.responseTimes.filter(r => r.time >= fiveMinAgo);
  const recentErrors = requestStats.errorCount5xx;
  const errorRate = requestStats.totalRequests > 0
    ? (recentErrors / requestStats.totalRequests) * 100
    : 0;
  checks.errorRatePercent = Math.round(errorRate * 10) / 10;
  if (errorRate >= 5) {
    status = status === 'down' ? 'down' : 'degraded';
    checks.errorRate = 'high';
  } else {
    checks.errorRate = 'ok';
  }

  checks.uptime = Math.round(process.uptime());
  res.status(status === 'down' ? 503 : 200).json({ status, checks });
});

module.exports = router;
module.exports.trackRequests = trackRequests;
