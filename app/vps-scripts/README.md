# WantokJobs VPS Deployment Scripts

Complete production deployment infrastructure for WantokJobs. This setup ensures zero-downtime deploys, proper caching, and automatic service recovery.

## 🏗️ Architecture

```
Internet → Cloudflare → nginx → Node.js (port 3001)
                 ↓
          Cache Control Headers
                 ↓
    HTML: no-cache (always fresh)
    JS/CSS: immutable (1 year cache)
    API: no-store (never cached)
```

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `setup-all.sh` | One-time setup script (run this first) |
| `deploy.sh` | Auto-deploy script (triggered by webhook) |
| `watchdog.sh` | Service health monitor (runs via cron) |
| `nginx-tolarai.conf` | Production nginx configuration |
| `wantokjobs.service` | Systemd service definition |

## 🚀 Initial Setup

### Prerequisites

- Ubuntu/Debian VPS with root access
- Node.js 18+ installed
- Nginx installed
- Git repository cloned to `/opt/wantokjobs`

### One-Time Setup

```bash
# Clone repository (if not already done)
sudo git clone <your-repo-url> /opt/wantokjobs

# Run setup script
cd /opt/wantokjobs/app/vps-scripts
sudo bash setup-all.sh
```

This script will:
- ✅ Install systemd service
- ✅ Configure nginx with optimal cache headers
- ✅ Set up watchdog monitoring (every 5 min)
- ✅ Install dependencies and build frontend
- ✅ Start the service

## 🔄 Auto-Deploy Workflow

### How It Works

1. **Developer pushes to `main` branch**
2. **GitHub webhook** calls `/api/webhook/github`
3. **Webhook handler** triggers `deploy.sh` using `setsid` (fully detached)
4. **Deploy script** runs:
   - `git pull origin main`
   - `cd client && npx vite build`
   - `systemctl restart wantokjobs`
5. **Service restarts** without killing the deploy script

### Configure GitHub Webhook

1. Go to your GitHub repo → Settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://tolarai.com/api/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Set in `.env` as `GITHUB_WEBHOOK_SECRET`
   - **Events**: Just the `push` event

### Manual Deploy

```bash
sudo bash /opt/wantokjobs/app/vps-scripts/deploy.sh
```

### View Deploy Logs

```bash
tail -f /var/log/wantokjobs-deploy.log
```

## 🛡️ Cache Strategy

### Service Worker (`client/public/sw.js`)

The service worker has been completely rewritten to fix caching issues:

**What Changed:**
- ❌ **Before**: Cached `index.html` indefinitely → served stale JS references
- ✅ **After**: NEVER caches HTML → always fetches fresh

**Caching Strategy:**
- **HTML pages** (`/`, `index.html`): Network only, never cached
- **Static assets** (`/assets/*.js`, `*.css`): Stale-while-revalidate
- **API responses**: Never cached
- **Service worker**: `skipWaiting()` + `clients.claim()` for immediate activation

### Nginx Caching

**HTML** (index.html):
```nginx
Cache-Control: no-cache, no-store, must-revalidate
```

**Static assets** (JS/CSS with hashes):
```nginx
Cache-Control: public, max-age=31536000, immutable
```

**API responses**:
```nginx
Cache-Control: no-store, no-cache, must-revalidate
```

### Cloudflare Settings

**Recommended Cloudflare settings:**
1. **Caching Level**: Standard
2. **Browser Cache TTL**: Respect Existing Headers
3. **Always Online**: OFF (prevents serving stale pages)

**Page Rules** (optional):
- `wantokjobs.com/api/*` → Cache Level: Bypass

## 🔧 Service Management

### Check Service Status

```bash
sudo systemctl status wantokjobs
```

### View Live Logs

```bash
# Service logs
sudo journalctl -u wantokjobs -f

# Deploy logs
tail -f /var/log/wantokjobs-deploy.log

# Watchdog logs
tail -f /var/log/wantokjobs-watchdog.log
```

### Restart Service

```bash
sudo systemctl restart wantokjobs
```

### Reload Nginx

```bash
# Test config first
sudo nginx -t

# Reload if OK
sudo systemctl reload nginx
```

## 🩺 Health Monitoring

### Watchdog Script

Runs every 5 minutes via cron to ensure service is healthy.

**What it checks:**
1. Is the service running? (`systemctl is-active`)
2. Does `/health` endpoint respond?

**What it does:**
- Restarts service if down
- Restarts service if not responding to health checks
- Logs all actions to `/var/log/wantokjobs-watchdog.log`

### Manual Health Check

```bash
curl http://localhost:3001/health | jq .
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "database": {
    "status": "connected",
    "jobs": 150,
    "users": 200
  }
}
```

## 🔒 Security

### CSP Headers

Fixed to allow:
- ✅ Cloudflare analytics (`https://static.cloudflareinsights.com`)
- ✅ Google Fonts (`https://fonts.googleapis.com`, `https://fonts.gstatic.com`)

### Nginx Security

- Real IP detection (Cloudflare IPs configured)
- Rate limiting (API: 60 req/min, general: 120 req/min)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- File upload limits (10MB max)

## 🐛 Troubleshooting

### Problem: Webhook crashes server

**Symptom**: Server restarts immediately when you push to GitHub

**Cause**: Old webhook code used `exec()` which was killed when the server restarted

**Fix**: ✅ Now using `setsid` to fully detach deploy script

### Problem: Old JS bundles cached forever

**Symptom**: Users see "No companies found" or broken UI after deploy

**Cause**: Service worker or Cloudflare cached `index.html` with old JS hash references

**Fix**: 
- ✅ Service worker never caches HTML
- ✅ Nginx sends `no-cache` headers for HTML
- ✅ Cloudflare should respect these headers

**Force clear:**
```bash
# On server
sudo systemctl restart nginx

# Tell users to hard refresh
Ctrl+Shift+R (Chrome/Firefox)
Cmd+Shift+R (Mac)
```

### Problem: CSP blocks Cloudflare analytics

**Symptom**: Browser console shows CSP violation errors

**Fix**: ✅ Added `https://static.cloudflareinsights.com` to `connectSrc` and `scriptSrc`

### Problem: Service won't start

**Check logs:**
```bash
sudo journalctl -u wantokjobs -n 100
```

**Common issues:**
- Port 3001 already in use → `sudo lsof -i :3001`
- Missing environment variables → Check `/opt/wantokjobs/app/server/.env`
- Database permissions → Check file ownership
- Node.js version → Requires Node 18+

### Problem: Deploy script fails

**Check deploy log:**
```bash
tail -n 100 /var/log/wantokjobs-deploy.log
```

**Common issues:**
- Git merge conflicts → Manually resolve in `/opt/wantokjobs/app`
- npm install fails → Check disk space (`df -h`)
- Vite build fails → Check Node.js memory limit
- Permission denied → Ensure scripts are executable (`chmod +x vps-scripts/*.sh`)

## 📊 Monitoring Best Practices

### Log Rotation

The scripts automatically trim their log files to prevent disk space issues:
- Deploy log: 1000 lines max
- Watchdog log: 500 lines max

For service logs, configure systemd journal limits:

```bash
# Edit /etc/systemd/journald.conf
SystemMaxUse=500M
```

### Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check largest directories
du -sh /opt/wantokjobs/* | sort -h

# Clean up old builds (if needed)
cd /opt/wantokjobs/app/client
rm -rf dist/old-builds
```

### Performance Monitoring

```bash
# Check service memory usage
systemctl status wantokjobs

# Check nginx connections
sudo nginx -T | grep worker_connections

# Check database size
du -sh /opt/wantokjobs/app/server/data/
```

## 🔄 Rollback Procedure

If a deploy breaks production:

```bash
# 1. Check recent commits
cd /opt/wantokjobs/app
git log --oneline -n 5

# 2. Revert to previous commit
git reset --hard HEAD~1

# 3. Rebuild and restart
cd client && npx vite build && cd ..
sudo systemctl restart wantokjobs

# 4. Verify health
curl http://localhost:3001/health
```

## 📞 Support

### Useful Commands Reference

```bash
# Service management
sudo systemctl status wantokjobs      # Check status
sudo systemctl restart wantokjobs     # Restart
sudo systemctl stop wantokjobs        # Stop
sudo systemctl start wantokjobs       # Start

# Logs
sudo journalctl -u wantokjobs -f     # Live service logs
tail -f /var/log/wantokjobs-deploy.log   # Deploy logs
tail -f /var/log/wantokjobs-watchdog.log # Watchdog logs

# Nginx
sudo nginx -t                         # Test config
sudo systemctl reload nginx           # Reload config
sudo systemctl restart nginx          # Restart nginx

# Deploy
sudo bash /opt/wantokjobs/app/vps-scripts/deploy.sh  # Manual deploy

# Health check
curl http://localhost:3001/health | jq .
```

## 📝 Changelog

### 2026-02-18 - Major Infrastructure Overhaul

**Fixed:**
- ✅ Webhook no longer crashes server (uses `setsid` to detach)
- ✅ Service worker never caches HTML (stale-while-revalidate for assets only)
- ✅ Nginx properly caches static assets but not HTML
- ✅ CSP headers allow Cloudflare analytics and Google Fonts
- ✅ Proper deploy pipeline (pull → build → restart)

**Added:**
- ✅ Complete setup script (`setup-all.sh`)
- ✅ Watchdog monitoring (every 5 min)
- ✅ Comprehensive logging
- ✅ Lockfile-based deploy queue
- ✅ Health check integration

---

## 📧 Questions?

For issues or questions, check:
1. Service logs: `sudo journalctl -u wantokjobs -f`
2. Deploy logs: `tail -f /var/log/wantokjobs-deploy.log`
3. Nginx error log: `tail -f /var/log/nginx/wantokjobs-error.log`

**Emergency contact**: Nick (system owner)
