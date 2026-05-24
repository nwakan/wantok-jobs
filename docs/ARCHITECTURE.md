# WantokJobs Platform Architecture

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**Platform URL:** https://wantokjobs.com  
**Status:** Production (1,335 jobs, 33,481 users, 2,782 employers)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [Service Integrations](#service-integrations)
8. [Multi-Tenant Architecture](#multi-tenant-architecture)
9. [Security Architecture](#security-architecture)
10. [Deployment Architecture](#deployment-architecture)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Scalability Considerations](#scalability-considerations)

---

## System Overview

WantokJobs is a **multi-tenant job board and recruitment automation platform** designed for Papua New Guinea and Pacific markets with global scalability. The platform features three distinct dashboard systems:

- **Jobseeker Dashboard** - Job search, applications, saved jobs, alerts
- **Employer Dashboard** - Job posting, applicant tracking, analytics
- **Admin Dashboard** - Platform moderation, analytics, system management

### Core Features

- **Job Posting & Management** - 20+ field comprehensive job listings
- **Applicant Tracking System (ATS)** - Complete hiring pipeline management
- **AI-Powered Matching** - Claude Sonnet 4 intelligent candidate recommendations
- **WhatsApp Integration** - Meta Cloud API for mobile-first PNG market
- **Jean AI Assistant** - Conversational AI for job search and recruitment
- **Multi-Channel Communication** - Email (Brevo), WhatsApp, web chat
- **Premium Subscriptions** - 6-tier pricing model (PGK 15-300)
- **Automated Verification** - 3-agent company and fraud detection system

### Architecture Philosophy

**Monolithic with Microservice Patterns**
- Single deployable unit for operational simplicity
- Modular internal architecture for maintainability
- Agent-based automation for scalability
- API-first design for future decomposition

---

## Technology Stack

### Frontend Stack

```
React 18.2.0          - UI framework
Vite 5.0.8            - Build tool and dev server
React Router 6.x      - Client-side routing
Tailwind CSS 3.4.0    - Utility-first styling
DOMPurify 3.0.8       - XSS protection
React Icons           - Icon library
Date-fns              - Date manipulation
```

**Key Libraries:**
- `@tanstack/react-query` - Server state management
- `react-hot-toast` - Notifications
- `framer-motion` - Animations
- `recharts` - Analytics charts

### Backend Stack

```
Node.js v22.22.1      - Runtime environment
Express 4.18.2        - Web framework
SQLite 3 (better-sqlite3) - Production database
bcrypt 5.1.1          - Password hashing
JWT (jsonwebtoken)    - Authentication tokens
```

**Key Libraries:**
- `express-rate-limit` - Rate limiting (11 limiters)
- `helmet` - Security headers
- `cors` - Cross-origin resource sharing
- `multer` - File upload handling
- `uuid` - Unique identifier generation

### AI & Integration Stack

```
Anthropic Claude API  - Primary LLM (Sonnet 4)
Groq API              - Backup LLM + Whisper transcription
Brevo API             - Transactional email (26 templates)
WhatsApp Cloud API    - Mobile messaging
Cloudflare API        - CDN, DNS, caching
```

### Infrastructure Stack

```
Ubuntu VPS            - Hostinger srv1380615.hstgr.cloud
Nginx 1.18+           - Reverse proxy, SSL termination
PM2 5.3.0             - Process management
Let's Encrypt         - SSL certificates
GitHub Actions        - CI/CD automation
Cloudflare            - CDN, DDoS protection, caching
```

---

## Architecture Patterns

### 1. Monolithic Architecture with Agent Pattern

```
┌─────────────────────────────────────────────────────────┐
│                  WantokJobs Monolith                    │
├─────────────────────────────────────────────────────────┤
│  Frontend (React SPA)                                   │
│  ├── JobSeeker Dashboard                                │
│  ├── Employer Dashboard                                 │
│  └── Admin Dashboard                                    │
├─────────────────────────────────────────────────────────┤
│  Backend (Express API)                                  │
│  ├── 91 API Routes                                      │
│  ├── 18 Middleware Components                           │
│  └── 16 Agent Workers                                   │
├─────────────────────────────────────────────────────────┤
│  Data Layer (SQLite)                                    │
│  ├── 25+ Core Tables                                    │
│  ├── 13 WhatsApp Tables                                 │
│  └── 12 Jean AI Tables                                  │
├─────────────────────────────────────────────────────────┤
│  External Services                                      │
│  ├── Brevo Email                                        │
│  ├── WhatsApp Cloud API                                 │
│  ├── Claude/Groq AI                                     │
│  └── Cloudflare CDN                                     │
└─────────────────────────────────────────────────────────┘
```

### 2. Three-Tier Architecture

**Presentation Tier** (Client-side SPA)
- React components with routing
- State management via React hooks
- Real-time UI updates

**Application Tier** (Express API + Agents)
- RESTful API endpoints
- Business logic in route handlers
- Background agents for automation

**Data Tier** (SQLite Database)
- Single database file (~96MB)
- Multi-tenant with company_id isolation
- 51 migrations for schema evolution

### 3. Agent-Based Automation

**16 Autonomous Agents:**

**Active Cron Agents (2):**
- Daily Verification Sweep (5 AM PNG time)
- Scout Agent (6 AM PNG time, 30 companies)

**Real-Time Integration Agents (3):**
- Screener Agent (Claude Sonnet 4)
- Ranker Agent (candidate scoring)
- Matchmaker Agent (job-candidate pairing)

**Verification & Security Agents (2):**
- Verifier Agent (PNG IPA Registry check)
- Fraud Detector Agent (pattern analysis)

**Transparency & Compliance Agents (3):**
- Enforcer Agent (policy compliance)
- Scorer Agent (transparency metrics)
- Campaign Agent (verification campaigns)

**See AGENT_ARCHITECTURE.md for complete agent documentation**

---

## Frontend Architecture

### Component Structure

```
client/src/
├── components/           # Reusable UI components
│   ├── JobCard.jsx      # Job listing display
│   ├── ApplicationCard.jsx
│   ├── CompanyCard.jsx
│   ├── ChatWidget.jsx   # Jean AI web chat
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── ... (40+ components)
├── pages/               # Route-level page components
│   ├── JobSearch.jsx    # Main job board
│   ├── JobDetail.jsx    # Individual job page
│   ├── PostJob.jsx      # Employer job posting
│   ├── MyJobs.jsx       # Employer job management
│   ├── Applications.jsx # Jobseeker applications
│   ├── CompanyProfile.jsx
│   └── ... (25+ pages)
├── hooks/               # Custom React hooks
│   ├── useAuth.js
│   ├── useJobs.js
│   ├── useApplications.js
│   └── useJeanChat.js   # Jean AI integration
├── contexts/            # React Context providers
│   └── AuthContext.jsx
├── utils/               # Helper functions
│   ├── api.js           # Axios API client
│   ├── formatters.js
│   └── validators.js
└── config/              # Configuration
    └── constants.js
```

### Routing Architecture

**Public Routes:**
- `/` - Homepage
- `/jobs` - Job search
- `/jobs/:id` - Job detail
- `/companies` - Company directory
- `/login` - Authentication
- `/register` - User registration

**Protected Routes (Jobseeker):**
- `/dashboard` - Jobseeker dashboard
- `/applications` - My applications
- `/saved-jobs` - Saved jobs
- `/profile` - Profile management

**Protected Routes (Employer):**
- `/employer/dashboard` - Employer dashboard
- `/employer/post-job` - Job posting form
- `/employer/jobs` - Job management
- `/employer/applications` - Applicant tracking
- `/employer/company` - Company profile

**Protected Routes (Admin):**
- `/admin/dashboard` - Admin overview
- `/admin/jobs` - Job moderation
- `/admin/companies` - Company moderation
- `/admin/users` - User management
- `/admin/analytics` - Platform analytics

### State Management Strategy

**Local State** (useState)
- UI interactions (modals, dropdowns)
- Form inputs
- Temporary data

**Context State** (React Context)
- Authentication state (user, token)
- Global UI state (theme, language)

**Server State** (@tanstack/react-query)
- API data fetching
- Caching and invalidation
- Background refetching

### Build & Deployment

```bash
# Development
npm run dev              # Vite dev server (port 5173)

# Production Build
npm run build            # Generates client/dist/

# Deployment
cp -r client/dist/. server/dist/  # Copy to Express static folder
systemctl restart wantokjobs      # Restart service
```

**Build Output:**
- `dist/index.html` - Entry point
- `dist/assets/*.js` - Code-split JavaScript bundles
- `dist/assets/*.css` - Minified CSS
- `dist/assets/*.{png,jpg,svg}- `dist/assets/*.{png,jpg,svg}` - Optimized images

---

## Backend Architecture

### Express Server Structure

**Port:** 3001 (backend API)
**Entry Point:** `server/index.js`
**Static Files:** Serves frontend from `server/dist/`

### API Route Organization (91 files)

Routes organized by functional domain:
- **Authentication** (auth.js) - Login, register, OAuth, session management
- **Jobs** (jobs.js, applications.js) - Job CRUD, search, applications
- **Employer** (employer.js, companies.js) - Company profiles, job management
- **Admin** (admin.js, admin-jobs.js) - Platform moderation, analytics
- **AI Integration** (chat.js, recommendations.js) - Jean AI endpoints
- **WhatsApp** (whatsapp-webhook.js) - Meta Cloud API integration
- **Payments** (subscriptions.js, payments.js) - Premium subscriptions

See API_DOCUMENTATION.md for complete endpoint reference.

### Middleware Stack (18 components)

Request processing pipeline:
1. CORS configuration
2. Security headers (Helmet)
3. Rate limiting (11 different limiters)
4. Anti-scrape detection
5. CSRF token validation
6. Input sanitization
7. JWT authentication
8. Role-based authorization
9. Request logging
10. Error handling

### Agent Workers (16 autonomous agents)

Background automation system:
- **Cron Agents**: Daily verification sweep (5 AM), Scout agent (6 AM)
- **AI Agents**: Screener (Claude), Ranker, Matchmaker
- **Security Agents**: Verifier, Fraud detector
- **Compliance Agents**: Enforcer, Scorer, Campaign manager

---

## Database Architecture

### Overview

**Database:** SQLite 3 (better-sqlite3)
**Size:** ~96MB production database
**Location:** `server/data/wantokjobs.db`
**Migrations:** 51 completed schema migrations
**Tables:** 25+ core tables + 13 WhatsApp + 12 Jean AI = 50+ total

### Multi-Tenant Isolation

Every tenant-specific table includes company_id foreign key for data segregation.

### Core Tables

**Users & Authentication:**
- `users` (33,481 rows) - User accounts, roles, authentication
- `profiles_jobseeker` (30,707 rows) - Jobseeker profiles
- `profiles_employer` (2,739 rows) - Employer profiles

**Companies:**
- `companies` (2,782 rows) - Employer organizations
- `company_verification` - Verification status tracking

**Jobs:**
- `jobs` (1,335 rows) - Job listings
- `applications` (157 rows) - Job applications with ATS workflow
- `job_alerts` - Email alert subscriptions

See DATABASE_SCHEMA.md for complete schema documentation.

---

## Service Integrations

### Email (Brevo API)
**Provider:** Brevo (formerly Sendinblue)
**Templates:** 26 transactional email templates
**Features:** Job alerts, application notifications, verification emails

### AI (Anthropic Claude + Groq)
**Primary:** Claude Sonnet 4 (Anthropic API)
**Backup:** Groq API
**Usage:** Jean AI assistant, CV parsing, job matching, screening

### WhatsApp (Meta Cloud API)
**Phone:** +675 8346 0582
**Features:** Registration, job search, applications, CV upload, account linking
**Integration:** Webhook at `/api/whatsapp/webhook`

### Cloudflare
**Services:** CDN, DNS, DDoS protection, cache management, SSL/TLS
**Nameservers:** carlane.ns.cloudflare.com, will.ns.cloudflare.com

---

## Multi-Tenant Architecture

### Tenant Model

**Company-Based Multi-Tenancy:**
- Each employer organization = separate tenant
- Data isolation via `company_id` column
- Middleware enforces automatic filtering

### RBAC (Role-Based Access Control)

**Roles:**
- `admin` - Platform administration
- `employer` - Company owner/manager
- `recruiter` - Hiring team member
- `jobseeker` - Job applicant

---

## Security Architecture

### Authentication
- JWT tokens (15 min access, 7 day refresh)
- HTTP-only cookies
- OAuth: Google ✅, LinkedIn ✅
- bcrypt password hashing (10 rounds)

### Rate Limiting (11 limiters)
- Global: 100 req/15min per IP
- Login: 5 attempts/15min
- Registration: 3 attempts/hour
- Job posting: 10 jobs/day

### Input Protection
- XSS: DOMPurify on frontend
- SQL Injection: Parameterized queries
- CSRF: Double-submit cookies

---

## Deployment Architecture

### Infrastructure

Cloudflare CDN → Nginx → PM2 → Node.js (Port 3001) → SQLite Database

**VPS:** Ubuntu server at 76.13.190.157
**Domain:** wantokjobs.com
**SSL:** Let's Encrypt certificates
**Process:** systemd service (wantokjobs.service)

### CI/CD Pipeline

**GitHub Actions Workflow:**
1. Developer pushes to `main` branch
2. GitHub Actions triggered
3. SSH to VPS, pull latest code
4. `npm install` dependencies
5. `npm run build` frontend
6. Copy `client/dist` to `server/dist`
7. `pm2 restart` application
8. Purge Cloudflare cache

**Deployment Time:** 1-2 minutes

See DEPLOYMENT_GUIDE.md for detailed setup instructions.

---

## Data Flow Diagrams

### User Registration Flow

1. User submits registration form
2. Frontend validates input
3. POST /api/auth/register
4. Backend validates data
5. Hash password (bcrypt)
6. Insert into users table
7. Generate JWT tokens
8. Return tokens + user data
9. Frontend stores tokens
10. Redirect to dashboard

### Job Application Flow

1. Jobseeker clicks Apply
2. POST /api/applications
3. Verify user authentication
4. Check application does not exist
5. Insert application record
6. Send email to employer (Brevo)
7. Send confirmation to applicant
8. Update job applications_count
9. Return success response
10. Frontend updates UI

### WhatsApp Integration Flow

1. User sends WhatsApp message
2. Meta Cloud API calls webhook
3. POST /api/whatsapp/webhook
4. Parse message intent
5. Query database for context
6. Route to appropriate handler
7. Generate response (Jean AI if needed)
8. Queue outbound message
9. Background processor sends reply
10. Log conversation history

---

## Scalability Considerations

### Current Architecture

**Supports:**
- 33,000+ users
- 1,300+ jobs
- 2,700+ employers
- ~96MB database

### Horizontal Scaling Options

**When needed:**
1. **Database Migration**: SQLite → PostgreSQL for concurrent writes
2. **Load Balancer**: Nginx round-robin to multiple Node.js instances
3. **Redis Cache**: Session storage, rate limiting, job listings cache
4. **CDN Optimization**: Static assets on Cloudflare edge network
5. **Microservices**: Extract WhatsApp, Jean AI, email into separate services

### Performance Optimizations

**Implemented:**
- 95% index coverage on database tables
- Parameterized queries (no N+1 problems)
- Frontend code splitting (Vite)
- Static asset caching (Cloudflare)
- Lazy loading components

**Monitoring:**
- PM2 process metrics
- Nginx access logs
- Database query performance
- API response times

---

## Technical Decisions

### Why SQLite?
- **Simplicity**: Single file database, no separate server
- **Performance**: Fast for read-heavy workloads (<100K users)
- **Reliability**: ACID compliant, production-proven
- **Cost**: Zero licensing, minimal resources

**Migration path to PostgreSQL documented when scale requires it.**

### Why Monolithic Architecture?
- **Operational Simplicity**: Single deployment, easier debugging
- **Development Speed**: Rapid iteration without service coordination
- **Cost Efficiency**: One VPS instead of multiple services
- **PNG Market Fit**: Right-sized for regional platform

**Modular internal structure enables future microservices extraction.**

---

## Conclusion

WantokJobs architecture balances pragmatism with scalability:

✅ **Production-Ready**: Handling real traffic, real users, real jobs
✅ **Secure**: 95/100 security score, comprehensive protection
✅ **Maintainable**: Modular code, clear separation of concerns
✅ **Scalable**: Clear migration path for horizontal scaling
✅ **Cost-Effective**: Optimized for PNG market economics

The platform demonstrates that a well-architected monolith can deliver enterprise-grade features while remaining operationally simple and cost-effective for regional markets.

For implementation details, see:
- **API_DOCUMENTATION.md** - Complete API reference
- **DATABASE_SCHEMA.md** - Full schema documentation
- **DEPLOYMENT_GUIDE.md** - Infrastructure setup
- **WHATSAPP_INTEGRATION.md** - Mobile messaging integration
- **JEAN_AI_GUIDE.md** - AI assistant documentation
