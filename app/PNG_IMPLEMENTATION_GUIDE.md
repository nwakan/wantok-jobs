# PNG Optimization Implementation Guide
Quick reference for integrating the new PNG-optimized features

## Already Completed ✅
- ✅ i18n infrastructure (English/Tok Pisin)
- ✅ Mobile bottom navigation
- ✅ Offline support & service worker
- ✅ Swipe actions & pull-to-refresh hooks
- ✅ WhatsApp integration components
- ✅ Province data & helpers
- ✅ Kina salary formatting
- ✅ Company logo placeholders

## Quick Integration Steps

### 1. Add Pull-to-Refresh to Job Search Page

**File:** `client/src/pages/JobSearch.jsx`

```jsx
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function JobSearch() {
  const [jobs, setJobs] = useState([]);
  
  const refreshJobs = async () => {
    const data = await jobs.getAll(filters);
    setJobs(data.data);
  };

  const { 
    isPulling, 
    pullProgress, 
    isRefreshing, 
    getRefreshIndicatorStyle 
  } = usePullToRefresh(refreshJobs);

  return (
    <div>
      {/* Refresh Indicator */}
      {isPulling && (
        <div 
          className="pull-to-refresh-indicator"
          style={getRefreshIndicatorStyle()}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          {pullProgress >= 1 && <span>Release to refresh</span>}
        </div>
      )}
      
      {/* Job listings */}
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
```

---

### 2. Use Swipeable Job Cards

**File:** `client/src/pages/JobSearch.jsx`

```jsx
import SwipeableJobCard from '../components/SwipeableJobCard';
import { savedJobs } from '../api';
import { useToast } from '../components/Toast';

function JobSearch() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);

  const handleSaveJob = async (job) => {
    try {
      await savedJobs.save(job.id);
      showToast('Job saved! ❤️', 'success');
    } catch (error) {
      showToast('Failed to save job', 'error');
    }
  };

  const handleDismissJob = (job) => {
    // Remove from local state
    setJobs(prev => prev.filter(j => j.id !== job.id));
    showToast('Job dismissed', 'info');
  };

  return (
    <div className="space-y-4">
      {jobs.map(job => (
        <SwipeableJobCard
          key={job.id}
          job={job}
          onSave={handleSaveJob}
          onDismiss={handleDismissJob}
          enableSwipe={true}
        />
      ))}
    </div>
  );
}
```

---

### 3. Add WhatsApp Apply Button to Job Detail

**File:** `client/src/pages/JobDetail.jsx`

```jsx
import WhatsAppButton from '../components/WhatsAppButton';

function JobDetail() {
  const { job } = useJob();
  const { user } = useAuth();

  return (
    <div>
      {/* Regular Apply Button */}
      <button onClick={handleApplyClick} className="...">
        Apply Now
      </button>

      {/* WhatsApp Apply (if available) */}
      <WhatsAppButton job={job} user={user} className="mt-3" />
    </div>
  );
}
```

---

### 4. Format Salaries with Kina Prefix

**File:** Any component displaying salaries

```jsx
import { formatPNGSalary, formatSalaryRange } from '../utils/pngHelpers';

// Single amount
<span>{formatPNGSalary(50000)}</span> 
// Output: K50,000

// Range
<span>{formatSalaryRange(30000, 80000, 'PGK', 'month')}</span>
// Output: K30,000 - K80,000/mun
```

---

### 5. Use Language Translations

**File:** Any component

```jsx
import { useLanguage } from '../context/LanguageContext';

function MyComponent() {
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <div>
      <h1>{t('nav.findJobs')}</h1>
      <button>{t('jobs.applyNow')}</button>
      <p>Current language: {language}</p>
    </div>
  );
}
```

**Add new translations:**
- Edit `client/src/i18n/en.json`
- Edit `client/src/i18n/tpi.json`

---

## Backend API Updates Required

### 1. Add Province Filter to Jobs API

**File:** `server/routes/jobs.js`

```javascript
// GET /api/jobs
router.get('/', (req, res) => {
  const { province, ...otherFilters } = req.query;
  
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];
  
  if (province) {
    sql += ' AND (province = ? OR location LIKE ?)';
    params.push(province, `%${province}%`);
  }
  
  // ... other filters
});
```

### 2. Add WhatsApp Fields to Jobs Table

**Migration:**
```sql
ALTER TABLE jobs 
ADD COLUMN whatsapp_number VARCHAR(20) DEFAULT NULL,
ADD COLUMN application_method ENUM('internal', 'external', 'email', 'whatsapp') DEFAULT 'internal';
```

**Update Job POST/PUT endpoints** to accept these fields.

### 3. Map Existing Jobs to Provinces

**One-time script:**
```javascript
const { matchProvinceFromLocation } = require('../client/src/data/provinces');

db.prepare('SELECT id, location FROM jobs').all().forEach(job => {
  const province = matchProvinceFromLocation(job.location);
  if (province) {
    db.prepare('UPDATE jobs SET province = ? WHERE id = ?')
      .run(province.name, job.id);
  }
});
```

---

## Testing Guide

### Test on Mobile
1. Open Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
2. Select "iPhone 12 Pro" or "Pixel 5"
3. Check:
   - ✅ Bottom nav appears and is clickable
   - ✅ Swipe right on job card → green background
   - ✅ Swipe left on job card → red background
   - ✅ Pull down on job list → refresh indicator
   - ✅ Language toggle EN ↔ TPI works

### Test Offline Mode
1. Chrome DevTools → Network tab → "Offline"
2. Reload page
3. Check:
   - ✅ Orange "Yu stap offlain" banner appears
   - ✅ Cached jobs still display
   - ✅ New searches fail gracefully

### Test WhatsApp Integration
1. Add `whatsapp_number: "6757XXXXXXX"` to a test job
2. Click "Apply via WhatsApp"
3. Check:
   - ✅ Opens WhatsApp with pre-filled message
   - ✅ Message includes job title, company, profile link

---

## Common Issues

### Issue: Bottom nav overlaps content
**Fix:** Ensure `<Layout>` has `pb-16 md:pb-0` class (already applied)

### Issue: Swipe actions not working
**Fix:** Check that parent container doesn't have `overflow: hidden` or `touch-action: none`

### Issue: Language doesn't persist
**Fix:** Check browser localStorage is enabled

### Issue: Offline banner flashing
**Fix:** Adjust `showBanner` timeout in `OfflineBanner.jsx`

---

## Performance Monitoring

Add these metrics to analytics:

```javascript
// Track language preference
analytics.track('Language Changed', {
  from: 'en',
  to: 'tpi'
});

// Track swipe actions
analytics.track('Job Swiped', {
  direction: 'right', // or 'left'
  job_id: job.id
});

// Track offline usage
if (!navigator.onLine) {
  analytics.track('Offline Job Browsing', {
    cached_jobs: cachedCount
  });
}

// Track WhatsApp shares
analytics.track('Job Shared', {
  platform: 'whatsapp',
  job_id: job.id
});
```

---

## Next Steps

1. **Immediate:**
   - [ ] Test all features on mobile viewport
   - [ ] Add pull-to-refresh to JobSearch.jsx
   - [ ] Switch JobCard to SwipeableJobCard

2. **Backend (Week 1):**
   - [ ] Add province column to jobs table
   - [ ] Add WhatsApp fields to jobs table
   - [ ] Update API to filter by province
   - [ ] Map existing jobs to provinces

3. **Enhancement (Week 2):**
   - [ ] Add sticky apply button to JobDetail
   - [ ] Implement one-tap apply
   - [ ] Add WhatsApp job alerts
   - [ ] Track analytics events

4. **Testing (Week 3):**
   - [ ] Test on real PNG network (2-5 Mbps)
   - [ ] Test on low-end Android devices
   - [ ] User acceptance testing with PNG users
   - [ ] A/B test language toggle placement

---

## Resources

- **Tok Pisin Dictionary:** https://www.tok-pisin.com/
- **PNG Network Stats:** https://www.speedtest.net/global-index/papua-new-guinea
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp
- **Navigator.connection API:** https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation

---

**Questions?** Check the detailed report: `/data/.openclaw/workspace/memory/2026-02-17-png-optimization.md`
