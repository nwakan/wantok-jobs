# Rich Results (JobPosting Schema) Validation Report

**Date:** 2026-02-18  
**Domain:** tolarai.com  
**Schema Type:** JobPosting (Google Jobs)

## Current Implementation Status

### ✅ SSR Meta Injection - IMPLEMENTED

The site has **Server-Side Rendering (SSR) meta injection** for crawlers implemented in:
- **File:** `/data/.openclaw/workspace/data/wantok/app/server/index.js`
- **Lines:** ~595-670 (SSR meta/JSON-LD injection section)

**How it works:**
1. Detects crawlers by User-Agent: `googlebot|bingbot|slurp|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot`
2. Injects meta tags and JSON-LD into HTML **before** sending to crawler
3. Regular users get client-side rendered React app

### ✅ JobPosting Schema - IMPLEMENTED

Job detail pages (`/jobs/:id`) include proper JobPosting JSON-LD:

**Generated JSON-LD Structure:**
```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Job Title",
  "description": "Full job description...",
  "datePosted": "2026-02-18T10:00:00Z",
  "validThrough": "2026-03-20T10:00:00Z",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Company Name",
    "sameAs": "https://company-website.com",
    "logo": "https://tolarai.com/uploads/logo.png"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Port Moresby",
      "addressCountry": "PG"
    }
  },
  "identifier": {
    "@type": "PropertyValue",
    "name": "WantokJobs",
    "value": "WJ-123"
  },
  "url": "https://tolarai.com/jobs/123",
  "directApply": true,
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "PGK",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 50000,
      "maxValue": 80000,
      "unitText": "YEAR"
    }
  }
}
```

---

## Employment Type Mapping

The code correctly maps internal job types to Google's schema:

| Internal Type | Schema Value  |
|---------------|---------------|
| full-time     | FULL_TIME     |
| part-time     | PART_TIME     |
| contract      | CONTRACTOR    |
| temporary     | TEMPORARY     |
| internship    | INTERN        |

**Default:** Falls back to `FULL_TIME` if unrecognized.

---

## Validation Checklist

### Required Fields (per Google spec)

- [x] **@context** - Set to "https://schema.org"
- [x] **@type** - Set to "JobPosting"
- [x] **title** - Job title from database
- [x] **description** - Full job description (HTML allowed)
- [x] **datePosted** - ISO 8601 format (created_at)
- [x] **hiringOrganization** - Organization object with name
- [x] **jobLocation** - Place object with address
- [x] **identifier** - Unique identifier (WJ-{id})

### Recommended Fields

- [x] **validThrough** - Expiry date (expires_at or +30 days)
- [x] **employmentType** - Mapped correctly
- [x] **url** - Direct link to job page
- [x] **directApply** - Set to true
- [x] **baseSalary** - Included when salary data available
- [x] **logo** - Company logo in hiringOrganization

### Optional But Good to Have

- [ ] **jobBenefits** - Not currently included
- [ ] **qualifications** - Not currently included
- [ ] **responsibilities** - Not currently included
- [ ] **skills** - Not currently included
- [ ] **educationRequirements** - Not currently included
- [ ] **experienceRequirements** - Not currently included
- [ ] **industry** - Not currently included

---

## Known Issues & Recommendations

### Issue 1: 502 Bad Gateway on Job Pages ❌

**Problem:** Job detail pages return 502 errors when accessed.

**Impact:** 
- Crawlers cannot access the JSON-LD
- Pages won't be indexed
- Rich results won't appear in Google

**Fix Required:**
- Debug backend server connectivity
- Check database queries in job detail route
- Review Cloudflare proxy/origin settings
- Check server logs for specific error

**Priority:** **CRITICAL** - Must fix before Google Search Console submission

---

### Issue 2: Base URL Mismatch ⚠️

**Problem:** sitemap.xml uses wantokjobs.com, but domain is tolarai.com

**Current Code:**
```javascript
const baseUrl = process.env.BASE_URL || 'https://wantokjobs.com';
```

**Fix:**
Add to `.env`:
```bash
BASE_URL=https://tolarai.com
APP_URL=https://tolarai.com
```

**Priority:** **HIGH**

---

### Enhancement 1: Add More Optional Fields 💡

**Recommendation:** Enhance JSON-LD with additional structured data:

```javascript
// Add to job JSON-LD generation (server/index.js ~640)
if (job.required_skills) {
  jsonLd.skills = job.required_skills.split(',').map(s => s.trim());
}

if (job.education_level) {
  jsonLd.educationRequirements = {
    "@type": "EducationalOccupationalCredential",
    "credentialCategory": job.education_level
  };
}

if (job.experience_years) {
  jsonLd.experienceRequirements = {
    "@type": "OccupationalExperienceRequirements",
    "monthsOfExperience": parseInt(job.experience_years) * 12
  };
}

if (job.benefits) {
  jsonLd.jobBenefits = job.benefits;
}

if (job.industry) {
  jsonLd.industry = job.industry;
}
```

**Priority:** **MEDIUM** (nice to have, not required)

---

### Enhancement 2: Company Schema on Profile Pages 💡

**Current Status:** Company pages (`/companies/:id`) have basic Organization schema.

**Recommendation:** Enhance with:
- `aggregateRating` (already included! ✅)
- `review` objects for individual reviews
- `numberOfEmployees`
- `foundingDate`

**Priority:** **LOW** (already pretty good)

---

## Testing & Validation

### Step 1: Fix 502 Errors First

Before testing structured data, ensure pages load:

```bash
# Test job page accessibility
curl -I https://tolarai.com/jobs/8
# Should return 200 OK, not 502

# Test with Googlebot user-agent
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://tolarai.com/jobs/8
# Should return HTML with JSON-LD
```

### Step 2: Use Google's Rich Results Test

Once pages load correctly:

1. Go to: [Rich Results Test](https://search.google.com/test/rich-results)
2. Enter URL: `https://tolarai.com/jobs/8` (or any active job ID)
3. Click "Test URL"
4. Check for:
   - ✅ "JobPosting" detected
   - ✅ No errors
   - ⚠️ Warnings are OK (optional fields)

### Step 3: Use Schema Markup Validator

Alternative testing tool:

1. Go to: [Schema.org Validator](https://validator.schema.org/)
2. Paste the job page URL
3. Review detected schemas and warnings

### Step 4: Manual Inspection

```bash
# Fetch HTML as Googlebot would see it
curl -A "Googlebot" https://tolarai.com/jobs/8 > job-page.html

# Extract JSON-LD
grep -o '<script type="application/ld+json">.*</script>' job-page.html | \
  sed 's/<script type="application\/ld+json">//; s/<\/script>//' | \
  python3 -m json.tool
```

---

## Validation Tools

| Tool | Purpose | URL |
|------|---------|-----|
| **Rich Results Test** | Primary Google validation | https://search.google.com/test/rich-results |
| **Schema Validator** | General schema validation | https://validator.schema.org/ |
| **Search Console** | Production monitoring | https://search.google.com/search-console |
| **JSON-LD Playground** | Manual JSON-LD testing | https://json-ld.org/playground/ |

---

## Expected Results After Implementation

Once all issues are fixed and submitted to Google Search Console:

### Week 1-2:
- Google starts crawling sitemaps
- JobPosting schema detected
- No critical errors in Search Console → Enhancements → Job Postings

### Week 3-4:
- Jobs start appearing in Google Jobs search
- Rich results visible in standard Google Search
- Click-through rate improves (jobs show enhanced listings)

### Ongoing:
- Monitor "Job Postings" report in Search Console
- Fix any new errors/warnings
- Track impressions and clicks

---

## Example: What Good Rich Results Look Like

**In Google Search:**
```
🔍 Google Search: "software engineer port moresby"

┌─────────────────────────────────────────────┐
│ 🏢 Company Logo                              │
│ Software Engineer                            │
│ Company Name · Port Moresby, PNG             │
│ Full-time · PGK 60,000 - 80,000/year        │
│ Posted 2 days ago                            │
│ Apply directly on WantokJobs                 │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Higher visibility
- More click-throughs
- Better qualified applicants
- Increased trust/credibility

---

## Monitoring After Go-Live

### Weekly Checks (first month):

1. **Search Console → Coverage**
   - Check for indexing errors on job pages
   - Ensure all jobs are being crawled

2. **Search Console → Enhancements → Job Postings**
   - Monitor for structured data errors
   - Track valid vs invalid job postings

3. **Search Console → Performance**
   - Filter by "Job Posting" appearance
   - Track impressions, clicks, CTR

### Monthly Checks (ongoing):

1. **Random sampling**
   - Test 5-10 random job URLs in Rich Results Test
   - Ensure schema still validates

2. **Review errors**
   - Fix any new warnings/errors
   - Keep schema up to date with Google changes

---

## Summary

**Current Status:** ✅ **Implementation is GOOD**

The structured data implementation is solid. The main blocker is:
- ❌ **502 errors preventing page access**
- ⚠️ **BASE_URL needs update to tolarai.com**

Once these are fixed:
- ✅ JSON-LD schema is compliant
- ✅ SSR injection works correctly
- ✅ All required fields are present
- ✅ Employment types mapped correctly
- ✅ Salary data included when available

**Action Items:**
1. **CRITICAL:** Fix 502 errors on job pages
2. **HIGH:** Update BASE_URL to tolarai.com
3. **MEDIUM:** Add optional fields (skills, education, etc.)
4. **LOW:** Enhanced company schema (already pretty good)

**Timeline to Rich Results:**
- Fix issues: 1-2 days
- Google crawl/index: 1-2 weeks
- Rich results appear: 2-4 weeks

---

## Contact for Issues

If you encounter validation errors after go-live:
1. Check Google Search Console → Enhancements → Job Postings
2. Use Rich Results Test to debug specific URLs
3. Review server logs for SSR injection issues
4. Verify crawler user-agents are properly detected
