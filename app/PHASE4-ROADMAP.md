# WantokJobs Phase 4 Roadmap - V2 Features Implementation

> **Mission**: Transform WantokJobs from legacy job board to AI-first job platform dominating PNG market

## 📊 Current Status

### Project Progress
- **Phase 1 & 2**: ✅ 100% Complete (14/14 tasks)
- **Phase 3**: ✅ 100% Complete (14/14 tasks)
- **Phase 4**: ⚠️ 10% Complete (1/10 tasks)
- **Overall**: 76.3% Complete (29/38 tasks)

### Phase 4 Tasks Overview
- ✅ **Task 15**: WhatsApp Multi-Channel Job Alerts (DEPLOYED - commit 9762211)
- ⏳ **Tasks 16-25**: V2 Features from Blueprint (9 remaining tasks)

### Market Context (from V2 Blueprint)
- **WantokJobs Legacy**: 30,688 jobseekers, 330 employers, **13 active jobs**, K1.13M total sales
- **PNGJobSeek** (competitor): 40,335 jobseekers, 380 employers, **154 active jobs** (overtaking us)
- **Key Insight**: WantokJobs has largest registered base but dormant. No PNG platform uses AI or mobile apps.
- **Opportunity**: AI-first approach with WhatsApp integration can reclaim market leadership

---

## 🎯 Phase 4 Goals

### Strategic Objectives
1. **Reactivate Dormant Users** - Engage 30K+ registered jobseekers with AI-powered matching
2. **Increase Active Jobs** - Grow from 13 to 100+ active listings via AI sourcing and employer retention
3. **Mobile-First Engagement** - Leverage WhatsApp (already deployed) for PNG market penetration
4. **AI Automation** - Deploy 15 autonomous agents to reduce manual work by 90%
5. **Revenue Growth** - Scale from K7,850/posting to tiered subscription model (K2,500-20,000/month)

### Success Metrics
- **Active Jobs**: 13 → 100+ (7.7x growth)
- **Monthly Applications**: Current → 2,000+ (10x growth)
- **Employer Retention**: 30-day → 90-day average plan duration
- **AI Automation**: 0% → 80% of platform operations automated
- **Mobile Engagement**: 0% → 40% of interactions via WhatsApp

---

## 📋 Phase 4 Task Breakdown (Tasks 16-25)

### Task 16: AI Job Sourcing Agent (Scout + Headhunter Upgrade)
**Status**: ❌ Not Started  
**Priority**: 🔴 CRITICAL (directly addresses 13 active jobs problem)  
**Business Impact**: 🔥 HIGH - Solves biggest competitive weakness  
**Technical Complexity**: 6/10  
**Estimated Time**: 5-7 days  
**Dependencies**: None (can start immediately)  

#### What This Solves
- **Problem**: Only 13 active jobs vs competitor's 154 jobs
- **Solution**: AI agents proactively source jobs from:
  - PNG company career pages
  - LinkedIn PNG jobs
  - Government gazette (PNG IPA)
  - Newspaper PDFs (Post-Courier, The National)
  - Facebook company pages
  - Competitor sites (PNGJobSeek, PNGWorkforce) with deduplication

#### Implementation Details
1. **Headhunter Agent Upgrade** (existing at `system/agents/headhunter-agent.js`)
   - Add new sources beyond current 3 PNG job sites
   - Implement deduplication engine (same job on multiple sites)
   - Add AI auto-categorization using GPT-4
   - Run every 6 hours (current frequency maintained)

2. **Scout Agent** (NEW - `system/agents/scout-agent.js`)
   - Scrape PNG business registry (IPA)
   - Scan company websites for career pages
   - Monitor Facebook pages for hiring posts
   - Generate lead list for outreach
   - Auto-send invite emails to potential employers
   - Run weekly

3. **Database Changes**
   - Add `job_sources` table to track scraping origins
   - Add deduplication fingerprint fields to jobs table
   - Add `employer_leads` table for Scout discoveries

#### Success Criteria
- ✅ Active jobs increase from 13 to 50+ within 2 weeks
- ✅ Deduplication rate >95% (no duplicate job postings)
- ✅ Scout identifies 100+ potential employer leads
- ✅ Headhunter runs every 6 hours without errors
- ✅ Auto-categorization accuracy >85%

#### Files to Create/Modify
- `system/agents/scout-agent.js` (NEW)
- `system/agents/headhunter-agent.js` (MODIFY - upgrade)
- `server/migrations/030_job_sourcing.js` (NEW)
- `scripts/test-scout.js` (NEW - testing)

---

### Task 17: Candidate Verification Automation (Verifier Agent)
**Status**: ❌ Not Started  
**Priority**: 🟠 HIGH (fraud prevention + trust building)  
**Business Impact**: 🔥 HIGH - Reduces spam, increases employer confidence  
**Technical Complexity**: 7/10  
**Estimated Time**: 4-6 days  
**Dependencies**: None  

#### What This Solves
- **Problem**: Fake accounts, spam applications, fraudulent employers
- **Solution**: AI-powered verification and fraud detection

#### Implementation Details
1. **Verifier Agent** (NEW - `system/agents/verifier-agent.js`)
   - Validate job postings (real company? legitimate contact?)
   - Verify employer accounts (cross-check IPA registry, website, phone)
   - Flag suspicious applications (duplicate accounts, fake resumes)
   - IP/device fingerprinting for fraud detection
   - Run on every new job/user + daily sweep

2. **Fraud Detector Agent** (NEW - `system/agents/fraud-detector-agent.js`)
   - Detect duplicate accounts (same phone/email/IP)
   - Identify fake employers (no website, suspicious contact)
   - Flag mass-apply bots (50+ applications in 1 hour)
   - Monitor scam postings (upfront fees, unrealistic salary)
   - Real-time + daily sweep

3. **Database Changes**
   - Add `verification_checks` table
   - Add `fraud_flags` table
   - Add `ip_blocks` table (from blueprint)
   - Add verification status fields to users and jobs tables

#### Success Criteria
- ✅ All new employers verified within 24 hours
- ✅ Fraud detection rate >90%
- ✅ False positive rate <5%
- ✅ IP blocking prevents repeat offenders
- ✅ Admin review queue stays under 10 pending items

#### Files to Create/Modify
- `system/agents/verifier-agent.js` (NEW)
- `system/agents/fraud-detector-agent.js` (NEW)
- `server/migrations/031_verification.js` (NEW)
- `server/routes/admin-verification.js` (NEW)

---

### Task 18: Smart Matching Algorithms (Matchmaker + Screener + Ranker)
**Status**: ❌ Not Started  
**Priority**: 🟠 HIGH (core value proposition)  
**Business Impact**: 🔥 HIGH - Improves match quality, reduces time-to-hire  
**Technical Complexity**: 8/10  
**Estimated Time**: 6-8 days  
**Dependencies**: Task 17 (verification for data quality)  

#### What This Solves
- **Problem**: Manual candidate screening, poor job-seeker matching, 208 applications per job (PNGJobSeek)
- **Solution**: AI-powered matching, screening, and ranking

#### Implementation Details
1. **Matchmaker Agent Upgrade** (existing at `system/agents/matchmaker-agent.js`)
   - Current: 12-category scoring
   - Upgrade: Learn from application outcomes (who got hired?)
   - Add: Location/transport feasibility in PNG
   - Add: Bi-directional matching (jobs→seekers AND seekers→jobs)
   - Add: Match explanations in Tok Pisin + English

2. **Screener Agent** (NEW - `system/agents/screener-agent.js`)
   - Auto-generate screening questions from job description
   - Score screening responses using AI
   - Rank applicants by fit + screening score
   - Flag red flags (gaps, inconsistencies)
   - Run on every application

3. **Ranker Agent** (NEW - `system/agents/ranker-agent.js`)
   - Stack-rank all applicants for a job
   - Combine: match score + screening + profile completeness + recency
   - Generate shortlist recommendation
   - Auto-move top candidates to "shortlisted" stage
   - Run when application count hits threshold (10+)

4. **Database Changes**
   - Add `screening_questions` table (from blueprint)
   - Add `screening_answers` table (from blueprint)
   - Add `ai_assessments` table (from blueprint)
   - Add `application_events` table for pipeline tracking

#### Success Criteria
- ✅ Match score accuracy >80% (validated by hire outcomes)
- ✅ Screening questions generated for 100% of new jobs
- ✅ Applicant ranking reduces employer review time by 50%
- ✅ Bi-directional matching sends 5+ candidate recommendations per new employer
- ✅ Tok Pisin explanations generated for all matches

#### Files to Create/Modify
- `system/agents/matchmaker-agent.js` (MODIFY - major upgrade)
- `system/agents/screener-agent.js` (NEW)
- `system/agents/ranker-agent.js` (NEW)
- `server/migrations/032_smart_matching.js` (NEW)
- `server/routes/screening.js` (NEW)


---

### Task 19: Mobile App Planning & Prototyping
**Status**: ❌ Not Started  
**Priority**: 🟡 MEDIUM (strategic but not immediate)  
**Business Impact**: 🔶 MEDIUM - Captures mobile-first PNG market  
**Technical Complexity**: 9/10  
**Estimated Time**: 10-15 days (planning + MVP)  
**Dependencies**: Tasks 16-18 (need stable API + features)  

#### What This Solves
- **Problem**: No PNG platform has mobile apps (competitor says "coming soon" for years)
- **Solution**: React Native apps for iOS + Android

#### Implementation Details
1. **Mobile App Architecture Planning**
   - React Native (single codebase for iOS + Android)
   - Offline-first design (PNG internet reliability)
   - WhatsApp deep linking (apply via WhatsApp from app)
   - Push notifications (job alerts, application updates)

2. **MVP Feature Set**
   - Job search with filters
   - One-tap apply (saved profile)
   - Application tracking
   - Job alerts management
   - Profile editing
   - WhatsApp quick apply button

3. **Backend API Preparation**
   - Ensure all routes support mobile clients
   - Add push notification endpoints
   - Optimize API responses for mobile bandwidth
   - Add app version checking

#### Success Criteria
- ✅ Architecture document completed
- ✅ MVP prototype running on 2+ test devices
- ✅ WhatsApp integration functional
- ✅ Push notifications working
- ✅ Offline mode stores up to 100 jobs

#### Files to Create
- `MOBILE-APP-ARCHITECTURE.md` (NEW)
- `mobile-app/` directory (NEW)
- `server/routes/mobile.js` (NEW)
- `server/routes/push-notifications.js` (NEW)

---

### Task 20: Advanced Analytics Dashboard
**Status**: ❌ Not Started  
**Priority**: 🟡 MEDIUM (revenue optimization)  
**Business Impact**: 🔶 MEDIUM - Increases employer satisfaction + upsells  
**Technical Complexity**: 6/10  
**Estimated Time**: 4-6 days  
**Dependencies**: Task 18 (need match scoring data)  

#### What This Solves
- **Problem**: Employers can't see job performance metrics, no data-driven hiring
- **Solution**: Comprehensive analytics for employers + admin

#### Implementation Details
1. **Employer Analytics Dashboard**
   - Job views over time (line chart)
   - Application funnel (applied → shortlisted → interview → hired)
   - Source tracking (where candidates came from)
   - Cost per hire (plan cost / hires)
   - Average time to hire
   - Match score distribution
   - Best performing job attributes

2. **Admin Analytics Dashboard**
   - Platform KPIs (users, jobs, applications, revenue)
   - Monthly trend charts
   - Employer health score (activity, retention)
   - Jobseeker engagement metrics
   - AI agent performance
   - Revenue breakdown by employer

3. **Market Intel Agent** (NEW)
   - Generate weekly PNG labor market report
   - Track: top industries, salary trends, regional demand
   - Identify skill gaps
   - Publish as blog content for SEO

#### Success Criteria
- ✅ Employer dashboard shows all key metrics
- ✅ Admin dashboard updated in real-time
- ✅ Market intel report published weekly
- ✅ Analytics queries return in <2 seconds
- ✅ Charts render smoothly on mobile

#### Files to Create/Modify
- `server/routes/analytics.js` (NEW)
- `system/agents/market-intel-agent.js` (NEW)
- `client/src/pages/EmployerAnalytics.jsx` (NEW)
- `server/migrations/033_analytics.js` (NEW)

---

### Task 21: SMS Notifications (Twilio Integration)
**Status**: ❌ Not Started  
**Priority**: 🟡 MEDIUM (multi-channel completion)  
**Business Impact**: 🔶 MEDIUM - Completes multi-channel strategy  
**Technical Complexity**: 5/10  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 15 (WhatsApp multi-channel foundation)  

#### What This Solves
- **Problem**: SMS placeholder exists but not implemented
- **Solution**: Twilio SMS integration for job alerts and notifications

#### Implementation Details
1. **Twilio SMS Service**
   - Create SMS service wrapper (`server/lib/sms.js`)
   - Integrate with existing notification channels
   - Support delivery status tracking
   - Implement rate limiting (avoid spam)

2. **SMS Outbox System**
   - Create `sms_outbox` table (similar to whatsapp_outbox)
   - SMS outbox processor service
   - Failed delivery retry logic
   - Cost tracking per SMS

3. **Update Multi-Channel Code**
   - Modify `scripts/send-job-alerts.js` to send SMS
   - Add SMS option to job alert preferences
   - Implement SMS verification for phone numbers

#### Success Criteria
- ✅ SMS sent successfully to PNG numbers
- ✅ Delivery status tracked accurately
- ✅ SMS costs logged per message
- ✅ Users can enable/disable SMS alerts
- ✅ Rate limiting prevents abuse

#### Files to Create/Modify
- `server/lib/sms.js` (NEW)
- `server/migrations/034_sms_outbox.js` (NEW)
- `scripts/send-job-alerts.js` (MODIFY - add SMS)
- `scripts/sms-outbox-processor.js` (NEW)

---

### Task 22: Advanced Search Filters
**Status**: ❌ Not Started  
**Priority**: 🟢 LOW (nice-to-have)  
**Business Impact**: 🔵 LOW - Improves UX for power users  
**Technical Complexity**: 4/10  
**Estimated Time**: 2-3 days  
**Dependencies**: None  

#### What This Solves
- **Problem**: Basic search lacks advanced filters
- **Solution**: Add filters for experience level, company size, benefits, etc.

#### Implementation Details
1. **New Search Filters**
   - Experience level (entry, mid, senior, executive)
   - Company size (startup, SME, enterprise)
   - Benefits (health insurance, housing, transport)
   - Remote work option
   - Salary range slider
   - Date posted (24h, 7d, 30d)

2. **Database Schema Updates**
   - Add filter fields to jobs table
   - Create indexed columns for performance
   - Migrate existing jobs data

3. **Frontend Search UI**
   - Add filter panel to job search page
   - Implement filter state management
   - Add "Clear all filters" button
   - Save filter preferences

#### Success Criteria
- ✅ All filters functional and tested
- ✅ Filter combinations work correctly
- ✅ Search performance <500ms with filters
- ✅ Filter preferences saved per user
- ✅ Mobile-friendly filter UI

#### Files to Create/Modify
- `server/routes/jobs.js` (MODIFY - add filter logic)
- `server/migrations/035_advanced_filters.js` (NEW)
- `client/src/components/JobSearchFilters.jsx` (NEW)

---

### Task 23: Employer Insights & Recommendations
**Status**: ❌ Not Started  
**Priority**: 🟢 LOW (revenue optimizer feature)  
**Business Impact**: 🔵 LOW - Increases employer engagement  
**Technical Complexity**: 7/10  
**Estimated Time**: 4-5 days  
**Dependencies**: Task 20 (analytics data)  

#### What This Solves
- **Problem**: Employers don't know how to improve job postings
- **Solution**: AI-powered insights and recommendations

#### Implementation Details
1. **Revenue Optimizer Agent** (NEW)
   - Track employer spend patterns
   - Identify upsell opportunities
   - Auto-generate renewal reminders
   - Suggest pricing adjustments
   - Track ROI for employers

2. **Job Quality Agent Upgrade**
   - Suggest improvements ("add salary for 3x more applicants")
   - Auto-enhance job descriptions (with approval)
   - Detect discriminatory language
   - Score job quality (0-100)

3. **Insight Notifications**
   - Email digest with recommendations
   - In-dashboard insight cards
   - A/B test suggestions (featured vs standard)

#### Success Criteria
- ✅ Insights generated for 100% of active jobs
- ✅ Recommendation acceptance rate >30%
- ✅ Upsell conversion rate >5%
- ✅ Employer satisfaction score increases
- ✅ Average job quality score improves

#### Files to Create/Modify
- `system/agents/revenue-optimizer-agent.js` (NEW)
- `system/agents/job-quality-agent.js` (UPGRADE)
- `server/routes/employer-insights.js` (NEW)

---

### Task 24: AI Interview Scheduling
**Status**: ❌ Not Started  
**Priority**: 🟢 LOW (automation enhancement)  
**Business Impact**: 🔵 LOW - Reduces manual coordination  
**Technical Complexity**: 6/10  
**Estimated Time**: 3-4 days  
**Dependencies**: Task 18 (screening + ranking)  

#### What This Solves
- **Problem**: Interview scheduling is manual back-and-forth
- **Solution**: AI-powered scheduling assistant

#### Implementation Details
1. **Calendar Integration**
   - Google Calendar API integration
   - Outlook Calendar support
   - Availability checking
   - Timezone handling (PNG time)

2. **Scheduling Logic**
   - Parse availability from shortlisted candidates
   - Find optimal time slots
   - Send calendar invites
   - Handle reschedules and cancellations

3. **WhatsApp Integration**
   - Confirm interview via WhatsApp
   - Send reminders 24h before
   - Collect feedback post-interview

#### Success Criteria
- ✅ Calendar integration working
- ✅ Auto-scheduling success rate >80%
- ✅ WhatsApp confirmations sent
- ✅ Timezone handling accurate
- ✅ Reschedule flow functional

#### Files to Create/Modify
- `server/lib/calendar.js` (NEW)
- `server/routes/interviews.js` (UPGRADE)
- `system/agents/scheduler-agent.js` (NEW)

---

### Task 25: Load Testing & Performance Optimization
**Status**: ❌ Not Started  
**Priority**: 🟡 MEDIUM (production readiness)  
**Business Impact**: 🔶 MEDIUM - Ensures scale and reliability  
**Technical Complexity**: 7/10  
**Estimated Time**: 3-5 days  
**Dependencies**: Tasks 16-24 (need full feature set)  

#### What This Solves
- **Problem**: Unknown performance limits, potential bottlenecks
- **Solution**: Comprehensive load testing and optimization

#### Implementation Details
1. **Load Testing Suite**
   - Artillery.io or k6 test scripts
   - Simulate 1000+ concurrent users
   - Test all major endpoints
   - Identify bottlenecks

2. **Performance Optimizations**
   - Database query optimization
   - Redis caching layer
   - CDN for static assets
   - API response compression
   - Connection pooling

3. **Monitoring & Alerting**
   - New Relic or Datadog integration
   - Response time dashboards
   - Error rate alerts
   - Resource usage monitoring

#### Success Criteria
- ✅ System handles 1000+ concurrent users
- ✅ Average API response time <200ms
- ✅ 99th percentile response time <1s
- ✅ Database queries optimized (<50ms)
- ✅ Zero critical bottlenecks identified

#### Files to Create/Modify
- `tests/load/` directory (NEW)
- `tests/load/scenarios.yml` (NEW)
- `server/lib/cache.js` (UPGRADE)
- `PERFORMANCE-REPORT.md` (NEW)


---

## 🎯 Quick Start Recommendations

### Immediate Actions (Next 7 Days)
1. **Task 16: AI Job Sourcing** - CRITICAL priority
   - Current: 13 active jobs (losing to competitor's 154)
   - Target: 50+ active jobs within 2 weeks
   - Start with Scout agent to identify employer leads
   - Upgrade Headhunter for better job scraping

2. **Task 17: Verification** - Run in parallel if resources allow
   - Prevent fraud before it scales
   - Build trust with employers
   - Essential foundation for AI matching

### Quick Wins (Low-Hanging Fruit)
- **Task 22: Advanced Search Filters** (2-3 days, complexity 4/10)
- **Task 21: SMS Integration** (3-4 days, builds on WhatsApp foundation)

These can be implemented alongside critical tasks to show continuous progress.

---

## 📊 Summary

### Phase 4 Overview
- **Total Tasks**: 10 (Tasks 15-25, with Task 15 complete)
- **Remaining Tasks**: 9
- **Estimated Duration**: 6-8 weeks (with 2-person team)
- **Total Effort**: 472 hours
- **Critical Path**: Tasks 16 → 17 → 18 → 20 → 23

### Key Deliverables
1. **AI Agent Fleet**: 15 autonomous agents reducing manual work by 90%
2. **Mobile App MVP**: React Native app for iOS + Android
3. **Analytics Platform**: Comprehensive dashboards for employers and admins
4. **Multi-Channel Complete**: Email + WhatsApp + SMS notifications
5. **Smart Matching**: AI-powered screening, ranking, and recommendations

### Expected Outcomes
- Active jobs: 13 → 100+ (7.7x growth)
- Monthly applications: ~100 → 2,000+ (20x growth)
- Employer retention: 30 days → 90 days (3x improvement)
- Platform automation: 0% → 80%
- Mobile engagement: 0% → 40%

---

## 🚀 Next Steps

### For Product Owner/Manager
1. ✅ Review and approve this Phase 4 roadmap
2. ✅ Allocate development resources (2-person team recommended)
3. ✅ Set up project tracking (GitHub Projects, Jira, or Trello)
4. ✅ Schedule sprint planning meetings (weekly)
5. ✅ Establish stakeholder communication plan

### For Development Team
1. ✅ Review V2 Blueprint in detail (`WANTOKJOBS-V2-BLUEPRINT.md`)
2. ✅ Set up development environment for new features
3. ✅ Begin Sprint 1 with Task 16 (AI Job Sourcing)
4. ✅ Create feature branches for each task
5. ✅ Implement continuous testing and deployment

### For DevOps/Infrastructure
1. ✅ Ensure VPS can handle increased load (1000+ concurrent users)
2. ✅ Set up monitoring and alerting (New Relic/Datadog)
3. ✅ Configure Redis for caching layer
4. ✅ Plan CDN deployment for static assets
5. ✅ Prepare for mobile app infrastructure (push notifications)

---

## 📝 Document Information

**Created**: 2026-03-23  
**Version**: 1.0  
**Status**: Draft - Awaiting Approval  
**Last Updated**: 2026-03-23  
**Author**: Agent Zero Developer  
**Approved By**: [Pending]  

**Related Documents**:
- `WANTOKJOBS-V2-BLUEPRINT.md` - Comprehensive V2 feature specifications
- `RBAC-POLICY.md` - Role-based access control documentation
- `CONSENT-AUDIT.md` - Email consent and compliance audit
- `MFA-DOCUMENTATION.md` - Multi-factor authentication guide

**Repository**: https://github.com/nwakan/wantok-jobs  
**Production**: https://wantokjobs.com  

---

**END OF PHASE 4 ROADMAP**
