# WantokJobs UI Audit

**Date:** 2026-02-17  
**Reviewed pages:** Home, Jobs, Categories, Pricing, Companies

---

## 1. Home Page (`home.png`)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | No chat widget visible | Medium | Jean chat widget FAB not showing — may be a rendering/settings issue |
| 2 | Popular search tags low contrast | Low | White/gray tags on green gradient — could be harder to read on some screens |
| 3 | Stats section cut off at bottom | Low | The stats bar (356+ Active Jobs, 330+ Employers, etc.) is partially visible — may need more spacing or scroll hint |
| 4 | No mobile hamburger menu visible | Medium | Nav shows full links — need to verify responsive behavior on small screens |
| 5 | Search button lacks hover state feedback | Low | Large green button blends with background gradient — could use slight shadow or contrast change |

## 2. Jobs Page (`jobs.png`)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **Stray "0" above job titles** | **Critical** | Each job card shows a "0" above the title (likely a broken views/applications counter). Looks like a data rendering bug |
| 2 | Company name shows "WantokJobs Imports0" | **Critical** | Company name has "0" appended — likely a data import artifact or rendering bug |
| 3 | Double "Remote only" checkbox | Medium | "Remote Only" tab at top AND checkbox in filters sidebar — redundant UX |
| 4 | Filter dropdowns have no visual active state | Low | Hard to tell which filters are applied |
| 5 | No salary information shown on cards | Medium | Job seekers expect salary ranges — currently absent from listing cards |
| 6 | No pagination visible | Medium | 356 jobs but no pagination or "load more" visible in viewport |
| 7 | Job card lacks company logo | Low | Cards show text only — logo would improve scannability |

## 3. Categories Page (`categories.png`)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | "Trending Now" duplicates "Popular Categories" | Medium | Same categories (ICT & Technology, Management & Executive) appear in both sections with identical data — feels redundant |
| 2 | Inconsistent card heights in Trending section | Low | Cards have different text lengths causing uneven heights — needs `min-h` or truncation |
| 3 | No visual hierarchy between sections | Low | Both sections look nearly identical — Trending could use a different card style or background |
| 4 | Stats bar duplicates home page stats | Low | Same 4 stats shown — consider making this section contextual |

## 4. Pricing Page (`pricing.png`)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | Pricing cards cut off at bottom | Medium | Card details (features list, CTA buttons) not fully visible — page needs scroll or cards need to be higher |
| 2 | "BEST VALUE" badge overlaps card border | Low | The green "BEST VALUE" label on Pro Pack clips the top edge slightly |
| 3 | Free tier shows "K0" | Low | Consider showing "Free" instead of "K0" — more intuitive |
| 4 | Trust badges have mixed styling | Low | "14-day free trial" and "No credit card required" use different icon styles (check vs clock) |
| 5 | No comparison table | Medium | Users can't easily compare features across plans without scrolling through each card |

## 5. Companies Page (`companies.png`)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **"No companies found" on default load** | **Critical** | Page shows empty state immediately — should show all companies by default or auto-search. Says "330+ verified employers" but displays none |
| 2 | Search button misaligned | Medium | "Search Companies" button is below and left-aligned while search fields are inline — should be inline or centered |
| 3 | Filter dropdowns have gray background | Low | "All Industries" and "All Locations" dropdowns use gray bg inconsistent with other pages' white inputs |
| 4 | Large empty white space | Medium | Massive gap between search and empty state — poor use of space |
| 5 | CTA section at bottom ("Is Your Company Listed?") | Low | Good but unreachable if user bounces due to empty state |

---

## Summary

### Critical Issues (fix immediately)
1. **Jobs page: Stray "0" and "Imports0" in job cards** — data/rendering bug
2. **Companies page: Empty by default** — should load companies on page load

### Medium Issues (fix soon)
- Missing pagination on jobs page
- No salary info on job cards
- Redundant trending/popular sections on categories
- Pricing cards cut off
- Companies search UX (button alignment, empty default)
- Mobile nav not verified

### Low Issues (polish)
- Minor contrast and spacing issues
- Inconsistent card heights
- Badge clipping on pricing
- Filter visual feedback
