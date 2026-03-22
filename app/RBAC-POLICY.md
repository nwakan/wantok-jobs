# WantokJobs RBAC Policy Documentation

**Document Version:** 1.0  
**Last Updated:** March 22, 2026  
**Status:** Phase 3 Task 12 Complete  

## Overview

WantokJobs implements a **Role-Based Access Control (RBAC)** system with strict tenant isolation, JWT-based authentication, and hierarchical permission management. The system supports three core user roles with an additional account type distinction for agency vs employer operations.

## Role Hierarchy

### Database Schema

- **Primary Role Field**: `users.role`  
- **Allowed Values**: `'admin'`, `'employer'`, `'jobseeker'`  
- **Account Type**: `users.account_type` (`'employer'` or `'agency'`)

### Role Structure

```
Platform Admin (admin)
        ↓
Employer/Agency (employer)
        ↓
  Job Seeker (jobseeker)
```

### 1. Platform Admin (`role = "admin"`

**Capabilities**:
- Full system access and configuration
- User account management (suspend, delete, reset passwords)
- Job moderation and approval
- Application review across all employers
- System monitoring and analytics
- Rate limit management
- Cache control
- Payment and wallet administration

**Implementation**: `requireRole('admin')`

### 2. Employer (`role = "employer"`

**Account Types**:
- `account_type = 'employer'` - Direct employer (single company)
- `account_type = 'agency'` - Recruitment agency (multiple clients)

**Capabilities**:
- Create, edit, and delete job postings
- View applications for owned jobs only
- Update application status
- Add private notes to applications
- Rate and tag candidates
- Schedule interviews
- Send offer letters
- View job analytics

**Multi-Tenant Isolation**: Enforced via `employer_id` foreign keys

### 3. Job Seeker (`role = "jobseeker"`

**Capabilities**:
- Browse and search jobs
- Apply to jobs
- Withdraw own applications
- View own application history
- Manage profile and CV
- Save jobs and searches
- Use Jean AI assistant

## Permission Matrix

### Job Management Routes

| Endpoint | Admin | Employer | Job Seeker | Anonymous |
|----------|:-----:|:--------:|:----------:|:---------:|
| GET /jobs | ✅ | ✅ | ✅ | ✅ |
| POST /jobs | ✅ | ✅ | ❌ | ❌ |
| PUT /jobs/:id | ✅ | ✅ (Own) | ❌ | ❌ |
| DELETE /jobs/:id | ✅ | ✅ (Own) | ❌ | ❌ |

### Application Routes

| Endpoint | Admin | Employer | Job Seeker | Anonymous |
|----------|:-----:|:--------:|:----------:|:---------:|
| POST /applications | ❌ | ❌ | ✅ | ❌ |
| GET /applications/my | ❌ | ❌ | ✅ | ❌ |
| GET /applications/job/:jobId | ✅ | ✅ (Own) | ❌ | ❌ |
| PUT /applications/:id/status | ✅ | ✅ (Own) | ❌ | ❌ |

### Admin Routes

| Route Pattern | Access |
|---------------|--------|
| ALL /admin/* | ✅ Admin only |

## Authentication & Authorization

### JWT Token Structure

**Implementation**: `server/middleware/auth.js`

```javascript
{
  id: userId,
  email: userEmail,
  role: userRole,
  account_type: accountType,
  iat: issuedAtTimestamp,
  exp: expirationTimestamp
}
```

### Token Lifecycle

1. **Issuance**: On successful login
2. **Storage**: Client localStorage
3. **Transmission**: `Authorization: Bearer <token>` header
4. **Verification**: Every protected route
5. **Invalidation**: Automatic on password change

### Password Change Invalidation

**Critical Feature**: All tokens become invalid when user changes password

**Database Field**: `users.password_changed_at`

**Implementation**:
```javascript
if (user.iat) {
  const dbUser = db.prepare("SELECT password_changed_at FROM users WHERE id = ?").get(user.id);
  if (dbUser && dbUser.password_changed_at) {
    const changedAt = Math.floor(new Date(dbUser.password_changed_at).getTime() / 1000);
    if (changedAt > user.iat) {
      return res.status(401).json({ 
        error: "Token invalidated by password change",
        code: "TOKEN_INVALIDATED" 
      });
    }
  }
}
```

## Middleware Implementation

### Core Functions

#### 1. `authenticateToken`

**File**: `server/middleware/auth.js`

**Purpose**: Verify JWT and attach user to request

**Usage**:
```javascript
router.get("/protected", authenticateToken, (req, res) => {
  // req.user is now available
});
```

#### 2. `requireRole(...allowedRoles)`

**File**: `server/middleware/role.js`

**Purpose**: Verify user has required role

**Implementation**:
```javascript
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}
```

## Multi-Tenant Isolation

### Employer Data Isolation

**Pattern**: All employer queries include `employer_id` check

```javascript
// Get employer's jobs
const jobs = db.prepare(`
  SELECT * FROM jobs 
  WHERE employer_id = ?
`).all(req.user.id);
```

### Agency Isolation

**Pattern**: Check both role and account_type

```javascript
function requireAgency(req, res, next) {
  if (req.user.account_type !== "agency") {
    return res.status(403).json({ error: "Agency account required" });
  }
  next();
}
```

## Security Controls

### 1. Rate Limiting

- Login attempts: 5 per 15 minutes
- API requests: 100 per 15 minutes
- File uploads: 10 per hour

### 2. Input Validation

- XSS protection via sanitization
- SQL injection prevention (parameterized queries)
- File upload validation

### 3. Password Security

- bcrypt hashing (10 rounds)
- Minimum 8 characters
- Force password reset support

## Best Practices

### For Developers

1. Always use middleware for role checks
2. Scope database queries by user/employer ID
3. Test all permission combinations
4. Log all privileged operations

### For Administrators

1. Regular role/permission audits
2. Monitor suspicious access patterns
3. Rotate JWT secrets regularly
4. Review audit logs

---

## Document Status

- **Created**: March 22, 2026
- **Phase**: 3 Task 12
- **Status**: ✅ Complete
- **Next Review**: June 22, 2026
