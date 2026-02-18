# Domain Cutover Plan: wantokjobs.com → Cloudflare

**Date:** 2026-02-18  
**Target:** Migrate wantokjobs.com to Cloudflare (same setup as tolarai.com)

---

## Current State

| Domain | Current Host | IP Address | Status |
|--------|--------------|------------|--------|
| **wantokjobs.com** | Old Host | 162.241.253.126 | ❌ Legacy setup |
| **tolarai.com** | Cloudflare | 172.67.188.57<br>104.21.48.221 | ✅ Active, working |

**Goal:** Point wantokjobs.com to the same Cloudflare infrastructure as tolarai.com

---

## Pre-Cutover Checklist

### 1. Verify Current Setup

- [ ] **Check wantokjobs.com registrar:**
  ```bash
  whois wantokjobs.com | grep -i registrar
  ```
  - Find where domain is registered (e.g., GoDaddy, Namecheap, etc.)
  - Get login credentials for registrar account

- [ ] **Document current DNS records:**
  ```bash
  dig wantokjobs.com ANY
  dig www.wantokjobs.com
  dig mail.wantokjobs.com
  ```
  - Save all current DNS records (A, MX, TXT, CNAME)
  - Note any email, subdomains, or services using the domain

- [ ] **Check email setup:**
  - Are emails sent/received via wantokjobs.com?
  - Current MX records?
  - Email provider (Google Workspace, etc.)?

- [ ] **Backup current site:**
  ```bash
  wget --mirror --convert-links --page-requisites \
    http://wantokjobs.com/ -P backup-$(date +%Y%m%d)
  ```

---

### 2. Cloudflare Account Preparation

- [ ] **Verify Cloudflare account access:**
  - Login URL: https://dash.cloudflare.com/
  - Confirm you have admin access
  - Verify tolarai.com is already configured

- [ ] **Check current Cloudflare settings:**
  - Note SSL/TLS mode (Full/Full Strict)
  - Note proxy settings (orange cloud vs DNS only)
  - Note firewall rules, page rules, etc.

- [ ] **Prepare origin server:**
  - Confirm server accepts requests for wantokjobs.com
  - Update virtual host config if needed (nginx/Apache)
  - Test with host header spoofing:
    ```bash
    curl -H "Host: wantokjobs.com" http://172.67.188.57/
    ```

---

## Cutover Steps

### Phase 1: Add Domain to Cloudflare (Day 1)

#### Step 1.1: Add wantokjobs.com to Cloudflare

1. **Log into Cloudflare:**
   - Go to: https://dash.cloudflare.com/
   - Click **"Add a Site"**

2. **Enter domain:**
   - Type: `wantokjobs.com`
   - Click **"Add site"**

3. **Select plan:**
   - Choose: **Free** (same as tolarai.com)
   - Click **"Continue"**

4. **DNS record scan:**
   - Cloudflare will scan existing DNS records
   - **Review carefully** - especially:
     - MX records (email)
     - TXT records (SPF, DKIM, DMARC, verification)
     - CNAME records (subdomains)
   - Click **"Continue"**

5. **Note nameservers:**
   - Cloudflare will show 2 nameservers (e.g.):
     - `dana.ns.cloudflare.com`
     - `walt.ns.cloudflare.com`
   - **Write these down!**

---

#### Step 1.2: Configure DNS Records in Cloudflare

Before changing nameservers, set up all DNS records correctly:

**Root Domain (A Record):**
```
Type: A
Name: @
IPv4: [Your Origin Server IP - get from tolarai.com setup]
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

**WWW Subdomain:**
```
Type: CNAME
Name: www
Target: wantokjobs.com
Proxy: ✅ Proxied (orange cloud)
TTL: Auto
```

**Email (MX Records) - Copy from old DNS:**
```bash
# Get current MX records:
dig wantokjobs.com MX

# Add each MX record in Cloudflare:
Type: MX
Name: @
Mail server: [existing mail server]
Priority: [existing priority]
TTL: Auto
```

**Email Authentication (TXT Records):**
```bash
# Get current TXT records:
dig wantokjobs.com TXT

# Add SPF record:
Type: TXT
Name: @
Content: v=spf1 ... (copy exact content from old DNS)

# Add DKIM record (if exists):
Type: TXT
Name: [selector]._domainkey
Content: v=DKIM1; ... (copy exact content)

# Add DMARC record (if exists):
Type: TXT
Name: _dmarc
Content: v=DMARC1; ... (copy exact content)
```

**Other Subdomains:**
- Copy any other A/CNAME/TXT records from old DNS
- Common ones: `mail.`, `ftp.`, `cpanel.`, etc.

---

#### Step 1.3: Configure Cloudflare Settings (Match tolarai.com)

1. **SSL/TLS:**
   - Go to: SSL/TLS → Overview
   - Set mode: **Full (strict)** (same as tolarai.com)

2. **SSL/TLS → Edge Certificates:**
   - ✅ Always Use HTTPS: ON
   - ✅ Automatic HTTPS Rewrites: ON
   - ✅ HTTP Strict Transport Security (HSTS): Enable (after testing)
   - Minimum TLS Version: 1.2

3. **Security → Settings:**
   - Security Level: Medium (or match tolarai.com)
   - Challenge Passage: 30 minutes
   - Browser Integrity Check: ON

4. **Speed → Optimization:**
   - ✅ Auto Minify: JS, CSS, HTML
   - ✅ Brotli: ON
   - ✅ Rocket Loader: OFF (test after if needed)

5. **Caching:**
   - Caching Level: Standard
   - Browser Cache TTL: 4 hours (or match tolarai.com)

---

### Phase 2: Test Before Cutover (Day 1-2)

**Critical:** Test BEFORE changing nameservers!

#### Step 2.1: Test DNS Resolution

Use Cloudflare IPs directly to test:

```bash
# Get Cloudflare IPs for wantokjobs.com
dig wantokjobs.com @dana.ns.cloudflare.com
# Should return Cloudflare proxy IPs

# Test website access through Cloudflare
curl -H "Host: wantokjobs.com" http://172.67.188.57/
# Should return website content

# Test HTTPS (may fail until nameservers changed - expected)
curl -H "Host: wantokjobs.com" https://172.67.188.57/ -k
```

#### Step 2.2: Test via Hosts File (Local Testing)

**On your local machine:**

1. **Edit hosts file:**
   - Mac/Linux: `/etc/hosts`
   - Windows: `C:\Windows\System32\drivers\etc\hosts`

2. **Add entries:**
   ```
   172.67.188.57 wantokjobs.com
   172.67.188.57 www.wantokjobs.com
   ```

3. **Test in browser:**
   - Visit: http://wantokjobs.com
   - Visit: https://wantokjobs.com
   - Test all critical pages:
     - Homepage
     - /jobs
     - /login
     - /register
     - API endpoints

4. **Check SSL certificate:**
   - Should show valid Cloudflare certificate
   - No browser warnings

5. **Remove hosts entries after testing**

---

#### Step 2.3: Parallel Testing (Advanced)

**Option A: Use dig to test Cloudflare DNS before cutover:**
```bash
# Query Cloudflare nameservers directly
dig @dana.ns.cloudflare.com wantokjobs.com
dig @dana.ns.cloudflare.com www.wantokjobs.com
dig @dana.ns.cloudflare.com wantokjobs.com MX
```

**Option B: Test email delivery (if using email):**
```bash
# Send test email through Cloudflare's MX records
# Use mail testing service: https://mxtoolbox.com/emailhealth.aspx
```

---

### Phase 3: Nameserver Cutover (Day 2-3)

**⚠️ Point of No Return - Do During Low Traffic Hours**

#### Step 3.1: Lower TTL (24-48 hours BEFORE cutover)

**At current DNS provider:**
1. Log into old DNS provider (registrar or hosting)
2. Find TTL settings for all records
3. Lower TTL to 300 seconds (5 minutes)
4. Wait 24-48 hours for old TTL to expire

**Why:** Ensures fast propagation when you switch nameservers

---

#### Step 3.2: Change Nameservers

1. **Log into domain registrar** (where wantokjobs.com is registered)

2. **Find nameserver settings:**
   - Usually under: "DNS Management", "Nameservers", or "Domain Settings"

3. **Note current nameservers:**
   ```
   # Old nameservers (example - yours will differ):
   ns1.hostingprovider.com
   ns2.hostingprovider.com
   ```
   - **SAVE THESE!** In case you need to roll back

4. **Change to Cloudflare nameservers:**
   ```
   # Replace with YOUR Cloudflare nameservers from Step 1.1:
   dana.ns.cloudflare.com
   walt.ns.cloudflare.com
   ```

5. **Save changes**
   - Registrar will confirm nameserver update
   - Some registrars require email confirmation

6. **Note the time:**
   - DNS propagation takes 0-48 hours (usually 2-4 hours)

---

#### Step 3.3: Monitor Propagation

**Check propagation status:**

1. **Use online tools:**
   - https://www.whatsmydns.net/#NS/wantokjobs.com
   - Should show Cloudflare nameservers globally

2. **Command line:**
   ```bash
   # Check nameservers
   dig wantokjobs.com NS
   
   # Check A record
   dig wantokjobs.com A
   
   # Check from multiple locations
   dig @8.8.8.8 wantokjobs.com  # Google DNS
   dig @1.1.1.1 wantokjobs.com  # Cloudflare DNS
   ```

3. **Cloudflare Dashboard:**
   - Go to: wantokjobs.com → Overview
   - Wait for: "Great news! Cloudflare is now protecting your site"
   - Status changes from "Pending" to "Active"

**Expected Timeline:**
- 0-2 hours: Some regions see new DNS
- 2-6 hours: Most regions propagated
- 6-24 hours: Full global propagation
- 24-48 hours: All ISPs updated (rare)

---

### Phase 4: Post-Cutover Validation (Day 3-4)

#### Step 4.1: Comprehensive Testing

**Website Functionality:**
- [ ] Homepage loads correctly
- [ ] All pages accessible (jobs, companies, login, etc.)
- [ ] Search works
- [ ] Forms submit correctly
- [ ] User login/registration works
- [ ] Job posting works
- [ ] API endpoints respond
- [ ] Admin panel accessible

**Performance:**
```bash
# Test load time
curl -w "@curl-format.txt" -o /dev/null -s https://wantokjobs.com/

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

**SSL/TLS:**
- [ ] Certificate valid and trusted
- [ ] No mixed content warnings
- [ ] HTTP redirects to HTTPS
- [ ] All subdomains have valid certs

**Email (if applicable):**
- [ ] Send test email FROM @wantokjobs.com
- [ ] Receive test email TO @wantokjobs.com
- [ ] Check spam score: https://www.mail-tester.com/

**DNS Resolution:**
```bash
# Verify all records resolve correctly
dig wantokjobs.com
dig www.wantokjobs.com
dig wantokjobs.com MX
dig wantokjobs.com TXT

# Check from multiple global locations
# https://www.whatsmydns.net/
```

---

#### Step 4.2: Enable Advanced Features

Once stable (after 24-48 hours):

**Enable HSTS (if not already):**
- SSL/TLS → Edge Certificates → HSTS
- Max Age: 6 months
- Include Subdomains: Yes
- Preload: Yes (optional - permanent)

**Add Page Rules (optional):**
```
# Force HTTPS
Rule: http://*wantokjobs.com/*
Setting: Always Use HTTPS

# Cache static assets
Rule: *wantokjobs.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month

# Cache API responses (if appropriate)
Rule: *wantokjobs.com/api/jobs*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 5 minutes
```

**Configure Firewall Rules:**
```
# Block bad bots (if needed)
# Security → Firewall → Firewall Rules
# Match tolarai.com rules
```

---

#### Step 4.3: Update Application Config

**Update .env file:**
```bash
# Change ALL references from old domain if needed:
# (Most likely already correct, but double-check)

APP_URL=https://wantokjobs.com  # ✅ Should already be this
BASE_URL=https://wantokjobs.com # ADD THIS if missing

# Email settings:
FROM_EMAIL=noreply@wantokjobs.com  # ✅ Correct

# CORS origins:
CORS_ORIGIN=https://wantokjobs.com,https://www.wantokjobs.com
```

**Restart application:**
```bash
pm2 restart wantokjobs
# or
systemctl restart wantokjobs
```

---

### Phase 5: Decommission Old Hosting (Day 30+)

**⚠️ Wait at least 30 days before canceling old hosting!**

**Why wait:**
- Ensure full DNS propagation worldwide
- Catch any missed subdomains or services
- Allow time for any email delivery delays
- Verify backups are complete

**Before canceling:**
- [ ] Full backup of old server (files + databases)
- [ ] Archive old emails (if hosted there)
- [ ] Document any special configurations
- [ ] Verify no services still pointing to old IP
- [ ] Export all logs for historical reference

---

## Rollback Plan (If Things Go Wrong)

**If you encounter critical issues during cutover:**

### Immediate Rollback (First 24 hours)

1. **Revert nameservers at registrar:**
   ```
   Change back to:
   ns1.hostingprovider.com  # Your old nameservers (saved from Step 3.2)
   ns2.hostingprovider.com
   ```

2. **Wait for propagation** (faster this time due to low TTL)

3. **Verify old site is back:**
   ```bash
   dig wantokjobs.com
   # Should show old IP: 162.241.253.126
   ```

### Partial Rollback (DNS Record Level)

**If only specific services are broken:**

**Option 1: Keep Cloudflare, fix DNS records**
- Edit DNS records in Cloudflare dashboard
- Fix incorrect A/CNAME/MX records
- Wait 5 minutes (low TTL)

**Option 2: Temporarily point to old server**
- Change A record in Cloudflare to old IP:
  ```
  Type: A
  Name: @
  IPv4: 162.241.253.126
  Proxy: OFF (gray cloud - DNS only)
  ```
- Keeps Cloudflare nameservers but routes to old server

---

## Timing Recommendations

### Best Time to Cut Over

**Recommended Window:**
- **Day:** Saturday or Sunday (low traffic)
- **Time:** 2am - 6am in primary user timezone (Papua New Guinea: UTC+10)
- **Avoid:** Monday-Friday, business hours, month-end

**Duration:**
- Actual work: 30-60 minutes
- Propagation: 2-6 hours (monitoring)
- Full validation: 24 hours

---

## Communication Plan

### Before Cutover (1 week)

**Notify stakeholders:**
- [ ] Send email to team/admins
- [ ] Post notice on status page (if applicable)
- [ ] Notify any integrated services/partners

**Message template:**
```
Subject: Scheduled DNS Migration - wantokjobs.com

We will be migrating wantokjobs.com to Cloudflare on [DATE] at [TIME].

Expected downtime: None (transparent)
Expected completion: [DATE + 6 hours]

What to expect:
- Website will remain accessible
- Possible brief SSL warnings during propagation
- Email delivery may have slight delays (5-15 min)

Actions required: None

Contact: [YOUR EMAIL] for questions
```

---

### During Cutover

**Status Updates:**
- T+0: Nameservers changed
- T+2h: Propagation ~50% complete
- T+6h: Propagation ~90% complete
- T+24h: All clear

---

### After Cutover (24 hours)

**Confirmation email:**
```
Subject: DNS Migration Complete - wantokjobs.com

The DNS migration to Cloudflare completed successfully.

All systems operational:
✅ Website: https://wantokjobs.com
✅ Email: working
✅ SSL: valid
✅ Performance: improved

Old hosting will be decommissioned in 30 days.

Thank you for your patience.
```

---

## Troubleshooting Common Issues

### Issue 1: SSL Certificate Errors

**Symptom:** Browser shows "Your connection is not private"

**Cause:** 
- Certificate not yet issued
- DNS not fully propagated
- Wrong SSL mode

**Fix:**
1. Check SSL mode: SSL/TLS → Overview → Full (strict)
2. Check certificate status: SSL/TLS → Edge Certificates
3. Wait for auto-provisioning (up to 24 hours)
4. Force certificate issuance: Edge Certificates → "Order Certificate" (if stuck)

---

### Issue 2: Website Shows Old Content

**Symptom:** Site looks different than expected

**Cause:**
- Caching (Cloudflare or browser)
- DNS not propagated yet

**Fix:**
1. **Purge Cloudflare cache:**
   - Caching → Configuration → Purge Everything

2. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

3. **Check DNS:**
   ```bash
   dig wantokjobs.com
   # Verify IP matches Cloudflare proxy IPs
   ```

---

### Issue 3: Email Not Working

**Symptom:** Emails not sending/receiving

**Cause:**
- MX records missing or incorrect
- SPF/DKIM records missing

**Fix:**
1. **Verify MX records:**
   ```bash
   dig wantokjobs.com MX
   # Should match old DNS exactly
   ```

2. **Check email authentication:**
   ```bash
   dig wantokjobs.com TXT
   # Verify SPF record present
   ```

3. **Test email delivery:**
   - https://mxtoolbox.com/SuperTool.aspx
   - Enter: wantokjobs.com
   - Check all tests pass

---

### Issue 4: Subdomain Not Working

**Symptom:** mail.wantokjobs.com or other subdomain inaccessible

**Cause:** Missing CNAME or A record in Cloudflare

**Fix:**
1. Check old DNS for the subdomain:
   ```bash
   dig subdomain.wantokjobs.com @ns1.hostingprovider.com
   ```

2. Add missing record in Cloudflare DNS

---

### Issue 5: API Rate Limiting

**Symptom:** API calls failing with 429 errors

**Cause:** Cloudflare default rate limiting more aggressive

**Fix:**
1. Check: Firewall → Tools → Rate Limiting
2. Adjust rules or disable if necessary
3. Consider Cloudflare Workers for API (advanced)

---

## Checklist: Complete Cutover Process

### Pre-Cutover (1 week before)
- [ ] Verify registrar access
- [ ] Document all current DNS records
- [ ] Check email setup (MX, SPF, DKIM, DMARC)
- [ ] Backup old server
- [ ] Add domain to Cloudflare
- [ ] Configure all DNS records in Cloudflare
- [ ] Match settings to tolarai.com
- [ ] Test via hosts file
- [ ] Notify stakeholders

### 24-48 Hours Before
- [ ] Lower TTL at old DNS provider

### Cutover Day
- [ ] Change nameservers at registrar
- [ ] Note cutover time
- [ ] Monitor propagation (whatsmydns.net)
- [ ] Wait for "Active" status in Cloudflare

### First 24 Hours After
- [ ] Test all website functionality
- [ ] Verify SSL certificate
- [ ] Test email send/receive
- [ ] Check all subdomains
- [ ] Monitor error logs
- [ ] Purge Cloudflare cache if needed

### First Week After
- [ ] Enable HSTS (after confirming stability)
- [ ] Configure page rules
- [ ] Optimize cache settings
- [ ] Monitor analytics (traffic, performance)
- [ ] Update any hardcoded references

### 30 Days After
- [ ] Final verification all services stable
- [ ] Archive old server data
- [ ] Cancel old hosting account
- [ ] Document lessons learned

---

## Post-Migration Benefits

**Expected Improvements:**

1. **Performance:**
   - Faster page loads (Cloudflare CDN)
   - Global edge caching
   - Brotli/gzip compression

2. **Security:**
   - DDoS protection
   - Web Application Firewall (WAF)
   - Bot mitigation
   - Always-on SSL

3. **Reliability:**
   - 100% uptime SLA (paid plans)
   - Automatic failover
   - Origin server protection

4. **Cost:**
   - Free tier covers most needs
   - Reduced bandwidth costs at origin
   - No separate CDN costs

5. **Management:**
   - Single dashboard for both domains
   - Consistent configuration
   - Better analytics

---

## Contacts & Resources

### Cloudflare Resources
- Dashboard: https://dash.cloudflare.com/
- Status: https://www.cloudflarestatus.com/
- Docs: https://developers.cloudflare.com/
- Support: https://support.cloudflare.com/

### DNS Tools
- DNS Checker: https://www.whatsmydns.net/
- DNS Propagation: https://dnschecker.org/
- MX Toolbox: https://mxtoolbox.com/
- SSL Test: https://www.ssllabs.com/ssltest/

### Emergency Contacts
- Primary: [Your email/phone]
- Secondary: [Backup contact]
- Cloudflare Support: support@cloudflare.com (paid plans only)

---

## Success Criteria

**Migration is successful when:**

- ✅ wantokjobs.com resolves to Cloudflare IPs globally
- ✅ Website loads correctly with valid SSL
- ✅ All functionality works (login, search, jobs, etc.)
- ✅ Email sends/receives without issues
- ✅ No increase in error rates
- ✅ Page load times improved or equal
- ✅ Analytics tracking continues without gaps
- ✅ No user complaints about accessibility

**Timeline:** 2-3 days from nameserver change to full success

---

**Good luck with the migration! Take it slow, test thoroughly, and you'll be fine.** 🚀
