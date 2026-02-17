# WantokJobs Security Audit — Authentication & Backend

**Compared against:** Auth0, Okta, GitHub, Stripe best practices, OWASP Top 10

**Current Score:** 8.5/10 (strong foundation, minor gaps)

**Audit Date:** 2026-02-16

---

## ✅ Strengths (Already Implemented)

### Password Security
1. **bcrypt hashing** with 10 rounds (industry standard)
2. **Password length** validation (min 6 chars)
3. **Legacy MD5 migration** — seamlessly upgrades old passwords on login
4. **Password changed notifications** — emails user when password changes
5. **Forgot password flow** with 1-hour expiry token
6. **Separate change password** endpoint (requires current password)

### Authentication
1. **JWT tokens** with 7-day expiry (reasonable balance)
2. **Bearer token** format (Authorization: Bearer TOKEN)
3. **Token verification** middleware catches expired/invalid tokens
4. **Role-based access control** (jobseeker/employer/admin)
5. **/me endpoint** to fetch current user
6. **Last login tracking** (updates on every login)

### Rate Limiting (express-rate-limit)
1. **Global:** 200 req/min per IP (prevents API abuse)
2. **Auth endpoints:** 10 req/min (login, register, forgot-password)
3. **Contact form:** 5 req/min (prevents spam)
4. **Granular application:** Applied per-route (best practice)

### HTTP Security Headers (Helmet + custom)
1. **helmet()** middleware with CSP disabled for SPA
2. **X-Content-Type-Options: nosniff** — prevents MIME sniffing
3. **X-Frame-Options: DENY** — prevents clickjacking
4. **X-XSS-Protection: 1; mode=block** — XSS filter (legacy browsers)
5. **Referrer-Policy: strict-origin-when-cross-origin** — privacy
6. **Cache-Control** headers for static assets (1-year immutable)

### CORS
1. **Configured** with process.env.CORS_ORIGIN (or * default)
2. **Credentials: true** — allows cookies/auth headers

### Input Validation (Zod)
1. **Validation middleware** on all write endpoints
2. **Schemas defined** for register, login, forgot-password, reset-password, change-password
3. **Type coercion** and error messages

### Activity Logging
1. **activity_log table** tracks user actions (register, login, apply)
2. **Metadata** stored as JSON (context for security audits)
3. **Graceful failures** (try/catch, doesn't block response)

### Email Security
1. **Password reset emails** with token link
2. **Password changed notifications** (alerts user to unauthorized changes)
3. **Welcome emails** with account confirmation

---

## ❌ Gaps (vs Auth0/Okta/Best Practices)

### High Priority (Security Risks)

1. **No 2FA/MFA support** ⚠️
   - Auth0/Okta standard feature
   - Should support TOTP (Google Authenticator, Authy)
   - Critical for admin accounts
   - Estimated impact: Prevents 99.9% of credential-stuffing attacks

2. **JWT_SECRET in code** ⚠️
   - Current: `process.env.JWT_SECRET || 'your_jwt_secret_change_in_production'`
   - Fallback is dangerous (hardcoded secret in production if .env missing)
   - Recommendation: Fail fast if JWT_SECRET not set in production
   - Add startup check: `if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('JWT_SECRET required in production');`

3. **No password complexity requirements** ⚠️
   - Current: Only checks length >= 6
   - NIST/OWASP recommend:
     - Min 8 characters (12+ for admin)
     - Check against common password lists (e.g., Have I Been Pwned)
     - No complexity rules (research shows they don't help)
     - Blocklist: "password", "123456", "wantokjobs", etc.
   - Frontend shows strength meter but backend doesn't enforce

4. **No account lockout after failed attempts** ⚠️
   - Current: Rate limit (10 req/min) but no lockout
   - Risk: Brute force within rate limit (10 attempts/min = 14,400/day)
   - Recommendation:
     - Track failed attempts per user (not just IP)
     - Lockout after 5 failed attempts (15 min lockout)
     - Email user when lockout occurs
     - Reset counter on successful login

5. **No session management** ⚠️
   - Current: JWT only, no revocation
   - Problem: Can't invalidate tokens (user logout doesn't kill token server-side)
   - Risk: Stolen token valid until expiry (7 days)
   - Recommendation:
     - Add `sessions` table with token hashes
     - Check session validity on sensitive actions
     - Provide "logout all devices" functionality
     - Track device fingerprint (User-Agent, IP) for suspicious activity

6. **Password reset token stored in plain text** ⚠️
   - Current: `reset_token` column stores raw token
   - Risk: DB compromise reveals valid reset tokens
   - Recommendation:
     - Hash token before storage (bcrypt or SHA256)
     - Compare hash during reset
     - Same as password hashing principle

### Medium Priority (Security Enhancements)

7. **No email verification on registration** 
   - Current: Users active immediately after registration
   - Risk: Fake accounts, spam
   - Recommendation:
     - Send verification email with token
     - Set `email_verified = 0` by default
     - Require verification before posting jobs/applying

8. **No CSRF token system**
   - Current: Headers set but no token validation
   - Risk: Cross-site request forgery on state-changing actions
   - Recommendation:
     - csurf middleware or custom implementation
     - SameSite cookie attribute (already helps in modern browsers)
     - Double-submit cookie pattern

9. **No API key authentication for integrations**
   - Current: Only JWT for web app
   - Missing: API keys for third-party integrations
   - Use case: ATS integrations, mobile apps, webhooks

10. **No IP whitelisting for admin**
    - Risk: Admin accounts accessible from any IP
    - Recommendation: Optional IP whitelist for admin role

11. **JWT expiry too long (7 days)**
    - Auth0 default: 1 hour access token + 30-day refresh token
    - Current: Single 7-day token, no refresh
    - Recommendation:
      - 1-hour access token
      - 30-day refresh token
      - Rotate tokens on refresh

12. **No security audit log**
    - Current: activity_log tracks actions, but not security events
    - Missing:
      - Failed login attempts
      - Password changes
      - Email changes
      - Role changes (admin actions)
      - Token revocations
      - 2FA enable/disable
    - Recommendation: Separate `security_events` table

### Low Priority (Nice-to-Have)

13. **No device fingerprinting**
    - Track User-Agent, IP, screen resolution (hashed)
    - Detect suspicious logins from new devices
    - "Is this you?" email confirmation

14. **No password expiry**
    - NIST no longer recommends forced expiry
    - But enterprise clients may require it
    - Optional setting: 90-day expiry for compliance

15. **No OAuth/SSO**
    - "Login with Google/LinkedIn" not supported
    - For future: passport.js integration

16. **No breach detection**
    - Check passwords against Have I Been Pwned API
    - Warn users if their password appears in breaches

17. **No Content Security Policy (CSP)**
    - Currently disabled: `contentSecurityPolicy: false`
    - Prevents XSS but requires careful configuration for SPA

18. **No Subresource Integrity (SRI)**
    - For CDN resources (if using)
    - Ensures scripts haven't been tampered

---

## 🔧 Recommendations (Prioritized)

### Immediate (This Run) — 30-45 min

1. ✅ **JWT_SECRET startup check** (5 min)
   ```javascript
   if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
     throw new Error('❌ JWT_SECRET required in production. Set in .env file.');
   }
   ```

2. ✅ **Account lockout system** (15 min)
   - Add `failed_attempts` and `lockout_until` columns to `users` table
   - Track failed logins in auth.js
   - Return "Account locked" error if `lockout_until > now()`
   - Reset on successful login

3. ✅ **Password complexity validation** (10 min)
   - Function: `isWeakPassword(password)` checks against blocklist
   - Blocklist: ["password", "123456", "qwerty", "wantokjobs", "papuanewguinea"]
   - Return error if weak password detected

4. ✅ **Hash reset tokens** (10 min)
   - Use crypto.createHash('sha256').update(token).digest('hex')
   - Store hash in database
   - Compare hash during password reset

### Short-Term (Next Week) — 2-3 hours

5. **Email verification** (1h)
   - Add `email_verified` column (default 0)
   - Send verification email on registration
   - Require verification before job posting/applying
   - `/api/auth/verify-email` endpoint

6. **2FA/TOTP support** (2h)
   - npm: speakeasy (TOTP generation)
   - npm: qrcode (QR code for setup)
   - Add `two_factor_secret` column to users
   - Add `two_factor_enabled` boolean
   - `/api/auth/setup-2fa`, `/api/auth/verify-2fa` endpoints
   - Require 2FA code on login if enabled

7. **Session management** (1h)
   - Create `sessions` table: id, user_id, token_hash, device, ip, created_at, expires_at
   - Store token hash (not plain JWT)
   - Check session validity on authenticateToken
   - `/api/auth/sessions` (list active sessions)
   - `/api/auth/revoke-session` (logout device)
   - `/api/auth/revoke-all` (logout all devices)

### Long-Term (Next Month) — 4-6 hours

8. **Security audit log** (1h)
   - Separate `security_events` table
   - Track: failed_login, password_change, role_change, 2fa_toggle, suspicious_login
   - Admin dashboard view

9. **Breach detection** (30 min)
   - Integrate Have I Been Pwned Passwords API
   - Warn on registration/password change if compromised

10. **OAuth/SSO** (4h)
    - passport.js + passport-google-oauth20
    - "Login with Google" button
    - Link Google account to existing account

---

## 🎯 Implementation Plan (This Run)

I'll implement the 4 immediate improvements:

1. **JWT_SECRET check** — Startup validation
2. **Account lockout** — Failed attempt tracking + 15min lockout
3. **Password blocklist** — Reject common weak passwords
4. **Hash reset tokens** — Store SHA256 hash, not plaintext

**Estimated time:** 45 minutes  
**Security impact:** Closes 4 high-priority vulnerabilities  
**Breaking changes:** None (backward compatible)

---

## 📊 After Immediate Fixes: 9.0/10

Would match or exceed Auth0/Okta on:
- ✅ Password security (bcrypt, min length, blocklist)
- ✅ Account lockout (prevents brute force)
- ✅ Token security (hash reset tokens, JWT_SECRET required)
- ✅ Rate limiting (auth endpoints protected)
- ⚠️ Still missing: 2FA (most critical gap), email verification, session management

**Comparison**:
- **WantokJobs (current):** 8.5/10
- **WantokJobs (after fixes):** 9.0/10
- **Auth0:** 10/10 (2FA, SSO, breach detection, device fingerprinting, anomaly detection)
- **Okta:** 10/10 (enterprise-grade, compliance certifications)
- **GitHub:** 9.5/10 (2FA, SSH keys, device verification, audit log)
- **Stripe:** 9.5/10 (2FA, API keys, webhook signing, restricted keys)

**PNG Market Context:**
- **2FA adoption low** in PNG (limited smartphone penetration in rural areas)
- **Email verification** more critical (many fake Gmail accounts)
- **SMS fallback** for 2FA would help (Digicel, bmobile common)
- **Password complexity** less critical (user education more important)
- **Rate limiting** crucial (PNG has high bot activity from SEA region)

**OWASP Top 10 Coverage:**
1. ✅ Broken Access Control — Role-based middleware
2. ✅ Cryptographic Failures — bcrypt, TLS (assumed)
3. ✅ Injection — Parameterized SQL queries
4. ⚠️ Insecure Design — Missing 2FA, email verification
5. ✅ Security Misconfiguration — Helmet headers, rate limiting
6. ⚠️ Vulnerable Components — npm audit shows 2 moderate issues (need npm audit fix)
7. ⚠️ Identification/Auth Failures — No account lockout (will fix), no 2FA
8. ✅ Software/Data Integrity — (need SRI for CDN resources)
9. ✅ Logging/Monitoring — activity_log (need security_events)
10. ⚠️ SSRF — No external URL fetching (low risk)

**Score: 7/10 on OWASP** (after fixes: 8/10)
