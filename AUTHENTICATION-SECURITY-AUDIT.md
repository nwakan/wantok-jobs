# Authentication & Security Audit — WantokJobs

**Date**: 2026-02-16  
**Auditor**: Nazira (AI Assistant)  
**Reference Platforms**: Auth0, GitHub, Stripe, Okta best practices  
**Current Score**: 7.5/10 (good foundation, missing advanced features)  
**Target Score**: 9.0/10 (best-in-class)

---

## Executive Summary

WantokJobs has a **solid authentication foundation** with bcrypt password hashing, JWT tokens, rate limiting, account lockout, and Helmet.js security headers. However, **critical gaps exist** around 2FA, session management, CSRF protection, and email verification that prevent this from being truly production-grade for a job board handling sensitive employer and jobseeker data.

**Risk Level**: MEDIUM  
**Estimated work**: 12 hours to reach 9/10 score  
**Top 3 priorities**: Email verification (2h), Stronger password policies (1h), Session management (3h)

---

## ✅ Strengths (What's Working Well)

### 1. Password Security
- ✅ **Bcrypt hashing** (cost 10) — industry standard, better than MD5/SHA-256
- ✅ **Weak password blocklist** (25 common passwords including PNG-specific: wantokjobs, png123, portmoresby)
- ✅ **Legacy password migration** — MD5:salt passwords auto-upgraded to bcrypt on login
- ✅ **Min length**: 6 characters (should be 8+, see gaps)
- ✅ **Password reset flow** with email verification
- ✅ **SHA-256 token hashing** before database storage (prevents DB compromise attacks)
- ✅ **1-hour reset token expiry** (reasonable for PNG email delivery times)

### 2. Account Protection
- ✅ **Account lockout**: 5 failed attempts → 15 minute lockout
- ✅ **Remaining attempts display**: User warned before lockout
- ✅ **Lockout expiry auto-clear**: Graceful unlock after duration
- ✅ **Failed attempts reset on success**: Prevents permanent lockout

### 3. HTTP Security (Helmet.js)
- ✅ **X-Content-Type-Options**: nosniff (prevents MIME sniffing attacks)
- ✅ **X-Frame-Options**: DENY (prevents clickjacking)
- ✅ **X-XSS-Protection**: 1; mode=block (legacy XSS filter)
- ✅ **Referrer-Policy**: strict-origin-when-cross-origin (privacy)
- ✅ **CSP disabled for SPA**: Correct approach for React apps

### 4. Rate Limiting (express-rate-limit)
- ✅ **Global**: 200 req/min per IP (generous but protects against floods)
- ✅ **Auth endpoints**: 10/min (prevents brute force)
- ✅ **Contact forms**: 5/min (prevents spam)
- ✅ **Standard headers** (RateLimit-* headers exposed)
- ✅ **Proper error messages** (user-friendly, not technical)

### 5. JWT Implementation
- ✅ **Secret enforcement**: Production requires JWT_SECRET in env
- ✅ **Auto-generated secret suggestion**: Console output for new deployments
- ✅ **7-day expiry**: Balances convenience vs security (see gaps for refresh token)
- ✅ **Payload includes role**: Enables role-based access control
- ✅ **Proper Bearer token format**: Authorization: Bearer <token>

### 6. Input Validation
- ✅ **Zod schemas** on auth endpoints (register, login, forgot/reset password)
- ✅ **Email format validation**: Prevents malformed emails
- ✅ **Required field checks**: All critical fields validated
- ✅ **Role whitelist**: Only jobseeker, employer, admin allowed

### 7. CORS Configuration
- ✅ **Origin control**: process.env.CORS_ORIGIN or '*' (dev-friendly)
- ✅ **Credentials support**: Enabled for cookie-based auth (not currently used but ready)

### 8. Email Security Notifications
- ✅ **Welcome emails** on registration (jobseeker/employer-specific)
- ✅ **Password reset emails** with secure token links
- ✅ **Password changed emails** (alerts user of unauthorized changes)
- ✅ **Admin notifications** on new user registration (fraud monitoring)

### 9. Logging & Monitoring
- ✅ **Activity log table**: Tracks register, login, apply, etc.
- ✅ **Request logging middleware**: All API calls logged
- ✅ **Health check endpoint**: /health with DB connectivity, latency, memory
- ✅ **Console logging**: Auth events logged to stdout

### 10. Database Security
- ✅ **Parameterized queries**: All SQL uses ? placeholders (no string interpolation)
- ✅ **SQL injection protection**: Sanitization on LIKE queries (added in Run 16)
- ✅ **Indexes on critical columns**: User email, job employer_id, etc. (added in Run 16)

---

## ❌ Critical Gaps (MUST FIX for Production)

### 1. ❌ No Email Verification (HIGH RISK)
**Issue**: Accounts are activated immediately on registration. Anyone can register with fake/disposable emails.

**Risk**: 
- Spam accounts (employers posting fake jobs)
- Data pollution (abandoned unverified profiles)
- Reputation damage (emails to invalid addresses hurt sender score)

**Impact**: HIGH (job boards rely on verified employers)

**Fix** (2 hours):
```sql
-- Add email_verified column
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN verification_token TEXT;
ALTER TABLE users ADD COLUMN verification_token_expires TEXT;

-- Update auth.js registration flow:
1. Generate verification token (crypto.randomBytes)
2. Send verification email with link
3. Return success but require verification before full access
4. Add /auth/verify-email/:token endpoint
5. Block job posting/applying until verified
```

**Reference**: GitHub, Auth0, all top job boards require email verification

---

### 2. ❌ No 2FA/MFA Support (MEDIUM-HIGH RISK)
**Issue**: Single-factor authentication only (password). No TOTP, SMS, or backup codes.

**Risk**:
- Admin account compromise (full database access)
- Employer account takeover (fake job postings, applicant data theft)
- Credential stuffing attacks succeed (if password leaked elsewhere)

**Impact**: MEDIUM-HIGH (especially for admin/employer roles)

**Fix** (3-4 hours):
```sql
-- Add 2FA tables
CREATE TABLE user_2fa (
  user_id INTEGER PRIMARY KEY,
  method TEXT DEFAULT 'totp', -- totp, sms, email
  secret TEXT, -- TOTP secret (encrypted)
  backup_codes TEXT, -- JSON array of hashed codes
  enabled INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Implementation:
1. npm install speakeasy qrcode (TOTP library)
2. /api/auth/2fa/setup → Generate QR code
3. /api/auth/2fa/verify → Verify code, enable 2FA
4. /api/auth/2fa/backup-codes → Generate 10 single-use codes
5. Update login flow: check user_2fa.enabled, require code if yes
6. Add /api/auth/2fa/disable (requires current password + code)
```

**Reference**: GitHub (TOTP required for orgs), Okta, Auth0 standard

**Constraint**: Requires npm packages — can't implement without root access

---

### 3. ❌ No Session Management / Token Revocation (HIGH RISK)
**Issue**: JWTs are stateless. Once issued, they're valid for 7 days no matter what (logout, password change, account ban don't revoke).

**Risk**:
- Stolen tokens valid until expiry (7 days is too long)
- Compromised accounts can't be locked out immediately
- Logout is client-side only (token still works if attacker has it)

**Impact**: HIGH (common JWT vulnerability)

**Fix** (3 hours):
```sql
-- Session table approach
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of JWT
  ip_address TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_activity TEXT DEFAULT (datetime('now')),
  revoked INTEGER DEFAULT 0
);

-- Implementation:
1. On login: Insert session row with token hash
2. authenticateToken middleware: Check sessions table (not revoked, not expired)
3. /api/auth/logout: UPDATE sessions SET revoked=1 WHERE token_hash=?
4. /api/auth/sessions: List active sessions
5. /api/auth/sessions/:id/revoke: Revoke specific session (device management)
6. Password change: Revoke ALL sessions except current

-- Alternative: Redis-based blacklist (faster but requires external dep)
```

**Reference**: GitHub (active sessions page), all modern apps

---

### 4. ⚠️ Weak Password Policy (MEDIUM RISK)
**Issue**: Only 6 characters minimum, no complexity requirements (uppercase, number, symbol).

**Risk**:
- Brute force easier (lowercase-only 6-char = 309 million combinations vs 8-char mixed = 218 trillion)
- Weak password blocklist helps but not sufficient
- User accounts vulnerable to dictionary attacks

**Impact**: MEDIUM (mitigated by account lockout, but still weak)

**Fix** (1 hour):
```javascript
// Enhanced password validation in auth.js

function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Include at least one special character');
  }
  
  // Check against common patterns
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character');
  }
  
  if (/^(012|123|234|345|456|567|678|789|890)+/.test(password)) {
    errors.push('Password cannot be a simple sequence');
  }
  
  return errors;
}

// Alternative: zxcvbn library (entropy-based scoring)
// More sophisticated but requires npm install zxcvbn
```

**Reference**: NIST SP 800-63B (8+ chars, check against breach lists), Auth0 defaults

---

### 5. ❌ No CSRF Protection (MEDIUM RISK)
**Issue**: No anti-CSRF tokens on state-changing operations (POST/PUT/DELETE).

**Risk**:
- Malicious sites can submit forms to WantokJobs on behalf of logged-in users
- Job posting, application submission, account changes possible via CSRF

**Impact**: MEDIUM (mitigated if using SameSite cookies, but JWTs in localStorage are vulnerable)

**Fix** (1.5 hours):
```javascript
// Option 1: SameSite cookie approach (preferred for JWT)
// Set JWT in httpOnly, SameSite=Strict cookie instead of localStorage

// Option 2: csurf middleware (requires cookie-parser)
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Add to all state-changing routes
app.post('/api/jobs', csrfProtection, ...);

// Frontend: Include CSRF token in meta tag, read and send with requests
```

**Reference**: Django (CSRF middleware standard), Ruby on Rails, OWASP

**Constraint**: csurf requires npm package — can't add without root

---

### 6. ❌ No Device/IP Tracking (MEDIUM RISK)
**Issue**: No anomaly detection for suspicious logins (new device, new country, impossible travel).

**Risk**:
- Account takeover goes unnoticed
- User not alerted when someone logs in from Port Moresby then 5 min later from Nigeria

**Impact**: MEDIUM (quality-of-life security feature)

**Fix** (2 hours):
```sql
-- Login history table
CREATE TABLE login_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  country_code TEXT,
  city TEXT,
  success INTEGER, -- 1=success, 0=failed
  failure_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Anomaly detection logic:
1. On login: Check last successful login IP/country
2. If different: Send "new device" email alert
3. If impossible travel (<4h between distant locations): Require email verification
4. Store geolocation from IP (use free MaxMind GeoLite2 DB or ipinfo.io API)
```

**Reference**: GitHub (email on new device login), Google (suspicious activity alerts)

---

### 7. ⚠️ No Password History (LOW-MEDIUM RISK)
**Issue**: Users can change password back to old password immediately (defeats rotation purpose).

**Risk**:
- Compromised old password reused after forced reset
- Compliance failures (some regulations require password history)

**Impact**: LOW-MEDIUM (depends on compliance needs)

**Fix** (1 hour):
```sql
CREATE TABLE password_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- On password change:
1. Check last 5 passwords in history
2. Reject if new password matches any (bcrypt.compare)
3. After success: INSERT into password_history
4. Clean up old entries (keep last 5 only)
```

**Reference**: NIST SP 800-63B recommends against forced rotation but supports history for reuse prevention

---

### 8. ⚠️ Wide-Open CORS in Development (LOW RISK, HIGH IMPACT IF DEPLOYED)
**Issue**: `CORS_ORIGIN = '*'` allows any domain to make API requests (dev-friendly but risky).

**Risk**:
- Production deploy with `*` → any website can call API
- Sensitive data leaks to malicious sites
- CSRF easier to exploit

**Impact**: LOW (dev only), HIGH if deployed with default

**Fix** (5 minutes):
```javascript
// server/index.js
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://wantokjobs.com', 'https://www.wantokjobs.com']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Reference**: All production APIs (strict origin whitelist)

---

## ⚠️ Medium-Priority Gaps (Should Fix Soon)

### 9. ⚠️ JWT Expiry Too Long (7 Days)
**Issue**: Long-lived tokens = larger compromise window. No refresh token system.

**Fix**: 1h access tokens + 30d refresh tokens (2 hours implementation)

### 10. ⚠️ No Role-Based Password Policies
**Issue**: Admins should have stricter requirements (2FA mandatory, 12+ char passwords).

**Fix**: Role-specific validation in `validatePasswordStrength()` (30 min)

### 11. ⚠️ No Account Deletion Workflow
**Issue**: Users can't delete their own accounts (GDPR violation in EU, good practice globally).

**Fix**: /api/auth/delete-account endpoint with password confirmation (1 hour)

### 12. ⚠️ No Security Audit Log
**Issue**: Activity log exists but doesn't track security events (password change, 2FA enable, role change).

**Fix**: Dedicated security_events table with admin dashboard view (1.5 hours)

---

## 📊 Comparison to Best-in-Class Platforms

| Feature | WantokJobs | GitHub | Auth0 | Stripe |
|---------|------------|--------|-------|--------|
| **Bcrypt password hashing** | ✅ | ✅ | ✅ | ✅ |
| **Email verification** | ❌ | ✅ | ✅ | ✅ |
| **2FA/TOTP** | ❌ | ✅ | ✅ | ✅ |
| **Session management** | ❌ | ✅ | ✅ | ✅ |
| **Account lockout** | ✅ | ✅ | ✅ | ✅ |
| **Rate limiting** | ✅ | ✅ | ✅ | ✅ |
| **Password strength policy** | ⚠️ (6 char) | ✅ (8+) | ✅ (8+) | ✅ (8+) |
| **CSRF protection** | ❌ | ✅ | ✅ | ✅ |
| **Device tracking** | ❌ | ✅ | ✅ | ✅ |
| **Password history** | ❌ | ✅ | ✅ | ✅ |
| **Security audit log** | ⚠️ | ✅ | ✅ | ✅ |
| **OAuth/SSO** | ❌ | ✅ | ✅ | ✅ |
| **IP whitelisting** | ❌ | ✅ | ✅ | ✅ |
| **Anomaly detection** | ❌ | ✅ | ✅ | ✅ |
| **GDPR compliance** | ⚠️ | ✅ | ✅ | ✅ |
| **SOC 2 ready** | ❌ | ✅ | ✅ | ✅ |

**Score**: 6/15 features = **40%** (vs best-in-class 100%)

---

## 🛠️ Implementation Roadmap

### Phase 1: Critical Fixes (6 hours)
**Goal**: Eliminate HIGH-risk gaps

1. ✅ **Email verification** (2h)
   - Add email_verified column + verification_token
   - Send verification email on registration
   - Block job posting/applying until verified
   - Add /auth/verify-email/:token endpoint

2. ✅ **Password policy strengthening** (1h)
   - Increase min length: 6 → 8 characters
   - Add complexity requirements (uppercase, number, symbol)
   - Implement validatePasswordStrength() function
   - Update frontend with strength meter

3. ✅ **Session management** (3h)
   - Create sessions table
   - Update authenticateToken to check sessions
   - Add /api/auth/sessions endpoint (list + revoke)
   - Revoke sessions on password change

### Phase 2: Medium-Priority Security (4 hours)

4. ✅ **CSRF protection** (1.5h)
   - Migrate JWT from localStorage → httpOnly cookie
   - Set SameSite=Strict cookie flag
   - Update frontend auth handling

5. ✅ **CORS hardening** (15min)
   - Whitelist production domains
   - Block wildcard in production

6. ✅ **Device tracking** (2h)
   - Create login_history table
   - Log IP, user agent on login
   - Send email alerts on new device

7. ⚠️ **Password history** (1h) — SKIP (low value for PNG market)

### Phase 3: Advanced Features (6+ hours) — REQUIRES NPM PACKAGES

8. ❌ **2FA/TOTP** (4h) — BLOCKED (requires speakeasy + qrcode npm packages)
9. ❌ **Anomaly detection** (2h) — BLOCKED (requires geolocation API or MaxMind)
10. ❌ **Security audit dashboard** (3h) — FUTURE

---

## 🎯 Success Metrics

**Before Improvements**:
- Email verification: 0% (no verification)
- 2FA adoption: 0% (not available)
- Avg token lifetime: 7 days (too long)
- CSRF attacks: VULNERABLE
- Session hijacking: VULNERABLE (no revocation)
- Password strength: WEAK (6 char, no complexity)

**After Phase 1+2** (10 hours):
- Email verification: 100% (required)
- Session hijacking: MITIGATED (revocation available)
- Avg token lifetime: 1 hour (with 30d refresh)
- CSRF attacks: PROTECTED (SameSite cookies)
- Password strength: STRONG (8+ char, complexity)
- Device tracking: ENABLED (new device emails)
- CORS: HARDENED (whitelist only)

**Target After All Phases** (16+ hours):
- 2FA adoption: 30% employers, 80% admins (after education campaign)
- Security score: 9/10
- Compliance: GDPR-ready
- Trust: Best-in-class for PNG job boards

---

## 🇵🇬 PNG Market Considerations

### 1. **Email Verification Challenges**
- **Issue**: PNG internet reliability varies (rural vs urban)
- **Solution**: 
  - 24-hour verification window (not 1 hour)
  - Resend verification email button (no limit)
  - SMS fallback for critical employers (Digicel, bmobile)

### 2. **2FA Adoption Barriers**
- **Issue**: Smartphone penetration ~45% in PNG, data costs high
- **Solution**:
  - Make 2FA optional for jobseekers
  - Mandatory only for employers posting >5 jobs
  - SMS backup codes (one-time, no app needed)
  - Email-based 2FA as alternative to TOTP

### 3. **Password Complexity**
- **Issue**: High complexity → forgotten passwords → support burden
- **Balance**:
  - 8 characters + 2 of 4 types (not all 4)
  - Weak password blocklist includes PNG-specific terms
  - Password reset always available (email-based)

### 4. **Session Management**
- **Issue**: Shared devices common (internet cafes, office computers)
- **Solution**:
  - Prominent logout button
  - Auto-logout after 30 min inactivity
  - "Log out all devices" option in settings
  - Session list shows last IP + city (helps detect unauthorized access)

---

## 📝 Testing Plan

### 1. Email Verification Testing
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","role":"jobseeker","name":"Test User"}'

# Check email_verified = 0
sqlite3 wantokjobs.db "SELECT email, email_verified FROM users WHERE email='test@example.com';"

# Attempt to post job (should fail)
curl -X POST http://localhost:3001/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Job"}' 
# Expected: 403 Forbidden, "Email verification required"

# Verify email
curl http://localhost:3001/api/auth/verify-email/<token>
# Expected: 200 OK, email_verified = 1

# Retry job post (should succeed)
```

### 2. Password Policy Testing
```bash
# Test weak passwords
passwords=("short" "onlylowercase" "ONLYUPPERCASE" "12345678" "NoSpecial1")

for pwd in "${passwords[@]}"; do
  echo "Testing: $pwd"
  curl -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$RANDOM@example.com\",\"password\":\"$pwd\",\"role\":\"jobseeker\",\"name\":\"Test\"}"
  echo ""
done
# Expected: All should fail with specific error messages
```

### 3. Session Revocation Testing
```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"ValidPass123!"}' | jq -r .token)

# Use token (should work)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Retry (should fail)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/me
# Expected: 403 Forbidden, "Session revoked"
```

### 4. Device Tracking Testing
```bash
# Login from different IPs/user agents
# Should trigger email alerts on new device detection
```

### 5. CSRF Testing
```bash
# Attempt cross-origin POST with credentials
# Should be blocked by SameSite=Strict cookies
```

---

## 🔐 Security Checklist (Production Deployment)

- [ ] JWT_SECRET is strong random value (48+ bytes base64)
- [ ] Email verification ENABLED and required
- [ ] CORS whitelist configured (no `*`)
- [ ] HTTPS enforced (Helmet HSTS header)
- [ ] Database backups automated (encrypted at rest)
- [ ] Rate limiting tested under load
- [ ] Password policy enforced (8+ chars, complexity)
- [ ] Session management active (revocation works)
- [ ] Security headers verified (securityheaders.com scan)
- [ ] SQL injection testing passed (sqlmap scan)
- [ ] XSS testing passed (OWASP ZAP scan)
- [ ] Dependency audit clean (npm audit, Snyk)
- [ ] Secrets not in git (check .env, .gitignore)
- [ ] Logs don't contain passwords/tokens
- [ ] Error messages don't leak system details
- [ ] File upload validation (if implemented)
- [ ] Admin panel behind 2FA (once implemented)
- [ ] Incident response plan documented
- [ ] Security contact email published
- [ ] Bug bounty program considered

---

## 📚 References

1. **OWASP Top 10 2021**: https://owasp.org/www-project-top-ten/
2. **NIST SP 800-63B** (Digital Identity Guidelines): Password policies
3. **Auth0 Security Best Practices**: https://auth0.com/docs/secure
4. **GitHub Security Features**: 2FA, session management patterns
5. **Stripe API Security**: Rate limiting, idempotency keys
6. **JWT Best Practices**: https://tools.ietf.org/html/rfc8725
7. **bcrypt Cost Factor**: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## 💡 Quick Wins (No External Dependencies)

These can be implemented **immediately** without npm packages:

1. ✅ **Stronger password validation** (30 min) — Pure JavaScript
2. ✅ **CORS whitelist** (5 min) — Configuration change
3. ✅ **Email verification flow** (2h) — Uses existing crypto + email libs
4. ✅ **Session table** (3h) — SQLite schema + middleware update
5. ✅ **Login history tracking** (1h) — New table + INSERT on login
6. ✅ **Password history** (1h) — New table + bcrypt compare
7. ✅ **Security audit log** (1.5h) — New table + logging calls

**Total Quick Wins**: ~9 hours, raises score from 7.5/10 → 8.5/10

---

## 🚫 Blocked Features (Require npm install)

These **cannot** be implemented without root access:

1. ❌ **2FA/TOTP** — Requires speakeasy, qrcode, or similar
2. ❌ **CSRF middleware** — Requires csurf package
3. ❌ **IP geolocation** — Requires geoip-lite or API calls
4. ❌ **Password strength meter (zxcvbn)** — Better entropy calculation
5. ❌ **OAuth/SSO** — Requires passport.js or similar
6. ❌ **Advanced anomaly detection** — ML libraries (brain.js, tensorflow)

**Workaround**: Document these as post-deployment enhancements, implement once hosting environment allows npm installs.

---

**End of Audit** — Nazira, 2026-02-16 23:15 MYT
