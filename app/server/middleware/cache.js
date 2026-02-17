/**
 * In-memory API cache with TTL and LRU eviction.
 * CommonJS module.
 */

const MAX_ENTRIES = 1000;

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map(); // key → { data, headers, expiry }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  set(key, value, ttlMs) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, {
      data: value.data,
      headers: value.headers || {},
      expiry: Date.now() + ttlMs,
    });
  }

  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const store = new LRUCache(MAX_ENTRIES);

// Route-specific TTLs (in ms)
const CACHE_RULES = [
  { pattern: /^\/api\/categories(\?|$)/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/api\/stats(\?|$)/, ttl: 2 * 60 * 1000 },
  { pattern: /^\/api\/jobs\/\d+\/similar/, ttl: 60 * 1000 },
  { pattern: /^\/api\/jobs(\?|$)/, ttl: 30 * 1000 },
  { pattern: /^\/api\/jobs\/featured/, ttl: 60 * 1000 },
  { pattern: /^\/api\/stats\/categories/, ttl: 5 * 60 * 1000 },
  { pattern: /^\/api\/stats\/top-employers/, ttl: 5 * 60 * 1000 },
];

// Invalidation map: mutation path prefix → cache prefixes to clear
const INVALIDATION_MAP = {
  '/api/jobs': ['/api/jobs', '/api/stats', '/api/categories'],
  '/api/categories': ['/api/categories'],
  '/api/applications': ['/api/stats'],
};

function getTTL(path) {
  for (const rule of CACHE_RULES) {
    if (rule.pattern.test(path)) return rule.ttl;
  }
  return 0; // not cacheable
}

/**
 * Express middleware for GET request caching.
 */
function apiCache(req, res, next) {
  // Only cache GET
  if (req.method !== 'GET') {
    // On mutations, invalidate related caches
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      for (const [prefix, targets] of Object.entries(INVALIDATION_MAP)) {
        if (req.originalUrl.startsWith(prefix)) {
          targets.forEach(t => store.invalidatePrefix(t));
        }
      }
    }
    return next();
  }

  const cacheKey = req.originalUrl;
  const ttl = getTTL(cacheKey);

  if (ttl === 0) return next();

  // Check cache
  const cached = store.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    // Restore cached headers
    for (const [k, v] of Object.entries(cached.headers)) {
      res.setHeader(k, v);
    }
    return res.json(cached.data);
  }

  // Intercept res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Capture pagination headers
      const headersToCache = {};
      ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Total-Pages', 'Link'].forEach(h => {
        const v = res.getHeader(h);
        if (v !== undefined) headersToCache[h] = v;
      });

      store.set(cacheKey, { data: body, headers: headersToCache }, ttl);
    }
    res.setHeader('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
}

// Export for use and testing
apiCache.store = store;
module.exports = apiCache;
