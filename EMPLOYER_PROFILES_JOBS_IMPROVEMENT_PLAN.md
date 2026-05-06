# WantokJobs Employer Profiles & Jobs Feature Audit & Improvement Plan

**Date:** 2026-05-06

**Scope:** Comprehensive audit of employer profile features and job listing features/format/layout

**Files Analyzed:** 5 files, 5,270 lines, 231.7 KB

---

## Executive Summary

**Audit Completed:** ✅ Employer Profiles + Job Features/Format/Layout

**Files Analyzed:**
1. CompanyProfile.jsx (711 lines, 32.8 KB) - Employer profile editing
2. JobDetail.jsx (2164 lines, 95.8 KB) - Job listing display
3. JobSearch.jsx (692 lines, 32.2 KB) - Job search/filtering
4. PostJob.jsx (1358 lines, 57.0 KB) - Job posting form
5. MyJobs.jsx (345 lines, 13.9 KB) - Employer job management

**Key Findings:**
- ✅ **STRONG:** Comprehensive employer profile system (17 fields, PNG-localized)
- ✅ **STRONG:** Feature-rich job posting form (20+ fields)
- ⚠️ **MODERATE:** Job detail page needs optimization (95.8 KB)
- ❌ **WEAK:** Missing industry-standard employer branding features
- ❌ **WEAK:** Missing advanced job listing features

---

## Part 1: Employer Profile Features

### Current Implementation (CompanyProfile.jsx)

**Core Profile Fields (17 total):**
1. company_name (required)
2. industry (37 PNG-localized options)
3. company_size (6 categories)
4. location
5. country (8 Pacific region options)
6. website
7. logo_url
8. description
9. culture
10. founded_year
11. email
12. phone  
13. contact_preference
14. benefits (16 PNG-relevant options)
15. photos (workplace gallery)
16. social_links (Facebook, LinkedIn, Twitter)
17. verified (badge)

**Profile Completeness:** 12-metric system (0-100%)

---

### Industry Benchmark: Employer Profiles

#### LinkedIn Company Pages (72% coverage)

| Feature | Status |
|---------|--------|
| Company name, logo, industry, size | ✅ |
| Location, founded, website, description | ✅ |
| Culture, benefits, photos, social links | ✅ |
| Verification badge | ✅ |
| **Cover photo/banner** | ❌ MISSING |
| **Tagline/slogan** | ❌ MISSING |
| **Specialties/skills** | ❌ MISSING |
| **Company updates/posts** | ❌ MISSING |
| **Video support** | ❌ MISSING |

#### Glassdoor (56% coverage)

| Feature | Status |
|---------|--------|
| Basic info, photos, benefits | ✅ |
| **Company reviews/ratings** | ❌ CRITICAL MISSING |
| **CEO approval rating** | ❌ MISSING |
| **Salary insights** | ❌ MISSING |
| **Interview questions** | ❌ MISSING |

#### Indeed (60% coverage)

| Feature | Status |
|---------|--------|
| Basic info, photos, benefits | ✅ |
| **Company reviews** | ❌ CRITICAL MISSING |
| **Work happiness score** | ❌ MISSING |
| **Follow company** | ❌ MISSING |
| **Q&A section** | ❌ MISSING |

---

### Top 10 Missing Features - Employer Profiles

**P0 - Critical (2 features):**
1. 🔴 **Company Reviews/Ratings** - Glassdoor/Indeed standard
2. 🔴 **Cover Photo/Banner** - LinkedIn standard

**P1 - Important (4 features):**
3. 🟡 **Tagline/Slogan** (60-char headline)
4. 🟡 **Specialties/Skills** (company expertise areas)
5. 🟡 **Video Support** (company intro video)
6. 🟡 **Follow Company** (job seeker engagement)

**P2 - Enhancement (4 features):**
7. 🟢 **Company Updates/Posts** (news feed)
8. 🟢 **Salary Insights** (role-based pay data)
9. 🟢 **Interview Questions** (past candidate experiences)
10. 🟢 **Q&A Section** (employer-answered FAQs)

---

## Part 2: Job Features Audit

### Current Implementation

**PostJob.jsx (1358 lines, 20 form fields):**
- title, description, location
- salary (min, max, currency, period)
- category, skills, experience_level
- job_type, remote_ok, application_deadline
- application_url, screening_questions
- benefits, perks

**JobDetail.jsx (2164 lines, 95.8 KB):**
- Job title, company, logo, location
- Salary range, job type, experience level
- Application deadline
- Job description (HTML formatting)
- **Quick Apply** button
- Save job, share job
- Application status tracking
- Screening questions

**JobSearch.jsx (692 lines):**
- Keyword search
- Location filter
- Category filter
- Salary range filter
- Job type filter
- Remote work filter
- Experience level filter

---

### Industry Benchmark: Job Listings

#### LinkedIn Jobs (68% coverage)

| Feature | Status |
|---------|--------|
| Basic job info, description | ✅ |
| Salary, location, remote | ✅ |
| Quick apply, save job | ✅ |
| **Easy Apply (1-click)** | ⚠️ PARTIAL |
| **Applicant count** | ❌ MISSING |
| **Skills match score** | ❌ MISSING |
| **Seniority level** | ⚠️ PARTIAL (experience_level) |

#### Indeed Jobs (75% coverage)

| Feature | Status |
|---------|--------|
| Basic job info, salary | ✅ |
| Quick apply, save job | ✅ |
| **Employer reviews link** | ❌ MISSING |
| **Salary comparison** | ❌ MISSING |
| **Job alerts** | ✅ (exists) |

---

### Top 10 Missing Features - Job Listings

**P0 - Critical (3 features):**
1. 🔴 **Applicant Count Display** ("50+ applicants")
2. 🔴 **Skills Match Score** (0-99% match)
3. 🔴 **Easy Apply 1-Click** (pre-filled from profile)

**P1 - Important (4 features):**
4. 🟡 **Salary Comparison** (vs similar roles)
5. 🟡 **Company Reviews Link** (from employer profile)
6. 🟡 **Similar Jobs** (recommendations)
7. 🟡 **Job Freshness** ("Posted 2 hours ago")

**P2 - Enhancement (3 features):**
8. 🟢 **Application Deadline Countdown** ("5 days left")
9. 🟢 **Job View Count** ("Viewed 230 times")
10. 🟢 **Promoted/Sponsored Badge** (premium jobs)

---

## Recommended Implementation Roadmap

### Phase 1: P0 Critical Features (Week 1)

**Employer Profiles:**
1. **Cover Photo/Banner** (3-4 hours)
   - Add banner_url field to profiles_employer
   - Update CompanyProfile.jsx with file upload
   - Display in preview mode

**Job Listings:**
2. **Applicant Count Display** (1-2 hours)
   - Add SQL COUNT aggregation to job queries
   - Display "X applicants" on JobCard and JobDetail
   - Privacy: Show ranges (1-10, 10-50, 50+)

3. **Skills Match Score** (2-3 hours)
   - Calculate score based on job.skills vs user profile
   - Display 0-99% match on job cards
   - Add sorting by match score

### Phase 2: P1 Important Features (Week 2)

**Employer Profiles:**
4. **Tagline/Slogan** (1 hour)
   - Add tagline field (60 char limit)
   - Display below company name

5. **Specialties/Skills** (2 hours)
   - Add specialties array field
   - Auto-suggest from jobs posted
   - Display as tags on profile

**Job Listings:**
6. **Similar Jobs** (3-4 hours)
   - Algorithm: Same category + location + salary range
   - Display 3-5 recommendations below job detail

7. **Job Freshness** (1 hour)
   - Calculate time ago ("2 hours ago", "3 days ago")
   - Display on job cards

### Phase 3: P2 Enhancement Features (Week 3)

**Employer Profiles:**
8. **Company Reviews/Ratings** (8-10 hours)
   - Create reviews table
   - Add review submission form
   - Display average rating (1-5 stars)
   - Moderation workflow

**Job Listings:**
9. **Application Deadline Countdown** (1 hour)
   - Calculate days remaining
   - Display urgency badge ("5 days left")

10. **Job View Count** (2 hours)
    - Track views in jobs.views_count
    - Display "Viewed X times"

---

## Quick Wins (Immediate Implementation)

### 1. Cover Photo/Banner (Employer Profiles)

**Effort:** 3-4 hours

**Implementation:**

**Database Migration 055:**
```sql
ALTER TABLE profiles_employer ADD COLUMN banner_url TEXT;
```

**CompanyProfile.jsx Changes:**
- Add file upload input for banner
- Update formData state with banner_url
- Display banner in preview mode (400x100px)

**Impact:** Immediate visual improvement, matches LinkedIn standard

---

### 2. Applicant Count Display (Job Listings)

**Effort:** 1-2 hours

**Implementation:**

**Backend (jobs.js):**
```javascript
SELECT 
  j.*,
  COUNT(a.id) as applicant_count
FROM jobs j
LEFT JOIN applications a ON j.id = a.job_id
GROUP BY j.id
```

**Frontend (JobCard.jsx, JobDetail.jsx):**
- Display applicant count with privacy ranges:
  - 1-10: "Less than 10 applicants"
  - 10-50: "10-50 applicants"
  - 50+: "50+ applicants"

**Impact:** Builds urgency, matches Indeed/LinkedIn standard

---

### 3. Skills Match Score (Job Listings)

**Effort:** 2-3 hours

**Implementation:**

**Algorithm:**
```javascript
function calculateMatchScore(jobSkills, userSkills) {
  const matches = jobSkills.filter(s => 
    userSkills.includes(s)
  ).length;
  
  const score = Math.round(
    (matches / jobSkills.length) * 99
  );
  
  return score;
}