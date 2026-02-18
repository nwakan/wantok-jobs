# Google Gemini API Quota Fix

**Issue Date:** 2026-02-18  
**Current Status:** ❌ Quota limit 0 - API key not working  
**Current Key:** AIzaSyCsULfo0NuZ3YTLlQSMjaZW8e_uT_TG4PM

---

## Problem

The current `GOOGLE_AI_KEY` in `.env` has **quota limit 0**, preventing any API calls to Google Gemini.

**Error Symptoms:**
- AI features fail silently or return errors
- Gemini API calls throw quota exceeded errors
- Chat/AI router falls back to other providers

---

## Root Cause

**Incorrect API Key Source:**

The current key appears to be from **Google Cloud Console** (possibly a generic API key or one without Gemini API enabled).

**What's Needed:**

A key from **Google AI Studio** (aistudio.google.com) which provides:
- Free tier with generous quota
- Direct access to Gemini models
- No billing required for basic usage

---

## The Two Google AI Platforms (Explained)

### Option 1: Google AI Studio (Recommended for WantokJobs) ⭐

**URL:** https://aistudio.google.com/

**Best for:**
- Quick prototyping
- Development/testing
- Free tier usage
- Simple API access

**Free Tier Limits:**
- **Gemini 2.0 Flash:** 1,500 requests/day, 1M tokens/day
- **Gemini 1.5 Pro:** 50 requests/day, 32K tokens/minute
- No credit card required

**API Endpoint:**
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**Key Format:** Starts with `AIza...`

---

### Option 2: Google Cloud Console (For Production Scale)

**URL:** https://console.cloud.google.com/

**Best for:**
- Production applications with high volume
- Enterprise usage
- Billing/quota management
- Service accounts

**Free Tier:**
- Less generous than AI Studio
- Requires billing account (even for free tier)
- More complex setup

**API Endpoint:** Same as AI Studio

---

## Fix Steps for Nick

### Step 1: Get New API Key from AI Studio

1. **Go to Google AI Studio:**
   - Visit: https://aistudio.google.com/
   - Sign in with Google account (preferably WantokJobs/project account)

2. **Get API Key:**
   - Click **"Get API Key"** button (top right)
   - Choose **"Create API key in new project"** (or use existing project)
   - Copy the generated key (starts with `AIza...`)
   - **Save this key securely** - it won't be shown again!

3. **Key Permissions (Auto-Configured):**
   - Gemini API is automatically enabled
   - Free tier quota automatically applied
   - No additional setup needed

---

### Step 2: Update .env File

**Current (broken):**
```bash
GOOGLE_AI_KEY=AIzaSyCsULfo0NuZ3YTLlQSMjaZW8e_uT_TG4PM
```

**Replace with new key:**
```bash
GOOGLE_AI_KEY=AIza...YOUR_NEW_KEY_FROM_AI_STUDIO...
```

---

### Step 3: Restart Server

```bash
# SSH into VPS
ssh user@tolarai.com

# Navigate to app directory
cd /path/to/app

# Restart Node.js server
pm2 restart wantokjobs
# or
npm run restart
# or kill and restart process
```

---

### Step 4: Test the Fix

**Test 1: Simple API Call**

Create test file: `test-gemini.js`
```javascript
require('dotenv').config();
const https = require('https');

const key = process.env.GOOGLE_AI_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

const body = JSON.stringify({
  contents: [{ parts: [{ text: 'Say "Hello from Gemini!"' }] }]
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': body.length
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(body);
req.end();
```

Run test:
```bash
node test-gemini.js
```

**Expected Output:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "Hello from Gemini!" }]
    }
  }],
  "usageMetadata": {
    "promptTokenCount": 5,
    "candidatesTokenCount": 4,
    "totalTokenCount": 9
  }
}
```

**Test 2: Check AI Router**

```bash
# Test through the app's AI router
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test Gemini connection"}'
```

Should respond without quota errors.

---

## Understanding the Codebase Integration

### Where GOOGLE_AI_KEY is Used

**File:** `/data/.openclaw/workspace/data/wantok/app/server/lib/ai-router.js`

```javascript
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    models: {
      flash: 'gemini-2.0-flash',
      pro: 'gemini-1.5-pro',
    },
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    dailyLimit: { requests: 1500, tokens: 1000000 },
    getKey: () => process.env.GOOGLE_AI_KEY, // <-- Used here
    
    async call(prompt, opts = {}) {
      const key = this.getKey();
      if (!key) throw new Error('GOOGLE_AI_KEY not set');
      // ... makes API call to Gemini
    }
  }
}
```

### AI Router Auto-Switching

The AI router is smart - it will:
1. Try Gemini first (cheapest/fastest)
2. Track usage in `/server/data/ai-usage.json`
3. Auto-switch to backup providers if quota exceeded:
   - Kimi (NVIDIA NIM)
   - Groq (fast inference)
   - Cohere
   - OpenRouter (fallback)

**This means:** Even with broken Gemini key, AI features still work (using backups), but:
- Costs more (OpenRouter has usage fees)
- May be slower
- Higher latency

**With working Gemini key:**
- Free tier handles most traffic
- Fast responses
- No costs

---

## Quota Monitoring

### Check Current Usage

AI usage is tracked in: `/server/data/ai-usage.json`

```json
{
  "date": "2026-02-18",
  "providers": {
    "gemini": {
      "requests": 234,
      "tokens": 45678,
      "errors": 0,
      "lastUsed": "2026-02-18T10:30:00Z"
    }
  }
}
```

### Google AI Studio Dashboard

Monitor quota in real-time:
1. Go to: https://aistudio.google.com/
2. Click on your API key
3. View usage statistics

**Warning Thresholds:**
- >1200 requests/day - approaching limit
- >800K tokens/day - approaching limit

---

## Production Considerations

### When to Upgrade to Google Cloud

Consider moving from AI Studio to Google Cloud Console if:

1. **High Volume:**
   - >1500 requests/day consistently
   - Need higher rate limits

2. **Enterprise Requirements:**
   - Need SLA guarantees
   - Require dedicated quota
   - Need service accounts
   - Want detailed billing/analytics

3. **Advanced Features:**
   - Need Vertex AI features
   - Want to fine-tune models
   - Require model deployment control

### Migration Path (AI Studio → Cloud Console)

1. Create Google Cloud project
2. Enable "Generative Language API" (Gemini)
3. Create API key or service account
4. Enable billing (required even for free tier)
5. Update GOOGLE_AI_KEY in .env
6. Same API endpoints - no code changes needed

---

## Troubleshooting

### Error: "API key not valid"

**Cause:** Key not from AI Studio or doesn't have Gemini API enabled

**Fix:**
1. Verify key is from https://aistudio.google.com/
2. Check key is copied completely (no spaces/newlines)
3. Generate new key if needed

---

### Error: "Quota exceeded"

**Cause:** Hit daily limit (1500 requests or 1M tokens)

**Fix:**
1. Check usage in ai-usage.json
2. Wait for daily reset (midnight UTC)
3. Or upgrade to Google Cloud for higher limits

---

### Error: "Model not found"

**Cause:** Model name typo or model not available

**Fix:**
1. Verify model names in ai-router.js:
   - `gemini-2.0-flash` (fast, default)
   - `gemini-1.5-pro` (smarter, slower)
2. Check https://aistudio.google.com/models for available models

---

### Error: "Network timeout"

**Cause:** Slow API response or network issue

**Fix:**
1. Check internet connectivity
2. Increase timeout in ai-router.js
3. Try different region/endpoint

---

## Security Best Practices

### Protect Your API Key

- ✅ **Do:** Store in .env file (already correct)
- ✅ **Do:** Add .env to .gitignore (already done)
- ✅ **Do:** Use environment variables in production
- ❌ **Don't:** Commit key to Git
- ❌ **Don't:** Expose key in client-side code
- ❌ **Don't:** Share key in public channels

### Key Rotation

Rotate API keys periodically:
1. Generate new key in AI Studio
2. Update .env with new key
3. Restart server
4. Delete old key in AI Studio (after verifying new one works)

---

## Alternative: Service Account (Advanced)

For production, consider using a service account instead of API key:

**Benefits:**
- More secure (no static key in .env)
- Better audit trails
- Automated key rotation

**Setup:**
1. Create service account in Google Cloud
2. Grant "Generative Language API User" role
3. Download JSON key file
4. Update code to use service account credentials

**Code Changes:**
```javascript
const { GoogleAuth } = require('google-auth-library');
const auth = new GoogleAuth({
  keyFilename: '/path/to/service-account-key.json',
  scopes: ['https://www.googleapis.com/auth/generative-language']
});
// Use auth to get tokens for API calls
```

---

## Summary

**Action Required:** Generate new API key from Google AI Studio

**Steps:**
1. ✅ Visit https://aistudio.google.com/
2. ✅ Click "Get API Key" → Create new
3. ✅ Copy key to .env file
4. ✅ Restart server
5. ✅ Test with `node test-gemini.js`

**Timeline:** 5-10 minutes

**Cost:** $0 (Free tier covers WantokJobs usage)

**Impact:** Unlocks free AI features, reduces costs on paid providers

---

## Resources

- **Google AI Studio:** https://aistudio.google.com/
- **Gemini API Docs:** https://ai.google.dev/docs
- **Pricing:** https://ai.google.dev/pricing
- **Quota Limits:** https://ai.google.dev/docs/quota
- **Support:** https://support.google.com/ai-studio

---

## Questions?

If you encounter issues during setup:
1. Check Google AI Studio status page
2. Verify API key format (starts with AIza...)
3. Test with curl before integrating
4. Check server logs for specific error messages
5. Review ai-router.js error tracking

**The fix is straightforward - just get the right key from the right place!** 🚀
