# WhatsApp Jean — Quick Start Guide 🚀

## ✅ What's Ready

All 7 WhatsApp features are built and tested:
1. Account linking (email + OTP)
2. Job search ("search jobs")
3. Job applications ("apply 1")
4. Resume upload (send PDF/DOC)
5. Application status ("my applications")
6. Job alerts ("alert me for...")
7. Help menu ("help")

## 🏃 Quick Start (3 Steps)

### Step 1: Verify Setup ✅

```bash
cd /data/.openclaw/workspace/data/wantok/app

# Check files are in place
ls -l server/routes/whatsapp-webhook.js  # 28K enhanced webhook
ls -l migrate-whatsapp.js                # Migration script
ls -l test-whatsapp-features.js          # Test suite

# Verify database migration ran
node -e "const db = require('./server/database'); const s = db.prepare('SELECT * FROM whatsapp_sessions LIMIT 1').get(); console.log('Columns:', s ? Object.keys(s) : 'Table ready');"
# Should show: otp, otp_expires, last_search_results
```

### Step 2: Configure WhatsApp Cloud API

Get credentials from Meta:
1. Go to https://business.facebook.com
2. Create WhatsApp Business Account
3. Get:
   - `WHATSAPP_API_TOKEN` (permanent token)
   - `WHATSAPP_PHONE_ID` (your WhatsApp number ID)
   - `VERIFY_TOKEN` (set to: `wantokjobs-verify`)

Add to `.env`:
```bash
WHATSAPP_VERIFY_TOKEN=wantokjobs-verify
WHATSAPP_API_TOKEN=your_token_here
WHATSAPP_PHONE_ID=your_phone_id_here
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
```

### Step 3: Configure Webhook

In WhatsApp Business dashboard:
1. **Webhook URL:** `https://yourdomain.com/api/whatsapp/webhook`
2. **Verify Token:** `wantokjobs-verify`
3. **Subscribe to:** `messages`

Test verification:
```bash
curl "https://yourdomain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wantokjobs-verify&hub.challenge=test123"
# Should return: test123
```

## 🧪 Test It

Send to your WhatsApp Business number:

```
You: help
Jean: 🤖 Jean - WantokJobs Assistant
      Here's what I can do:
      🔍 Search — "search accountant jobs in Lae"
      📝 Apply — "apply 1" (after search)
      ...

You: hi
Jean: Hi! I'm Jean from WantokJobs 🇵🇬
      Link your account by replying with your email.

You: your@email.com
Jean: I found your account! ✅
      Your verification code is: 123456
      
You: 123456
Jean: Account linked! ✅ You're now connected as [Name].

You: search IT jobs
Jean: 🔍 Top 5 jobs matching "IT":
      1️⃣ Senior Developer...
      
You: apply 1
Jean: [If no CV] Send me your resume first!
      [If have CV] Applied! ✅
```

## 📊 Monitor & Debug

Check logs:
```bash
# Application logs (if using PM2)
pm2 logs wantokjobs

# Or direct logs
tail -f /path/to/logs/app.log

# Test database operations
node test-whatsapp-features.js
```

Check sessions:
```bash
node -e "const db = require('./server/database'); const sessions = db.prepare('SELECT * FROM whatsapp_sessions ORDER BY last_message_at DESC LIMIT 5').all(); console.table(sessions);"
```

## 🐛 Troubleshooting

### "Webhook verification failed"
- Check `WHATSAPP_VERIFY_TOKEN` matches in .env and dashboard
- Ensure webhook endpoint is publicly accessible
- Try: `curl -I https://yourdomain.com/api/whatsapp/webhook`

### "No messages received"
- Check WhatsApp dashboard subscription (must subscribe to "messages")
- Verify API token is valid
- Check server logs for errors
- Test with: `curl -X POST https://yourdomain.com/api/whatsapp/webhook -d '{}'`

### "OTP not working"
- Check `otp`, `otp_expires` columns exist: `node migrate-whatsapp.js`
- OTP expires in 10 minutes
- Database time must be in UTC

### "Resume upload fails"
- Check `/data/resumes` directory exists and is writable
- Max file size: 16MB (WhatsApp limit)
- Supported: PDF, DOC, DOCX only

### "Job search returns nothing"
- Verify `jobs` table has active jobs: `SELECT COUNT(*) FROM jobs WHERE status='active'`
- Check search keywords match job titles/descriptions
- Try: "search jobs" (no keywords) to see all

## 📚 Full Documentation

- **Technical details:** `WHATSAPP_FEATURES.md`
- **Complete summary:** `/wantok/WHATSAPP_SUMMARY.md`
- **Test suite:** `test-whatsapp-features.js`
- **Migration:** `migrate-whatsapp.js`

## 🎯 What Each File Does

```
server/routes/whatsapp-webhook.js       ← Main webhook handler
  ↳ handleAccountLinking()              ← OTP flow
  ↳ handleWhatsAppCommands()            ← Job search, apply, etc.
  ↳ downloadWhatsAppMedia()             ← Resume download
  ↳ sendWhatsAppMessage()               ← Send replies

migrate-whatsapp.js                     ← Add DB columns (run once)
test-whatsapp-features.js               ← Test suite (run anytime)
```

## ✨ Feature Commands

| User Types | Jean Does |
|------------|-----------|
| `help` | Shows command menu |
| `john@example.com` | Starts account linking |
| `123456` | Validates OTP |
| `search IT jobs` | Shows top 5 IT jobs |
| `search jobs in Lae` | Jobs in Lae only |
| `painim wok` | Search jobs (Tok Pisin) |
| `apply 1` | Applies to job #1 from last search |
| `save 2` | Saves job #2 |
| `my applications` | Lists all your applications |
| `alert me for developer jobs` | Creates job alert |
| [Send PDF] | Uploads resume |

## 🚀 Ready to Go!

Everything is built and tested. Just add WhatsApp credentials and you're live!

**Questions?** Check `WHATSAPP_FEATURES.md` for detailed docs.

---
**Status:** ✅ Production-ready  
**Last updated:** Feb 18, 2026
