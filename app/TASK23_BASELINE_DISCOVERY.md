# Task 23: Employer Insights Dashboard - Baseline Discovery Report

## Executive Summary
Task 23 requires implementing an AI-powered Employer Insights Dashboard. **Significant analytics infrastructure already exists** and must be leveraged rather than rebuilt.

---

## 1. EXISTING ANALYTICS INFRASTRUCTURE

### 1.1 Backend Routes (Analysis Complete)

#### ✅ `server/routes/employer-analytics.js` (Comprehensive)
**What exists:**
- Overall stats (total jobs, views, applications)
- Time-period filtering (7/30 days)
- Per-job metrics with conversion rates
- Top performing jobs by views
- Application status breakdown
- View-to-application conversion tracking

**Usage:** GET `/api/employer/analytics?period=30`

#### ✅ `server/routes/pipeline-analytics.js` (ATS Funnel)
**What exists:**
- Application funnel data (applied → hired)
- Average time in each stage
- **Time-to-hire calculation** (already implemented!)
- Stage conversion rates (applied→screening, screening→shortlisted, etc.)
- Drop-off rates per stage
- Interview-to-hire ratio
- Weekly trend comparison

**Usage:** GET `/api/employer/pipeline-analytics`

#### ✅ `server/routes/insights-market.js` (Market Intelligence)
**What exists:**
- In-demand skills analysis (last 3 months)
- Salary ranges by industry
- Hiring trends (12-month historical)
- Top hiring companies
- Location distribution
- Cached results (1 hour TTL)

**Usage:** GET `/api/insights/market`

#### ✅ `server/routes/insights.js` (Jobseeker-focused)
**What exists:**
- Profile views analytics
- Salary insights based on desired role
- Trend analysis (up/down/stable)

**Usage:** GET `/api/insights/profile-views`, `/api/insights/salary`

#### ❌ `server/lib/analytics-email-reports.js` (EMPTY - 0 bytes)
**Status:** File exists but is completely empty
**Required:** Weekly email report generation

---

### 1.2 Database Schema (Current State)

#### ✅ Existing Tables (from migration 020_analytics_enhancement.js)
```sql
-- General analytics cache
CREATE TABLE analytics_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT UNIQUE NOT NULL,
  metric_value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Detailed job view tracking
CREATE TABLE job_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  viewer_id INTEGER,
  viewer_ip TEXT,
  viewed_at TEXT DEFAULT (datetime('now')),
  source_channel TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
```

#### ❌ Missing Tables (Required for Task 23)
```sql
-- NOT YET CREATED
CREATE TABLE employer_insights_cache (
  employer_id INTEGER PRIMARY KEY,
  insights TEXT,
  recommendations TEXT,
  updated_at TEXT
);

-- NOT YET CREATED
CREATE TABLE market_benchmarks (
  id INTEGER PRIMARY KEY,
  job_title TEXT,
  province TEXT,
  avg_salary_min INTEGER,
  avg_salary_max INTEGER,
  avg_applications INTEGER,
  avg_time_to_hire INTEGER,
  sample_size INTEGER,
  updated_at TEXT
);
```

---

## 2. TASK 23 REQUIREMENTS vs EXISTING CAPABILITIES

### Feature 1: Hiring Performance Summary (30 min)
**Status:** ✅ **80% COMPLETE**

| Metric | Source | Status |
|--------|--------|--------|
| Time to hire | `pipeline-analytics.js` | ✅ Already calculated |
| Application quality score | N/A | ❌ Need to implement (match scores) |
| Interview-to-hire ratio | `pipeline-analytics.js` | ✅ Conversion rates exist |
| Offer acceptance rate | `pipeline-analytics.js` | ✅ offeredToHired conversion |
| Top performing job categories | `employer-analytics.js` | ✅ Top jobs by views |
| Industry benchmarks | N/A | ❌ Need market_benchmarks table |

**Work Required:**
- Add application quality scoring based on AI match scores
- Build market_benchmarks table and populate
- Create comparison logic against benchmarks

---

### Feature 2: Market Intelligence (30 min)
**Status:** ✅ **60% COMPLETE**

| Metric | Source | Status |
|--------|--------|--------|
| Salary benchmarks by position/province | `insights-market.js` | ✅ Partial (by industry, not province) |
| Competitive analysis | N/A | ❌ Need to implement |
| Candidate availability | N/A | ❌ Need to query jobseeker profiles |
| Trending skills | `insights-market.js` | ✅ Already tracking (in-demand skills) |
| Seasonal hiring patterns | `insights-market.js` | ✅ 12-month trends exist |

**Work Required:**
- Expand salary benchmarks to include province dimension
- Add competitive job analysis (similar roles, salary comparison)
- Query candidate pool by skills/location
- Refine existing data for employer context

---

### Feature 3: AI Recommendations (30 min)
**Status:** ❌ **0% COMPLETE**

**Work Required:**
- Integrate with Jean AI or OpenAI
- Create prompt templates for:
  - Job posting optimization
  - Salary recommendations
  - Best posting times
  - Skills gap analysis
  - Candidate sourcing suggestions
- Store recommendations in employer_insights_cache

---

### Feature 4: Weekly Market Report (20 min)
**Status:** ❌ **0% COMPLETE**

**Work Required:**
- Implement `server/lib/analytics-email-reports.js` (currently empty)
- Create email template for weekly digest
- Aggregate:
  - PNG job market summary
  - Company hiring stats
  - Available top candidates
  - Competitor activity
  - Recommended actions
- Schedule via cron (weekly delivery)

---

### Feature 5: Insights Dashboard UI (10 min)
**Status:** ❌ **0% COMPLETE**

**Work Required:**
- Create `/client/src/components/Employer/Insights.jsx`
- Integrate with existing API endpoints
- Display metrics from employer-analytics and pipeline-analytics
- Add AI recommendations section
- Add market trends charts

---

## 3. INTEGRATION POINTS

### 3.1 AI Integration Options
1. **Jean AI** (internal, WhatsApp-focused)
   - Located: `server/agents/jean-orchestrator.js`
   - Current use: Jobseeker + Recruiter chat
   - **Consideration:** May need to extend for analytics use case

2. **OpenAI via ai-router.js**
   - Located: `server/lib/ai-router.js`
   - Current use: CV parsing, job matching
   - **Recommended:** Use this for insights generation

### 3.2 Email System
- Provider: Amazon SES
- Email lib: `server/lib/email.js`
- Template system exists
- Consent/suppression list managed

### 3.3 Cron/Scheduler
- Location: `system/setup-crontab.sh`
- Existing jobs: expire-jobs, send-job-alerts, employer-digest
- **Add:** Weekly insights report generation

---

## 4. ARCHITECTURE GAPS & RISKS

### 4.1 Missing Components
- ❌ `employer_insights_cache` table
- ❌ `market_benchmarks` table
- ❌ AI recommendation engine
- ❌ Weekly email report generator
- ❌ Client-side Insights dashboard component

### 4.2 Data Quality Risks
- **Benchmark accuracy:** Need sufficient sample size per category
- **Match score availability:** Application quality depends on AI scores being present
- **Market data freshness:** Cache invalidation strategy needed

### 4.3 Performance Considerations
- Insights generation should be async (cron-based)
- Cache employer-specific insights (daily refresh)
- Market benchmarks update weekly
- Real-time data only for critical metrics

---

## 5. IMPLEMENTATION STRATEGY

### Phase 1: Database Schema (5 min)
- Create migration: `021_employer_insights.js`
- Add `employer_insights_cache` table
- Add `market_benchmarks` table

### Phase 2: Market Benchmarks Population (15 min)
- Create `scripts/generate-market-benchmarks.js`
- Aggregate historical job data by title/province
- Calculate avg salary, time-to-hire, application counts
- Store in `market_benchmarks` table
- Schedule weekly refresh

### Phase 3: AI Recommendations (30 min)
- Create `server/lib/ai-insights-generator.js`
- Integrate with `ai-router.js`
- Define prompt templates
- Generate recommendations per employer
- Cache in `employer_insights_cache`

### Phase 4: Enhanced API Endpoint (15 min)
- Create `GET /api/employer/insights`
- Combine data from:
  - `employer-analytics.js`
  - `pipeline-analytics.js`
  - `employer_insights_cache` (AI recommendations)
  - `market_benchmarks` (comparison data)
- Return unified insights object

### Phase 5: Weekly Email Report (20 min)
- Implement `server/lib/analytics-email-reports.js`
- Create email template
- Aggregate weekly market summary
- Schedule via cron: `0 9 * * 1` (Monday 9 AM)

### Phase 6: Dashboard UI (10 min)
- Create `client/src/components/Employer/Insights.jsx`
- Use Ant Design components (Card, Statistic, Progress, Alert)
- Fetch from `/api/employer/insights`
- Display metrics, recommendations, market trends

### Phase 7: Daily Insights Generation Script (10 min)
- Create `scripts/generate-employer-insights.js`
- Run daily: `0 2 * * *` (2 AM)
- Calculate all metrics per employer
- Generate AI recommendations
- Update cache

---

## 6. SUCCESS CRITERIA VERIFICATION

- ✅ Hiring metrics calculated accurately → Leverage existing pipeline-analytics
- ✅ Market benchmarks populated → New market_benchmarks table + script
- ✅ AI recommendations generated → ai-router.js integration
- ✅ Weekly reports scheduled → analytics-email-reports.js + cron
- ✅ Dashboard UI functional → New Insights.jsx component
- ✅ All changes committed and deployed → Standard deployment process

---

## 7. ESTIMATED TIMELINE

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 1 | Database migration | 5 min | 5 min |
| 2 | Market benchmarks script | 15 min | 20 min |
| 3 | AI recommendations engine | 30 min | 50 min |
| 4 | Enhanced API endpoint | 15 min | 65 min |
| 5 | Weekly email reports | 20 min | 85 min |
| 6 | Dashboard UI component | 10 min | 95 min |
| 7 | Daily insights script | 10 min | 105 min |
| 8 | Testing & deployment | 15 min | **120 min (2 hrs)** |

**Status:** Timeline achievable ✅

---

## 8. DEPENDENCIES

### External Services
- Amazon SES (email delivery) ✅ Already configured
- OpenAI API (AI recommendations) ✅ ai-router.js exists
- Cron scheduler ✅ Already in use

### Internal Components
- `server/lib/ai-router.js` ✅ Ready
- `server/lib/email.js` ✅ Ready
- `server/routes/employer-analytics.js` ✅ Ready
- `server/routes/pipeline-analytics.js` ✅ Ready
- `server/routes/insights-market.js` ✅ Ready

---

## 9. NEXT STEPS

1. ✅ **Baseline discovery complete** (this document)
2. 🔄 **Architecture proposal** → Confirm approach with stakeholder
3. ⏳ **Implementation** → Execute phases 1-7
4. ⏳ **Testing** → Verify all success criteria
5. ⏳ **Deployment** → VPS deployment + verification

---

**Report Generated:** 2026-03-23 06:03 UTC  
**Discovery Status:** ✅ COMPLETE  
**Ready to Proceed:** YES (pending architecture approval)
