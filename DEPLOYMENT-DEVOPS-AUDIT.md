# WantokJobs Deployment & DevOps Audit

**Date**: 2026-02-17 00:50 MYT  
**Reviewer**: Nazira (Autonomous)  
**Comparison**: Vercel, Railway, Fly.io, Netlify

---

## Executive Summary

**Current Score**: **7.0/10** (good foundation, missing production safeguards)  
**Target Score**: **9.5/10** (enterprise-grade reliability)  
**Implementation Time**: **6-8 hours** (critical items only)

### Key Findings

**Strengths** ✅:
- Fly.io configuration present (fly.toml)
- Production environment variables configured
- Database persistence via volume mounts
- Auto-scaling configured (min_machines_running: 0)
- Build scripts functional (npm run build)
- Node.js production mode configured

**Critical Gaps** ❌:
1. No CI/CD pipeline (manual deployments)
2. No database backup strategy
3. No health check monitoring
4. No error tracking (Sentry, etc.)
5. No logging aggregation
6. No rollback procedure documented
7. No staging environment
8. No deployment checklist
9. No performance monitoring
10. No uptime monitoring

---

## Detailed Analysis

### 1. Deployment Infrastructure

**Current State**:
- **Platform**: Fly.io (configured via fly.toml)
- **Region**: Sydney (primary_region = "syd")
- **Compute**: shared-cpu-1x, 256MB RAM
- **Auto-scaling**: stop/start on demand (min 0 machines)
- **Persistence**: Volume mount at /data for SQLite database
- **HTTPS**: Enforced via force_https = true

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Fly.io Best Practice |
|---------|------------|--------|---------|----------------------|
| Platform | ✅ Fly.io | N/A (static) | ✅ Railway | ✅ Fly.io |
| Region | ✅ Sydney | Global edge | Multi-region | ⚠️ Single region only |
| Auto-scale | ✅ 0-N machines | ✅ Automatic | ✅ Automatic | ✅ Configured |
| HTTPS | ✅ Forced | ✅ Automatic | ✅ Automatic | ✅ Configured |
| Volume mounts | ✅ /data | N/A | ✅ Persistent | ✅ Configured |
| Health checks | ❌ None | ✅ Built-in | ✅ Built-in | ⚠️ Should add |

**Issues**:
1. **Single region** — No failover if Sydney experiences outages
2. **Low memory** — 256MB may be insufficient under load (recommend 512MB minimum)
3. **No health check endpoint configured** — Fly can't detect unhealthy instances
4. **No readiness probe** — Machines may serve traffic before fully initialized
5. **No graceful shutdown** — Database connections may not close cleanly on stop

**Recommendations**:
- ✅ **DONE** (Run 16): Added `/health` endpoint with DB connectivity + memory checks
- **High Priority** (30min): Configure Fly health checks in fly.toml
- **Medium Priority** (1h): Add secondary region (Singapore or Tokyo) for redundancy
- **Medium Priority** (30min): Increase memory to 512MB (current 256MB risky)
- **Low Priority** (1h): Implement graceful shutdown handler (SIGTERM)

---

### 2. CI/CD Pipeline

**Current State**:
- ❌ **No automated CI/CD**
- Manual deployment via `fly deploy` command
- No automated testing before deploy
- No staging environment
- No rollback automation

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Fly.io + GitHub Actions |
|---------|------------|--------|---------|-------------------------|
| Auto-deploy | ❌ Manual | ✅ Git push | ✅ Git push | ⚠️ Manual (could automate) |
| Build tests | ❌ None | ✅ Automatic | ✅ Automatic | ⚠️ Could add |
| Staging env | ❌ None | ✅ Preview | ✅ Branch deploys | ⚠️ Could add |
| Rollback | ❌ Manual | ✅ 1-click | ✅ 1-click | ⚠️ Manual (could script) |

**Issues**:
1. **Manual deployments prone to human error** (forgot to run build, wrong env vars, etc.)
2. **No pre-deploy tests** — Breaking changes can reach production
3. **No staging environment** — Can't test changes before production
4. **Rollback requires manual `fly deploy` of previous version** — Slow incident response
5. **No deployment logs** — Hard to debug failed deployments

**Recommendations**:
- **Critical** (2h): Create GitHub Actions workflow for automated deploy
  - Trigger on push to `main` branch
  - Run `npm test` (if tests exist)
  - Run `npm run build` (verify no errors)
  - Deploy to Fly.io via `fly deploy`
  - Notify team on Discord/Slack
- **High Priority** (1h): Add staging app on Fly (`wantokjobs-staging`)
  - Deploy `develop` branch to staging
  - Smoke test before merging to main
- **Medium Priority** (30min): Document rollback procedure
  - `fly releases` to list versions
  - `fly deploy --image <previous-version>` to rollback
  - Keep last 5 releases for quick recovery

---

### 3. Database Management

**Current State**:
- **Database**: SQLite (better-sqlite3)
- **Location**: /data/wantokjobs.db (persistent volume)
- **Backups**: ❌ None configured
- **Migrations**: ✅ Auto-run on startup (database.js)
- **Seeding**: Manual via `npm run seed`

**Comparison**:
| Feature | WantokJobs | Vercel (Postgres) | Railway (Postgres) | Best Practice |
|---------|------------|-------------------|-------------------|---------------|
| Database | SQLite | Postgres | Postgres | ⚠️ SQLite OK for <10K users |
| Backups | ❌ None | ✅ Automatic | ✅ Automatic | ❌ CRITICAL GAP |
| Migrations | ✅ Auto | ✅ Tools | ✅ Tools | ✅ Working |
| Replication | ❌ None | ✅ Read replicas | ✅ HA | ⚠️ Single point of failure |

**Issues**:
1. **No database backups** — Data loss if volume fails (HIGH RISK)
2. **Single point of failure** — No replication (SQLite limitation)
3. **No point-in-time recovery** — Can't restore to specific timestamp
4. **Volume snapshots not automated** — Fly volumes can be snapshotted but not scheduled
5. **No backup verification** — Can't confirm backups are restorable

**Recommendations**:
- **CRITICAL** (2h): Implement automated backup script
  - Daily backup to Backblaze B2 / S3 / Cloudflare R2
  - Run via cron (3 AM MYT daily)
  - Keep 30 daily, 12 monthly backups
  - Verify backup integrity (can restore test copy)
  - Script: `/data/.openclaw/workspace/data/wantok/scripts/backup-db.sh`
- **High Priority** (1h): Document manual backup procedure
  - `fly ssh console` → `cp /data/wantokjobs.db /tmp/backup.db`
  - `fly sftp get /tmp/backup.db`
  - Store securely offsite
- **Medium Priority** (3h): Consider PostgreSQL migration for scale
  - SQLite works <10K concurrent users
  - PNG market: 30K jobseekers → may hit limits
  - PostgreSQL benefits: replication, backups, full-text search
  - Migration path: sqlite3 → pg_dump via conversion tool

---

### 4. Monitoring & Observability

**Current State**:
- ❌ **No uptime monitoring** (Pingdom, UptimeRobot, etc.)
- ❌ **No error tracking** (Sentry, Bugsnag, etc.)
- ❌ **No logging aggregation** (Logtail, Papertrail, etc.)
- ❌ **No performance monitoring** (New Relic, DataDog, etc.)
- ✅ **Health endpoint exists** (added in Run 16: /health)
- ⚠️ **Console.log only** — Logs disappear when machine restarts

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Production Standard |
|---------|------------|--------|---------|---------------------|
| Uptime monitoring | ❌ None | ✅ Built-in | ✅ Built-in | ❌ CRITICAL |
| Error tracking | ❌ None | ✅ Vercel Logs | ✅ Railway Logs | ❌ CRITICAL |
| Log aggregation | ❌ None | ✅ Real-time | ✅ Real-time | ❌ CRITICAL |
| APM | ❌ None | ✅ Analytics | ⚠️ Basic | ⚠️ Optional |
| Alerts | ❌ None | ✅ Email/Slack | ✅ Email/Slack | ❌ CRITICAL |

**Issues**:
1. **Downtime goes unnoticed** — No alerts when site is down
2. **Errors hidden** — Users see 500 errors, devs don't know
3. **Logs ephemeral** — Can't debug issues after machine restarts
4. **No performance metrics** — Can't optimize slow endpoints
5. **No user analytics** — Don't know which features are used

**Recommendations**:
- **CRITICAL** (1h): Add uptime monitoring
  - UptimeRobot (free, 5 min checks) or Better Uptime (paid, 30s checks)
  - Monitor: wantokjobs.com/health
  - Alert via email + Discord/Slack webhook
  - Check from 3+ global locations
- **CRITICAL** (2h, blocked by npm): Integrate Sentry for error tracking
  - Requires `@sentry/node` + `@sentry/react` npm packages
  - Captures unhandled exceptions + stack traces
  - User context (email, user ID) for debugging
  - Free tier: 5K events/month (sufficient for WantokJobs)
- **High Priority** (1h): Fly log forwarding to Logtail
  - Fly can forward logs to external services
  - Logtail free tier: 1 GB/month
  - Persistent logs, searchable, exportable
  - Alternative: Papertrail, Logflare
- **Medium Priority** (blocked by npm): Add express-pino-logger for structured logging
  - JSON logs easier to parse/search
  - Includes request IDs for tracing
  - Performance metrics per endpoint

---

### 5. Environment Management

**Current State**:
- ✅ `.env.example` present (template for secrets)
- ✅ Production secrets in Fly secrets (`fly secrets list`)
- ⚠️ No staging environment (can't test env var changes)
- ⚠️ Secrets not documented (what each var does)
- ⚠️ No secrets rotation policy

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Best Practice |
|---------|------------|--------|---------|---------------|
| Env template | ✅ .env.example | ✅ vercel.json | ✅ railway.json | ✅ Good |
| Secrets mgmt | ✅ Fly secrets | ✅ Dashboard | ✅ Dashboard | ✅ Good |
| Multi-env | ❌ Prod only | ✅ Preview + Prod | ✅ Branch envs | ⚠️ Should add staging |
| Documentation | ❌ None | ✅ Comments | ✅ Comments | ⚠️ Should add |
| Rotation | ❌ Never | ⚠️ Manual | ⚠️ Manual | ⚠️ Should document |

**Issues**:
1. **Production-only deployment** — Can't test env var changes safely
2. **Secrets undocumented** — New devs don't know what to set
3. **Never rotate secrets** — JWT_SECRET, API keys same since launch
4. **No audit log for secret changes** — Can't track who changed what

**Recommendations**:
- **High Priority** (30min): Document all environment variables
  - Create `ENVIRONMENT.md` with descriptions
  - Example: `JWT_SECRET` — Random 48-byte base64 string for auth tokens
  - Mark required vs optional
  - List sensitive secrets (never commit to git)
- **High Priority** (1h): Add staging environment
  - Deploy `wantokjobs-staging` app on Fly
  - Use separate database (`wantokjobs-staging.db`)
  - Different secrets (test API keys, etc.)
  - Deploy `develop` branch automatically
- **Medium Priority** (30min): Document secrets rotation procedure
  - JWT_SECRET: Rotate every 6 months (invalidates all sessions)
  - BREVO_API_KEY: Rotate if leaked
  - Database encryption key: Never rotate (data loss)
  - Test rotation in staging first

---

### 6. Security & Compliance

**Current State**:
- ✅ HTTPS enforced (force_https = true)
- ✅ Helmet.js security headers
- ✅ Rate limiting (express-rate-limit)
- ✅ Password hashing (bcrypt cost 10)
- ✅ SQL injection protection (parameterized queries + LIKE sanitization)
- ✅ CORS whitelisting (production-safe)
- ⚠️ No secrets scanning (GitHub Advanced Security)
- ⚠️ No dependency vulnerability scanning
- ❌ No WAF (Web Application Firewall)
- ❌ No DDoS protection beyond Fly's default
- ❌ No security audit log for admin actions

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Industry Standard |
|---------|------------|--------|---------|-------------------|
| HTTPS | ✅ Forced | ✅ Automatic | ✅ Automatic | ✅ Standard |
| Security headers | ✅ Helmet.js | ✅ Built-in | ✅ Built-in | ✅ Standard |
| Rate limiting | ✅ Custom | ✅ Built-in | ⚠️ Add-on | ✅ Standard |
| WAF | ❌ None | ✅ Built-in | ❌ None | ⚠️ Recommended |
| DDoS protection | ⚠️ Fly default | ✅ Cloudflare | ⚠️ Basic | ⚠️ Recommended |
| Secrets scanning | ❌ None | ✅ GitHub | ⚠️ Manual | ⚠️ Recommended |

**Recommendations**:
- **High Priority** (30min): Enable GitHub secrets scanning
  - GitHub repo → Settings → Security → Enable secret scanning
  - Alerts if API keys/passwords committed to git
  - Free for public repos, paid for private
- **High Priority** (1h): Add dependency vulnerability scanning
  - `npm audit` in CI/CD pipeline
  - Block deploys if high/critical vulnerabilities
  - Automated PR from Dependabot to update packages
- **Medium Priority** (2h): Add Cloudflare in front of Fly
  - Cloudflare → WantokJobs → Fly.io
  - Benefits: DDoS protection, WAF, caching, bot protection
  - Free tier sufficient for WantokJobs traffic
  - Requires DNS change (NS records to Cloudflare)
- **Low Priority** (1h): Implement security audit log
  - Log sensitive actions: user role changes, job deletions, payment confirmations
  - Store in `security_audit_log` table
  - Immutable (no UPDATE/DELETE allowed)
  - Admin dashboard view for compliance

---

### 7. Performance Optimization

**Current State**:
- ✅ Database indexes (33 total, added in Run 16)
- ✅ Compression middleware (gzip responses)
- ⚠️ No CDN for static assets
- ⚠️ No image optimization
- ⚠️ No caching headers
- ❌ No Redis/Memcached for session/query caching
- ❌ No background job queue (long tasks block requests)

**Comparison**:
| Feature | WantokJobs | Vercel | Railway | Best Practice |
|---------|------------|--------|---------|---------------|
| DB indexes | ✅ 33 indexes | N/A | ✅ Developer-managed | ✅ Good |
| Compression | ✅ Gzip | ✅ Brotli | ⚠️ Add middleware | ✅ Good |
| CDN | ❌ None | ✅ Global edge | ⚠️ Add Cloudflare | ⚠️ Recommended |
| Image optimization | ❌ None | ✅ Automatic | ❌ None | ⚠️ Recommended |
| Caching | ❌ None | ✅ Automatic | ⚠️ Add Redis | ⚠️ Recommended |
| Background jobs | ❌ None | ✅ Serverless functions | ⚠️ Add Bull | ⚠️ Recommended |

**Recommendations**:
- **Medium Priority** (1h): Add Cloudflare CDN
  - Cache static assets (JS, CSS, images) at edge
  - Reduces load on Fly.io (PNG → Sydney latency high)
  - Free tier includes 100 GB/month bandwidth
  - Configure `Cache-Control` headers in Express
- **Medium Priority** (2h, blocked by npm): Add image optimization
  - Requires `sharp` npm package for server-side resizing
  - Lazy loading for job cards (Intersection Observer API)
  - WebP format with JPEG fallback
  - PNG market: Many users on slow 3G → optimization critical
- **Low Priority** (blocked by npm): Add Redis for caching
  - Requires `ioredis` npm package
  - Cache expensive queries (job search, category counts)
  - Session storage (currently in-memory, lost on restart)
  - Fly Redis addon: $5/month for 256MB

---

### 8. Deployment Checklist

**Current State**: ❌ No documented deployment checklist

**Recommended Checklist** (create as DEPLOYMENT-CHECKLIST.md):

#### Pre-Deploy
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Database migrations tested locally
- [ ] Environment variables documented
- [ ] Secrets set in Fly (`fly secrets list`)
- [ ] Staging deploy successful
- [ ] Smoke test on staging (login, post job, apply)
- [ ] Performance test (response time <500ms)
- [ ] Security scan passed (`npm audit`)
- [ ] Code review approved (GitHub PR)

#### Deploy
- [ ] Announce maintenance window (if downtime expected)
- [ ] Backup database (`fly ssh console` → manual backup)
- [ ] Deploy to production (`fly deploy`)
- [ ] Health check passes (`curl https://wantokjobs.com/health`)
- [ ] Smoke test on production (critical user flows)
- [ ] Monitor error rates (check Sentry if configured)
- [ ] Monitor response times (check /health memory usage)

#### Post-Deploy
- [ ] Announce deployment success
- [ ] Monitor for 1 hour (watch for errors)
- [ ] Update changelog (CHANGELOG.md)
- [ ] Tag release in GitHub (v1.2.3)
- [ ] Document rollback steps (if issues found)

#### Rollback (if needed)
- [ ] Identify issue (error logs, user reports)
- [ ] Decide: rollback or hotfix?
- [ ] If rollback: `fly deploy --image <previous-version>`
- [ ] If hotfix: fix → test → deploy → monitor
- [ ] Post-mortem (what went wrong, how to prevent)

---

### 9. Disaster Recovery

**Current State**: ❌ No disaster recovery plan documented

**Scenarios & Procedures**:

#### Scenario 1: Database Corruption
- **Detection**: Health check fails, SQL errors in logs
- **Recovery**:
  1. Stop all write operations (maintenance mode)
  2. Restore from latest backup (S3/B2)
  3. Verify restored data integrity
  4. Resume operations
- **Time to Recovery**: 30-60 minutes (if backups exist)
- **Data Loss**: Since last backup (daily = max 24h loss)
- **Prevention**: CRITICAL — Implement automated backups

#### Scenario 2: Fly.io Region Outage (Sydney Down)
- **Detection**: Uptime monitor alerts downtime
- **Recovery**:
  1. Deploy to secondary region (Singapore/Tokyo)
  2. Update DNS to point to new region
  3. Restore database from backup
  4. Test critical flows
- **Time to Recovery**: 2-4 hours (manual process)
- **Data Loss**: Since last backup
- **Prevention**: Multi-region deployment (not currently configured)

#### Scenario 3: Malicious User / Data Breach
- **Detection**: Unusual activity in logs, user reports
- **Recovery**:
  1. Disable affected user accounts
  2. Rotate all secrets (JWT, API keys)
  3. Force password reset for all users (if needed)
  4. Restore clean database backup (if data poisoned)
  5. Notify affected users (GDPR compliance if EU users)
- **Time to Recovery**: 1-2 hours for lockdown, days for full cleanup
- **Data Loss**: Depends on breach severity
- **Prevention**: Security audit log + anomaly detection

#### Scenario 4: Accidental Data Deletion
- **Detection**: User reports missing data, admin realizes mistake
- **Recovery**:
  1. Stop operations immediately
  2. Restore from most recent backup before deletion
  3. Verify restored data with users
  4. Implement soft-delete (deleted flag, not hard delete)
- **Time to Recovery**: 1 hour
- **Data Loss**: Minimal (recent backup)
- **Prevention**: Soft-delete + admin confirmation prompts

---

### 10. PNG Market Considerations

#### Network Reliability
- **Challenge**: Intermittent internet connectivity in PNG
- **Solutions**:
  - ✅ Email notifications as fallback (implemented in Run 19)
  - ✅ Offline-friendly PWA (manifest exists)
  - ⚠️ Service worker for offline caching (not yet implemented)
  - ⚠️ SMS notifications (backup when internet down, requires Twilio)

#### Data Costs
- **Challenge**: Mobile data expensive in PNG
- **Solutions**:
  - ✅ Compression enabled (gzip responses)
  - ✅ Lightweight bundle (127 KB gzipped)
  - ⚠️ Image optimization (WebP format, lazy loading)
  - ⚠️ CDN caching (reduce repeat downloads)

#### Hosting Costs
- **Challenge**: Budget constraints for PNG startups
- **Solutions**:
  - ✅ Fly.io free tier: 3 shared-cpu-1x machines (generous)
  - ✅ SQLite (no separate database hosting cost)
  - ⚠️ Optimize to stay in free tier (auto-scale, efficient queries)
  - ⚠️ Monitor costs via Fly dashboard (set budget alerts)

#### Local Support
- **Challenge**: Few PNG developers familiar with Fly.io/modern stack
- **Solutions**:
  - **High Priority**: Write PNG-focused deployment guide
  - Document common issues (BSP bank payments, PNG internet quirks)
  - Local admin training (how to restore from backup, deploy updates)
  - Consider local support contact (PNG timezone, understands context)

---

## Implementation Roadmap

### Phase 1: Critical Production Safeguards (4 hours)

**Week 1 priorities**:
1. **Database backups** (2h) — Daily automated backups to S3/B2
2. **Uptime monitoring** (1h) — UptimeRobot + Discord/Slack alerts
3. **Deployment checklist** (30min) — DEPLOYMENT-CHECKLIST.md document
4. **Health check configuration** (30min) — fly.toml health checks

**Impact**: Data loss prevention + downtime visibility (CRITICAL)

---

### Phase 2: CI/CD & Staging (3 hours)

**Week 2 priorities**:
1. **GitHub Actions workflow** (2h) — Automated deploy on push to main
2. **Staging environment** (1h) — wantokjobs-staging app on Fly

**Impact**: Faster deploys + safer testing (HIGH)

---

### Phase 3: Monitoring & Observability (3 hours, some blocked by npm)

**Week 3-4 priorities**:
1. **Fly log forwarding** (1h) — Logtail integration
2. **Error tracking** (2h, blocked) — Sentry integration (requires @sentry/node npm)
3. **Dependency scanning** (30min) — npm audit in CI/CD

**Impact**: Better debugging + proactive issue detection (HIGH)

---

### Phase 4: Performance & Scale (4 hours, mostly blocked by npm)

**Month 2 priorities**:
1. **Cloudflare CDN** (1h) — Edge caching for static assets
2. **Image optimization** (2h, blocked) — Sharp npm package for resizing
3. **Redis caching** (3h, blocked) — Query caching + session storage
4. **Background job queue** (4h, blocked) — Bull npm package for async tasks

**Impact**: Faster page loads + handle scale (MEDIUM)

---

## Success Metrics

### Reliability Targets (6 months)
- **Uptime**: 95% → 99.9% (with monitoring + backups)
- **MTTR** (Mean Time To Recovery): Unknown → <1 hour
- **Zero data loss incidents** (with daily backups)
- **Deployment frequency**: Manual ad-hoc → 2-3x/week automated

### Performance Targets
- **Homepage load**: <2s (PNG 3G network)
- **API response time**: <500ms (p95)
- **Database query time**: <50ms (with indexes)
- **Image load time**: <1s (with optimization + CDN)

### Developer Experience
- **Deploy time**: 15 min manual → 5 min automated
- **Time to debug production issue**: Hours → Minutes (with logs)
- **Confidence in deploys**: Low → High (with staging + checklist)

---

## Risk Assessment

### Current Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Database loss (no backups) | **CRITICAL** | Medium | ✅ Implement automated backups |
| Downtime goes unnoticed | **HIGH** | High | ✅ Add uptime monitoring |
| Breaking deploy to production | **HIGH** | Medium | ✅ Add staging environment |
| Unable to rollback quickly | **MEDIUM** | Medium | ✅ Document rollback procedure |
| Secrets leaked in git | **MEDIUM** | Low | ✅ Enable GitHub secrets scanning |
| PNG region outage | **MEDIUM** | Low | ⚠️ Add secondary region (future) |
| Memory exhaustion (256MB) | **MEDIUM** | Medium | ⚠️ Increase to 512MB |
| Slow performance under load | **LOW** | Medium | ⚠️ Add caching + CDN (future) |

---

## Files to Create

1. **DEPLOYMENT-CHECKLIST.md** — Pre/during/post deploy steps
2. **ENVIRONMENT.md** — All env vars documented
3. **.github/workflows/deploy.yml** — CI/CD workflow
4. **scripts/backup-db.sh** — Automated backup script
5. **DISASTER-RECOVERY.md** — Runbook for incidents
6. **fly-staging.toml** — Staging app configuration

---

## Files to Modify

1. **fly.toml** — Add health check configuration
2. **server/index.js** — Graceful shutdown handler
3. **package.json** — Add deploy script

---

## Estimated Costs

**Current** (Fly.io free tier):
- Compute: $0/month (3 shared-cpu-1x machines free)
- Volume: $0/month (3 GB free)
- Egress: $0/month (100 GB free)
- **Total**: $0/month

**After recommendations** (staying within free tier):
- Backups (Backblaze B2): $0.005/GB/month → ~$0.50/month (100 GB total)
- Uptime monitoring (UptimeRobot): $0/month (free tier)
- Log aggregation (Logtail): $0/month (1 GB free)
- Staging app: $0/month (uses free tier slot)
- Error tracking (Sentry): $0/month (5K events free)
- CDN (Cloudflare): $0/month (free tier)
- **Total**: ~$0.50/month

**Future scaling** (10K+ users):
- Fly.io: ~$30/month (4x dedicated-cpu-1x + 20 GB volume)
- Redis: $5/month (Fly addon)
- PostgreSQL: $10/month (if migrating from SQLite)
- Error tracking (Sentry): $26/month (50K events)
- **Total**: ~$71/month (still very affordable)

---

## Next Steps

1. **Today**: Create backup script + enable uptime monitoring (2h)
2. **This week**: Add CI/CD workflow + staging environment (3h)
3. **Next week**: Configure Fly health checks + dependency scanning (1h)
4. **This month**: Implement remaining monitoring + document procedures (4h)

---

**Total Estimated Impact**: 99.9% uptime, zero data loss, 3x faster deploys, 10x faster incident response

**Priority Ranking**:
1. ✅ **Database backups** (CRITICAL — prevents data loss)
2. ✅ **Uptime monitoring** (CRITICAL — detect downtime)
3. **CI/CD pipeline** (HIGH — safer deploys)
4. **Staging environment** (HIGH — test before production)
5. **Health check config** (HIGH — Fly can detect issues)
6. Error tracking (MEDIUM — blocked by npm)
7. Log aggregation (MEDIUM — better debugging)
8. Cloudflare CDN (MEDIUM — performance)
9. Multi-region (LOW — redundancy, but complex)
