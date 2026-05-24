# WantokJobs WhatsApp Integration Documentation

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**WhatsApp Phone:** +675 8346 0582  
**Phone Number ID:** 1143359958852423  
**WABA ID:** 2015988412656246  
**API Version:** Meta Cloud API v17.0

---

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Meta Cloud API Configuration](#meta-cloud-api-configuration)
3. [Webhook Configuration](#webhook-configuration)
4. [Database Architecture](#database-architecture)
5. [Registration Flow](#registration-flow)
6. [Account Linking (OTP)](#account-linking-otp)
7. [Job Search Features](#job-search-features)
8. [Application Submission](#application-submission)
9. [CV Upload](#cv-upload)
10. [Employer Job Posting](#employer-job-posting)
11. [Message Routing](#message-routing)
12. [Context Awareness](#context-awareness)
13. [Outbound Message Queue](#outbound-message-queue)
14. [Testing Guide](#testing-guide)
15. [Troubleshooting](#troubleshooting)

---

## Integration Overview

**Purpose:** Enable Papua New Guinea users to access WantokJobs features via WhatsApp, the most popular mobile messaging platform in PNG.

**Key Features:**
- **Registration**: Complete user registration via 5-step WhatsApp flow
- **Job Search**: Natural language job search with AI assistance (Jean AI)
- **Application Submission**: Apply to jobs directly through WhatsApp
- **CV Upload**: Upload resume files via WhatsApp for profile completion
- **Account Linking**: Link existing WantokJobs account via OTP
- **Employer Features**: Job posting flow for employers (5-step process)
- **Notifications**: Job alerts, application updates, and platform notifications

**Architecture:**
- **API Provider:** Meta WhatsApp Business Cloud API
- **Webhook Endpoint:** https://wantokjobs.com/api/whatsapp/webhook
- **Message Processing:** Real-time webhook handler with background queue processor
- **Database Tables:** 13 dedicated tables for WhatsApp integration
- **AI Integration:** Jean AI for natural language understanding and responses
- **Phone Number:** +675 8346 0582 (PNG country code +675)

---

## Meta Cloud API Configuration

### API Credentials

**WhatsApp Business Account ID (WABA ID):** 2015988412656246  
**Phone Number ID:** 1143359958852423  
**Display Phone Number:** +675 8346 0582  
**API Version:** v17.0  
**API Base URL:** https://graph.facebook.com/v17.0

**Environment Variables:**
```bash
WHATSAPP_API_TOKEN=<Meta Cloud API Access Token>
WHATSAPP_VERIFY_TOKEN=<Webhook Verification Token>
WHATSAPP_BUSINESS_NUMBER=+67583460582
WHATSAPP_PHONE_NUMBER_ID=1143359958852423
```

### API Endpoints Used

**Send Message:**
```
POST https://graph.facebook.com/v17.0/1143359958852423/messages
Headers:
  Authorization: Bearer ${WHATSAPP_API_TOKEN}
  Content-Type: application/json

Body:
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "67572000000",
  "type": "text",
  "text": {
    "body": "Hello from WantokJobs!"
  }
}
```

**Send Template Message:**
```
POST https://graph.facebook.com/v17.0/1143359958852423/messages
Body:
{
  "messaging_product": "whatsapp",
  "to": "67572000000",
  "type": "template",
  "template": {
    "name": "registration_welcome",
    "language": {"code": "en"}
  }
}
```

**Media Upload:**
```
POST https://graph.facebook.com/v17.0/1143359958852423/media
Headers:
  Authorization: Bearer ${WHATSAPP_API_TOKEN}
Form-Data:
  file: <binary_file_data>
  type: document
  messaging_product: whatsapp
```

---

## Webhook Configuration

### Webhook URL

**Endpoint:** https://wantokjobs.com/api/whatsapp/webhook  
**Method:** POST (receive messages), GET (verification)  
**Verification Token:** Configured in Meta Business Manager

### Verification Handler (GET)

```javascript
// server/routes/whatsapp-webhook.js
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

### Message Handler (POST)

**Request Format (Meta Cloud API):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "2015988412656246",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+675 8346 0582",
              "phone_number_id": "1143359958852423"
            },
            "contacts": [
              {
                "profile": {"name": "John Doe"},
                "wa_id": "67572000000"
              }
            ],
            "messages": [
              {
                "from": "67572000000",
                "id": "wamid.HBgNNjc1NzIwMDAwMDAVAgARGBI4RTVDNDM5RDlBQkY2RTlCN0UA",
                "timestamp": "1716548400",
                "type": "text",
                "text": {"body": "Show me software engineer jobs"}
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Handler Implementation:**
```javascript
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Acknowledge webhook immediately (required by Meta)
    res.sendStatus(200);

    // Process message asynchronously
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const messageBody = message.text ? message.text.body : '';
      const messageType = message.type;

      // Route to appropriate handler
      await routeMessage(from, messageBody, messageType, message);
    }
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
  }
}});
```

---

## Context Awareness

Session context stored in `whatsapp_sessions.context_data` JSON field enables intelligent conversation flow and personalized responses.

**Context Usage:**
- Remember user's last job search filters (location, category, salary)
- Track last viewed job for "apply" command without job ID
- Store registration progress through 5-step flow
- Maintain employer posting draft across multiple messages
- Personalize greetings with user's name

---

## Outbound Message Queue

**Background Processor:** `server/lib/whatsapp-outbox-processor.js`
**Schedule:** Every 5 minutes via cron
**Database:** `whatsapp_outbox` table

**Queue Processing:**
```javascript
setInterval(async () => {
  const pending = db.prepare(`
    SELECT * FROM whatsapp_outbox 
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC LIMIT 10
  `).all();
  
  for (const message of pending) {
    try {
      await sendWhatsAppMessage(message.phone_number, message.message_body);
      db.prepare(`UPDATE whatsapp_outbox SET status = 'sent', sent_at = datetime('now') WHERE id = ?`).run(message.id);
    } catch (error) {
      db.prepare(`UPDATE whatsapp_outbox SET attempts = attempts + 1, error_message = ? WHERE id = ?`).run(error.message, message.id);
    }
  }
}, 5 * 60 * 1000);
```

---

## Testing Guide

### Local Testing (Development)

**Ngrok Tunnel for Webhook Testing:**
```bash
ngrok http 3001
# Copy HTTPS URL: https://abc123.ngrok.io
# Update webhook in Meta Business Manager
```

**Test Message Flow:**
1. Send WhatsApp message to +675 8346 0582
2. Check server logs: `journalctl -u wantokjobs -f`
3. Verify webhook receives POST request
4. Check database for session creation
5. Confirm response sent back via WhatsApp

### Production Testing

**Webhook Verification:**
```bash
curl https://wantokjobs.com/api/whatsapp/webhook
# Should return 403 (no verification token)

curl "https://wantokjobs.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
# Should return 12345 (challenge response)
```

**Database Queries:**
```sql
-- Check active sessions
SELECT * FROM whatsapp_sessions WHERE last_activity > datetime('now', '-1 hour');

-- Check pending outbox messages
SELECT * FROM whatsapp_outbox WHERE status = 'pending';

-- Check message history
SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 10;
```

**Log Analysis:**
```bash
# View WhatsApp webhook logs
journalctl -u wantokjobs | grep "WhatsApp webhook"

# View outbox processor logs
journalctl -u wantokjobs | grep "whatsapp-outbox"

# Check for errors
journalctl -u wantokjobs | grep -i "error" | tail -20
```

---

## Troubleshooting

### Issue: Webhook Not Receiving Messages

**Causes:**
1. Incorrect webhook URL in Meta Business Manager
2. Verification token mismatch
3. SSL certificate issues
4. Server not responding

**Solutions:**
```bash
# 1. Verify webhook URL is correct
echo "https://wantokjobs.com/api/whatsapp/webhook"

# 2. Check webhook responds
curl -I https://wantokjobs.com/api/whatsapp/webhook

# 3. Verify SSL certificate
openssl s_client -connect wantokjobs.com:443 -servername wantokjobs.com

# 4. Check service is running
systemctl status wantokjobs
```

### Issue: Messages Not Sending

**Causes:**
1. Invalid API token
2. Rate limiting by Meta
3. Invalid phone number format
4. Network connectivity issues

**Solutions:**
```bash
# 1. Test API token
curl -H "Authorization: Bearer ${WHATSAPP_API_TOKEN}" \
  https://graph.facebook.com/v17.0/1143359958852423

# 2. Check outbox for failures
sqlite3 server/data/wantokjobs.db "SELECT * FROM whatsapp_outbox WHERE status = 'failed';"

# 3. Verify phone number format (country code + number, no spaces or +)
echo "67572000000"  # Correct
echo "+675 7200 0000"  # Incorrect
```

### Issue: Session Context Lost

**Causes:**
1. Session expired (30-day TTL)
2. Database connection issues
3. Context data not being saved

**Solutions:**
```sql
-- Check session exists
SELECT * FROM whatsapp_sessions WHERE phone_number = '67572000000';

-- Verify context data
SELECT context_data FROM whatsapp_sessions WHERE phone_number = '67572000000';

-- Check last activity timestamp
SELECT last_activity FROM whatsapp_sessions WHERE phone_number = '67572000000';
```

### Issue: Duplicate Messages

**Causes:**
1. Webhook retry logic from Meta
2. Message deduplication not working
3. Outbox processor running multiple instances

**Solutions:**
```javascript
// Add message deduplication
const messageId = message.id;  // Meta's unique message ID
const existing = db.prepare('SELECT id FROM whatsapp_messages WHERE message_id = ?').get(messageId);
if (existing) {
  console.log('Duplicate message, skipping');
  return;
}
```

---

## Rate Limits

**Meta Cloud API Limits:**
- 1000 messages per second (burst)
- 100,000 messages per day (free tier)
- Quality rating affects limits

**WantokJobs Rate Limits:**
- Webhook: 1000 requests/minute
- Outbound messages: 100 messages/hour per user
- Registration: 3 attempts per hour per phone

---

## Best Practices

1. **Always acknowledge webhooks immediately** (within 20 seconds)
2. **Process messages asynchronously** to avoid webhook timeouts
3. **Store all inbound/outbound messages** for audit trail
4. **Use outbox queue** for all outbound messages (retry logic)
5. **Maintain conversation context** for intelligent responses
6. **Validate phone numbers** before sending (country code format)
7. **Monitor message delivery status** via Meta API status callbacks
8. **Implement exponential backoff** for failed message retries
9. **Test on production phone number** before scaling
10. **Monitor quality rating** in Meta Business Manager

---

## Conclusion

WantokJobs WhatsApp integration provides comprehensive mobile-first access to the platform through Meta Cloud API. The system supports user registration, job search, applications, CV upload, account linking, and employer job posting - all through conversational WhatsApp interface powered by Jean AI.

**Key Metrics:**
- 13 database tables supporting WhatsApp features
- 5-step registration flow
- Real-time webhook processing
- Background outbox queue for reliable message delivery
- Context-aware conversations
- Jean AI natural language understanding

For additional details, see:
- **JEAN_AI_GUIDE.md** - Jean AI assistant integration
- **API_DOCUMENTATION.md** - WhatsApp API endpoints
- **DATABASE_SCHEMA.md** - WhatsApp table schemas
- **DEPLOYMENT_GUIDE.md** - WhatsApp webhook configuration
