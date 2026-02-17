# PNG Optimization TODO Checklist

## ✅ Completed (by AI Agent)
- [x] i18n infrastructure (English/Tok Pisin translations)
- [x] Language context & toggle component
- [x] Mobile bottom navigation bar
- [x] Offline banner component
- [x] Enhanced service worker with job caching
- [x] Pull-to-refresh hook
- [x] Swipe actions hook
- [x] SwipeableJobCard component
- [x] WhatsAppButton component
- [x] PNG provinces data & helpers
- [x] Kina salary formatting functions
- [x] Company logo placeholder generator
- [x] Mobile-optimized CSS
- [x] Province filter in SearchFilters
- [x] Build successful (136.99 KB gzipped)

---

## 🔧 Frontend Integration Needed

### High Priority (Week 1)

#### JobSearch.jsx
- [ ] Import and use `SwipeableJobCard` instead of `JobCard`
  - [ ] Wire up `onSave` handler
  - [ ] Wire up `onDismiss` handler
- [ ] Integrate `usePullToRefresh` hook
  - [ ] Add refresh indicator UI
  - [ ] Call refresh function on pull

#### JobDetail.jsx  
- [ ] Add `WhatsAppButton` component
  - [ ] Show if `job.application_method === 'whatsapp'`
  - [ ] Or if `job.whatsapp_number` exists
- [ ] Make apply button sticky on scroll
  - [ ] Add `position: sticky; bottom: 0;` wrapper
- [ ] Use `formatPNGSalary` for all salary displays

#### Home.jsx / Landing Pages
- [ ] Use `formatPNGSalary` in featured job cards
- [ ] Show province filter prominently

### Medium Priority (Week 2)

#### Profile Pages
- [ ] Use language translations for all UI strings
- [ ] Test Tok Pisin display across all pages

#### Dashboard Pages
- [ ] Ensure mobile bottom nav doesn't overlap content
- [ ] Test all dashboard features on mobile viewport

#### Share Functionality
- [ ] Use `getWhatsAppShareUrl()` helper
- [ ] Add WhatsApp share button to all job cards
- [ ] Track share events in analytics

### Low Priority (Week 3)

#### One-Tap Apply
- [ ] Check profile completeness before showing form
- [ ] If complete, show "Quick Apply" button
- [ ] Submit application with one click

#### Sticky Elements
- [ ] Sticky filter sidebar on desktop (already have?)
- [ ] Sticky apply button on job detail (mobile)

---

## 🗄️ Backend API Updates Required

### High Priority (Week 1)

#### Database Schema
- [ ] Add `province` column to `jobs` table
  ```sql
  ALTER TABLE jobs ADD COLUMN province VARCHAR(100);
  CREATE INDEX idx_jobs_province ON jobs(province);
  ```
- [ ] Add WhatsApp fields to `jobs` table
  ```sql
  ALTER TABLE jobs 
    ADD COLUMN whatsapp_number VARCHAR(20),
    ADD COLUMN application_method ENUM('internal', 'external', 'email', 'whatsapp') DEFAULT 'internal';
  ```

#### Jobs API (`server/routes/jobs.js`)
- [ ] Add province filter to GET `/api/jobs`
  ```javascript
  if (req.query.province) {
    sql += ' AND (province = ? OR location LIKE ?)';
  }
  ```
- [ ] Update POST/PUT endpoints to accept `province`, `whatsapp_number`, `application_method`
- [ ] Return province in job listings

#### Data Migration
- [ ] Write script to map existing jobs to provinces
  - [ ] Use `matchProvinceFromLocation()` helper from `client/src/data/provinces.js`
  - [ ] Update all jobs where `province IS NULL`
- [ ] Test migration on staging database first

### Medium Priority (Week 2)

#### Quick Apply Endpoint
- [ ] Create POST `/api/applications/quick-apply`
  - [ ] Accepts: `job_id`, `user_id`
  - [ ] Checks: Profile complete, CV uploaded
  - [ ] Auto-fills: Name, email, phone, CV from profile
  - [ ] Returns: Success or validation errors

#### WhatsApp Integration
- [ ] Add validation for `whatsapp_number` format
  - [ ] Must start with 675 (PNG country code)
  - [ ] 10-12 digits total
- [ ] Store formatted number (6757XXXXXXX)

#### Job Stats
- [ ] Track province in job view analytics
- [ ] Track WhatsApp apply vs traditional apply

### Low Priority (Week 3)

#### Search Improvements
- [ ] Add province to search index/SQL query
- [ ] Support multiple provinces (OR filter)
- [ ] Fuzzy matching for province variations

#### Admin Dashboard
- [ ] Show province distribution stats
- [ ] Show most popular provinces
- [ ] Filter jobs by province in admin panel

---

## 📱 Testing Checklist

### Manual Testing

#### Desktop (Chrome)
- [ ] Language toggle in header works
- [ ] Province filter in search works (after backend update)
- [ ] All UI strings translate properly
- [ ] No console errors

#### Mobile (Chrome DevTools Responsive)
- [ ] Bottom navigation bar appears (<768px)
- [ ] Bottom navigation bar hides (≥768px)
- [ ] All 5 nav items are clickable (44x44px min)
- [ ] Swipe right on job card → green background + save
- [ ] Swipe left on job card → red background + dismiss
- [ ] Pull-to-refresh on job listing page works
- [ ] Refresh indicator shows progress
- [ ] Offline banner appears when offline
- [ ] Offline banner hides when back online
- [ ] Cached jobs load when offline
- [ ] WhatsApp button opens WhatsApp with pre-filled message
- [ ] Language choice persists across pages

#### Real Device Testing (Critical!)
- [ ] Test on actual PNG mobile network (2-5 Mbps)
- [ ] Test on low-end Android device (common in PNG)
  - [ ] Samsung Galaxy A series
  - [ ] Oppo/Vivo budget phones
- [ ] Test on iPhone 8+ (older devices)
- [ ] Test offline mode on commute/poor signal areas

#### Cross-Browser
- [ ] Chrome (primary)
- [ ] Safari (iOS)
- [ ] Firefox
- [ ] Samsung Internet (popular in PNG)

### Performance Testing
- [ ] Lighthouse score >90 on mobile
- [ ] First Contentful Paint <3s on Fast 3G
- [ ] Time to Interactive <5s on Fast 3G
- [ ] Bundle size <200KB gzipped ✅ (already 136.99 KB)

### Accessibility Testing
- [ ] Screen reader navigation works
- [ ] Keyboard navigation (Tab key)
- [ ] Color contrast ratios pass WCAG AA
- [ ] Language attribute set correctly (en/tpi)

---

## 📊 Analytics & Tracking

### Events to Track
- [ ] Language preference selected
  ```js
  { event: 'language_changed', from: 'en', to: 'tpi' }
  ```
- [ ] Job swiped (saved/dismissed)
  ```js
  { event: 'job_swiped', direction: 'left|right', job_id: X }
  ```
- [ ] Pull-to-refresh triggered
  ```js
  { event: 'pull_to_refresh', page: 'job_search' }
  ```
- [ ] WhatsApp share clicked
  ```js
  { event: 'job_shared', platform: 'whatsapp', job_id: X }
  ```
- [ ] WhatsApp apply clicked
  ```js
  { event: 'job_applied', method: 'whatsapp', job_id: X }
  ```
- [ ] Offline mode activated
  ```js
  { event: 'offline_browsing', cached_jobs: N }
  ```
- [ ] Province filter used
  ```js
  { event: 'filter_changed', filter: 'province', value: 'NCD' }
  ```
- [ ] Bottom nav item clicked
  ```js
  { event: 'bottom_nav_click', item: 'search|profile|home|...' }
  ```

### KPIs to Monitor
- [ ] % users switching to Tok Pisin
- [ ] Mobile conversion rate (applications per visit)
- [ ] WhatsApp share rate
- [ ] Average time on site (mobile vs desktop)
- [ ] Bounce rate on slow connections
- [ ] Most popular provinces
- [ ] Offline session frequency

---

## 🚀 Deployment Plan

### Pre-Deployment
- [ ] Run full test suite
- [ ] Build production bundle (`npm run build`)
- [ ] Verify service worker cache names updated (v2)
- [ ] Backup production database
- [ ] Test on staging environment

### Database Migration
```bash
# 1. Run migrations
psql -U postgres -d wantokjobs < migrations/add_province_whatsapp.sql

# 2. Run province mapping script
node scripts/map_provinces.js

# 3. Verify data
SELECT COUNT(*) FROM jobs WHERE province IS NOT NULL;
```

### Frontend Deployment
```bash
# 1. Build client
cd client && npm run build

# 2. Copy to server
cp -r dist/* ../server/public/

# 3. Restart server
pm2 restart wantokjobs
```

### Post-Deployment
- [ ] Verify build deployed correctly (check version)
- [ ] Clear CDN cache (if using)
- [ ] Test critical paths:
  - [ ] Job search works
  - [ ] Job detail loads
  - [ ] Applications submit
  - [ ] Language toggle works
  - [ ] Offline mode works
- [ ] Monitor error logs for 24 hours
- [ ] Check analytics for drop-offs

### Rollback Plan
```bash
# If issues occur:
# 1. Revert frontend
git checkout HEAD~1 client/
npm run build
cp -r dist/* ../server/public/

# 2. Revert database (if needed)
psql -U postgres -d wantokjobs < migrations/rollback_province_whatsapp.sql

# 3. Restart
pm2 restart wantokjobs
```

---

## 📝 Documentation Updates Needed

- [ ] Update README.md with PNG-specific features
- [ ] Document i18n system for contributors
- [ ] Add "Adding Translations" guide
- [ ] Document province data structure
- [ ] Create API changelog (new fields)
- [ ] Update user help docs with Tok Pisin screenshots

---

## 🎯 Success Criteria

### Week 1 (MVP)
- [ ] Language toggle live on all pages
- [ ] Mobile bottom nav visible on mobile
- [ ] Province filter functional (backend + frontend)
- [ ] Kina salary formatting everywhere
- [ ] Offline mode working

### Week 2 (Enhanced)
- [ ] Swipe actions live on job cards
- [ ] Pull-to-refresh on job search
- [ ] WhatsApp share buttons everywhere
- [ ] Company logo placeholders showing

### Week 3 (Polished)
- [ ] WhatsApp apply method live
- [ ] Quick apply (one-tap)
- [ ] Analytics tracking all events
- [ ] Real device testing passed
- [ ] 90+ Lighthouse score

### Month 1 (Validated)
- [ ] 20%+ increase in mobile conversions
- [ ] 30%+ users trying Tok Pisin
- [ ] 50%+ jobs shared via WhatsApp
- [ ] <1% error rate in production logs
- [ ] Positive user feedback from PNG users

---

## 🤝 Team Assignments (Suggested)

### Frontend Dev
- JobSearch.jsx integration (swipe, pull-to-refresh)
- JobDetail.jsx WhatsApp button
- Salary formatting updates
- Mobile testing

### Backend Dev
- Database migrations
- Province mapping script
- API endpoint updates
- WhatsApp field validation

### QA Engineer
- Manual testing checklist
- Real device testing
- Performance testing
- Cross-browser testing

### DevOps
- Deployment plan execution
- Monitoring setup
- Rollback preparation

### Product Manager
- Analytics setup
- KPI tracking
- User acceptance testing
- PNG user interviews

---

## ⚠️ Blockers & Dependencies

### Blockers
- ❌ Province filter requires backend API update
- ❌ WhatsApp apply requires database schema change
- ❌ Quick apply needs new backend endpoint

### Dependencies
- ✅ i18n infrastructure ready
- ✅ Mobile components ready
- ✅ Hooks ready for integration
- ⏳ Backend API updates in progress

### Waiting On
- [ ] Backend team: Database migrations
- [ ] Backend team: API endpoint updates
- [ ] QA team: Real PNG device for testing
- [ ] Product team: Tok Pisin translation review by native speaker

---

## 📞 Support

**Questions or issues?**
1. Check `/data/.openclaw/workspace/memory/2026-02-17-png-optimization.md` (detailed report)
2. Check `PNG_IMPLEMENTATION_GUIDE.md` (code examples)
3. Contact: AI Agent (this subagent session)

**Need help with:**
- Tok Pisin translations → Find PNG Tok Pisin speaker for review
- WhatsApp API → Check Facebook Business Developer docs
- Province data accuracy → Verify with PNG government website
- Mobile testing → Use BrowserStack or real PNG SIM card

---

**Last Updated:** February 17, 2026  
**Status:** 🟢 Frontend Ready | 🟡 Backend Pending | 🔴 Testing Required
