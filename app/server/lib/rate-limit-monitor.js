/**
 * Rate Limit Monitor — tracks 429 blocks in memory (last 24h)
 */
const RETENTION_MS = 24 * 60 * 60 * 1000;

class RateLimitMonitor {
  constructor() {
    this.blocks = [];          // { ip, endpoint, timestamp }
    this.endpointHits = {};    // endpoint -> count
    // Prune every 10 minutes
    this._pruneInterval = setInterval(() => this.prune(), 10 * 60 * 1000);
    if (this._pruneInterval.unref) this._pruneInterval.unref();
  }

  /** Record a blocked (429) request */
  recordBlock(ip, endpoint) {
    const timestamp = Date.now();
    this.blocks.push({ ip, endpoint, timestamp });
    this.endpointHits[endpoint] = (this.endpointHits[endpoint] || 0) + 1;
  }

  /** Remove entries older than 24h */
  prune() {
    const cutoff = Date.now() - RETENTION_MS;
    this.blocks = this.blocks.filter(b => b.timestamp >= cutoff);
    // Rebuild endpoint hits from remaining blocks
    this.endpointHits = {};
    for (const b of this.blocks) {
      this.endpointHits[b.endpoint] = (this.endpointHits[b.endpoint] || 0) + 1;
    }
  }

  /** Top blocked IPs */
  topBlockedIPs(limit = 20) {
    const map = {};
    for (const b of this.blocks) {
      if (!map[b.ip]) map[b.ip] = { ip: b.ip, count: 0, lastEndpoint: b.endpoint, lastTime: b.timestamp };
      map[b.ip].count++;
      if (b.timestamp >= map[b.ip].lastTime) {
        map[b.ip].lastEndpoint = b.endpoint;
        map[b.ip].lastTime = b.timestamp;
      }
    }
    return Object.values(map)
      .sort((a, c) => c.count - a.count)
      .slice(0, limit)
      .map(e => ({ ...e, lastTime: new Date(e.lastTime).toISOString() }));
  }

  /** Blocks per hour (last 24h) — array of { hour: 'YYYY-MM-DD HH:00', count } */
  blocksByHour() {
    const now = Date.now();
    const cutoff = now - RETENTION_MS;
    const buckets = {};
    // Initialize 24 buckets
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600000);
      const key = d.toISOString().slice(0, 13) + ':00';
      buckets[key] = 0;
    }
    for (const b of this.blocks) {
      if (b.timestamp < cutoff) continue;
      const key = new Date(b.timestamp).toISOString().slice(0, 13) + ':00';
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
  }

  /** Endpoint hit counts sorted desc */
  topEndpoints(limit = 20) {
    return Object.entries(this.endpointHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /** Get summary object */
  getSummary() {
    this.prune();
    return {
      topBlockedIPs: this.topBlockedIPs(),
      blocksByHour: this.blocksByHour(),
      topEndpoints: this.topEndpoints(),
      totalBlocks24h: this.blocks.length,
    };
  }
}

module.exports = new RateLimitMonitor();
