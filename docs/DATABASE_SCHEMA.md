# WantokJobs Database Schema Documentation

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**Database Type:** SQLite 3 (better-sqlite3)  
**Database Size:** ~96MB  
**Total Tables:** 50+ tables  
**Migrations:** 51 completed migrations

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [Core Tables](#core-tables)
4. [User Management Tables](#user-management-tables)
5. [Company Management Tables](#company-management-tables)
6. [Job Management Tables](#job-management-tables)
7. [Application Management Tables](#application-management-tables)
8. [WhatsApp Integration Tables](#whatsapp-integration-tables)
9. [Jean AI Tables](#jean-ai-tables)
10. [Subscription & Payment Tables](#subscription--payment-tables)
11. [Analytics & Tracking Tables](#analytics--tracking-tables)
12. [Entity Relationships](#entity-relationships)
13. [Indexes & Performance](#indexes--performance)
14. [Migrations](#migrations)
15. [Sample Queries](#sample-queries)

---

## Database Overview

**Database Configuration:**
- **Type:** SQLite 3 with better-sqlite3 driver
- **Location:** `server/data/wantokjobs.db`
- **Size:** ~96MB (production database)
- **ACID Compliance:** Full ACID guarantees
- **Concurrency:** Read-heavy optimized, single-writer (SQLite limitation)
- **Backup:** Daily automated backups via cron (2 AM PNG time)

**Statistics (May 24, 2026):**
- Total tables: 50+ active tables
- Total users: 33,481 (30,707 jobseekers, 2,739 employers)
- Total jobs: 1,335 job listings
- Total companies: 2,782 employer organizations
- Total applications: 157 job applications
- Database growth: ~2-5MB per month

**Key Features:**
- Multi-tenant architecture via `company_id` isolation
- 95% index coverage for optimal query performance
- Parameterized queries preventing SQL injection
- Foreign key constraints enabled
- Automatic timestamp columns (created_at, updated_at)

---

## Multi-Tenant Architecture

**Isolation Strategy:**
Every tenant-specific table includes `company_id` foreign key for data segregation:

```sql
-- Example: Jobs table with multi-tenant isolation
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    -- ... other fields
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- All queries automatically filtered by company_id
SELECT * FROM jobs WHERE company_id = ? AND status = 'active';
```

**Access Control:**
- Middleware automatically injects `company_id` filter
- Row-level security enforced at application layer
- Cross-tenant queries blocked (admin exception)
- Employer users can only access their company data

**Tables with Multi-Tenant Isolation:**
- jobs
- applications
- company_verification
- employer_analytics
- notifications
- job_alerts (user-level, but company-aware)

---

## Core Tables

### users
**Purpose:** Central user authentication and profile data
**Row Count:** 33,481 users

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,                    -- bcrypt hash (10 rounds)
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,                    -- 'admin', 'employer', 'recruiter', 'jobseeker'
    company_id INTEGER,                    -- NULL for jobseekers, foreign key for employers
    is_verified BOOLEAN DEFAULT 0,         -- Email verification status
    email_verified BOOLEAN DEFAULT 0,      -- Redundant, legacy field
    oauth_provider TEXT,                   -- 'google', 'linkedin', 'facebook', NULL
    oauth_id TEXT,                         -- OAuth provider user ID
    profile_picture TEXT,                  -- URL to profile image
    location TEXT,                         -- User location (city, province)
    bio TEXT,                              -- User bio/description
    whatsapp_phone TEXT,                   -- WhatsApp phone number
    whatsapp_activated BOOLEAN DEFAULT 0,  -- WhatsApp account linked
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_whatsapp_phone ON users(whatsapp_phone);
```

**Key Relationships:**
- `company_id` → companies.id (employers/recruiters)
- `id` → profiles_jobseeker.user_id (jobseeker profiles)
- `id` → profiles_employer.user_id (employer profiles)
- `id` → applications.user_id (job applications)

---

## User Management Tables

### profiles_jobseeker
**Purpose:** Extended jobseeker profile data
**Row Count:** 30,707 profiles

```sql
CREATE TABLE profiles_jobseeker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    resume_url TEXT,                       -- URL to uploaded resume
    resume_text TEXT,                      -- Extracted resume text for search
    skills TEXT,                           -- JSON array of skills
    experience_years INTEGER,              -- Years of experience
    education_level TEXT,                  -- 'high_school', 'bachelor', 'master', 'phd'
    current_position TEXT,
    current_company TEXT,
    expected_salary_min INTEGER,           -- Minimum salary expectation (PGK)
    expected_salary_max INTEGER,           -- Maximum salary expectation (PGK)
    availability TEXT,                     -- 'immediate', '2_weeks', '1_month', 'notice_period'
    preferred_locations TEXT,              -- JSON array of preferred work locations
    willing_to_relocate BOOLEAN DEFAULT 0,
    remote_only BOOLEAN DEFAULT 0,
    job_alert_frequency TEXT DEFAULT 'daily', -- 'realtime', 'daily', 'weekly', 'none'
    profile_completeness INTEGER DEFAULT 0,   -- 0-100 score
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### profiles_employer
**Purpose:** Extended employer profile data
**Row Count:** 2,739 profiles

```sql
CREATE TABLE profiles_employer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    position TEXT,                         -- Job title within company
    department TEXT,
    can_post_jobs BOOLEAN DEFAULT 1,
    can_view_applications BOOLEAN DEFAULT 1,
    can_manage_company BOOLEAN DEFAULT 0,  -- Company profile edit permission
    hire_count INTEGER DEFAULT 0,          -- Number of successful hires
    active_jobs_count INTEGER DEFAULT 0,   -- Current active job postings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Company Management Tables

### companies
**Purpose:** Employer organization profiles
**Row Count:** 2,782 companies

```sql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,                      -- URL-friendly name
    industry TEXT,                         -- Industry category
    size TEXT,                             -- '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
    founded_year INTEGER,
    website TEXT,
    logo_url TEXT,
    banner_url TEXT,                       -- Cover photo/banner image
    tagline TEXT,                          -- Short company slogan
    description TEXT,                      -- Full company description
    mission TEXT,                          -- Company mission statement
    culture TEXT,                          -- Company culture description
    specialties TEXT,                      -- JSON array of specialties/focus areas
    benefits TEXT,                         -- JSON array of employee benefits
    headquarters TEXT,                     -- HQ location
    locations TEXT,                        -- JSON array of office locations
    contact_email TEXT,
    contact_phone TEXT,
    linkedin_url TEXT,
    facebook_url TEXT,
    twitter_url TEXT,
    video_url TEXT,                        -- Company video URL
    is_verified BOOLEAN DEFAULT 0,         -- Company verification status
    verification_method TEXT,              -- 'iparegistry', 'manual', 'domain', NULL
    verified_at DATETIME,
    transparency_score INTEGER DEFAULT 0,  -- 0-100 company transparency score
    profile_completeness INTEGER DEFAULT 0, -- 0-100 profile completion score
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'basic', 'professional', 'premium', 'enterprise', 'unlimited'
    subscription_expires_at DATETIME,
    credits_balance INTEGER DEFAULT 0,     -- Job posting credits
    jobs_posted_count INTEGER DEFAULT 0,
    active_jobs_count INTEGER DEFAULT 0,
    total_applications_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_is_verified ON companies(is_verified);
CREATE INDEX idx_companies_subscription_tier ON companies(subscription_tier);
```

### company_verification
**Purpose:** Company verification status tracking

```sql
CREATE TABLE company_verification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    status TEXT NOT NULL,                  -- 'pending', 'verified', 'rejected'
    method TEXT,                           -- 'iparegistry', 'manual', 'domain'
    verified_by INTEGER,                   -- Admin user ID
    verification_data TEXT,                -- JSON verification details
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## Job Management Tables

### jobs
**Purpose:** Job listings
**Row Count:** 1,335 jobs

```sql
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,                      -- URL-friendly title
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    benefits TEXT,                         -- JSON array or text
    category_id INTEGER,
    subcategory TEXT,
    employment_type TEXT,                  -- 'full_time', 'part_time', 'contract', 'casual', 'internship'
    location TEXT NOT NULL,
    province TEXT,
    is_remote BOOLEAN DEFAULT 0,
    salary_min INTEGER,                    -- Minimum salary (PGK)
    salary_max INTEGER,                    -- Maximum salary (PGK)
    salary_currency TEXT DEFAULT 'PGK',
    salary_period TEXT DEFAULT 'annual',   -- 'hourly', 'daily', 'weekly', 'monthly', 'annual'
    experience_required TEXT,              -- 'entry', 'mid', 'senior', 'executive'
    experience_years_min INTEGER,
    experience_years_max INTEGER,
    education_required TEXT,               -- 'high_school', 'bachelor', 'master', 'phd'
    skills_required TEXT,                  -- JSON array of required skills
    skills_preferred TEXT,                 -- JSON array of preferred skills
    application_deadline DATETIME,         -- Application deadline
    expires_at DATETIME,                   -- Job listing expiry (30 days default)
    status TEXT DEFAULT 'active',          -- 'active', 'paused', 'closed', 'expired', 'draft'
    is_featured BOOLEAN DEFAULT 0,         -- Featured job flag
    is_promoted BOOLEAN DEFAULT 0,         -- Promoted/sponsored job flag
    applications_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    source TEXT,                           -- 'manual', 'scraped', 'imported'
    external_url TEXT,                     -- Original job URL (if scraped)
    posted_by INTEGER,                     -- User ID who posted the job
    contact_email TEXT,                    -- Job-specific contact email
    contact_phone TEXT,                    -- Job-specific contact phone
    quick_apply_enabled BOOLEAN DEFAULT 1, -- Enable quick apply feature
    screening_questions TEXT,              -- JSON array of screening questions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN  await db.exec(`
    ALTER TABLE employers ADD COLUMN contact_email TEXT;
    ALTER TABLE employers ADD COLUMN contact_phone TEXT;
  `);
};
```

### Migration Execution

**Automatic Execution:** migrations run automatically on app start via `runner.js`
**Manual Execution:** `node server/migrations/runner.js`

**Migration Tracking:**
```sql
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Sample Queries

### Find Active Jobs

```sql
SELECT j.id, j.title, c.name as company_name, j.location, j.salary_min, j.salary_max
FROM jobs j
JOIN companies c ON j.company_id = c.id
WHERE j.status = 'active'
  AND j.expires_at > datetime('now')
ORDER BY j.created_at DESC
LIMIT 20;
```

### Get Job with Application Count

```sql
SELECT 
  j.*,
  c.name as company_name,
  c.logo_url as company_logo,
  (SELECT COUNT(*) FROM applications WHERE job_id = j.id AND status != 'withdrawn') as applications_count
FROM jobs j
JOIN companies c ON j.company_id = c.id
WHERE j.id = ?;
```

### Find Jobs Matching User Skills

```sql
SELECT j.id, j.title, c.name as company_name
FROM jobs j
JOIN companies c ON j.company_id = c.id
CROSS JOIN profiles_jobseeker p
WHERE p.user_id = ?
  AND j.status = 'active'
  AND j.skills_required LIKE '%' || json_extract(p.skills, '$[0]') || '%'
ORDER BY j.created_at DESC;
```

### Get User's Application History

```sql
SELECT 
  a.id,
  a.status,
  a.applied_at,
  j.title as job_title,
  c.name as company_name,
  j.location
FROM applications a
JOIN jobs j ON a.job_id = j.id
JOIN companies c ON j.company_id = c.id
WHERE a.user_id = ?
ORDER BY a.applied_at DESC;
```

### Company Verification Status

```sql
SELECT 
  c.id,
  c.name,
  c.is_verified,
  cv.status as verification_status,
  cv.method as verification_method,
  cv.verified_by
FROM companies c
LEFT JOIN company_verification cv ON c.id = cv.company_id
WHERE c.is_verified = 1
ORDER BY cv.created_at DESC;
```

### WhatsApp Active Sessions

```sql
SELECT 
  ws.phone_number,
  u.full_name,
  u.email,
  ws.current_flow,
  ws.last_activity
FROM whatsapp_sessions ws
LEFT JOIN users u ON ws.user_id = u.id
WHERE ws.last_activity > datetime('now', '-1 hour')
ORDER BY ws.last_activity DESC;
```

### Jean AI Usage Stats

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as message_count,
  COUNT(DISTINCT session_id) as unique_sessions,
  platform
FROM jean_messages
WHERE created_at > datetime('now', '-7 days')
GROUP BY DATE(created_at), platform
ORDER BY date DESC;
```

---

## Conclusion

WantokJobs database schema demonstrates:

✅ **Production-Ready**: 25+ core tables handling real users and jobs
✅ **Multi-Tenant**: Company-based isolation architecture
✅ **Well-Indexed**: 95% index coverage for optimal performance
✅ **Normalized**: Proper relationships and foreign key constraints
✅ **Scalable**: Clear migration path to PostgreSQL when needed
✅ **Feature-Rich**: WhatsApp integration, Jean AI, ATS workflows

The schema supports 33,481 users, 1,335 jobs, and 2,782 companies while maintaining data integrity and query performance.

For additional details, see:
- **API_DOCUMENTATION.md** - API endpoints and data access patterns
- **ARCHITECTURE.md** - Overall system architecture
- **DEPLOYMENT_GUIDE.md** - Database backup and maintenance procedures
