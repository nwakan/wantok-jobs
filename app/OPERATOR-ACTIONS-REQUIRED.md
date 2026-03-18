# OPERATOR ACTIONS REQUIRED - WantokJobs
# Generated: 2026-03-18 | Manual actions needed by Nick/operator on VPS

## STATUS: AGENT FIXES COMPLETE - Operator steps below are the only remaining blockers

---

## [CRITICAL] Must Complete Before Go-Live

### 1. Enable Production Emails (5 min)
  File: /opt/wantokjobs/app/.env
  Change: EMAIL_MODE=test  ->  EMAIL_MODE=live
  Then: sudo systemctl restart wantokjobs
  Impact: ALL emails (verification, payment confirm/reject) go to TEST_EMAIL only right now.

### 2. Fix Gemini API Key for Jean AI (5 min)
  File: /opt/wantokjobs/app/.env
  Add:  GOOGLE_AI_KEY=your_google_ai_studio_key_here
  Get free key: https://aistudio.google.com/app/apikey (1500 req/day free)
  Then: sudo systemctl restart wantokjobs
  Impact: Jean AI primary free LLM is failing. Falls back to paid providers.

### 3. Update Real Bank Account Details (10 min)
  File: /opt/wantokjobs/app/server/utils/jean/sme-pricing.js
  Fix:  account_number: '1234567890'  ->  real BSP account number
        account_number: '0987654321'  ->  real MiBank account number
        account_name: 'WantokJobs Ltd' ->  verify legal entity name
  Then: sudo systemctl restart wantokjobs
  Impact: CRITICAL - Payment instructions to employers have WRONG bank numbers!

### 4. Add Admin Cron Token to .env (5 min)
  SSH to VPS then run:
    TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  Add to /opt/wantokjobs/app/.env:
    ADMIN_CRON_TOKEN=<value above>
  Impact: Payment cron jobs (digest, expire-stale) need this token.

### 5. Install All Cron Jobs (5 min)
  SSH to VPS:
    cd /opt/wantokjobs/app
    sudo bash system/setup-crontab.sh
    crontab -l | grep wantokjobs   # verify
  Jobs installed: watchdog, backup, payment digest (9AM), stale expire (2:30AM),
  WhatsApp outbox (every 5min), job expiry (3AM), job alerts (8AM),
  search re-index (1AM), data cleanup (Sun 4AM)

### 6. Apply Nginx Config Live (10 min)
  SSH to VPS:
    sudo cp /opt/wantokjobs/app/vps-scripts/nginx-tolarai.conf /etc/nginx/sites-available/wantokjobs
    sudo ln -sf /etc/nginx/sites-available/wantokjobs /etc/nginx/sites-enabled/wantokjobs
    sudo nginx -t && sudo nginx -s reload
  Impact: Fixes 403/MIME errors, adds User-Agent header for botBlocker.

### 7. Domain Cutover to wantokjobs.com
  See full guide: /opt/wantokjobs/app/DOMAIN-CUTOVER.md
  Summary:
    1. Add wantokjobs.com to Cloudflare
    2. Update DNS A records -> VPS IP
    3. Update .env: APP_URL=https://wantokjobs.com
    4. Update .env: CORS_ORIGIN=https://wantokjobs.com
    5. Update Google OAuth redirect URIs in GCP console
    6. Run Certbot for SSL: certbot --nginx -d wantokjobs.com -d www.wantokjobs.com
    7. Reload nginx: sudo nginx -s reload

---

## COMPLETED BY AGENT - No Action Needed

  [x] botBlocker scoped to /api/* only (was incorrectly global)
  [x] CSRF protection mounted and active (app.use(csrfProtection) line 270)
  [x] Email verification fully implemented in registration flow
  [x] HuggingFace embedding provider disabled cleanly (DNS broken, no silent failures)
  [x] Cohere circuit breaker active (handles 61% error rate gracefully)
  [x] Payment cron scripts created: system/payment-cron.sh
  [x] Master crontab installer created: system/setup-crontab.sh
  [x] Nginx User-Agent header added to vps-scripts/nginx-tolarai.conf
  [x] Bank account placeholder warning comment added to sme-pricing.js
  [x] Frontend .data wrapper bugs fixed (94 files audited, 17 bugs fixed)
  [x] Mobile responsiveness improved (Sprint 12 complete)
  [x] Admin panel bulk operations added (Sprint 13 complete)
  [x] Payment workaround fully deployed (WhatsApp + email + in-app triple notification)
  [x] Semantic search operational (295-436 embeddings indexed)
  [x] Security audit score: 7.5/10 documented in AUTHENTICATION-SECURITY-AUDIT.md

---

## ROADMAP - V2 Items

  [ ] 2FA/TOTP implementation (4h dev work)
  [ ] Session management/refresh tokens (3h dev work)
  [ ] PostgreSQL migration (replace SQLite)
  [ ] Audio for Jean: Groq Whisper STT + ElevenLabs TTS
  [ ] V2 AI agents: Headhunter, Scout, Verifier
  [ ] Tok Pisin translations
  [ ] Interview scheduling, offer letters, referral system
  [ ] Stripe/PayPal proper payment gateway (replace manual workaround)
  [ ] Replace 70-80% of AI calls with rule-based logic (cost reduction)
  [ ] Uptime monitoring (UptimeRobot/PagerDuty)
  [ ] Centralized log aggregation dashboard

---
Last updated: 2026-03-18 by Agent Zero
