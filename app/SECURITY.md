# Security Hardening - WantokJobs

This document describes the security features implemented in the WantokJobs application.

## Implemented Features

### 1. CSRF Protection (`server/middleware/csrf.js`)

**Purpose:** Prevent Cross-Site Request Forgery attacks

**How it works:**
- Generates unique CSRF tokens per session
- Tokens stored in secure, httpOnly cookies
- Validates tokens on all POST/PUT/DELETE/PATCH requests
- Tokens validated via `X-CSRF-Token` header
- Webhooks are exempted (`/api/whatsapp`, `/api/webhook/*`)

**Usage:**
- Backend automatically validates tokens
- Frontend: Use `csrfFetch` from `client/src/utils/csrf.js`
- Token endpoint: `GET /api/csrf-token`

**Example (Frontend):**
```javascript
import { csrfFetch } from '@/utils/csrf';

// Initialize on app load
await initCsrfProtection();

// Use csrfFetch instead of fetch
const response = await csrfFetch('/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(jobData),
});
```

---

### 2. Input Sanitization (`server/middleware/inputSanitizer.js`)

**Purpose:** Detect and prevent SQL injection, XSS, and path traversal attacks

**What it detects:**
- SQL injection patterns (UNION, DROP, etc.)
- XSS attacks (script tags, event handlers)
- Path traversal (`../`, etc.)

**How it works:**
- Scans all request body, query params, and URL params
- Preserves legitimate content in description fields
- Logs detected attacks with risk level
- Strips dangerous patterns while keeping the rest of the input

**Attack Detection:**
All detected attacks are logged to the security audit log with:
- IP address
- User ID (if authenticated)
- Detected pattern type
- Field name
- Request details

---

### 3. API Security Headers (`server/middleware/apiSecurity.js`)

**Purpose:** Add security headers and detect header spoofing

**Features:**
- `X-Request-ID` - Request tracing
- `X-Response-Time` - Performance monitoring
- `X-RateLimit-Remaining` - Rate limit info
- Header spoofing detection (`X-Forwarded-For`, `X-Real-IP`)

**Header Spoofing Detection:**
- Blocks requests with proxy headers from untrusted sources
- Trusted proxies configured via `TRUSTED_PROXIES` env var
- Logs suspicious requests to security audit

**Environment Variables:**
```bash
TRUSTED_PROXIES=1.2.3.4,5.6.7.8  # Comma-separated trusted proxy IPs
```

---

### 4. Secure File Uploads (`server/middleware/uploadSecurity.js`)

**Purpose:** Harden file upload security

**Features:**
- **Magic byte validation** - Validates file type by content, not extension
- **File size limits** - 2MB for images, 5MB for documents
- **Filename sanitization** - Prevents path traversal attacks
- **Allowed file types:**
  - Images: JPG, PNG, WebP, GIF
  - Documents: PDF, DOC, DOCX

**Magic Bytes Validation:**
- PDF: `%PDF`
- JPEG: `0xFF 0xD8 0xFF`
- PNG: `0x89 0x50 0x4E 0x47`
- DOCX: ZIP signature `PK`

**Usage:**
```javascript
const { uploadSecurity } = require('../middleware/uploadSecurity');

router.post('/upload', 
  authenticateToken, 
  upload.single('file'), 
  uploadSecurity('cv'),  // Validates as CV (PDF/DOC/DOCX)
  (req, res) => {
    // File is validated and safe
  }
);
```

**Categories:**
- `avatar` - Profile pictures (2MB, JPG/PNG/WebP/GIF)
- `logo` - Company logos (5MB, JPG/PNG/WebP/SVG)
- `cv` - Resumes (5MB, PDF/DOC/DOCX)
- `banner` - Banner images (5MB, JPG/PNG/WebP)
- `photo` - General photos (2MB, JPG/PNG)
- `document` - General documents (5MB, PDF/DOC/DOCX)

---

### 5. Account Security (`server/routes/account-security.js`)

**Purpose:** Protect user accounts from brute force and unauthorized access

**Features:**

#### Password Strength Validation
- Minimum 8 characters
- Must contain letters AND numbers
- Common password detection
- Strength scoring (0-100)

#### Account Lockout
- Locks after 5 failed login attempts
- 15-minute lockout duration
- Automatic unlocking after timeout
- Lockout tracking in `account_lockouts` table

#### Login History
- Tracks all login attempts (successful and failed)
- Records: IP, user agent, timestamp, success status
- Suspicious login detection (new IP/location)
- Database table: `login_history`

#### Suspicious Login Detection
- Flags logins from new IPs
- Compares against last 5 successful logins
- User can view and clear suspicious flags

**API Endpoints:**

```
GET /api/account/security
```
Returns:
- Recent login history (last 20)
- Account lockout status
- Login statistics
- Unique IPs used

```
POST /api/account/security/clear-suspicious
```
Clears suspicious login flags for the user.

**Database Tables:**

```sql
-- Login history
CREATE TABLE login_history (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 1,
  failure_reason TEXT,
  country TEXT,
  city TEXT,
  suspicious INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Account lockouts
CREATE TABLE account_lockouts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

### 6. Database Backup Script (`system/agents/db-backup.js`)

**Purpose:** Automated database backups with rotation

**Features:**
- Creates timestamped SQLite backups
- Keeps last 7 daily backups (configurable)
- Automatic rotation (deletes old backups)
- Backup verification (size comparison)
- Restore functionality with rollback

**Usage:**

```bash
# Create backup
node system/agents/db-backup.js

# List backups
node system/agents/db-backup.js list

# Restore from backup
node system/agents/db-backup.js restore wantokjobs_2024-02-18_02-00-00.db

# Help
node system/agents/db-backup.js help
```

**Cron Setup (daily at 2 AM):**
```bash
0 2 * * * node /data/.openclaw/workspace/system/agents/db-backup.js
```

**Environment Variables:**
```bash
DB_PATH=/path/to/wantokjobs.db           # Database path
BACKUP_DIR=/path/to/backups              # Backup directory
MAX_BACKUPS=7                            # Number of backups to keep
```

**Default Paths:**
- Database: `server/data/wantokjobs.db`
- Backups: `server/data/backups/`
- Format: `wantokjobs_YYYY-MM-DD_HH-MM-SS.db`

---

### 7. Security Audit Logger (`server/middleware/securityAudit.js`)

**Purpose:** Comprehensive security event logging

**Events Logged:**
- Authentication events (login, logout, failed attempts)
- Admin actions (all non-GET requests to `/api/admin/*`)
- Claim attempts
- File uploads
- Detected attack patterns (SQL injection, XSS, etc.)
- Failed authorization (401, 403)
- Rate limit violations (429)

**Log Format:**
```json
{
  "timestamp": "2024-02-18T09:25:00.000Z",
  "type": "AUTH_LOGIN_FAILED",
  "details": {
    "path": "/api/auth/login",
    "statusCode": 401,
    "userAgent": "Mozilla/5.0..."
  },
  "riskLevel": "MEDIUM",
  "userId": "user@example.com",
  "ip": "1.2.3.4"
}
```

**Risk Levels:**
- `INFO` - Normal operations
- `LOW` - Minor security events
- `MEDIUM` - Suspicious activity
- `HIGH` - Detected attacks
- `CRITICAL` - Successful attacks or breaches

**Log Location:**
`server/data/security-audit.log`

**Reading Audit Logs:**
```javascript
const { readAuditLog } = require('./middleware/securityAudit');

const logs = readAuditLog({
  limit: 100,
  offset: 0,
  riskLevel: 'HIGH',  // Filter by risk level
  userId: 123,        // Filter by user
});
```

---

## Middleware Order in `server/index.js`

The middleware is registered in this order:

1. Request ID tracking
2. Request metrics
3. Compression
4. Anti-scraping protection
5. Security headers (Helmet)
6. CORS
7. Rate limiting (global)
8. Cookie parser
9. Request logging
10. **Input sanitization** ⬅️ NEW
11. **API security headers** ⬅️ NEW
12. **Security audit logger** ⬅️ NEW
13. Express JSON parser
14. **CSRF protection** ⬅️ NEW
15. API routes

## Testing the Security Features

### 1. Test CSRF Protection
```bash
# Without CSRF token (should fail)
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Job"}'

# With CSRF token (should succeed)
TOKEN=$(curl -s http://localhost:3001/api/csrf-token | jq -r '.token')
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"title":"Test Job"}'
```

### 2. Test Input Sanitization
```bash
# Try SQL injection (should be detected and logged)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass OR 1=1"}'

# Check security audit log
tail -f server/data/security-audit.log
```

### 3. Test Account Lockout
```bash
# Try 5 failed logins
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}'
done

# 6th attempt should be locked
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"anypassword"}'
```

### 4. Test File Upload Security
```bash
# Create a fake PDF (wrong magic bytes)
echo "not a real pdf" > fake.pdf

# Try to upload (should fail magic byte validation)
curl -X POST http://localhost:3001/api/uploads/cv \
  -H "Authorization: Bearer $TOKEN" \
  -F "cv=@fake.pdf"
```

### 5. Test Database Backup
```bash
# Create backup
node system/agents/db-backup.js

# List backups
node system/agents/db-backup.js list

# Check backup directory
ls -lh server/data/backups/
```

## Security Checklist

- [x] CSRF protection on all state-changing requests
- [x] Input sanitization (SQL injection, XSS, path traversal)
- [x] Security headers (HSTS, CSP, X-Frame-Options, etc.)
- [x] File upload validation (magic bytes, size limits)
- [x] Password strength requirements
- [x] Account lockout after failed attempts
- [x] Login history tracking
- [x] Suspicious login detection
- [x] Comprehensive security audit logging
- [x] Automated database backups
- [x] Header spoofing detection
- [x] Rate limiting (already existed)
- [x] JWT token validation (already existed)

## Environment Variables

Add these to your `.env` file:

```bash
# CSRF (uses default in-memory store, consider Redis for production clusters)
# No config needed

# API Security
TRUSTED_PROXIES=1.2.3.4,5.6.7.8  # Optional: trusted proxy IPs

# Database Backup
DB_PATH=/data/.openclaw/workspace/data/wantok/app/server/data/wantokjobs.db
BACKUP_DIR=/data/.openclaw/workspace/data/wantok/app/server/data/backups
MAX_BACKUPS=7
```

## Production Recommendations

1. **CSRF Tokens:** Consider using Redis for token storage in clustered environments
2. **Security Audit Logs:** Set up log rotation and monitoring alerts
3. **Database Backups:** Run daily via cron and store off-site
4. **Failed Login Notifications:** Consider emailing users after suspicious login attempts
5. **Rate Limiting:** Tune limits based on actual usage patterns
6. **File Uploads:** Consider virus scanning for production uploads
7. **Geo-Location:** Integrate IP geo-location for suspicious login detection

## Files Created/Modified

### New Files:
- `server/middleware/csrf.js` - CSRF protection
- `server/middleware/inputSanitizer.js` - Input sanitization
- `server/middleware/apiSecurity.js` - API security headers
- `server/middleware/uploadSecurity.js` - File upload security
- `server/middleware/securityAudit.js` - Security audit logger
- `server/routes/account-security.js` - Account security endpoints
- `system/agents/db-backup.js` - Database backup script
- `client/src/utils/csrf.js` - Frontend CSRF utility
- `SECURITY.md` - This documentation

### Modified Files:
- `server/index.js` - Integrated all security middleware
- `server/routes/uploads.js` - Added upload security validation
- `server/routes/auth.js` - Integrated account lockout and login tracking

---

**Last Updated:** 2024-02-18  
**Version:** 1.0.0
