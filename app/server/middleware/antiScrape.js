/**
 * Anti-Scraping & Bot Protection Middleware
 * 
 * Layers:
 * 1. Known bot user-agent blocking
 * 2. Rate limiting by behavioral patterns
 * 3. Request fingerprinting
 * 4. Honeypot trap endpoints
 * 5. Response sanitization (strip source metadata)
 */

const crypto = require('crypto');

// Known scraper/bot user agents
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /scrape/i, /fetch/i,
  /GPTBot/i, /ChatGPT/i, /ClaudeBot/i, /anthropic/i,
  /CCBot/i, /Google-Extended/i, /Bytespider/i,
  /PetalBot/i, /SemrushBot/i, /AhrefsBot/i, /MJ12bot/i,
  /DotBot/i, /Baiduspider/i, /YandexBot/i,
  /DataForSeoBot/i, /BLEXBot/i, /Linguee/i,
  /python-requests/i, /python-urllib/i, /scrapy/i,
  /httpx/i, /aiohttp/i, /node-fetch/i, /axios/i,
  /curl/i, /wget/i, /java\//i, /Go-http-client/i,
  /php/i, /libwww/i, /lwp-trivial/i,
  /Headless/i, /PhantomJS/i, /Selenium/i, /puppeteer/i,
];

// Allowed bots (search engines we want indexed by)
const ALLOWED_BOTS = [
  /Googlebot/i, /bingbot/i, /DuckDuckBot/i, /facebot/i,
  /Twitterbot/i, /LinkedInBot/i, /WhatsApp/i,
  /WantokWatchdog/i,
];

// Track request patterns per IP
const ipTracker = new Map();
const WINDOW_MS = 60000; // 1 minute window
const MAX_API_PER_WINDOW = 60; // max API calls per minute
const MAX_SEQUENTIAL_PAGES = 20; // max sequential page loads (pagination abuse)
const BLOCKED_IPS = new Set();
const BLOCK_DURATION_MS = 3600000; // 1 hour block

// Clean up tracker periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracker) {
    if (now - data.firstSeen > WINDOW_MS * 5) {
      ipTracker.delete(ip);
    }
  }
  for (const ip of BLOCKED_IPS) {
    // Blocks auto-expire (checked on access)
  }
}, 300000);

function getIpData(ip) {
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, {
      firstSeen: Date.now(),
      requests: [],
      apiCalls: 0,
      pageSequence: 0,
      lastPage: 0,
      flagged: false,
    });
  }
  const data = ipTracker.get(ip);
  // Reset window
  if (Date.now() - data.firstSeen > WINDOW_MS) {
    data.firstSeen = Date.now();
    data.apiCalls = 0;
    data.pageSequence = 0;
    data.requests = [];
  }
  return data;
}

/**
 * Block known bad bots
 */
function botBlocker(req, res, next) {
  const ua = req.get('User-Agent') || '';
  
  // Exempt monitoring endpoints from bot blocking
  if (req.path === '/health' || req.path === '/api/health') return next();
  
  // Allow known good bots
  if (ALLOWED_BOTS.some(p => p.test(ua))) return next();
  
  // Block known bad bots
  if (BOT_PATTERNS.some(p => p.test(ua))) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Block empty user agents on API routes
  if (!ua && req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}

/**
 * Behavioral rate limiting — detect scraping patterns
 */
function behaviorDetector(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Check if blocked
  if (BLOCKED_IPS.has(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  
  if (!req.path.startsWith('/api/')) return next();
  
  const data = getIpData(ip);
  data.apiCalls++;
  data.requests.push({ path: req.path, time: Date.now() });
  
  // Pattern 1: Too many API calls per minute
  if (data.apiCalls > MAX_API_PER_WINDOW) {
    BLOCKED_IPS.add(ip);
    setTimeout(() => BLOCKED_IPS.delete(ip), BLOCK_DURATION_MS);
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  // Pattern 2: Sequential pagination (page=1, page=2, page=3...)
  const pageMatch = req.query.page || req.query.offset;
  if (pageMatch) {
    const pageNum = parseInt(pageMatch);
    if (pageNum === data.lastPage + 1) {
      data.pageSequence++;
    } else {
      data.pageSequence = 0;
    }
    data.lastPage = pageNum;
    
    if (data.pageSequence > MAX_SEQUENTIAL_PAGES) {
      BLOCKED_IPS.add(ip);
      setTimeout(() => BLOCKED_IPS.delete(ip), BLOCK_DURATION_MS);
      return res.status(429).json({ error: 'Access pattern detected. Try again later.' });
    }
  }
  
  // Pattern 3: Rapid-fire identical endpoints
  const recentSame = data.requests.filter(r => r.path === req.path && Date.now() - r.time < 5000);
  if (recentSame.length > 10) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  next();
}

/**
 * Strip sensitive source metadata from API responses
 * This removes any trace of where data was sourced from
 */
function sanitizeResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      data = deepSanitize(data);
    }
    return originalJson(data);
  };
  
  next();
}

// Fields to strip from all API responses
const SENSITIVE_FIELDS = [
  'source', 'external_url', 'external_id', 'scraped_at', 'scrape_source',
  'import_source', 'original_url', 'source_url', 'crawled_from',
  'pngworkforce', 'pngjobseek', 'reliefweb',
];

function deepSanitize(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) continue;
      if (typeof value === 'string' && containsSourceUrl(value)) {
        // Replace source URLs with our own
        cleaned[key] = sanitizeUrl(value);
      } else {
        cleaned[key] = deepSanitize(value);
      }
    }
    return cleaned;
  }
  return obj;
}

const SOURCE_DOMAINS = [
  'pngworkforce.com', 'pngjobseek.com', 'reliefweb.int',
  'pngindustrynews.net', 'emtv.com.pg', 'postcourier.com.pg',
];

function containsSourceUrl(str) {
  return SOURCE_DOMAINS.some(d => str.includes(d));
}

function sanitizeUrl(str) {
  for (const domain of SOURCE_DOMAINS) {
    if (str.includes(domain)) return null;
  }
  return str;
}

/**
 * Honeypot endpoints — fake data traps for scrapers
 * If accessed, immediately block the IP
 */
function honeypotSetup(app) {
  const traps = [
    '/api/v2/export/all',
    '/api/data/download',
    '/api/jobs/export.csv',
    '/api/dump',
    '/api/v1/bulk',
    // REMOVED: '/sitemap-jobs.xml', — This was blocking legitimate SEO crawlers
    '/data/jobs.json',
    '/backup/db',
  ];
  
  traps.forEach(trap => {
    app.all(trap, (req, res) => {
      const ip = req.ip || req.connection.remoteAddress;
      console.warn(`🍯 Honeypot triggered: ${trap} by ${ip} (${req.get('User-Agent')})`);
      BLOCKED_IPS.add(ip);
      setTimeout(() => BLOCKED_IPS.delete(ip), BLOCK_DURATION_MS * 24); // 24h block
      // Return fake data to waste their time
      res.status(200).json({ 
        jobs: [{ title: 'Honeypot - You have been flagged', id: 0 }],
        message: 'This endpoint is monitored. Your IP has been logged.'
      });
    });
  });
}

/**
 * Add security headers that discourage scraping
 */
function securityHeaders(req, res, next) {
  // Prevent embedding in iframes (clickjacking)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

module.exports = {
  botBlocker,
  behaviorDetector,
  sanitizeResponse,
  honeypotSetup,
  securityHeaders,
  BLOCKED_IPS,
};
