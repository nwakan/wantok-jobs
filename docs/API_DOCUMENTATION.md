# WantokJobs API Documentation

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**Base URL:** https://wantokjobs.com/api  
**Environment:** Production

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Authorization (RBAC)](#authorization-rbac)
4. [Rate Limiting](#rate-limiting)
5. [Error Codes](#error-codes)
6. [Pagination](#pagination)
7. [Core Application Routes](#core-application-routes)
8. [Job Management Routes](#job-management-routes)
9. [Application Routes](#application-routes)
10. [Employer Routes](#employer-routes)
11. [Admin Routes](#admin-routes)
12. [AI & Automation Routes](#ai--automation-routes)
13. [WhatsApp Integration Routes](#whatsapp-integration-routes)
14. [User Management Routes](#user-management-routes)
15. [Analytics Routes](#analytics-routes)
16. [Payment & Subscription Routes](#payment--subscription-routes)
17. [Request/Response Examples](#requestresponse-examples)

---

## API Overview

**Architecture:** RESTful API with JSON request/response format
**Total Endpoints:** 91 route files covering 200+ individual endpoints
**Authentication:** JWT-based with refresh tokens
**Transport:** HTTPS only (HTTP redirects to HTTPS)
**Content-Type:** `application/json`

### API Base URL

```
Production: https://wantokjobs.com/api
Development: http://localhost:3001/api
```

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <access_token>
X-CSRF-Token: <csrf_token>
```

---

## Authentication

### JWT Token System

**Access Token:**
- Lifespan: 15 minutes
- Storage: HTTP-only cookie
- Usage: Authorization header

**Refresh Token:**
- Lifespan: 7 days
- Storage: HTTP-only cookie
- Usage: Automatic rotation via `/api/auth/refresh`

### Authentication Endpoints

#### POST /api/auth/register
**Description:** Create new user account
**Access:** Public
**Rate Limit:** 3 requests per hour per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "role": "jobseeker",
  "phone": "+675 7123 4567"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": 12345,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "jobseeker",
    "is_verified": false
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/login
**Description:** Authenticate existing user
**Access:** Public
**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": 12345,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "jobseeker",
    "company_id": null
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/logout
**Description:** Invalidate current session
**Access:** Authenticated
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/refresh
**Description:** Refresh access token using refresh token
**Access:** Public (requires valid refresh token in cookie)
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### OAuth Endpoints

#### POST /api/auth/google
**Description:** Google One Tap authentication
**Access:** Public
**Rate Limit:** 10 requests per minute

#### POST /api/auth/linkedin
**Description:** LinkedIn OAuth authentication
**Access:** Public
**Rate Limit:** 10 requests per minute

---

## Authorization (RBAC)

### Role Hierarchy

```
admin > employer > recruiter > jobseeker
```

### Roles and Permissions

**admin:**
- Full platform access
- User management
- Job moderation
- Company verification
- Analytics access
- System configuration

**employer:**
- Post/edit/delete own jobs
- View/manage applications for own jobs
- Company profile management
- Subscription management
- Analytics for own company

**recruiter:**
- Post jobs (within company)
- View/manage applications (within company)
- Limited analytics access
- Cannot modify company profile

**jobseeker:**
- Job search
- Apply to jobs
- Save jobs
- Profile management
- Application tracking

### Permission Enforcement

Middleware automatically enforces role-based access:

```javascript
// Example: Employer-only endpoint
app.post('/api/jobs', auth, role(['employer', 'admin']), ...)

// Example: Resource ownership check
app.put('/api/jobs/:id', auth, ownerOrAdmin, ...)
```

---

## Rate Limiting

### Global Rate Limits

**Default (all endpoints):**
- 100 requests per 15 minutes per IP
- Response header: `X-RateLimit-Remaining`

### Endpoint-Specific Limits

**Authentication:**
- Login: 5 attempts per 15 minutes
- Registration: 3 attempts per hour
- Password reset: 3 attempts per hour

**Job Operations:**
- Job posting: 10 jobs per day per employer
- Job application: 50 applications per day per jobseeker
- Job search: 60 requests per minute

**Email:**
- Email sending: 50 emails per hour per user
- Job alerts: 20 alerts per day per user

**API Access:**
- Read operations: 60 requests per minute
- Write operations: 30 requests per minute
- Admin operations: 100 requests per minute

**WhatsApp:**
- Webhook: 1000 requests per minute (Meta Cloud API)
- Outbound messages: 100 messages per hour

### Rate Limit Response

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 15 minutes.",
  "retry_after": 900
}
```

**HTTP Status:** 429 Too Many Requests

---

## Error Codes

### HTTP Status Codes

```
200 OK - Successful request
201 Created - Resource created successfully
204 No Content - Successful request with no response body
400 Bad Request - Invalid request parameters
401 Unauthorized - Authentication required
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found
409 Conflict - Resource already exists
422 Unprocessable Entity - Validation failed
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable - Maintenance mode
```

### Error Response Format

```json
{
  "error": "Validation Error",
  "message": "Invalid email format",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    }
  ],
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-05-24T12:27:14Z"
}
```

---

## Pagination

### Query Parameters

```
page - Page number (default: 1)
limit - Items per page (default: 20, max: 100)
sort - Sort field (default: created_at)
order - Sort order: asc|desc (default: desc)
```

### Paginated Response Format

```json
{
  "data": [
    { "id": 1, "title": "Job 1" },
    { "id": 2, "title": "Job 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1335,
    "total_pages": 67,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## Core Application Routes

### Health Check

#### GET /api/health
**Description:** API health status
**Access:** Public
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-24T12:27:14Z",
  "uptime": 864000,
  "version": "1.0.0",
  "database": "connected"
}
```

### Global Search

#### GET /api/search
**Description:** Search across jobs, companies, and users
**Access:** Public
**Rate Limit:** 60 requests per minute

**Query Parameters:**
```
q - Search query (required)
type - Result type: all|jobs|companies|users (default: all)
location - Filter by location
page - Page number (default: 1)
limit - Results per page (default: 20)
```

**Response (200 OK):**
```json
{
  "results": {
    "jobs": [
      {
        "id": 1,
        "title": "Software Engineer",
        "company_name": "Tech Corp PNG",
        "location": "Port Moresby"
      }
    ],
    "companies": [
      {
        "id": 1,
        "name": "Tech Corp PNG",
        "industry": "Technology",
        "location": "Port Moresby"
      }
    ]
  },
  "total": 42
}
```

---

## Job Management Routes

### List Jobs

#### GET /api/jobs
**Description:** Retrieve paginated job listings
**Access:** Public
**Rate Limit:** 60 requests per minute

**Query Parameters:**
```
page - Page number (default: 1)
limit - Jobs per page (default: 20, max: 100)
category - Filter by category ID
location - Filter by location
salary_min - Minimum salary (PGK)
salary_max - Maximum salary (PGK)
employment_type - full_time|part_time|contract|casual
remote - Filter remote jobs: true|false
search - Search query
sort - Sort field: created_at|salary|title
order - Sort order: asc|desc
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Senior Software Engineer",
      "company_id": 123,
      "company_name": "Tech Corp PNG",
      "company_logo": "https://wantokjobs.com/uploads/logos/tech-corp.png",
      "location": "Port Moresby, NCD",
      "employment_type": "full_time",
      "salary_min": 80000,
      "salary_max": 120000,
      "is_remote": false,
      "description": "We are seeking an experienced software engineer...",
      "requirements": "5+ years experience in full-stack development...",
      "applications_count": 12,
      "created_at": "2026-05-20T08:00:00Z",
      "expires_at": "2026-06-19T23:59:59Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1335,
    "total_pages": 67,
    "has_next": true
  }
}:** Retrieve single job details
**Access:** Public
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Senior Software Engineer",
  "company_id": 123,
  "company_name": "Tech Corp PNG",
  "company_logo": "https://wantokjobs.com/uploads/logos/tech-corp.png",
  "location": "Port Moresby, NCD",
  "employment_type": "full_time",
  "salary_min": 80000,
  "salary_max": 120000,
  "is_remote": false,
  "description": "We are seeking an experienced software engineer to join our growing team...",
  "requirements": "5+ years experience in full-stack development, proficiency in React and Node.js",
  "responsibilities": "Design and implement scalable web applications, mentor junior developers",
  "benefits": "Health insurance, retirement plan, professional development budget",
  "category_id": 5,
  "category_name": "Information Technology",
  "applications_count": 12,
  "views_count": 324,
  "created_at": "2026-05-20T08:00:00Z",
  "expires_at": "2026-06-19T23:59:59Z",
  "is_featured": true,
  "status": "active"
}
```

### Post Job

#### POST /api/jobs
**Description:** Create new job listing (employer/admin only)
**Access:** Authenticated (employer, admin)
**Rate Limit:** 10 jobs per day per employer

**Request Body:**
```json
{
  "title": "Senior Software Engineer",
  "description": "Full job description...",
  "requirements": "5+ years experience...",
  "employment_type": "full_time",
  "location": "Port Moresby, NCD",
  "salary_min": 80000,
  "salary_max": 120000,
  "category_id": 5,
  "is_remote": false,
  "expires_at": "2026-06-19T23:59:59Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "job_id": 1,
  "message": "Job posted successfully"
}
```

---

## Application Routes

### Apply to Job

#### POST /api/applications
**Description:** Submit job application
**Access:** Authenticated (jobseeker)
**Rate Limit:** 50 applications per day per jobseeker

**Request Body:**
```json
{
  "job_id": 1,
  "cover_letter": "I am excited to apply for this position...",
  "resume_url": "https://wantokjobs.com/uploads/resumes/user123.pdf",
  "screening_answers": [
    {
      "question_id": 1,
      "answer": "Yes, I have 5+ years of experience"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "application_id": 123,
  "status": "submitted",
  "message": "Application submitted successfully"
}
```

### List My Applications

#### GET /api/applications/me
**Description:** Retrieve jobseeker's application history
**Access:** Authenticated (jobseeker)
**Rate Limit:** 60 requests per minute

**Query Parameters:**
```
status - Filter by status: submitted|reviewed|shortlisted|rejected
page - Page number (default: 1)
limit - Applications per page (default: 20)
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 123,
      "job_id": 1,
      "job_title": "Senior Software Engineer",
      "company_name": "Tech Corp PNG",
      "status": "reviewed",
      "applied_at": "2026-05-21T10:30:00Z",
      "updated_at": "2026-05-22T14:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 15,
    "has_next": false
  }
}
```

---

## Employer Routes

### Employer Dashboard

#### GET /api/employer/dashboard
**Description:** Employer analytics and metrics
**Access:** Authenticated (employer, admin)
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "active_jobs": 5,
  "total_applications": 42,
  "pending_review": 8,
  "shortlisted": 12,
  "views_this_month": 324,
  "subscription_tier": "professional",
  "subscription_expires": "2026-06-30T23:59:59Z"
}
```

### Manage Applications

#### GET /api/employer/applications
**Description:** View applications for employer's jobs
**Access:** Authenticated (employer, recruiter, admin)
**Rate Limit:** 60 requests per minute

**Query Parameters:**
```
job_id - Filter by specific job
status - Filter by application status
page - Page number
limit - Applications per page
```

#### PUT /api/employer/applications/:id
**Description:** Update application status
**Access:** Authenticated (employer, recruiter, admin)
**Rate Limit:** 30 requests per minute

**Request Body:**
```json
{
  "status": "shortlisted",
  "notes": "Strong candidate, schedule interview"
}
```

---

## Admin Routes

### Admin Dashboard

#### GET /api/admin/dashboard
**Description:** Platform-wide analytics
**Access:** Authenticated (admin only)
**Rate Limit:** 100 requests per minute

**Response (200 OK):**
```json
{
  "total_users": 33481,
  "total_jobs": 1335,
  "total_companies": 2782,
  "active_applications": 157,
  "revenue_this_month": 15000,
  "new_users_today": 24
}
```

### Moderate Jobs

#### GET /api/admin/jobs/pending
**Description:** Jobs awaiting moderation
**Access:** Authenticated (admin only)
**Rate Limit:** 100 requests per minute

#### PUT /api/admin/jobs/:id/approve
**Description:** Approve job listing
**Access:** Authenticated (admin only)
**Rate Limit:** 100 requests per minute

---

## AI & Automation Routes

### Jean AI Chat

#### POST /api/chat
**Description:** Send message to Jean AI assistant
**Access:** Public (rate limited by IP)
**Rate Limit:** 60 requests per minute

**Request Body:**
```json
{
  "message": "What software engineer jobs are available in Port Moresby?",
  "session_token": "abc123",
  "page_context": {
    "current_page": "job_search",
    "filters": {"location": "Port Moresby"}
  }
}
```

**Response (200 OK):**
```json
{
  "response": "I found 12 software engineer positions in Port Moresby. Here are the top matches:
1. Senior Software Engineer at Tech Corp PNG (PGK 80-120K)
2. Full Stack Developer at Digital Solutions (PGK 60-90K)
Would you like to see more details?",
  "session_token": "abc123",
  "intent": "job_search",
  "confidence": 0.95
}
```

### AI Job Matching

#### GET /api/recommendations
**Description:** AI-powered job recommendations
**Access:** Authenticated (jobseeker)
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "recommendations": [
    {
      "job_id": 1,
      "title": "Senior Software Engineer",
      "match_score": 0.92,
      "reasons": [
        "Skills match: React, Node.js",
        "Experience level: Senior",
        "Location preference: Port Moresby"
      ]
    }
  ]
}
```

---

## WhatsApp Integration Routes

### WhatsApp Webhook

#### POST /api/whatsapp/webhook
**Description:** Receive WhatsApp messages from Meta Cloud API
**Access:** Public (verified via token)
**Rate Limit:** 1000 requests per minute

**Request Body (Meta Cloud API format):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "67572000000",
                "text": {"body": "Show me software engineer jobs"}
              }
            ]
          }
        }
      ]
    }
  ]
}
```

#### GET /api/whatsapp/webhook
**Description:** WhatsApp webhook verification
**Access:** Public (verified via token)
**Rate Limit:** None

### WhatsApp Account Activation

#### POST /api/whatsapp/activate
**Description:** Link WhatsApp account to WantokJobs user
**Access:** Authenticated
**Rate Limit:** 10 requests per hour

**Request Body:**
```json
{
  "phone_number": "+67572000000",
  "activation_code": "123456"
}
```

---

## User Management Routes

### Get User Profile

#### GET /api/profile
**Description:** Retrieve current user's profile
**Access:** Authenticated
**Rate Limit:** 60 requests per minute

### Update User Profile

#### PUT /api/profile
**Description:** Update user profile information
**Access:** Authenticated
**Rate Limit:** 30 requests per minute

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+675 7123 4567",
  "location": "Port Moresby, NCD",
  "bio": "Experienced software engineer..."
}
```

---

## Analytics Routes

### Platform Analytics

#### GET /api/analytics/platform
**Description:** Platform-wide metrics (admin only)
**Access:** Authenticated (admin)
**Rate Limit:** 100 requests per minute

### Employer Analytics

#### GET /api/analytics/employer
**Description:** Employer-specific metrics
**Access:** Authenticated (employer, admin)
**Rate Limit:** 60 requests per minute

---

## Payment & Subscription Routes

### List Subscription Plans

#### GET /api/subscriptions/plans
**Description:** Available subscription tiers
**Access:** Public
**Rate Limit:** 60 requests per minute

**Response (200 OK):**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": ["1 job posting", "Basic analytics"]
    },
    {
      "id": "professional",
      "name": "Professional",
      "price": 150,
      "currency": "PGK",
      "features": ["10 job postings", "Advanced analytics", "Featured listings"]
    }
  ]
}
```

### Subscribe to Plan

#### POST /api/subscriptions/subscribe
**Description:** Purchase subscription plan
**Access:** Authenticated (employer)
**Rate Limit:** 10 requests per hour

---

## Request/Response Examples

### Successful Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "error": "Validation Error",
  "message": "Invalid email format",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Must be a valid email address"
    }
  ]
}
