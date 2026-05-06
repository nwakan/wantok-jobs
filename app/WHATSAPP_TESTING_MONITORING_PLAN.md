# 🧪 WHATSAPP INTEGRATION - TESTING & MONITORING PLAN

**Created**: 2026-04-14 08:05 UTC  
**Purpose**: Comprehensive testing and monitoring plan for post-Gap #2 verification  
**Status**: Ready to execute once 'messages' subscription enabled  
**Prerequisites**: ✅ Gap #1 Complete, ⏸️ Gap #2 Pending

---

## 🎯 TESTING PHASES

### Phase 1: Quick Smoke Test (30 seconds)
**Execute immediately after enabling messages subscription**

#### Step 1: Database Pre-Check
```bash
ssh -i /path/to/deploy_key -p 2222 root@76.13.190.157 << 'EOF'
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db << 'SQL'
SELECT 
  'WhatsApp Sessions' as metric,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM jean_sessions 
WHERE platform = 'whatsapp'
UNION ALL
SELECT 
  'WhatsApp Messages' as metric,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM whatsapp_messages;
SQL
EOF
```

**Expected Output (Before Gap #2)**:
```
WhatsApp Sessions | 0 | NULL
WhatsApp Messages | 0 | NULL
```

**Expected Output (After Gap #2)**:
```
WhatsApp Sessions | 1+ | 2026-04-14 08:XX:XX
WhatsApp Messages | 2+ | 2026-04-14 08:XX:XX
```

---

#### Step 2: Send Test Message
**Use your phone to send WhatsApp message to: +67583460582**

**Test Message 1** (Simple greeting):
```
Hi WantokJobs
```

**Expected Response** (5-10 seconds):
```
Hi! 👋 I'm Jean, WantokJobs AI assistant.

I can help you with:
- 🔍 Job search and matching
- 📝 Application assistance
- 💼 Career guidance
- ℹ️ Platform information

What can I help you with today?
```

**If no response within 30 seconds**: Proceed to Phase 2 (Diagnostic Testing)

---

#### Step 3: Database Post-Check
```bash
ssh -i /path/to/deploy_key -p 2222 root@76.13.190.157 << 'EOF'
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db << 'SQL'
-- Check latest WhatsApp session
SELECT 
  'Latest Session' as type,
  id,
  session_token,
  platform,
  created_at,
  updated_at
FROM jean_sessions 
WHERE platform = 'whatsapp'
ORDER BY created_at DESC 
LIMIT 1;

-- Check latest WhatsApp messages
SELECT 
  'Latest Messages' as type,
  id,
  role,
  SUBSTR(content, 1, 50) as content_preview,
  created_at
FROM jean_messages 
WHERE session_id IN (
  SELECT id FROM jean_sessions WHERE platform = 'whatsapp'
)
ORDER BY created_at DESC 
LIMIT 5;
SQL
EOF
```

**Expected Output**:
- Latest Session: 1 row with today's timestamp
- Latest Messages: 2+ rows (user message + AI response)

**PASS Criteria**: Database shows new session and messages with today's timestamps  
**FAIL Criteria**: Database still shows 0 sessions/messages → Proceed to Phase 2

---

### Phase 2: Diagnostic Testing (5 minutes)
**Execute if Quick Smoke Test fails**

#### Test 2.1: Webhook Endpoint Verification
```bash
curl -v "https://wantokjobs.com/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=Wz1QYI31p8ZiLsEPnnZqXVLdb5o9"
```

**Expected**: HTTP 200, returns `test123`  
**If Failed**: Webhook verification broken (should not happen after Gap #1 completion)

---

#### Test 2.2: Service Status Check
```bash
ssh -i /path/to/deploy_key -p 2222 root@76.13.190.157 << 'EOF'
systemctl status wantokjobs.service --no-pager -l
EOF
```

**Expected**: `Active: active (running)`  
**If Failed**: Restart service: `systemctl restart wantokjobs.service`

---

#### Test 2.3: Recent Logs Analysis
```bash
ssh -i /path/to/deploy_key -p 2222 root@76.13.190.157 << 'EOF'
journalctl -u wantokjobs -n 100 --no-pager | grep -i whatsapp
EOF
```

**Look for**:
- ✅ `[WhatsApp] Incoming message from +675...`
- ✅ `[Jean AI] Processing message for session ...`
- ✅ `[WhatsApp] Sending response to +675...`
- ❌ `[WhatsApp] Error:` (investigate error message)
- ❌ `[WhatsApp] Webhook verification failed` (should not happen)

---

#### Test 2.4: Configuration Verification
```bash
ssh -i /path/to/deploy_key -p 2222 root@76.13.190.157 << 'EOF'
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db << 'SQL'
SELECT 
  key,
  CASE 
    WHEN key IN ('api_token', 'webhook_verify_token') THEN SUBSTR(value, 1, 20) || '...' 
    ELSE value 
  END as value
FROM whatsapp_config 
WHERE key IN (
  'enabled',
  'phone_number_id',
  'api_token',
  'webhook_verify_token',
  'provider'
)
ORDER BY key;
SQL
EOF
```

**Expected Configuration**:
```
api_token | EAARpXcxWfI4...
enabled | 1
phone_number_id | 1143359958852423
provider | 360dialog
webhook_verify_token | Wz1QYI31p8ZiLsEP...
```

**CRITICAL**: If `phone_number_id` is empty, Gap #1 was not properly deployed

---

#### Test 2.5: Meta Developer Console Verification
**Manual Check** (requires user login):

1. Go to https://developers.facebook.com/apps
2. Select WhatsApp app
3. Navigate to WhatsApp → Configuration → Webhook
4. Verify **Webhook fields** section shows:
   - ✅ **messages** - Active/Enabled (green checkmark)
   - ✅ **message_status** - Active/Enabled (if enabled)

**If 'messages' subscription NOT showing as active**:
- Messages subscription was not properly enabled (Gap #2 not complete)
- Repeat Gap #2 instructions from WHATSAPP_GAP2_VISUAL_GUIDE.md

---

### Phase 3: Integration Testing (10 minutes)
**Execute after Quick Smoke Test passes**

#### Test 3.1: Multi-Turn Conversation
**Send these messages in sequence**:

**Message 1**:
```
I'm looking for software engineering jobs in Port Moresby
```

**Expected Response**:
```
I can help you find software engineering jobs in Port Moresby! 🔍

[Job listings or search guidance]

Would you like me to:
1. Show you current openings
2. Help you set up job alerts
3. Assist with your application
```

**Message 2** (Follow-up):
```
Show me current openings
```

**Expected Response**:
```
Here are the latest software engineering jobs in Port Moresby:

[Job listings with titles, companies, salaries]

Would you like more details about any of these?
```

**PASS Criteria**: Jean AI maintains conversation context across messages  
**FAIL Criteria**: Each response treats message as new conversation

---

#### Test 3.2: Intent Classification
**Test different intents**:

**Job Search Intent**:
```
Find me teaching jobs
```

**Application Intent**:
```
How do I apply for jobs?
```

**Account Linking Intent**:
```
Link my account
```

**General Question Intent**:
```
What is WantokJobs?
```

**Expected**: Each intent receives appropriate response (not generic fallback)

---

#### Test 3.3: Employer-Specific Features
**If you have employer account linked**:

**Message**:
```
Show me my job postings
```

**Expected Response**:
```
📊 Your Active Job Postings:

[List of employer's jobs with stats]

Would you like to:
1. Post a new job
2. Edit existing job
3. View applicants
```

---

#### Test 3.4: Error Handling
**Test graceful degradation**:

**Invalid Request**:
```
asdfasdfasdf
```

**Expected Response** (Not error message):
```
I'm not sure I understand. Could you rephrase that?

I can help you with:
- Job search
- Applications
- Account management
- Platform information
```

---

### Phase 4: Performance Testing (5 minutes)

#### Test 4.1: Response Time Measurement
**Send message and time the response**:

```bash
# Record start time
START_TIME=$(date +%s.%N)

# Send WhatsApp message: "What is WantokJobs?"
# (Use your phone)

# Record end time when response received
END_TIME=$(date +%s.%N)

# Calculate response time
echo "Response time: $(echo "$END_TIME - $START_TIME" | bc) seconds"
```

**Acceptable Response Times**:
- **Excellent**: < 3 seconds
- **Good**: 3-5 seconds
- **Acceptable**: 5-10 seconds
- **Poor**: > 10 seconds (investigate AI API latency)

---

#### Test 4.2: Concurrent Users Simulation
**Send messages from 2-3 different phones simultaneously**:

**Phone 1**: "Find me IT jobs"
**Phone 2**: "What is WantokJobs?"
**Phone 3**: "Link my account"

**Expected**: All receive responses within 10 seconds

**Database Check** (verify separate sessions):
```bash
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db << 'SQL'
SELECT 
  COUNT(DISTINCT session_token) as unique_sessions,
  COUNT(*) as total_messages,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM jean_sessions js
JOIN jean_messages jm ON js.id = jm.session_id
WHERE platform = 'whatsapp'
  AND created_at > datetime('now', '-5 minutes');
SQL
```

**Expected**: `unique_sessions = 3` (separate sessions for each phone number)

---

#### Test 4.3: Message Queue Processing
**Check whatsapp_outbox table**:

```bash
sqlite3 /opt/wantokjobs/app/server/data/wantokjobs.db << 'SQL'
SELECT 
  status,
  COUNT(*) as count,
  AVG(CAST(
    (julianday(sent_at) - julianday(created_at)) * 86400 AS REAL
  )) as avg_processing_time_seconds
FROM whatsapp_outbox
WHERE created_at > datetime('now', '-1 hour')
GROUP BY status;
SQL
```

**