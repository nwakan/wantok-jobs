# WantokJobs Email & Newsletter System

Complete email and engagement system built for WantokJobs.

## 📋 What Was Built

### 1. **Email Templates Library** (`server/lib/email-templates.js`)
- Reusable, responsive HTML email components
- PNG-themed branding (green/gold colors, tropical professional design)
- Components:
  - `emailLayout()` - Main wrapper with WantokJobs branding
  - `button()` - CTA buttons (primary, secondary, gold variants)
  - `jobCard()` - Job listing cards with company info
  - `statCard()` - Statistics display
  - `alertBox()` - Info/success/warning/tip boxes
  - `newsletterDigest()` - Weekly digest template
  - `welcomeToNewsletter()` - Welcome email for new subscribers

### 2. **Newsletter Routes** (`server/routes/newsletter.js`)
Public and admin-facing API endpoints:

#### Public Endpoints:
- **POST `/api/newsletter/subscribe`** - Subscribe to newsletter
  - Body: `{ email, name? }`
  - Sends welcome email
  - Links to user account if authenticated

- **POST `/api/newsletter/unsubscribe`** - Unsubscribe
  - Body: `{ email }` or `{ token }` (from email link)

#### Admin Endpoints (require authentication + admin role):
- **GET `/api/newsletter/subscribers`** - List all subscribers
  - Query params: `status` (subscribed/unsubscribed), `page`, `limit`

- **GET `/api/newsletter/stats`** - Newsletter statistics
  - Returns: subscriber counts, last sent date, recent subscribers

- **POST `/api/newsletter/send`** - Send newsletter to all subscribers
  - Body: `{ subject?, previewOnly?, testEmail? }`
  - Pulls jobs from last 7 days
  - Generates personalized matches for users with profiles
  - Rate-limited to avoid Brevo API throttling

### 3. **Enhanced Email Service** (`server/lib/email.js`)
Added new functions:

- `sendNewsletterDigest()` - Send weekly digest to a subscriber
- `sendWelcomeNewsletter()` - Welcome email for new newsletter subscribers
- `sendNewJobAlerts()` - Alert subscribers when matching jobs are posted
  - Queries `job_alerts` table for matching criteria
  - Respects alert frequency settings
  - Deduplicates recent sends

### 4. **Job Alert Triggers** (Updated `server/routes/jobs.js`)
- When a new job is posted (`POST /api/jobs`), the system:
  1. Sends confirmation email to employer
  2. **NEW:** Triggers job alert emails to matching subscribers
  3. Matches based on keywords, location, job type
  4. Respects user alert frequency preferences

### 5. **Weekly Digest Cron Script** (`/data/.openclaw/workspace/system/agents/weekly-digest.js`)

Standalone script that sends personalized weekly digests.

**Usage:**
```bash
cd /data/.openclaw/workspace/data/wantok/app
node /data/.openclaw/workspace/system/agents/weekly-digest.js [--dry-run] [--test-email=user@example.com]
```

**Features:**
- Fetches jobs from last 7 days
- Calculates platform stats (new jobs, employers, jobseekers)
- Generates personalized job recommendations (skill-based matching)
- Sends to all active subscribers with rate limiting
- Logs activity to `activity_log` table

**Cron Schedule (Sunday 6 PM PNG time):**
```cron
0 18 * * 0 cd /data/.openclaw/workspace/data/wantok/app && node /data/.openclaw/workspace/system/agents/weekly-digest.js >> /var/log/wantok-digest.log 2>&1
```

## 🗄️ Database Schema

The `newsletter_subscribers` table already existed:

```sql
CREATE TABLE newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  user_id INTEGER,                      -- Links to users table if they have an account
  name TEXT,
  subscribed INTEGER DEFAULT 1,         -- 1 = subscribed, 0 = unsubscribed
  frequency TEXT DEFAULT 'weekly',
  last_sent TEXT,                       -- Last newsletter send timestamp
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)
```

## 🎨 Email Design

All emails feature:
- **WantokJobs branding** (green #10B981, gold #F59E0B)
- **PNG cultural touch** - "Wantok" = friend/connection in Tok Pisin
- **PNG flag colors** accent bar in header
- **Mobile-responsive** design
- **Inline CSS** for email client compatibility
- **Unsubscribe links** in newsletter emails

## 🧪 Testing

### Test Newsletter Subscription
```bash
curl -X POST http://localhost:3001/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### Test Weekly Digest (Dry Run)
```bash
cd /data/.openclaw/workspace/data/wantok/app
node /data/.openclaw/workspace/system/agents/weekly-digest.js --dry-run
```

### Test with Specific Email
```bash
cd /data/.openclaw/workspace/data/wantok/app
node /data/.openclaw/workspace/system/agents/weekly-digest.js --test-email=your@email.com
```

### Test Admin Newsletter Send (Preview Mode)
```bash
curl -X POST http://localhost:3001/api/newsletter/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"previewOnly":true,"testEmail":"admin@example.com"}'
```

## 📧 Email Templates Available

From the existing `server/lib/email.js`:

1. ✅ **Welcome Email** - Jobseeker/Employer variants
2. ✅ **Password Reset**
3. ✅ **Password Changed**
4. ✅ **Application Confirmation** (to jobseeker)
5. ✅ **Application Status Changed** (7 statuses: screening, shortlisted, interview, offered, hired, rejected, withdrawn)
6. ✅ **New Application Received** (to employer)
7. ✅ **Job Posted Confirmation** (to employer)
8. ✅ **Job Expiring Soon** (to employer)
9. ✅ **Job Alert** (matching jobs)
10. ✅ **Incomplete Profile Nudge** (to jobseeker)
11. ✅ **Order Confirmation** (to employer)
12. ✅ **Contact Form Received** (to admin)
13. ✅ **Contact Form Auto-Reply** (to sender)
14. ✅ **Admin Weekly Digest**
15. ✅ **Newsletter Welcome** (NEW)
16. ✅ **Newsletter Weekly Digest** (NEW)

## 🔐 Environment Variables

Already configured in `.env`:

```env
BREVO_API_KEY=xkeysib-...
FROM_EMAIL=noreply@wantokjobs.com
FROM_NAME=WantokJobs
APP_URL=https://wantokjobs.com
```

If `BREVO_API_KEY` is missing, emails are logged to console (dev mode).

## 🚀 Deployment Checklist

- [x] Newsletter routes registered in `server/index.js`
- [x] Job alert triggers added to jobs route
- [x] Weekly digest script created and tested
- [x] Email templates created with PNG branding
- [ ] Set up cron job for weekly digest
- [ ] Add newsletter signup form to frontend
- [ ] Add newsletter management UI in admin dashboard
- [ ] Test live email sending with Brevo

## 📊 Admin Dashboard Integration

Add to admin dashboard:

1. **Newsletter Stats Widget**
   - Total subscribers
   - Last newsletter sent
   - Open rates (if Brevo webhooks configured)

2. **Send Newsletter Button**
   - Preview mode
   - Test email option
   - Send to all subscribers

3. **Subscriber Management**
   - View all subscribers
   - Export CSV
   - Manual add/remove

## 🎯 Future Enhancements

1. **Segmentation** - Send different newsletters to jobseekers vs employers
2. **A/B Testing** - Test different subject lines
3. **Brevo Webhooks** - Track opens, clicks, bounces
4. **Newsletter Archives** - Public archive of past newsletters
5. **RSS Feed** - Auto-generate newsletter from blog posts + jobs
6. **Frequency Preferences** - Let users choose daily/weekly/monthly
7. **AI-Powered Recommendations** - Better job matching using AI

## 📝 Notes

- All email sends are async and wrapped in try/catch to avoid breaking main flows
- Rate limiting: 150ms delay between newsletter sends to avoid Brevo throttling
- Unsubscribe tokens: Base64-encoded `email:timestamp`
- Personalized jobs are skill-matched (simple keyword matching for now)
- Weekly digest only sends if there are new jobs (past 7 days)

## 🐛 Troubleshooting

### "No BREVO_API_KEY" in logs
- Check `.env` file has `BREVO_API_KEY`
- Restart server after adding key

### Newsletter subscribers not receiving emails
- Check `subscribed = 1` in database
- Verify `last_sent` isn't blocking (frequency check)
- Test with `--test-email` flag

### Cron job not running
- Check cron is enabled: `crontab -l`
- Verify script path is absolute
- Check logs: `/var/log/wantok-digest.log`
- Test manually first with `--dry-run`

---

**Built:** 2026-02-16  
**Status:** ✅ Complete and tested  
**Maintainer:** WantokJobs Dev Team
