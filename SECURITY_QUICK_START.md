# Security Quick Start Guide
## WantokJobs - Get Started in 5 Minutes

---

## 🚀 Quick Setup

### 1. Frontend Integration (Required)

Update your main app file (e.g., `client/src/main.js` or `App.jsx`):

```javascript
import { initCsrfProtection } from '@/utils/csrf';

// Initialize CSRF protection on app load
initCsrfProtection().then(() => {
  console.log('CSRF protection enabled');
});
```

Replace all `fetch` calls with `csrfFetch`:

```javascript
// Before
fetch('/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// After
import { csrfFetch } from '@/utils/csrf';

csrfFetch('/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

**Note:** Only POST/PUT/DELETE/PATCH need CSRF tokens. GET requests work as-is.

---

### 2. Database Backup (Optional but Recommended)

Set up daily backups via cron:

```bash
# Edit crontab
crontab -e

# Add this line (daily at 2 AM)
0 2 * * * node /data/.openclaw/workspace/system/agents/db-backup.js
```

Or run manually:
```bash
node system/agents/db-backup.js
```

---

### 3. Environment Variables (Production)

Add to `.env` file:

```bash
# Optional: Trusted proxy IPs (if behind load balancer)
TRUSTED_PROXIES=1.2.3.4,5.6.7.8

# Optional: Custom backup settings
DB_PATH=/path/to/wantokjobs.db
BACKUP_DIR=/path/to/backups
MAX_BACKUPS=7
```

---

## 📋 Testing Checklist

### Test CSRF Protection
```bash
# Should fail without token
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'

# Should succeed with token
TOKEN=$(curl -s http://localhost:3001/api/csrf-token | jq -r '.token')
curl -X POST http://localhost:3001/api/jobs \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

### Test Account Lockout
Try 5 failed logins, then check the 6th is blocked:
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Test File Upload Security
```bash
# Create fake PDF
echo "not a pdf" > fake.pdf

# Should fail magic byte check
curl -X POST http://localhost:3001/api/uploads/cv \
  -H "Authorization: Bearer $TOKEN" \
  -F "cv=@fake.pdf"
```

### Check Security Logs
```bash
# View recent security events
tail -f server/data/security-audit.log

# Or view in JSON format
tail -100 server/data/security-audit.log | jq
```

### View Login History
```bash
# As authenticated user
curl http://localhost:3001/api/account/security \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 🔍 Monitoring

### Security Audit Log
```bash
# Watch for attacks in real-time
tail -f server/data/security-audit.log | grep -i "HIGH\|CRITICAL"

# Count failed logins today
grep "AUTH_LOGIN_FAILED" server/data/security-audit.log | wc -l

# Find all HIGH risk events
grep '"riskLevel":"HIGH"' server/data/security-audit.log
```

### Database Backups
```bash
# List all backups
node system/agents/db-backup.js list

# Check backup directory
ls -lh server/data/backups/
```

---

## 🛠️ Common Tasks

### Reset Account Lockout (Manual)
```sql
-- In SQLite
DELETE FROM account_lockouts WHERE user_id = 123;
```

### Clear Login History
```sql
-- Keep last 30 days only
DELETE FROM login_history 
WHERE created_at < datetime('now', '-30 days');
```

### Restore from Backup
```bash
# List backups
node system/agents/db-backup.js list

# Restore (creates pre-restore backup automatically)
node system/agents/db-backup.js restore wantokjobs_2024-02-18_02-00-00.db
```

### Add Trusted Proxy
```bash
# Edit .env
echo "TRUSTED_PROXIES=1.2.3.4,5.6.7.8" >> .env

# Restart server
npm restart
```

---

## 🚨 Troubleshooting

### "CSRF token validation failed"
- Make sure you're using `csrfFetch` instead of `fetch`
- Check that cookies are enabled
- Verify `credentials: 'include'` is set

### "Account locked due to failed login attempts"
- Wait 15 minutes, or
- Manually clear lockout (see above)

### File upload rejected
- Check file is actually the correct type (not renamed)
- Verify file size is within limits
- Check server logs for specific error

### Security audit log growing too large
Set up log rotation:
```bash
# /etc/logrotate.d/wantokjobs
/path/to/server/data/security-audit.log {
  daily
  rotate 30
  compress
  missingok
  notifempty
}
```

---

## 📖 Full Documentation

- `SECURITY.md` - Complete feature documentation
- `SECURITY_IMPLEMENTATION_REPORT.md` - Implementation details

---

## 🎯 Quick Reference

| Feature | Endpoint/File | Purpose |
|---------|--------------|---------|
| CSRF Token | `GET /api/csrf-token` | Get token for state-changing requests |
| Login History | `GET /api/account/security` | View login attempts & security info |
| Clear Suspicious | `POST /api/account/security/clear-suspicious` | Clear suspicious login flags |
| Database Backup | `node system/agents/db-backup.js` | Create/restore backups |
| Security Logs | `server/data/security-audit.log` | View all security events |

---

**Ready to go! 🎉**

Start the server and all security features will be active automatically.
