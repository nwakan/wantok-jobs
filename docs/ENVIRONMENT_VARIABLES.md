# WantokJobs Environment Variables Reference

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**Purpose:** Complete reference for all environment variables required to run WantokJobs platform

---

## Table of Contents

1. [Overview](#overview)
2. [Server Configuration](#server-configuration)
3. [Database Configuration](#database-configuration)
4. [Email Service (Brevo)](#email-service-brevo)
5. [AI Services](#ai-services)
6. [WhatsApp Integration (Meta Cloud API)](#whatsapp-integration-meta-cloud-api)
7. [OAuth Authentication](#oauth-authentication)
8. [Cloudflare Configuration](#cloudflare-configuration)
9. [Production URLs](#production-urls)
10. [Optional Variables](#optional-variables)
11. [Environment File Template](#environment-file-template)

---

## Overview

**Environment File Location:** `/opt/wantokjobs/app/.env` (production) or project root (development)

**File Permissions:** `chmod 600 .env` (owner read/write only)

**Security:** Never commit `.env` file to Git. Use `.env.example` as template.

**Total Variables:** 20+ required variables across 9 categories

---

## Server Configuration

### PORT
**Description:** HTTP server port for Express application  
**Required:** Yes  
**Type:** Integer  
**Default:** 3001  
**Example:** `PORT=3001`

**Usage:**
- Local development: Port 3001 (avoid conflict with React dev server on 5173)
- Production: Port 3001 (Nginx reverse proxy from 443 → 3001)

**Notes:**
- Nginx listens on port 80/443 (public internet)
- Express listens on port 3001 (localhost only)
- Firewall blocks external access to port 3001

---

### NODE_ENV
**Description:** Runtime environment mode  
**Required:** Yes  
**Type:** String (enum)  
**Options:** `development`, `production`, `test`  
**Example:** `NODE_ENV=production`

**Behavior Changes:**
- **Production Mode:**
  - Detailed error messages disabled (security)
  - React optimizations enabled
  - Source maps disabled
  - Caching headers enabled
  - Console logging minimized

- **Development Mode:**
  - Verbose error messages
  - Hot module replacement
  - Source maps enabled
  - CORS relaxed
  - Console debugging enabled

**Notes:**
- Always set to `production` on VPS
- Never use `development` in production (security risk)

---

### SESSION_SECRET
**Description:** Secret key for Express session encryption  
**Required:** Yes  
**Type:** String (hex)  
**Length:** 64 characters (32 bytes)  
**Example:** `SESSION_SECRET=a1b2c3d4e5f6...` (64 hex chars)

**Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security:**
- **CRITICAL:** Use unique value per environment
- **NEVER** reuse between development/production
- **NEVER** share publicly or commit to Git
- Rotate regularly (every 90 days recommended)

**Impact:**
- User sessions encrypted with this key
- Compromised secret = all sessions vulnerable
- Changing secret logs out all users

---

## Database Configuration

### DATABASE_PATH
**Description:** Path to SQLite database file  
**Required:** Yes  
**Type:** String (file path)  
**Example:** `DATABASE_PATH=./server/data/wantokjobs.db`

**Paths:**
- **Production:** `./server/data/wantokjobs.db` (relative to `/opt/wantokjobs/app`)
- **Development:** `./server/data/wantokjobs.db` (relative to project root)

**File Permissions:**
```bash
chmod 644 server/data/wantokjobs.db  # Read/write owner, read group/others
chown wantokjobs:wantokjobs server/data/wantokjobs.db
```

**Backup Strategy:**
```bash
# Daily backup cron at 2 AM
cp server/data/wantokjobs.db backups/wantokjobs-$(date +%Y%m%d).db
```

**Notes:**
- SQLite is file-based (no server required)
- Database size: ~93MB (33,481 users, 1,335 jobs)
- No additional DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD needed

---

## Email Service (Brevo)

### BREVO_API_KEY
**Description:** Brevo (formerly Sendinblue) transactional email API key  
**Required:** Yes  
**Type:** String (API key)  
**Example:** `BREVO_API_KEY=xkeysib-a1b2c3d4...` (starts with `xkeysib-`)

**Where to Obtain:**
1. Log in to Brevo account: https://app.brevo.com
2. Navigate to: Settings → API Keys
3. Create new API key or copy existing key
4. Name: "WantokJobs Production" (for tracking)

**API Details:**
- **Endpoint:** https://api.brevo.com/v3/smtp/email
- **Rate Limits:** 300 emails/day (free tier), 40,000/month (paid)
- **Cost:** Free tier available, paid plans from $25/month

**Features Used:**
- Transactional emails (job alerts, application confirmations)
- Email templates (26 templates)
- Contact list management
- SMTP relay for system emails

**Email Types Sent:**
- Job alerts (daily digest)
- Application received notifications
- Account verification emails
- Password reset emails
- Employer digest (weekly summary)

**Notes:**
- Brevo replaced AWS SES for cost efficiency
- Templates managed in Brevo dashboard
- Delivery rate: 98.5% (May 2026)

---

## AI Services

### GROQ_API_KEY
**Description:** Groq API key for Jean AI assistant (backup LLM) and Whisper transcription  
**Required:** Yes (for Jean AI features)  
**Type:** String (API key)  
**Example:** `GROQ_API_KEY=gsk_a1b2c3d4...` (starts with `gsk_`)

**Where to Obtain:**
1. Sign up at: https://console.groq.com
2. Navigate to: API Keys
3. Create new key: "WantokJobs Production"
4. Copy key (shown once only)

**Models Used:**
- **LLM:** `llama3-70b-8192` (backup when Anthropic unavailable)
- **Voice:** `whisper-large-v3` (WhatsApp voice message transcription)

**Pricing:**
- **LLM:** $0.59 per 1M input tokens, $0.79 per 1M output tokens
- **Whisper:** $0.111 per hour of audio
- **Free Tier:** 14,400 requests/day, 30 requests/minute

**Usage Stats (May 12, 2026):**
- Total requests: 453 (441 web chat, 12 WhatsApp)
- Tokens consumed: ~314,835 in 7 days
- Cost: ~$0.20 (Groq backup, primary uses Anthropic)

**Notes:**
- Groq used as backup when Anthropic Claude unavailable
- Fast inference speed: 500+ tokens/second
- Lower cost but lower quality vs Claude

---

### ANTHROPIC_API_KEY
**Description:** Anthropic API key for Claude Sonnet 4 (primary Jean AI LLM)  
**Required:** Yes (for Jean AI features)  
**Type:** String (API key)  
**Example:** `ANTHROPIC_API_KEY=sk-ant-api03-a1b2c3d4...` (starts with `sk-ant-api03-`)

**Where to Obtain:**
1. Sign up at: https://console.anthropic.com
2. Navigate to: API Keys
3. Create new key: "WantokJobs Production"
4. Add payment method (required)
5. Copy key (shown once only)

**Model Used:**
- **Claude Sonnet 4:** `claude-sonnet-4-20250514`
- Context window: 200,000 tokens
- Output limit: 8,192 tokens
- Streaming: Server-sent events (SSE)

**Pricing:**
- **Input:** ~$3.00 per 1M tokens
- **Output:** ~$15.00 per 1M tokens
- **No free tier** (pay-as-you-go)

**Usage Stats (May 12, 2026):**
- Total messages: 453 (441 web chat, 12 WhatsApp)
- Tokens consumed: ~314,835 in 7 days
- Cost: ~$1.90 weekly (~$7.60/month projected)

**Features:**
- Natural language job search
- CV parsing and optimization
- Intelligent job matching (scoring algorithm)
- PNG cultural awareness (Tok Pisin phrases)
- Multi-channel support (web chat + WhatsApp)

**Notes:**
- Primary LLM (Groq is backup)
- Best quality for PNG context understanding
- Cost-effective for current usage (~$8/month)

---

## WhatsApp Integration (Meta Cloud API)

### WHATSAPP_API_TOKEN
**Description:** Meta WhatsApp Business Cloud API access token  
**Required:** Yes (for WhatsApp features)  
**Type:** String (bearer token)  
**Example:** `WHATSAPP_API_TOKEN=EAAa1b2c3d4...` (long token starting with `EAA`)

**Where to Obtain:**
1. Log in to Meta Business Manager: https://business.facebook.com
2. Navigate to: WhatsApp Business Account
3. Select: API Setup
4. Generate new permanent token (System User token)
5. Copy token (shown once only)

**Token Types:**
- **Temporary Token:** 24-hour expiry (testing only)
- **Permanent Token:** Never expires (production use)

**Permissions Required:**
- `whatsapp_business_management`
- `whatsapp_business_messaging`

**API Version:** v17.0  
**Endpoint:** `https://graph.facebook.com/v17.0/1143359958852423/messages`

**Notes:**
- Token is sensitive (treat like password)
- Rotate every 90 days for security
- Monitor usage in Meta Business Manager

---

### WHATSAPP_VERIFY_TOKEN
**Description:** Custom verification token for webhook security  
**Required:** Yes (for WhatsApp webhook)  
**Type:** String (any secure random string)  
**Example:** `WHATSAPP_VERIFY_TOKEN=my_secure_verification_token_12345`

**Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Setup Process:**
1. Generate random token locally
2. Add to `.env` file: `WHATSAPP_VERIFY_TOKEN=<your_token>`
3. Deploy application
4. Configure webhook in Meta Business Manager:
   - Callback URL: `https://wantokjobs.com/api/whatsapp/webhook`
   - Verify Token: `<your_token>` (must match `.env`)

**Security:**
- Meta uses this token to verify webhook requests are legitimate
- Prevents unauthorized parties from sending fake webhook events
- Must match exactly between `.env` and Meta dashboard

**Notes:**
- Simple string (no special format required)
- Only used during initial webhook verification (GET request)
- Not sent with actual message webhooks (POST requests)

---

### WHATSAPP_BUSINESS_NUMBER
**Description:** WhatsApp Business phone number (international format)  
**Required:** Yes (for WhatsApp features)  
**Type:** String (phone number)  
**Example:** `WHATSAPP_BUSINESS_NUMBER=+675 8346 0582`

**Current Number:** +675 8346 0582 (PNG country code +675)

**Format:**
- Include country code with `+` prefix
- Spaces optional for readability
- Example: `+675 8346 0582` or `+67583460582`

**Usage:**
- Displayed in contact pages
- Used for user-facing WhatsApp links
- Referenced in Jean AI responses

**Notes:**
- Must match number registered in Meta Business Manager
- Used in wa.me links: `https://wa.me/67583460582`

---

### WHATSAPP_PHONE_NUMBER_ID
**Description:** Meta WhatsApp Business Account Phone Number ID  
**Required:** Yes (for WhatsApp API calls)  
**Type:** String (numeric ID)  
**Example:** `WHATSAPP_PHONE_NUMBER_ID=1143359958852423`

**Current ID:** 1143359958852423

**Where to Find:**
1. Log in to Meta Business Manager
2. Navigate to: WhatsApp → API Setup
3. Copy "Phone Number ID" (15-digit number)

**Usage:**
- Used in all WhatsApp API requests
- Endpoint pattern: `https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages`
- Endpoint pattern: `https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages`

**Notes:**
- Different from WABA ID (business account ID)
- Specific to individual phone number
- Required for sending messages via API

---

## OAuth Authentication

### GOOGLE_CLIENT_ID
**Description:** Google OAuth 2.0 client ID for Google One Tap authentication  
**Required:** Yes (for Google login)  
**Type:** String (client ID)  
**Example:** `GOOGLE_CLIENT_ID=123456789012-abc123def456.apps.googleusercontent.com`

**Where to Obtain:**
1. Visit Google Cloud Console: https://console.cloud.google.com
2. Create project: "WantokJobs Production"
3. Enable Google+ API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://wantokjobs.com/auth/google/callback`
6. Copy Client ID

**Features:**
- Google One Tap sign-in
- Account linking
- Profile data import (name, email, photo)

---

### GOOGLE_CLIENT_SECRET
**Description:** Google OAuth 2.0 client secret  
**Required:** Yes (for Google login)  
**Type:** String (secret)  
**Example:** `GOOGLE_CLIENT_SECRET=GOCSPX-a1b2c3d4e5f6...`

**Security:**
- Treat like password
- Never expose in frontend code
- Rotate if compromised

---

### LINKEDIN_CLIENT_ID
**Description:** LinkedIn OAuth 2.0 client ID for LinkedIn authentication  
**Required:** Yes (for LinkedIn login)  
**Type:** String (client ID)  
**Example:** `LINKEDIN_CLIENT_ID=86a1b2c3d4e5f6`

**Where to Obtain:**
1. Visit LinkedIn Developers: https://www.linkedin.com/developers
2. Create app: "WantokJobs"
3. Request OAuth 2.0 scopes: `r_liteprofile`, `r_emailaddress`
4. Add redirect URL: `https://wantokjobs.com/auth/linkedin/callback`
5. Copy Client ID from App Settings

**Features:**
- LinkedIn profile import
- Professional network integration
- Job posting to LinkedIn (future)

---

### LINKEDIN_CLIENT_SECRET
**Description:** LinkedIn OAuth 2.0 client secret  
**Required:** Yes (for LinkedIn login)  
**Type:** String (secret)  
**Example:** `LINKEDIN_CLIENT_SECRET=a1b2c3d4e5f6...`

**Security:**
- Never commit to Git
- Rotate regularly
- Store securely

---

## Cloudflare Configuration

### CLOUDFLARE_API_TOKEN
**Description:** Cloudflare API token for zone management  
**Required:** Yes (for CDN cache purging)  
**Type:** String (API token)  
**Example:** `CLOUDFLARE_API_TOKEN=a1b2c3d4e5f6...`

**Where to Obtain:**
1. Log in to Cloudflare: https://dash.cloudflare.com
2. Navigate to: My Profile → API Tokens
3. Create token with permissions:
   - Zone.Cache Purge (for cache clearing)
   - Zone.Zone Settings (for configuration)
4. Scope to specific zone: wantokjobs.com
5. Copy token (shown once)

**Usage:**
- Automated cache purging after deployments
- DNS record management (if needed)
- SSL/TLS configuration updates

---

### CLOUDFLARE_EMAIL
**Description:** Cloudflare account email  
**Required:** Yes (for Global API Key authentication)  
**Type:** String (email)  
**Example:** `CLOUDFLARE_EMAIL=admin@wantokjobs.com`

**Usage:**
- Alternative authentication method with Global API Key
- Account identification

---

### CLOUDFLARE_GLOBAL_KEY
**Description:** Cloudflare Global API Key (full account access)  
**Required:** Optional (use API Token instead)  
**Type:** String (API key)  
**Example:** `CLOUDFLARE_GLOBAL_KEY=a1b2c3d4e5f6...`

**Security Warning:**
- Global Key has FULL account access
- Use scoped API Token instead (CLOUDFLARE_API_TOKEN)
- Only use if specific features require it

**Where to Find:**
1. Cloudflare Dashboard → My Profile → API Tokens
2. View Global API Key
3. Enter password to reveal

---

### CLOUDFLARE_WANTOKJOBS_ZONE
**Description:** Cloudflare Zone ID for wantokjobs.com domain  
**Required:** Yes (for cache purging)  
**Type:** String (zone ID)  
**Example:** `CLOUDFLARE_WANTOKJOBS_ZONE=a1b2c3d4e5f6...`

**Where to Find:**
1. Cloudflare Dashboard → Select wantokjobs.com domain
2. Scroll to "API" section on Overview page
3. Copy Zone ID (32-character hex string)

**Usage:**
- Identify specific domain for API operations
- Cache purging requests
- DNS management

---

### CLOUDFLARE_TOLARAI_ZONE
**Description:** Cloudflare Zone ID for tolarai.com domain (if applicable)  
**Required:** No (only if managing multiple domains)  
**Type:** String (zone ID)  
**Example:** `CLOUDFLARE_TOLARAI_ZONE=b2c3d4e5f6a7...`

**Usage:**
- Multi-domain management
- Separate zone for related services

---

## Production URLs

### FRONTEND_URL
**Description:** Public-facing frontend URL  
**Required:** Yes  
**Type:** String (URL)  
**Example:** `FRONTEND_URL=https://wantokjobs.com`

**Usage:**
- OAuth redirect URIs
- Email links (job alerts, password reset)
- CORS origin whitelisting
- Canonical URLs for SEO

**Notes:**
- Must match actual domain
- Include protocol (https://)
- No trailing slash

---

### BACKEND_URL
**Description:** Backend API URL  
**Required:** Yes  
**Type:** String (URL)  
**Example:** `BACKEND_URL=https://wantokjobs.com`

**Usage:**
- API endpoint references
- Webhook callbacks
- Internal service communication

**Notes:**
- Same as FRONTEND_URL in single-server setup
- Different if backend on separate domain/subdomain

---

## Optional Variables

### DEBUG
**Description:** Enable debug logging  
**Required:** No  
**Type:** Boolean (true/false)  
**Default:** false  
**Example:** `DEBUG=false`

**Usage:**
- Development debugging
- Troubleshooting production issues
- Never leave enabled long-term in production

---

### LOG_LEVEL
**Description:** Logging verbosity level  
**Required:** No  
**Type:** String (enum)  
**Options:** `error`, `warn`, `info`, `debug`  
**Default:** `info`  
**Example:** `LOG_LEVEL=info`

---

## Environment File Template

**File:** `.env.example`

```bash
# ============================================
# WANTOKJOBS ENVIRONMENT VARIABLES
# ============================================
# Copy this file to .env and fill in values
# Never commit .env to Git

# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=3001
NODE_ENV=production
SESSION_SECRET=<generate-with-crypto.randomBytes(32).toString('hex')>

# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_PATH=./server/data/wantokjobs.db

# ============================================
# EMAIL SERVICE (BREVO)
# ============================================
BREVO_API_KEY=<brevo-api-key-from-app.brevo.com>

# ============================================
# AI SERVICES
# ============================================
GROQ_API_KEY=<groq-api-key-from-console.groq.com>
ANTHROPIC_API_KEY=<anthropic-api-key-from-console.anthropic.com>

# ============================================
# WHATSAPP INTEGRATION (META CLOUD API)
# ============================================
WHATSAPP_API_TOKEN=<meta-cloud-api-access-token>
WHATSAPP_VERIFY_TOKEN=<custom-webhook-verification-token>
WHATSAPP_BUSINESS_NUMBER=+675 8346 0582
WHATSAPP_PHONE_NUMBER_ID=1143359958852423

# ============================================
# OAUTH AUTHENTICATION
# ============================================
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
LINKEDIN_CLIENT_ID=<linkedin-oauth-client-id>
LINKEDIN_CLIENT_SECRET=<linkedin-oauth-client-secret>

# ============================================
# CLOUDFLARE CONFIGURATION
# ============================================
CLOUDFLARE_API_TOKEN=<cloudflare-api-token>
CLOUDFLARE_EMAIL=<cloudflare-account-email>
CLOUDFLARE_GLOBAL_KEY=<cloudflare-global-api-key-optional>
CLOUDFLARE_WANTOKJOBS_ZONE=<wantokjobs.com-zone-id>
CLOUDFLARE_TOLARAI_ZONE=<tolarai.com-zone-id-optional>

# ============================================
# PRODUCTION URLS
# ============================================
FRONTEND_URL=https://wantokjobs.com
BACKEND_URL=https://wantokjobs.com

# ============================================
# OPTIONAL CONFIGURATION
# ============================================
DEBUG=false
LOG_LEVEL=info
```

---

## Security Best Practices

1. **File Permissions:** `chmod 600 .env` (owner read/write only)
2. **Git Ignore:** Add `.env` to `.gitignore` (never commit secrets)
3. **Secret Rotation:** Rotate API keys every 90 days
4. **Principle of Least Privilege:** Use scoped tokens (API Token > Global Key)
5. **Environment Separation:** Different secrets for dev/staging/production
6. **Backup:** Store encrypted backup of production `.env` in secure vault
7. **Access Control:** Limit VPS SSH access to authorized personnel only
8. **Audit Logs:** Monitor API key usage in provider dashboards
9. **Secrets Management:** Consider using tools like HashiCorp Vault for enterprise
10. **Documentation:** Keep this reference updated when adding new variables

---

## Troubleshooting

### Issue: "Cannot find module" errors
**Cause:** Missing environment variables
**Solution:** Verify all required variables are set in `.env`

### Issue: OAuth login fails
**Cause:** Incorrect redirect URIs or client IDs
**Solution:** Verify OAuth credentials match provider dashboard settings

### Issue: WhatsApp webhook not receiving messages
**Cause:** Verification token mismatch
**Solution:** Ensure WHATSAPP_VERIFY_TOKEN matches Meta Business Manager config

### Issue: Email sending fails
**Cause:** Invalid Brevo API key
**Solution:** Test key with: `curl -H "api-key: ${BREVO_API_KEY}" https://api.brevo.com/v3/account`

### Issue: Jean AI not responding
**Cause:** Missing AI API keys
**Solution:** Verify ANTHROPIC_API_KEY and GROQ_API_KEY are valid

---

## Conclusion

This environment variables reference documents all 20+ required configuration values for WantokJobs platform. Each variable includes detailed descriptions, examples, security considerations, and troubleshooting guidance. Always maintain `.env` file security and rotate secrets regularly.

For additional details, see:
- **DEPLOYMENT_GUIDE.md** - Environment setup procedures
- **ARCHITECTURE.md** - System architecture overview
- **WHATSAPP_INTEGRATION.md** - WhatsApp configuration details
- **README.md** - Quick start guide
