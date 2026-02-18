# Google Search Console Setup Guide

**Domain:** tolarai.com  
**DNS Provider:** Cloudflare  
**Date:** 2026-02-18

## Current Sitemap Status

✅ **Sitemap Index is accessible** at: https://tolarai.com/sitemap.xml

However, there's a critical issue:
- ❌ The sitemap URLs currently point to **wantokjobs.com** instead of **tolarai.com**
- The sitemap code uses `process.env.BASE_URL || 'https://wantokjobs.com'` as fallback
- Current .env has `APP_URL=https://wantokjobs.com` but **no BASE_URL** variable set

### Fix Required BEFORE Google Search Console Submission

**Update `.env` file:**
```bash
# Change this line:
APP_URL=https://wantokjobs.com

# To:
APP_URL=https://tolarai.com
BASE_URL=https://tolarai.com
```

Then restart the server to regenerate sitemaps with correct URLs.

---

## Sitemap Structure

The site uses a sitemap index pointing to three sub-sitemaps:

1. **sitemap-pages.xml** - Static pages, categories, blog articles
2. **sitemap-jobs.xml** - Job listings (up to 10,000 active jobs)
3. **sitemap-companies.xml** - Verified employer profiles

All sitemaps are cached for 1 hour and auto-regenerate.

---

## Google Search Console Verification Methods

### Method 1: HTML File Upload (Recommended - Easiest)

1. **Get verification file from Google:**
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add property: `https://tolarai.com`
   - Select **HTML file upload** method
   - Download the verification file (e.g., `google1234567890abcdef.html`)

2. **Upload to server:**
   ```bash
   # Upload file to: /data/.openclaw/workspace/data/wantok/app/public/
   # File will be accessible at: https://tolarai.com/google1234567890abcdef.html
   ```

3. **Verify in Google:**
   - Click "Verify" in Google Search Console
   - Keep the file permanently on the server

**Pros:** Simple, no DNS changes needed  
**Cons:** File must remain on server forever

---

### Method 2: DNS TXT Record (Recommended - Best for Long-term)

1. **Get TXT record from Google:**
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Add property: `https://tolarai.com`
   - Select **DNS TXT record** method
   - Copy the TXT record value (e.g., `google-site-verification=abc123xyz...`)

2. **Add TXT record in Cloudflare:**
   - Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Select the `tolarai.com` domain
   - Go to **DNS** → **Records**
   - Click **Add record**
   - Set:
     - **Type:** TXT
     - **Name:** @ (or leave blank for root domain)
     - **Content:** `google-site-verification=abc123xyz...` (paste from Google)
     - **TTL:** Auto
     - **Proxy status:** DNS only (gray cloud)
   - Click **Save**

3. **Wait for propagation:**
   ```bash
   # Check DNS propagation (may take 5-30 minutes):
   dig TXT tolarai.com
   # or
   nslookup -type=TXT tolarai.com
   ```

4. **Verify in Google:**
   - Click "Verify" in Google Search Console
   - DNS verification is permanent (record stays in DNS)

**Pros:** Clean, permanent, works even if server changes  
**Cons:** Requires DNS access (we have it via Cloudflare)

---

### Method 3: HTML Meta Tag (Alternative)

1. **Get meta tag from Google:**
   - Select **HTML tag** method in Google Search Console
   - Copy the meta tag: `<meta name="google-site-verification" content="abc123..." />`

2. **Add to site template:**
   - Edit `/data/.openclaw/workspace/data/wantok/app/client/index.html`
   - Add the meta tag inside `<head>` section
   - Rebuild and deploy frontend

**Pros:** Simple if you have code access  
**Cons:** Requires code deployment, easy to accidentally remove

---

## Recommended Verification Method

**Use Method 2 (DNS TXT Record)**

**Why:**
- Most reliable and permanent
- Survives server migrations
- No code changes needed
- Cloudflare DNS is fast and reliable
- Standard industry practice

---

## After Verification - Submit Sitemaps

Once verified, submit all sitemaps in Google Search Console:

1. Go to **Sitemaps** section
2. Submit:
   - `https://tolarai.com/sitemap.xml` (main index)
   - `https://tolarai.com/sitemap-pages.xml`
   - `https://tolarai.com/sitemap-jobs.xml`
   - `https://tolarai.com/sitemap-companies.xml`

Google will crawl these automatically, but manual submission speeds up initial indexing.

---

## Testing Checklist

Before submitting to Google:

- [ ] Update .env with `BASE_URL=https://tolarai.com`
- [ ] Restart server
- [ ] Verify sitemap accessible: https://tolarai.com/sitemap.xml
- [ ] Verify sitemap URLs use tolarai.com (not wantokjobs.com)
- [ ] Verify robots.txt accessible: https://tolarai.com/robots.txt
- [ ] Test a sample job page loads: https://tolarai.com/jobs/8
- [ ] Verify site resolves correctly (not 502 errors)

---

## Current Issues Discovered

1. **502 Bad Gateway errors** - The site returns 502 errors when accessing job pages. This needs to be fixed BEFORE Google Search Console submission:
   - Check backend server is running
   - Check database connectivity
   - Review Cloudflare proxy settings
   - Check server logs for errors

2. **Base URL mismatch** - Sitemaps use wantokjobs.com instead of tolarai.com (fix documented above)

3. **Anti-scrape protection** - The sitemap-jobs.xml endpoint returns a honeypot JSON response instead of XML when accessed by bots. This may interfere with Googlebot. Review `/data/.openclaw/workspace/data/wantok/app/server/middleware/antiScrape.js` to whitelist Googlebot user agent.

---

## Monitoring After Setup

Once verified and sitemaps submitted:

1. **Check Index Coverage** (daily for first week):
   - Google Search Console → Coverage report
   - Watch for indexing errors

2. **Monitor Rich Results**:
   - Google Search Console → Enhancements → Job Postings
   - Verify JobPosting structured data is recognized

3. **Track Performance**:
   - Google Search Console → Performance
   - Monitor clicks, impressions, CTR, position

---

## Support Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Cloudflare DNS Docs](https://developers.cloudflare.com/dns/)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)

---

## Next Steps

1. ✅ Fix BASE_URL in .env
2. ✅ Restart server
3. ✅ Fix 502 errors
4. ⏳ Choose verification method (recommend DNS TXT)
5. ⏳ Add verification to Cloudflare DNS or upload HTML file
6. ⏳ Verify in Google Search Console
7. ⏳ Submit sitemaps
8. ⏳ Monitor indexing over next 7-14 days
