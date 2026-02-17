# WantokJobs API v2 - Endpoint Reference

Base URL: `/api`

## 🆕 New Endpoints (v2)

### Categories
```
GET    /api/categories           - List all categories
GET    /api/categories/:slug     - Get category by slug
```

### Plans (Public)
```
GET    /api/plans                - List active subscription plans
```

### Orders (Auth Required - Employer)
```
POST   /api/orders               - Create new order
GET    /api/orders/my            - Get my orders
GET    /api/orders/:id           - Get order details
GET    /api/orders/admin/all     - [ADMIN] List all orders
```

### Screening Questions
```
POST   /api/screening/jobs/:jobId/questions           - [EMPLOYER] Add screening question
GET    /api/screening/jobs/:jobId/questions           - Get job screening questions
POST   /api/screening/applications/:appId/answers     - [JOBSEEKER] Submit answers
```

### Job Alerts (Auth Required - Jobseeker)
```
POST   /api/job-alerts           - Create job alert
GET    /api/job-alerts           - List my alerts
PUT    /api/job-alerts/:id       - Update alert
DELETE /api/job-alerts/:id       - Delete alert
```

### Saved Resumes (Auth Required - Employer)
```
POST   /api/saved-resumes/:userId   - Save a jobseeker's resume
GET    /api/saved-resumes           - List saved resumes
DELETE /api/saved-resumes/:userId   - Remove saved resume
```

### Messages (Auth Required)
```
POST   /api/messages             - Send message
GET    /api/messages             - Get inbox (query: type=received|sent)
GET    /api/messages/:id         - Get message details
PUT    /api/messages/:id/read    - Mark as read
```

### Contact (Public + Admin)
```
POST   /api/contact              - [PUBLIC] Submit contact form
GET    /api/contact              - [ADMIN] List contact messages
PUT    /api/contact/:id/reply    - [ADMIN] Reply to message
```

### Companies (Public)
```
GET    /api/companies            - List all companies (pagination, filters)
GET    /api/companies/:id        - Get company profile + active jobs
```

### Analytics (Auth Required)
```
GET    /api/analytics/employer/overview    - [EMPLOYER] Job stats & performance
GET    /api/analytics/admin/overview       - [ADMIN] Platform-wide stats + trends
```

---

## 📋 Existing Endpoints (v1)

### Authentication
```
POST   /api/auth/register        - Register new user
POST   /api/auth/login           - Login user
GET    /api/auth/me              - Get current user
```

### Jobs
```
GET    /api/jobs                 - List jobs (with filters)
GET    /api/jobs/:id             - Get job details
POST   /api/jobs                 - [EMPLOYER] Create job
PUT    /api/jobs/:id             - [EMPLOYER] Update job
DELETE /api/jobs/:id             - [EMPLOYER] Delete job
```

### Applications
```
GET    /api/applications         - List applications
POST   /api/applications         - [JOBSEEKER] Apply to job
PUT    /api/applications/:id     - Update application status
```

### Profiles
```
GET    /api/profile              - Get my profile
PUT    /api/profile              - Update my profile
```

### Saved Jobs
```
GET    /api/saved-jobs           - [JOBSEEKER] List saved jobs
POST   /api/saved-jobs           - [JOBSEEKER] Save job
DELETE /api/saved-jobs/:id       - [JOBSEEKER] Remove saved job
```

### Notifications
```
GET    /api/notifications        - List notifications
PUT    /api/notifications/:id/read  - Mark as read
```

### Admin
```
GET    /api/admin/*              - Various admin endpoints
```

---

## 🔐 Authentication

Most endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

Get token from `/api/auth/login` or `/api/auth/register`

---

## 📊 Query Parameters

### Pagination (where applicable)
- `limit` - Records per page (default: 20)
- `offset` - Starting position (default: 0)

### Filters (varies by endpoint)
- `status` - Filter by status
- `industry` - Filter by industry
- `country` - Filter by country
- `featured` - Show only featured items (true/false)

---

## 🎯 Role-Based Access

- **Public**: Categories, Plans, Companies, Contact form
- **Jobseeker**: Job alerts, Applications, Saved jobs
- **Employer**: Orders, Saved resumes, Screening questions, Job management
- **Admin**: All analytics, Contact management, Order management

---

## 📦 Response Format

Success (200/201):
```json
{
  "data": {},
  "message": "Success"
}
```

Error (4xx/5xx):
```json
{
  "error": "Error message"
}
```

---

**Total Endpoints:** 40+ (17 route modules)  
**Version:** 2.0  
**Last Updated:** February 16, 2026
