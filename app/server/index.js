require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for SPA
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
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

// Auth rate limit: 10 attempts/min per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a minute.' },
});

// Contact form rate limit: 5/min
const contactLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please wait a minute.' },
});

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const db = require('./database');
    const stats = {
      totalJobseekers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'jobseeker'").get().count,
      totalEmployers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employer'").get().count,
      totalJobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      activeJobs: db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'active'").get().count,
    };
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// API Routes (auth endpoints get stricter rate limiting)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth', require('./routes/auth'));

// Core routes
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/profile', require('./routes/profiles'));
app.use('/api/saved-jobs', require('./routes/saved-jobs'));
app.use('/api/notifications', require('./routes/notifications'));

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
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api', require('./routes/reviews')); // Note: reviews uses /api directly
app.use('/api/email-templates', require('./routes/email-templates'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/insights', require('./routes/insights'));

// New metadata and stats routes
app.use('/api', require('./routes/metadata')); // Provides /api/locations and /api/industries
app.use('/api/stats', require('./routes/stats')); // Provides /api/stats/dashboard

// Contact with rate limiting
app.use('/api/contact', contactLimiter, require('./routes/contact'));

// Admin routes (protected by auth middleware)
const { authenticateToken } = require('./middleware/auth');
app.use('/api/admin', authenticateToken, require('./routes/admin'));

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
    console.error('Sitemap error:', error);
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

app.listen(PORT, () => {
  console.log(`🚀 WantokJobs server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
