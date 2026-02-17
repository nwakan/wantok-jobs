require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const _rateLimit = require('express-rate-limit');
// In test mode, effectively disable rate limiting by setting very high max
const rateLimit = (opts) => _rateLimit({
  ...opts,
  max: process.env.NODE_ENV === 'test' ? 100000 : opts.max,
});
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Security: Enforce JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  logger.error('SECURITY ERROR: JWT_SECRET environment variable is required in production.');
  logger.error('Set a strong random secret in your .env file: JWT_SECRET=' + require('crypto').randomBytes(48).toString('base64'));
  process.exit(1);
}

const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Request ID tracking middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Compression (gzip/deflate for all responses)
try {
  const compression = require('compression');
  app.use(compression({ threshold: 512 }));
} catch (e) {
  logger.warn('compression module not installed, skipping');
}

// Request logging middleware
const requestLogger = require('./middleware/logging');

// API cache middleware
const apiCache = require('./middleware/cache');


// Security headers (enhanced CSRF protection)
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for SPA
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Vite's crossorigin script/link tags
}));

// Additional CSRF protection header
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS with production whitelist
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3001'];

// Default production origins if CORS_ORIGIN not set
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  allowedOrigins.push('https://wantokjobs.com', 'https://www.wantokjobs.com', 'https://tolarai.com', 'https://www.tolarai.com');
  logger.warn('No CORS_ORIGIN set in production. Using default: wantokjobs.com');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Allow same-host requests (different port/protocol)
      try {
        const url = new URL(origin);
        const isLocalhost = ['localhost', '127.0.0.1'].includes(url.hostname);
        if (isLocalhost) return callback(null, true);
      } catch {}
      logger.warn('CORS blocked', { origin, allowed: allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Global rate limit: 200 req/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// Request logging
app.use(requestLogger);

// Stricter per-route rate limiters
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a minute.', code: 'RATE_LIMIT' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please wait a minute.', code: 'RATE_LIMIT' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please wait a minute.', code: 'RATE_LIMIT' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a minute.', code: 'RATE_LIMIT' },
});

// Contact form rate limit: 5/min
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please wait a minute.', code: 'RATE_LIMIT' },
});

// Application rate limit: 10/min per user (keyed by auth user)
const applicationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  validate: false,
  message: { error: 'Too many applications. Please wait a minute.', code: 'RATE_LIMIT' },
});

// Upload rate limit: 20/min per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  validate: false,
  message: { error: 'Too many uploads. Please wait a minute.', code: 'RATE_LIMIT' },
});

// Search rate limit: 60/min per IP (generous but prevents scraping)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many search requests. Please slow down.', code: 'RATE_LIMIT' },
});

// Chat/AI rate limit: 15/min per user
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  validate: false,
  message: { error: 'Too many chat messages. Please wait a minute.', code: 'RATE_LIMIT' },
});

// GitHub webhook — must be before express.json() to get raw body for HMAC
app.use('/api/webhook', require('./routes/webhook'));

app.use(express.json({ limit: '1mb' }));

// Cache static assets aggressively
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

// Initialize database
require('./database');

// API caching for GET requests
app.use('/api', apiCache);

// Health check (enhanced for production monitoring)
app.get('/health', (req, res) => {
  const startTime = Date.now();
  
  try {
    const db = require('./database');
    
    // Test database connectivity
    const dbCheck = db.prepare('SELECT 1 as healthy').get();
    const dbLatency = Date.now() - startTime;
    
    // Basic database health metrics
    const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) // MB
      },
      database: {
        status: dbCheck && dbCheck.healthy === 1 ? 'connected' : 'error',
        latency: `${dbLatency}ms`,
        jobs: jobCount,
        users: userCount
      },
      version: process.env.npm_package_version || '1.0.0',
      node: process.version
    });
  } catch (error) {
    logger.error('Health check error', { error: error.message, requestId: req.id });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime()
    });
  }
});

// Public stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const db = require('./database');
    const stats = {
      totalJobseekers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker' AND COALESCE(account_status, 'active') != 'spam'").get().count,
      totalEmployers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employer' AND COALESCE(account_status, 'active') != 'spam'").get().count,
      totalJobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      activeJobs: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get().count,
    };
    res.json({ success: true, data: stats, ...stats });
  } catch (error) {
    logger.error('Stats error', { error: error.message, requestId: req.id });
    res.status(500).json({ success: false, error: 'Failed to fetch stats', message: 'Internal server error' });
  }
});

// API Routes (auth endpoints get stricter rate limiting)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/oauth/google', authLimiter);
app.use('/api/auth/oauth/facebook', authLimiter);
app.use('/api/auth', require('./routes/auth'));

// Force password reset middleware — blocks all non-auth routes for fpr users
const { checkForcePasswordReset } = require('./middleware/auth');
app.use('/api', checkForcePasswordReset);

// Core routes
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', applicationLimiter, require('./routes/applications'));
app.use('/api/offer-letters', require('./routes/offer-letters'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/profile', require('./routes/profiles'));
app.use('/api/saved-jobs', require('./routes/saved-jobs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/references', require('./routes/references'));

// Feature routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/credits', require('./routes/credits'));
app.use('/api/screening', require('./routes/screening'));
app.use('/api/job-alerts', require('./routes/job-alerts'));
app.use('/api/saved-resumes', require('./routes/saved-resumes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/activity', require('./routes/activity-feed'));
app.use('/api/uploads', uploadLimiter, require('./routes/uploads'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api', require('./routes/reviews')); // Note: reviews uses /api directly
app.use('/api/email-templates', require('./routes/email-templates'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/company-follows', require('./routes/company-follows'));
app.use('/api/training', require('./routes/training'));

// Agency & Claims routes
app.use('/api/agency', require('./routes/agency'));
app.use('/api/claims', require('./routes/claims'));

// New routes for analytics, stats, and resume features
app.use('/api/employer/analytics', require('./routes/employer-analytics'));
app.use('/api/employer/pipeline-analytics', require('./routes/pipeline-analytics'));
app.use('/api/stats/public', require('./routes/public-stats'));
app.use('/api/jobseeker/resume', require('./routes/resume'));

// New metadata and stats routes
app.use('/api', require('./routes/metadata')); // Provides /api/locations and /api/industries
app.use('/api/stats', require('./routes/stats')); // Provides /api/stats/dashboard

// Contact with rate limiting
app.use('/api/contact', contactLimiter, require('./routes/contact'));

// Jean AI Chat routes (with stricter rate limiting)
app.use('/api/chat', chatLimiter, require('./routes/chat'));

// Admin routes (protected by auth middleware)
const { authenticateToken } = require('./middleware/auth');
app.use('/api/admin', authenticateToken, require('./routes/admin'));

// Sitemap routes (SEO)
app.use('/', require('./routes/sitemap'));

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Sitemap: https://wantokjobs.com/sitemap.xml
`);
});

// Dynamic sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  try {
    const db = require('./database');
    const baseUrl = 'https://wantokjobs.com';
    const jobs = db.prepare("SELECT id, updated_at FROM jobs WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1000").all();
    const articles = db.prepare("SELECT slug, COALESCE(published_at, created_at) as last_mod FROM articles WHERE status = 'published' ORDER BY created_at DESC").all();
    const categories = db.prepare("SELECT slug FROM categories").all();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/jobs</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/categories</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/companies</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/blog</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${baseUrl}/pricing</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>${baseUrl}/faq</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${baseUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>`;

    for (const job of jobs) {
      xml += `\n  <url><loc>${baseUrl}/jobs/${job.id}</loc><lastmod>${job.updated_at ? job.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    }
    for (const cat of categories) {
      xml += `\n  <url><loc>${baseUrl}/jobs?category=${cat.slug}</loc><changefreq>daily</changefreq><priority>0.6</priority></url>`;
    }
    for (const article of articles) {
      xml += `\n  <url><loc>${baseUrl}/blog/${article.slug}</loc><lastmod>${article.last_mod ? article.last_mod.split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`;
    }

    xml += '\n</urlset>';
    res.type('application/xml').send(xml);
  } catch (error) {
    logger.error('Sitemap error', { error: error.message });
    res.status(500).send('Error generating sitemap');
  }
});

// Serve uploaded files statically
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Try server/public (Docker build) then client/dist (local dev)
  const clientDist = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Token refresh endpoint
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

app.post('/api/auth/refresh', authenticateToken, (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: req.user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to refresh token', code: 'INTERNAL_ERROR' });
  }
});

// Add password_changed_at column for token invalidation (run once)
try {
  const db = require('./database');
  db.exec("ALTER TABLE users ADD COLUMN password_changed_at TEXT");
  logger.info('Added password_changed_at column to users table');
} catch(e) {
  // Column already exists — expected
}

// Global error handler (MUST be last middleware)
app.use(errorHandler);

// ─── Graceful Shutdown ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`WantokJobs server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});

// Keep-alive timeout should exceed reverse proxy timeout (default 5s is too low)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

let isShuttingDown = false;

// Reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({ success: false, error: 'Server is shutting down', message: 'Service unavailable' });
  }
  next();
});

function gracefulShutdown(signal) {
  if (isShuttingDown) return; // Prevent double shutdown
  isShuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`, { signal });

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    try {
      const db = require('./database');
      if (db && typeof db.close === 'function') {
        db.close();
        logger.info('Database connection closed');
      }
    } catch (e) {
      logger.error('Error closing database', { error: e.message });
    }

    process.exit(0);
  });

  // Force exit after 15s if connections won't drain
  setTimeout(() => {
    logger.error('Forced shutdown — connections did not drain in 15s');
    process.exit(1);
  }, 15000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception — shutting down', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

module.exports = app; // For testing
