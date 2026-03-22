- Reset password with token from email
- All sessions automatically logged out

**2. 2FA Recovery** (Lost Authenticator)
- Use backup codes generated during 2FA setup
- Each code is single-use only
- Generate new backup codes after recovery

**3. Account Lockout** (Admin-Initiated)
- Admin sets force_password_reset flag
- User must reset password before access
- Cannot use any routes except /auth/*

### Recovery Procedures

**Lost Password + Lost 2FA**:
1. Request password reset via email
2. Use backup code to bypass 2FA during login
3. Disable and re-enable 2FA with new authenticator

**Lost Backup Codes**:
1. Login with password + 2FA code
2. Navigate to security settings
3. Generate new backup codes (requires password confirmation)
4. Old backup codes are invalidated

---

## Security Best Practices

### For Users

**Password Management**:
- Use minimum 8 characters (longer is better)
- Include uppercase, lowercase, numbers, and symbols
- Never reuse passwords across sites
- Use a password manager
- Change password if account compromise suspected

**2FA Management**:
- Enable 2FA for all accounts (especially admin)
- Use authenticator app (not SMS)
- Store backup codes securely offline
- Never share TOTP codes or backup codes
- Regenerate backup codes if compromised

### For Administrators

**Policy Enforcement**:
- Require 2FA for all admin accounts
- Enforce strong password requirements
- Monitor failed login attempts
- Regular security audits of user accounts
- Disable inactive accounts after 90 days

**Incident Response**:
- Use force_password_reset for compromised accounts
- Monitor password reset patterns for abuse
- Review 2FA disable requests
- Log all security-related actions

---

## Implementation Details

### Token Generation

**Password Reset Token**:
```javascript
const crypto = require("crypto");
const resetToken = crypto.randomBytes(32).toString("hex");
const resetExpires = new Date(Date.now() + 3600000); // 1 hour
```

**2FA Backup Codes**:
```javascript
function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex")
      .toUpperCase()
      .match(/.{4}/g)
      .join("-")
  );
}
```

### Session Invalidation

**On Password Change**:
```javascript
// Set password_changed_at timestamp
db.prepare(`
  UPDATE users 
  SET password_changed_at = datetime("now")
  WHERE id = ?
`).run(userId);

// All JWT tokens with iat < password_changed_at are invalid
```

### Rate Limiting

**Login Attempts**: 5 per 15 minutes per IP
**Password Reset**: 3 per hour per email
**2FA Setup**: 10 per hour per user
**Implementation**: `server/middleware/rate-limit.js`

## Testing

### 2FA Testing

```bash
# Test 2FA setup
curl -X POST https://wantokjobs.com/api/2fa/setup \
  -H "Authorization: Bearer <token>"

# Test 2FA verification
curl -X POST https://wantokjobs.com/api/2fa/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### Password Reset Testing

```bash
# Request password reset
curl -X POST https://wantokjobs.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Reset password with token
curl -X POST https://wantokjobs.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "...", "password": "newPassword123"}'
```

## Summary

WantokJobs implements robust authentication security with TOTP-based 2FA and secure password reset mechanisms. The platform follows industry best practices including token-based recovery, automatic session invalidation on password change, and comprehensive backup code systems.

**Key Security Features**:
- TOTP 2FA with QR code enrollment
- Single-use backup codes for recovery
- Time-limited password reset tokens (1 hour)
- Automatic session invalidation on security events
- Force password reset for compromised accounts
- Rate limiting on all sensitive endpoints

---

## Document Status

- **Created**: March 22, 2026
- **Phase**: 3 Task 14
- **Status**: ✅ Complete
- **Next Review**: June 22, 2026
- **Implementation Files**:
  - `server/routes/2fa.js` (223 lines)
  - `server/routes/auth.js` (password reset sections)
  - `server/middleware/auth.js` (token validation)
