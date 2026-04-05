# WantokJobs Comprehensive Platform Audit

**Date:** April 5, 2026 13:37 UTC  
**Auditor:** Agent Zero (Autonomous AI Assistant)  
**Scope:** Full platform assessment (frontend, backend, database, infrastructure)  
**Duration:** 90+ minutes (autonomous multi-phase investigation)  
**Status:** ✅ COMPLETE

---

## Executive Summary

**Platform Health:** 🟡 **OPERATIONAL with CRITICAL GAPS**

**Production Metrics:**
- Service: ✅ Active, stable (10+ hours uptime)
- Database: 86 MB (1,332 jobs, 33,481 users)
- Jobs: 1,332 active listings
- Users: 33,481 registered (30,707 jobseekers, 2,739 employers)
- Security: 95/100 (Task 24 audit)
- Test Coverage: 10/10 Playwright tests passing

**Critical Issues Identified:**
1. ❌ **Application Flow Broken**: 0.12 apps/job (expected: 50-100) - 400× performance gap
2. ❌ **Employer Profile Gaps**: 48.6% posting rate (expected: 80-100%), missing contact fields
3. ❌ **Schema Bloat**: 52% empty tables (88/169 tables unused)
4. ⚠️ **"Various Employers" Confusion**: System placeholder account visible to users
5. ⚠️ **Data Quality Issues**: 28.7% job formatter failures, 0% benefits population

**Overall Grade:** **B-** (73/100)
- Strengths: Security, automation, AI features
- Weaknesses: Application flow, data quality, employer engagement

---

## 1. "Various Employers" Investigation

### Issue Description
**User Report:** "Users should be shown their proper names rather than saying 'Various Employers'"

**Screenshot Evidence:** User logged in as "Various Employers" (various.employers@wantokjobs.com)

### Root Cause Analysis

**Phase 1: Database Investigation**
- Searched `users` table: ❌ NO "Various Employers" account found
- Searched `profiles_employer` table: ❌ NO "Various Employers" company found
- Conclusion: "Various Employers" is NOT in production database

**Phase 2: Code Investigation**
- Found 7 references in frontend source code:
  1. `client/src/utils/pngHelpers.js:83` - Filter condition
  2. `client/src/utils/pngHelpers.js:244` - Name check for special handling
  3. `client/src/components/JobCard.jsx:153` - Logo display conditional
  4. `client/src/pages/Home.jsx:201` - Filter from top employers list
  5. `client/src/pages/JobDetail.jsx:763` - Company name display conditional
  6. `client/src/pages/JobDetail.jsx:1167` - Company info section conditional
  7. `client/src/pages/JobDetail.jsx:1387` - Employer ID conditional

**Pattern Identified:**
```javascript
// From pngHelpers.js line 244
if (name === 'Various Employers' || name === 'WantokJobs Imports') {
  // Special handling for system accounts
}