# WantokJobs API Testing Guide

## Quick Start

All endpoints are available at `http://localhost:3001/api` (development) or your production URL.

## Authentication

Most endpoints require a Bearer token:
```bash
Authorization: Bearer <your_jwt_token>
```

Get a token by logging in:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@wantokjobs.com", "password": "admin123"}'
```

## New & Enhanced Endpoints

### 1. Jobs API

#### Get Featured Jobs (Top 6 Most Viewed)
```bash
curl http://localhost:3001/api/jobs/featured
```

#### Search Jobs with Advanced Filters
```bash
# All filters are optional
curl "http://localhost:3001/api/jobs?category=technology&location=Port%20Moresby&job_type=full-time&salary_min=50000&sort=salary&page=1&limit=20"
```

Available filters:
- `keyword` - Full-text search
- `category` - Category slug or name
- `location` - Location or country
- `job_type` - full-time, part-time, contract, casual, internship
- `industry` - Industry name
- `salary_min` - Minimum salary
- `salary_max` - Maximum salary
- `sort` - date (default), salary, relevance
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

#### Get Job with Full Details (Company + Similar Jobs)
```bash
curl http://localhost:3001/api/jobs/8
```

Returns:
- Job details
- Full company profile
- Job categories
- 3-5 similar jobs

#### Get Similar Jobs
```bash
curl http://localhost:3001/api/jobs/8/similar
```

#### Quick Job Status Change (Employer/Admin)
```bash
curl -X PATCH http://localhost:3001/api/jobs/8/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

Valid statuses: `draft`, `active`, `closed`, `filled`

### 2. Companies API

#### List Companies with Job Counts
```bash
curl "http://localhost:3001/api/companies?limit=20&offset=0&industry=Technology"
```

Optional filters:
- `industry` - Filter by industry
- `country` - Filter by country
- `featured=true` - Only featured companies
- `limit` - Results per page
- `offset` - Pagination offset

#### Get Company Profile (Enhanced)
```bash
curl http://localhost:3001/api/companies/11
```

Returns:
- Full company profile
- Active jobs list
- Company statistics
- Reviews (approved only)
- Average rating

### 3. Applications API

#### Get Applications for Job (Employer)
```bash
curl http://localhost:3001/api/applications/job/8?sort=date \
  -H "Authorization: Bearer <employer_token>"
```

Includes:
- Full jobseeker profile (bio, headline, skills, work_history, education)
- Contact information
- Screening answers (if available)

Sort options: `date` (default), `score`, `status`

#### Add/Update Employer Notes on Application
```bash
curl -X PATCH http://localhost:3001/api/applications/123/notes \
  -H "Authorization: Bearer <employer_token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Great candidate, schedule interview"}'
```

### 4. Screening Routes

#### Add Screening Questions to Job (Employer)
```bash
curl -X POST http://localhost:3001/api/screening/jobs/8/questions \
  -H "Authorization: Bearer <employer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Do you have a valid driver'\''s license?",
    "question_type": "yes_no",
    "required": 1,
    "sort_order": 0
  }'
```

Question types: `text`, `yes_no`, `multiple_choice`, `number`

#### Get Screening Questions (Public)
```bash
curl http://localhost:3001/api/screening/jobs/8/questions
```

#### Submit Screening Answers (Jobseeker)
```bash
curl -X POST http://localhost:3001/api/screening/applications/123/answers \
  -H "Authorization: Bearer <jobseeker_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {"question_id": 1, "answer": "Yes"},
      {"question_id": 2, "answer": "5 years"}
    ]
  }'
```

#### Get Screening Answers
```bash
curl http://localhost:3001/api/screening/applications/123/answers \
  -H "Authorization: Bearer <token>"
```

### 5. Saved Resumes (Employer)

#### Save a Jobseeker Profile
```bash
curl -X POST http://localhost:3001/api/saved-resumes/456 \
  -H "Authorization: Bearer <employer_token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Great skills for future projects", "folder": "tech-talents"}'
```

#### Get Saved Resumes with Full Profiles
```bash
curl "http://localhost:3001/api/saved-resumes?folder=tech-talents" \
  -H "Authorization: Bearer <employer_token>"
```

Returns:
- Full jobseeker profiles
- Skills (parsed JSON)
- Work history (parsed JSON)
- Education (parsed JSON)
- List of available folders

#### Remove Saved Resume
```bash
curl -X DELETE http://localhost:3001/api/saved-resumes/456 \
  -H "Authorization: Bearer <employer_token>"
```

### 6. Metadata Endpoints

#### Get Locations (with Job Counts)
```bash
curl http://localhost:3001/api/locations
```

Returns:
- City-level locations with job counts
- Country-level totals

#### Get Industries (with Job & Company Counts)
```bash
curl http://localhost:3001/api/industries
```

### 7. Admin Dashboard Stats

```bash
curl http://localhost:3001/api/stats/dashboard \
  -H "Authorization: Bearer <admin_token>"
```

Returns:
- Weekly stats (new users, jobs, applications, revenue)
- Total stats (all users, jobs, applications)
- Revenue breakdown
- Top employers
- Recent activity
- Job type distribution
- Application status distribution

## Response Format

All endpoints return JSON:

### Success Response
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

Or for single resource:
```json
{
  "id": 123,
  "title": "...",
  ...
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## Rate Limits

- General API: 200 requests/minute
- Auth endpoints: 10 requests/minute
- Contact form: 5 requests/minute

## Testing with Postman/Insomnia

Import these as a collection:

1. Create environment with:
   - `base_url`: http://localhost:3001
   - `token`: (get from login response)

2. Test the flow:
   - Login → Get token
   - Search jobs → Get job IDs
   - Get job details → See similar jobs
   - Apply to job → Submit screening answers
   - (Employer) View applications → Add notes

## Common Issues

### 403 Forbidden
- Check your token is valid
- Verify you have the correct role (employer/jobseeker/admin)
- For job-specific actions, check ownership

### 400 Bad Request
- Check request body matches validation schema
- Ensure all required fields are present
- Verify enum values (status, job_type, etc.)

### 404 Not Found
- Verify the resource ID exists
- Check the resource hasn't been soft-deleted
- Ensure you're using the correct endpoint URL

## Database Status

Current database stats:
- Users: 61,672
- Jobs: 212 (all active)
- Industries: 20+
- Locations: 100+
- Active companies: 2

## Next Steps for Frontend

1. Update job search to use new filters
2. Display similar jobs on job detail pages
3. Show company profiles with reviews
4. Implement screening questions UI for employers
5. Add screening answers UI for jobseekers
6. Build employer notes feature
7. Create saved resumes dashboard for employers
8. Add location and industry filters to search
9. Build admin dashboard with stats
10. Implement quick status change for jobs

---

**Note**: All database queries have been verified and tested. The API is production-ready!
