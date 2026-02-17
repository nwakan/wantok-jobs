# WantokJobs v2 — AI-First Job Platform Blueprint

> "Not a job board. A job *engine*."

## Competitive Landscape

### PNG Market (as of Feb 2026)

| Platform | Jobseekers | Employers | Live Jobs | Revenue Model | Strengths | Weaknesses |
|----------|-----------|-----------|-----------|---------------|-----------|------------|
| **WantokJobs** (legacy) | 30,688 | 330 | 13 active | K7,850/posting (1.13M PGK total sales) | Largest jobseeker base in PNG, established brand | Outdated PHP, no mobile, no AI, manual everything |
| **PNGJobSeek** | 40,335 | 380 | 154 | Ad packages | More live jobs, SMS codes, cleaner UI | No AI, basic matching, limited features |
| **PNGWorkforce** | Unknown | Unknown | ~50+ | Sponsored listings | Good SEO, province/category filters, established | Static, no AI, employer-focused only |
| **LinkedIn PNG** | Unknown | Unknown | 341 | Premium/recruiter seats | Global brand, professional network | Expensive, not PNG-focused, low local penetration |

### Key Insight
- **PNGJobSeek has overtaken WantokJobs in active listings** (154 vs 13) despite fewer legacy users
- WantokJobs has the **largest registered base** (30K+) but most are dormant
- **No PNG platform uses AI** — massive opportunity
- **No PNG platform has mobile apps** — PNGJobSeek says "coming soon" (for years)
- Average 208 applications per job on PNGJobSeek — high demand, low supply

### Global Best-in-Class Features (to steal)

| Feature | Platform | What They Do | Our 10x Version |
|---------|----------|-------------|-----------------|
| **AI Job Matching** | LinkedIn, Indeed | ML-based recommendations | AI agent scores every match in real-time with explanations |
| **Easy Apply** | LinkedIn, Indeed | One-click with saved profile | WhatsApp apply — send "APPLY 1234" via text |
| **Salary Transparency** | Glassdoor, Levels.fyi | Crowdsourced salary data | AI estimates PNG salary ranges from job data + market |
| **ATS Integration** | Lever, Greenhouse, Workable | Applicant Tracking System | Built-in ATS with AI pipeline stages |
| **Skills Assessment** | TestGorilla, Indeed | Pre-employment tests | AI-generated screening questions + auto-scoring |
| **Company Reviews** | Glassdoor, Indeed | Employee reviews | Community-driven company profiles |
| **Job Alerts** | All major boards | Email alerts | Multi-channel: Email + SMS + WhatsApp alerts |
| **Resume Builder** | Indeed, Canva | Template-based resume tools | AI resume builder tailored to PNG market |
| **Analytics** | LinkedIn Talent Insights | Market intelligence | AI-powered PNG labor market analytics |
| **Video Interviews** | HireVue, Spark Hire | Async video screening | WhatsApp voice/video screening |

---

## Architecture: AI Agent Automation

### The Agent Fleet (v3)

```
┌─────────────────────────────────────────────────┐
│                  ORCHESTRATOR                     │
│            (Shadow Kernel Pipeline)               │
├─────────────┬──────────────┬────────────────────┤
│             │              │                      │
│  SOURCING   │  MATCHING    │  ENGAGEMENT          │
│  ─────────  │  ──────────  │  ───────────         │
│  Headhunter │  Matchmaker  │  Town Crier          │
│  Scout      │  Screener    │  Retention           │
│  Verifier   │  Ranker      │  Onboarder           │
│             │              │  Alerter              │
│             │              │  Nudger               │
├─────────────┴──────────────┴────────────────────┤
│                   QUALITY                         │
│  ─────────────────────────────────────           │
│  Job Quality │ Resume Quality │ Fraud Detector    │
│  Market Intel │ Revenue Optimizer                 │
└─────────────────────────────────────────────────┘
```

### Agent Responsibilities

#### 1. HEADHUNTER (existing, upgrade)
- **Now**: Scrapes 3 PNG job sites
- **v2**: + scrapes company career pages, LinkedIn, government gazette, newspaper PDFs
- **v2**: + deduplication engine (same job posted on multiple sites)
- **v2**: + auto-categorization with AI
- **Runs**: Every 6 hours
- **Automated**: 100%

#### 2. SCOUT (NEW)
- Proactively finds employers NOT on the platform
- Scrapes PNG business registry, company websites, Facebook pages
- Identifies companies that are hiring (career pages, Facebook posts)
- Generates lead list for outreach
- Auto-sends invite emails to potential employers
- **Runs**: Weekly
- **Automated**: 90% (human approves outreach)

#### 3. VERIFIER (NEW)
- Validates job postings (real company? real contact? not spam?)
- Verifies employer accounts (cross-checks IPA registry, website, phone)
- Flags suspicious applications (duplicate accounts, fake resumes)
- IP/device fingerprinting for fraud
- **Runs**: On every new job/user, + daily sweep
- **Automated**: 95%

#### 4. MATCHMAKER (existing, upgrade)
- **Now**: 12-category scoring
- **v2**: + learns from application outcomes (who got hired?)
- **v2**: + considers jobseeker location/transport feasibility in PNG
- **v2**: + bi-directional: matches jobs→seekers AND seekers→jobs for employers
- **v2**: + generates match explanations in Tok Pisin + English
- **Runs**: On every new job posting + every new registration
- **Automated**: 100%

#### 5. SCREENER (NEW)
- Auto-generates screening questions based on job description
- Scores screening responses using AI
- Ranks applicants by fit score + screening score
- Flags red flags (gaps, inconsistencies)
- **Runs**: On every application
- **Automated**: 100%

#### 6. RANKER (NEW)
- Stack-ranks all applicants for a job
- Combines: match score + screening score + profile completeness + recency
- Generates shortlist recommendation for employer
- Auto-moves top candidates to "shortlisted" stage
- **Runs**: When application count hits threshold (e.g., 10+)
- **Automated**: 100% (employer can override)

#### 7. TOWN CRIER (existing, upgrade)
- **Now**: Generates social media posts
- **v2**: + actually posts to Facebook, LinkedIn, Twitter via API
- **v2**: + generates job-specific promo graphics (Canva API or HTML→image)
- **v2**: + A/B tests post formats, tracks engagement
- **v2**: + WhatsApp broadcast to jobseeker segments
- **Runs**: On every new job posting + scheduled campaigns
- **Automated**: 95% (human approves sensitive posts)

#### 8. RETENTION (existing, upgrade)
- **Now**: Finds inactive users, matches top 3 jobs
- **v2**: + personalized re-engagement campaigns (email + SMS + WhatsApp)
- **v2**: + "we found X new jobs matching your profile" nudges
- **v2**: + employer retention: "your posting expires in 3 days"
- **v2**: + win-back campaigns for churned employers
- **Runs**: Daily
- **Automated**: 100%

#### 9. ONBOARDER (NEW)
- Greets every new registration
- Guides profile completion step-by-step
- For jobseekers: suggests skills to add, helps with resume
- For employers: verifies company, suggests first job posting
- Multi-channel: in-app + email + WhatsApp
- **Runs**: On every new registration
- **Automated**: 100%

#### 10. ALERTER (NEW)
- Manages all job alerts (email, SMS, WhatsApp)
- Intelligent batching (don't spam 50 alerts, send curated top 5)
- Time-zone aware delivery (don't send at 3am)
- Tracks open/click rates, adapts frequency
- **Runs**: Real-time (new job posted) + daily digest
- **Automated**: 100%

#### 11. JOB QUALITY (existing, upgrade)
- **v2**: + suggests improvements to employer ("add salary range for 3x more applicants")
- **v2**: + auto-enhances job descriptions with AI (with employer approval)
- **v2**: + detects discriminatory language
- **Runs**: On every job posting
- **Automated**: 100%

#### 12. RESUME QUALITY (NEW)
- Scores resume/profile completeness (0-100)
- Suggests improvements ("add your education to increase visibility by 40%")
- Parses uploaded CV/PDF to auto-fill profile fields
- Detects outdated/stale profiles
- **Runs**: On every profile update + weekly for incomplete profiles
- **Automated**: 100%

#### 13. FRAUD DETECTOR (NEW)
- Detects duplicate accounts (same phone/email/IP)
- Identifies fake employers (no website, suspicious contact info)
- Flags mass-apply bots (50+ applications in 1 hour)
- Monitors for scam job postings (upfront fees, unrealistic salary)
- **Runs**: Real-time + daily sweep
- **Automated**: 90% (auto-flag, human confirms ban)

#### 14. MARKET INTEL (NEW)
- Generates weekly PNG labor market report
- Tracks: top industries hiring, salary trends, regional demand
- Identifies skill gaps (many jobseekers, few jobs in X category)
- Feeds data to Town Crier for content marketing
- Published as blog content for SEO
- **Runs**: Weekly
- **Automated**: 100%

#### 15. REVENUE OPTIMIZER (NEW)
- Tracks employer spend patterns
- Identifies upsell opportunities ("upgrade to featured for 5x views")
- Auto-generates renewal reminders before plan expires
- Suggests pricing adjustments based on demand
- Tracks ROI for employers (cost per hire)
- **Runs**: Daily
- **Automated**: 80% (pricing changes need approval)

---

## Database Schema v2

### New Tables Needed

```sql
-- Employer subscription plans
CREATE TABLE plans (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,           -- 'Basic', 'Professional', 'Enterprise'
  price REAL NOT NULL,          -- in PGK
  currency TEXT DEFAULT 'PGK',
  duration_days INTEGER,        -- 30, 90, 365
  job_limit INTEGER,            -- posts allowed per period
  featured_jobs INTEGER DEFAULT 0,
  resume_views INTEGER,         -- how many resumes they can view
  ai_screening INTEGER DEFAULT 0, -- AI screening included
  priority_support INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

-- Orders / payments
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  employer_id INTEGER NOT NULL,
  plan_id INTEGER,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'PGK',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','refunded')),
  payment_method TEXT,          -- 'bank_transfer', 'mobile_money', 'card'
  payment_ref TEXT,
  invoice_number TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (employer_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Job categories (many-to-many)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  icon TEXT,
  job_count INTEGER DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE job_categories (
  job_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (job_id, category_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Screening questions
CREATE TABLE screening_questions (
  id INTEGER PRIMARY KEY,
  job_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'text' CHECK(question_type IN ('text','yes_no','multiple_choice','number')),
  options TEXT,                  -- JSON for multiple_choice
  required INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE screening_answers (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT,
  ai_score REAL,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES screening_questions(id)
);

-- Job alerts
CREATE TABLE job_alerts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  keywords TEXT,
  category_id INTEGER,
  location TEXT,
  job_type TEXT,
  salary_min REAL,
  frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('instant','daily','weekly')),
  channel TEXT DEFAULT 'email' CHECK(channel IN ('email','sms','whatsapp','push')),
  active INTEGER DEFAULT 1,
  last_sent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Structured skills
CREATE TABLE skills (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  normalized_name TEXT          -- lowercase, no special chars
);

CREATE TABLE user_skills (
  user_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  proficiency TEXT CHECK(proficiency IN ('beginner','intermediate','advanced','expert')),
  years_experience REAL,
  last_used TEXT,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

CREATE TABLE job_skills (
  job_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  required INTEGER DEFAULT 1,   -- required vs preferred
  PRIMARY KEY (job_id, skill_id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Company reviews
CREATE TABLE company_reviews (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL,  -- employer user_id
  reviewer_id INTEGER NOT NULL, -- jobseeker user_id
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  title TEXT,
  pros TEXT,
  cons TEXT,
  advice TEXT,
  is_current_employee INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,   -- admin approval
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES users(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Saved resumes (employers bookmark candidates)
CREATE TABLE saved_resumes (
  id INTEGER PRIMARY KEY,
  employer_id INTEGER NOT NULL,
  jobseeker_id INTEGER NOT NULL,
  notes TEXT,
  folder TEXT DEFAULT 'default',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (jobseeker_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(employer_id, jobseeker_id)
);

-- Application pipeline (detailed tracking)
CREATE TABLE application_events (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by INTEGER,           -- user who changed it
  notes TEXT,
  ai_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- AI scores and explanations
CREATE TABLE ai_assessments (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('application','job','profile','match')),
  entity_id INTEGER NOT NULL,
  assessment_type TEXT NOT NULL, -- 'match_score', 'quality_score', 'fraud_risk', 'screening_score'
  score REAL,
  explanation TEXT,              -- human-readable explanation
  details TEXT,                  -- JSON detailed breakdown
  model_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Banners / advertising
CREATE TABLE banners (
  id INTEGER PRIMARY KEY,
  employer_id INTEGER,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  placement TEXT CHECK(placement IN ('homepage_top','homepage_side','search_top','search_side','job_detail')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  active INTEGER DEFAULT 1,
  FOREIGN KEY (employer_id) REFERENCES users(id)
);

-- Articles / blog (for SEO + market intel)
CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  author_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT,
  tags TEXT,                     -- JSON array
  featured_image TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  ai_generated INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  user_id INTEGER,
  name TEXT,
  subscribed INTEGER DEFAULT 1,
  frequency TEXT DEFAULT 'weekly',
  last_sent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin messages
CREATE TABLE admin_messages (
  id INTEGER PRIMARY KEY,
  from_user_id INTEGER,
  to_user_id INTEGER,
  subject TEXT,
  body TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Activity log (analytics)
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,          -- 'job_view', 'job_apply', 'resume_view', 'search', 'login'
  entity_type TEXT,
  entity_id INTEGER,
  metadata TEXT,                 -- JSON (search query, IP, device, etc.)
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- IP blocks (anti-abuse)
CREATE TABLE ip_blocks (
  id INTEGER PRIMARY KEY,
  ip_address TEXT NOT NULL,
  reason TEXT,
  blocked_by INTEGER,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Multiple resumes per user
CREATE TABLE resumes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT DEFAULT 'My Resume',
  file_url TEXT,
  file_name TEXT,
  parsed_data TEXT,             -- JSON: AI-extracted skills, experience, education
  is_primary INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Frontend Pages v2 (Complete)

### Public Pages
- [ ] Home (hero + search + featured jobs + categories + stats)
- [ ] Job Search (filters: category, location, type, salary, date posted)
- [ ] Job Detail (full posting + company profile + similar jobs + apply)
- [ ] Company Directory (browse employers with profiles)
- [ ] Company Profile (public: about, jobs, reviews)
- [ ] Blog/Articles (market intel, career advice — AI-generated)
- [ ] About / Contact
- [ ] Pricing (employer plans)
- [ ] Privacy / Terms
- [ ] FAQ

### Jobseeker Dashboard
- [ ] Overview (match score, profile completeness %, recommended jobs, alerts)
- [ ] My Profile (multi-step: personal → skills → education → work history → preferences)
- [ ] My Resumes (upload multiple, AI parsing, primary selection)
- [ ] My Applications (pipeline view: applied → screening → shortlisted → interview → offered)
- [ ] Saved Jobs
- [ ] Job Alerts (manage alert rules, channel preferences)
- [ ] AI Resume Builder (generate resume from profile data)
- [ ] Messages (from employers + admin)
- [ ] Settings (password, notifications, privacy, delete account)

### Employer Dashboard
- [ ] Overview (active jobs, total applicants, views, conversion rate, plan usage)
- [ ] Post Job (multi-step: details → requirements → screening questions → preview → payment)
- [ ] My Jobs (list with status, views, applicants count, quick actions)
- [ ] Applicants (per job: pipeline kanban view, AI scores, bulk actions)
- [ ] Candidate Search (search all jobseekers by skills, location, experience)
- [ ] Saved Candidates (bookmarked profiles with folders)
- [ ] Company Profile (edit public profile, logo, description)
- [ ] Messages (to applicants + admin)
- [ ] Orders & Billing (invoices, payment history, plan management)
- [ ] Analytics (views over time, apply rate, source tracking, cost per hire)
- [ ] Settings

### Admin Dashboard
- [ ] Overview (KPIs: users, jobs, applications, revenue, monthly trend chart)
- [ ] Manage Users (jobseekers + employers, search/filter, featured toggle, verify, ban)
- [ ] Manage Jobs (all jobs, approve/reject, featured toggle, expired cleanup)
- [ ] Manage Applications (cross-employer view, pipeline stats)
- [ ] Orders & Revenue (order list, revenue chart, outstanding invoices)
- [ ] Plans & Pricing (CRUD subscription plans)
- [ ] Categories (manage job categories tree)
- [ ] Job Alerts (view/manage all alerts)
- [ ] Reports (monthly breakdown: signups, postings, applications, revenue by employer)
- [ ] Banner Manager (CRUD banners, placement, impressions/clicks)
- [ ] Article Manager (CRUD blog posts, AI-generate)
- [ ] Newsletter (compose + send to segments)
- [ ] Messages (admin ↔ any user)
- [ ] Email Templates (manage system email templates)
- [ ] SEO (meta tags, sitemap, structured data)
- [ ] Configuration (all system settings)
- [ ] AI Agents (status, last run, logs, manual trigger, enable/disable)
- [ ] Fraud & Security (flagged accounts, IP blocks, suspicious activity)
- [ ] Administrators (manage admin accounts, roles)

---

## API Routes v2 (Complete)

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/change-password
- POST /api/auth/verify-email
- GET /api/auth/me

### Jobs
- GET /api/jobs (public search with filters + pagination)
- GET /api/jobs/:id (public detail)
- GET /api/jobs/my (employer's own jobs)
- POST /api/jobs (employer create)
- PUT /api/jobs/:id (employer edit)
- DELETE /api/jobs/:id (employer delete)
- POST /api/jobs/:id/close
- GET /api/jobs/:id/similar
- GET /api/jobs/featured
- GET /api/jobs/categories/:slug

### Applications
- POST /api/applications (jobseeker apply)
- GET /api/applications/my (jobseeker's applications)
- GET /api/applications/job/:jobId (employer view applicants)
- PUT /api/applications/:id/status (employer update status)
- GET /api/applications/:id (detail with screening answers)
- POST /api/applications/:id/rate (employer rate)

### Screening
- POST /api/jobs/:id/screening-questions (employer add)
- GET /api/jobs/:id/screening-questions (get for job)
- POST /api/applications/:id/screening-answers (jobseeker submit)

### Profiles
- GET /api/profiles/me
- PUT /api/profiles/me
- GET /api/profiles/:id (public profile view)
- GET /api/profiles/search (employer search candidates)

### Resumes
- POST /api/resumes/upload
- GET /api/resumes/my
- DELETE /api/resumes/:id
- PUT /api/resumes/:id/primary
- POST /api/resumes/:id/parse (AI parse)

### Skills
- GET /api/skills (search/autocomplete)
- POST /api/skills/user (add to profile)
- DELETE /api/skills/user/:skillId

### Categories
- GET /api/categories
- GET /api/categories/:slug/jobs

### Saved Items
- POST /api/saved-jobs/:jobId
- DELETE /api/saved-jobs/:jobId
- GET /api/saved-jobs
- POST /api/saved-resumes/:userId (employer)
- DELETE /api/saved-resumes/:userId
- GET /api/saved-resumes

### Job Alerts
- POST /api/job-alerts
- GET /api/job-alerts
- PUT /api/job-alerts/:id
- DELETE /api/job-alerts/:id

### Notifications
- GET /api/notifications
- PUT /api/notifications/:id/read
- PUT /api/notifications/read-all

### Messages
- POST /api/messages
- GET /api/messages
- GET /api/messages/:id
- PUT /api/messages/:id/read

### Orders
- POST /api/orders (create order/checkout)
- GET /api/orders/my (employer order history)
- GET /api/orders/:id

### Plans
- GET /api/plans (public pricing)

### Companies
- GET /api/companies (public directory)
- GET /api/companies/:id (public profile)
- POST /api/companies/:id/reviews (jobseeker submit review)
- GET /api/companies/:id/reviews

### Articles
- GET /api/articles (public blog)
- GET /api/articles/:slug

### Analytics (employer)
- GET /api/analytics/jobs/:id (views, applies over time)
- GET /api/analytics/overview (employer dashboard stats)

### Admin
- GET /api/admin/stats (dashboard KPIs)
- GET /api/admin/reports/monthly
- GET /api/admin/users (with filters)
- PUT /api/admin/users/:id (verify, feature, ban)
- GET /api/admin/jobs (with filters)
- PUT /api/admin/jobs/:id (approve, feature)
- GET /api/admin/orders
- CRUD /api/admin/plans
- CRUD /api/admin/categories
- CRUD /api/admin/banners
- CRUD /api/admin/articles
- POST /api/admin/newsletter/send
- GET /api/admin/newsletter/subscribers
- CRUD /api/admin/email-templates
- GET /api/admin/agents (AI agent status)
- POST /api/admin/agents/:id/run (manual trigger)
- GET /api/admin/fraud/flagged
- POST /api/admin/ip-blocks
- CRUD /api/admin/administrators
- GET /api/admin/config
- PUT /api/admin/config

---

## Implementation Priority

### Sprint 1 (Week 1): Foundation
- [ ] Schema v2 migration (add all new tables)
- [ ] Fix employer migration (338 companies)
- [ ] Categories system (44 legacy categories + many-to-many)
- [ ] Plans & Orders (basic payment tracking)
- [ ] Admin dashboard upgrade (match legacy KPIs)

### Sprint 2 (Week 2): Core Features
- [ ] Screening questions (employer add, jobseeker answer)
- [ ] Job alerts (email channel first)
- [ ] Candidate search (employer searches jobseekers)
- [ ] Saved resumes (employer bookmarks)
- [ ] Application pipeline (kanban view)
- [ ] Company directory (public)

### Sprint 3 (Week 3): AI Layer
- [ ] AI Screener agent
- [ ] AI Ranker agent
- [ ] Resume Quality agent
- [ ] Enhanced Matchmaker (bi-directional)
- [ ] AI assessments table + score display in UI

### Sprint 4 (Week 4): Growth
- [ ] Scout agent (find new employers)
- [ ] Onboarder agent
- [ ] Alerter agent (multi-channel)
- [ ] Market Intel agent
- [ ] Blog/articles (AI-generated)
- [ ] Newsletter system

### Sprint 5 (Week 5): Revenue & Polish
- [ ] Revenue Optimizer agent
- [ ] Banner ad system
- [ ] Analytics dashboards (employer + admin)
- [ ] Fraud Detector agent
- [ ] Admin messaging
- [ ] Email templates
- [ ] SEO (meta tags, sitemap, structured data)

### Sprint 6 (Week 6): WhatsApp Integration
- [ ] WhatsApp job search ("send JOBS to find work")
- [ ] WhatsApp apply ("send APPLY 1234")
- [ ] WhatsApp alerts (new matching jobs)
- [ ] WhatsApp onboarding (profile setup via chat)

---

## Revenue Model v2

| Tier | Price (PGK) | Duration | Job Posts | Features |
|------|------------|----------|-----------|----------|
| **Free** | 0 | - | 1 active | Basic listing, 30-day expiry |
| **Starter** | 2,500 | 30 days | 5 | AI screening, candidate search |
| **Professional** | 7,500 | 30 days | 20 | Featured jobs, analytics, priority support |
| **Enterprise** | 20,000 | 30 days | Unlimited | All features, API access, dedicated account manager |
| **Pay-per-post** | 5,000 | Per job | 1 | Single featured posting, 60-day expiry |

Additional revenue:
- **Banner ads**: K1,000-5,000/month depending on placement
- **Featured employer**: K2,500/month (highlighted in directory)
- **Resume database access**: Included in Professional+ plans
- **Market intel reports**: Free (SEO play, builds authority)

---

## What Makes This 10x

1. **AI does the work** — Not a static board where employers post and pray. Agents actively source, match, screen, rank, and engage.
2. **WhatsApp-first** — In PNG, WhatsApp penetration >> web browser usage. Apply for jobs via text.
3. **Bi-directional matching** — Don't just let jobseekers search. Push candidates TO employers.
4. **Quality enforcement** — AI rejects bad postings, suggests improvements. No more "we are looking for a hard worker" with zero details.
5. **Market intelligence** — Weekly PNG labor market reports. Become the authority.
6. **Fraud protection** — No more scam postings, duplicate accounts, or fake employers.
7. **Revenue optimization** — AI identifies who should upgrade, when to send renewals, what pricing works.
8. **Multi-channel alerts** — Email + SMS + WhatsApp + push. Meet users where they are.
9. **Self-healing** — Agents monitor each other. If headhunter fails, system adapts. If quality drops, alerts fire.
10. **Data flywheel** — More users → more data → better AI → better matches → more users.
