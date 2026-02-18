require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const _rateLimit = require('express-rate-limit');
const rateLimitMonitor = require('./lib/rate-limit-monitor');
// In test mode, effectively disable rate limiting by setting very high max
const rateLimit = (opts) => _rateLimit({
  ...opts,
  max: process.env.NODE_ENV === 'test' ? 100000 : opts.max,
  handler: (req, res, next, options) => {
    rateLimitMonitor.recordBlock(req.ip, req.originalUrl || req.url);
    if (opts.handler) return opts.handler(req, res, next, options);
    res.status(429).json(opts.message || { error: 'Too many requests, please try again later.' });
  },
});
const cookieParser = require('cookie-parser');
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
app.set('trust proxy', 1); // Trust first proxy (Cloudflare/nginx)
const PORT = process.env.PORT || 3001;

// Request ID tracking middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Request metrics tracking
const { trackRequests } = require('./routes/metrics');
app.use(trackRequests);

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

// Anti-scraping protection
const { botBlocker, behaviorDetector, sanitizeResponse, honeypotSetup, securityHeaders } = require('./middleware/antiScrape');
app.use(botBlocker);
app.use(behaviorDetector);
app.use(sanitizeResponse);
app.use(securityHeaders);
honeypotSetup(app);

// Security headers (enhanced CSRF protection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.cloudflareinsights.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://www.googleapis.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://static.cloudflareinsights.com", // Cloudflare analytics
      ],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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
app.use(cookieParser());
app.use(requestLogger);

// ─── Security Hardening Middleware ─────────────────────────────────
// Input sanitization (detect SQL injection, XSS, path traversal)
const inputSanitizer = require('./middleware/inputSanitizer');
app.use(inputSanitizer);

// API security headers (request ID, rate limit info, response time, header spoofing detection)
const apiSecurity = require('./middleware/apiSecurity');
app.use(apiSecurity);

// Security audit logger (logs auth events, admin actions, attacks)
const securityAudit = require('./middleware/securityAudit');
app.use(securityAudit);

// Stricter per-route rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.', code: 'RATE_LIMIT' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.', code: 'RATE_LIMIT' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.', code: 'RATE_LIMIT' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a minute.', code: 'RATE_LIMIT' },
});

// Contact form rate limit: 5/hour
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many submissions. Please try again later.', code: 'RATE_LIMIT' },
});

// Application rate limit: 10/hour per user (keyed by auth user)
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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

// Employer claim rate limit: 3/hour per IP/employer
const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many claim attempts. Please try again later.', code: 'RATE_LIMIT' },
});

// GitHub webhook — must be before express.json() to get raw body for HMAC
app.use('/api/webhook', require('./routes/webhook'));

app.use(express.json({ limit: '1mb' }));

// ─── CSRF Protection ────────────────────────────────────────────────
// CSRF token endpoint (must be before CSRF protection middleware)
const { getCsrfToken, csrfProtection } = require('./middleware/csrf');
app.get('/api/csrf-token', getCsrfToken);

// CSRF protection for state-changing requests (POST/PUT/DELETE/PATCH)
// Exempts webhook endpoints (/api/whatsapp, /api/webhook/*)
app.use(csrfProtection);

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
    const statsCache = require('./lib/cache');
    const cached = statsCache.get('stats:public');
    if (cached) return res.json(cached);

    const db = require('./database');
    const stats = {
      totalJobseekers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker' AND COALESCE(account_status, 'active') != 'spam'").get().count,
      totalEmployers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employer' AND COALESCE(account_status, 'active') != 'spam'").get().count,
      totalJobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      activeJobs: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get().count,
      transparentEmployers: db.prepare("SELECT COUNT(*) as count FROM profiles_employer WHERE transparency_required = 1").get().count,
      governmentBodies: db.prepare("SELECT COUNT(*) as count FROM profiles_employer WHERE employer_type IN ('government', 'soe')").get().count,
      totalApplications: db.prepare("SELECT COUNT(*) as count FROM applications").get().count,
    };
    const result = { success: true, data: stats, ...stats };
    statsCache.set('stats:public', result, 300);
    res.json(result);
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
app.use('/api/search', require('./routes/semantic-search')); // Semantic search (Phase 1)
app.use('/api/applications', applicationLimiter, require('./routes/applications'));
app.use('/api/offer-letters', require('./routes/offer-letters'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/profile', require('./routes/profiles'));
app.use('/api/profile', require('./routes/profile-insights')); // Profile insights (Part 2.3)
app.use('/api/saved-jobs', require('./routes/saved-jobs'));
app.use('/api/saved-searches', require('./routes/saved-searches'));
app.use('/api/recommendations', require('./routes/recommendations'));
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
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/employers', claimLimiter, require('./routes/employer-claims'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/activity', require('./routes/activity-feed'));
app.use('/api/uploads', uploadLimiter, require('./routes/uploads'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/notification-preferences', require('./routes/notification-preferences'));
app.use('/api', require('./routes/reviews')); // Note: reviews uses /api directly
app.use('/api/email-templates', require('./routes/email-templates'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/insights', require('./routes/insights'));
app.use('/api/insights', require('./routes/insights-market')); // Market insights (Part 2.8)
app.use('/api/company-follows', require('./routes/company-follows'));
app.use('/api/training', require('./routes/training'));
app.use('/api/transparency', require('./routes/transparency'));
app.use('/api/transparency-public', require('./routes/transparency-public'));
app.use('/api/features', require('./routes/features'));

// Agency & Claims routes
app.use('/api/agency', require('./routes/agency'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/referrals', require('./routes/referrals'));

// New routes for analytics, stats, and resume features
app.use('/api/employer/analytics', require('./routes/employer-analytics'));
app.use('/api/employer/pipeline-analytics', require('./routes/pipeline-analytics'));
app.use('/api/stats/public', require('./routes/public-stats'));
app.use('/api', require('./routes/salary'));
app.use('/api/jobseeker/resume', require('./routes/resume'));
app.use('/api/badges', require('./routes/badges'));

// New metadata and stats routes
app.use('/api', require('./routes/metadata')); // Provides /api/locations and /api/industries
app.use('/api/industries', require('./routes/industries')); // Industry landing pages
app.use('/api/stats', require('./routes/stats')); // Provides /api/stats/dashboard

// Contact with rate limiting
app.use('/api/contact', contactLimiter, require('./routes/contact'));

// Jean AI Chat routes (with stricter rate limiting)
app.use('/api/chat', chatLimiter, require('./routes/chat'));

// WhatsApp webhook for Jean AI
app.use('/api/whatsapp', require('./routes/whatsapp-webhook'));

// Admin routes (protected by auth middleware)
const { authenticateToken } = require('./middleware/auth');
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/admin', authenticateToken, require('./routes/admin'));
app.use('/api/admin/employer-claims', authenticateToken, require('./routes/employer-claims'));
app.use('/api/export', require('./routes/export'));
app.use('/api/account', require('./routes/account'));
app.use('/api/account', require('./routes/account-security')); // Account security endpoints

// SEO and Meta Tags
app.use('/', require('./routes/job-schema')); // Google Jobs JSON-LD schema
app.use('/', require('./routes/meta-tags')); // Open Graph meta tags API

// Admin Analytics
app.use('/api/admin/analytics', authenticateToken, require('./routes/analytics-admin'));

// Marketing Dashboard (admin only)
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/ai', require('./routes/ai'));

// Sitemap routes (SEO)
app.use('/', require('./routes/sitemap'));

// Note: robots.txt and sitemap.xml are now handled by ./routes/sitemap

// Serve uploaded files statically
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
app.use('/uploads', express.static(path.join(dataDir, 'uploads'), {
  maxAge: '1y',
  immutable: true,
}));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Try server/public (Docker build) then client/dist (local dev)
  const clientDist = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '..', 'client', 'dist');
  // Hashed assets get long-lived cache (already handled by the global middleware above)
  app.use(express.static(clientDist, { index: false }));

  // ─── SSR Meta/JSON-LD injection for crawlers ─────────────────────
  // Google, Facebook, Twitter crawlers don't execute JS. Inject meta tags
  // and JSON-LD into the HTML shell so they see structured data.
  const crawlerPattern = /googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot/i;

  function injectMetaIntoHtml(htmlPath, meta, jsonLd) {
    let html = fs.readFileSync(htmlPath, 'utf-8');
    if (meta) {
      // Replace existing title
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
      // Replace existing meta description
      html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${(meta.description || '').replace(/"/g, '&quot;')}">`);
      // Replace existing OG tags
      html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${(meta.title || '').replace(/"/g, '&quot;')}">`);
      html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${(meta.description || '').replace(/"/g, '&quot;')}">`);
      html = html.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${meta.image || ''}">`);
      html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${meta.url || ''}">`);
      html = html.replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="${meta.type || 'website'}">`);
      // Replace existing Twitter tags
      html = html.replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${(meta.title || '').replace(/"/g, '&quot;')}">`);
      html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${(meta.description || '').replace(/"/g, '&quot;')}">`);
    }
    if (jsonLd) {
      // Replace existing JSON-LD or add before </head>
      if (html.includes('application/ld+json')) {
        html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
      } else {
        html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`);
      }
    }
    return html;
  }

  // index.html must never be cached — prevents stale JS after deploys
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const ua = req.headers['user-agent'] || '';
    const isCrawler = crawlerPattern.test(ua);
    const indexPath = path.join(clientDist, 'index.html');

    // Only do SSR injection for crawlers on specific routes
    if (isCrawler) {
      try {
        const db = require('./database');
        const baseUrl = process.env.APP_URL || 'https://wantokjobs.com';

        // Job detail pages: /jobs/:id
        const jobMatch = req.path.match(/^\/jobs\/(\d+)$/);
        if (jobMatch) {
          const job = db.prepare(`
            SELECT j.*, p.company_name, p.logo_url as logo, p.website
            FROM jobs j
            LEFT JOIN profiles_employer p ON j.employer_id = p.user_id
            WHERE j.id = ? AND j.status = 'active'
          `).get(jobMatch[1]);
          if (job) {
            const desc = (job.description || '').replace(/<[^>]*>/g, '').substring(0, 160);
            const employmentTypeMap = { 'full-time': 'FULL_TIME', 'part-time': 'PART_TIME', 'contract': 'CONTRACTOR', 'temporary': 'TEMPORARY', 'internship': 'INTERN' };
            const meta = {
              title: `${job.title} - ${job.company_name || 'WantokJobs'}`,
              description: desc || `${job.title} at ${job.company_name}`,
              image: job.logo ? (job.logo.startsWith('http') ? job.logo : `${baseUrl}${job.logo}`) : `${baseUrl}/og-image.png`,
              url: `${baseUrl}/jobs/${job.id}`,
              type: 'website',
            };
            const jsonLd = {
              "@context": "https://schema.org", "@type": "JobPosting",
              title: job.title,
              description: job.description || desc,
              datePosted: job.created_at,
              validThrough: job.expires_at || new Date(Date.now() + 30*86400000).toISOString(),
              employmentType: employmentTypeMap[job.job_type] || 'FULL_TIME',
              hiringOrganization: { "@type": "Organization", name: job.company_name || 'Unknown', sameAs: job.website || `${baseUrl}/companies/${job.employer_id}` },
              jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location || 'Papua New Guinea', addressCountry: "PG" } },
              identifier: { "@type": "PropertyValue", name: "WantokJobs", value: `WJ-${job.id}` },
              url: `${baseUrl}/jobs/${job.id}`,
              directApply: true,
            };
            if (job.logo) jsonLd.hiringOrganization.logo = meta.image;
            if (job.salary_min) {
              jsonLd.baseSalary = { "@type": "MonetaryAmount", currency: "PGK", value: { "@type": "QuantitativeValue", minValue: parseFloat(job.salary_min), ...(job.salary_max ? { maxValue: parseFloat(job.salary_max) } : {}), unitText: job.salary_period || 'YEAR' } };
            }
            const html = injectMetaIntoHtml(indexPath, meta, jsonLd);
            return res.send(html);
          }
        }

        // Company profile pages: /companies/:id
        const companyMatch = req.path.match(/^\/companies\/(\d+)$/);
        if (companyMatch) {
          const company = db.prepare(`
            SELECT p.user_id as id, p.company_name, p.description as company_description, p.logo_url as logo, p.location, p.industry
            FROM profiles_employer p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ? AND u.role = 'employer'
          `).get(companyMatch[1]);
          if (company) {
            const meta = {
              title: `${company.company_name} - Jobs & Profile | WantokJobs`,
              description: (company.company_description || `${company.company_name} - ${company.industry || 'Employer'} in ${company.location || 'PNG'}`).substring(0, 160),
              image: company.logo ? (company.logo.startsWith('http') ? company.logo : `${baseUrl}${company.logo}`) : `${baseUrl}/og-image.png`,
              url: `${baseUrl}/companies/${company.id}`,
              type: 'profile',
            };
            const jsonLd = {
              "@context": "https://schema.org", "@type": "Organization",
              name: company.company_name,
              description: meta.description,
              url: meta.url,
              address: { "@type": "PostalAddress", addressLocality: company.location || 'Papua New Guinea', addressCountry: "PG" },
            };
            if (company.logo) jsonLd.logo = meta.image;
            const html = injectMetaIntoHtml(indexPath, meta, jsonLd);
            return res.send(html);
          }
        }
      } catch (err) {
        logger.error('SSR meta injection error', { error: err.message, path: req.path });
      }
    }

    res.sendFile(indexPath);
  });
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
