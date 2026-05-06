# WhatsApp Onboarding, Login & Authenticated Actions - Gap Analysis

**Date**: 2026-05-06 12:20 UTC  
**Purpose**: Comprehensive audit of WhatsApp user flows and authenticated action capabilities  
**Status**: 🟡 PARTIAL IMPLEMENTATION - Gaps Identified

---

## Executive Summary

### Current Implementation Status

| Feature Category | Status | Completion |
|------------------|--------|------------|
| **New User Registration** | ✅ IMPLEMENTED | 100% (awaiting migration) |
| **Existing User Login/Linking** | ✅ IMPLEMENTED | 100% (functional) |
| **Authenticated Actions** | ❌ NOT IMPLEMENTED | 0% |
| **Non-Registered User Flow** | 🟡 PARTIAL | 40% |

### Critical Findings

1. ✅ **Registration Flow**: Full conversational registration implemented (commit e26724a, 2026-05-06 02:12 UTC)
   - 4-step flow: name → email → role → password
   - Auto-creates user account and links WhatsApp
   - Migration 054 adds database columns (NOT YET RUN)

2. ✅ **Login/Linking Flow**: OTP-based account linking already operational
   - User sends email → receives 6-digit OTP → enters code → account linked
   - Updates whatsapp_sessions.user_id and users.phone

3. ❌ **Authenticated Actions**: MISSING - No actions implemented
   - Cannot apply for jobs via WhatsApp
   - Cannot upload CV via WhatsApp (file handler exists but no flow)
   - Cannot post jobs via WhatsApp
   - Cannot view applications via WhatsApp

4. 🟡 **User Experience Flow**: Confusing for non-registered users
   - Registration flow just added but migration not run
   - Old account linking flow still shows "register at website" message
   - No clear guidance on which flow to use (register vs login)

---

## Detailed Gap Analysis

### 1. New User Registration Flow

#### Current Implementation (commit e26724a)

**File**: `server/lib/whatsapp-registration.js` (444 lines)

**Flow Steps**:
```
STEP 1: Collect Full Name
  User: "I want to register"
  Jean: "Great! What's your full name? (e.g., John Doe)"
  Validation: min 2 words, no numbers, max 100 chars

STEP 2: Collect Email Address
  Jean: "Thanks John! What's your email address?"
  Validation: email format, check duplicates, max 100 chars
  Error: "❌ This email is already registered"

STEP 3: Detect User Role
  Jean: "Are you jobseeker or employer?"
  Pattern matching: "looking for job" → jobseeker, "hiring" → employer

STEP 4: Generate Password & Create Account
  Jean: Auto-generates 12-char secure password
  Creates user account in users table
  Links WhatsApp number to whatsapp_sessions.user_id
  Creates role-specific profile (profiles_jobseeker or profiles_employer)
  Sends password: "🎉 Registration complete! Password: [12-char]"
```

**Database Schema** (Migration 054 - NOT YET RUN):
```sql
ALTER TABLE whatsapp_sessions ADD COLUMN registration_flow_active INTEGER DEFAULT 0;
ALTER TABLE whatsapp_sessions ADD COLUMN registration_step TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN registration_data TEXT; -- JSON storage
ALTER TABLE whatsapp_sessions ADD COLUMN registration_started_at TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN registration_completed_at TEXT;
```

**Status**: ✅ FULLY IMPLEMENTED

**Issues**:
- ⚠️ Migration 054 NOT YET RUN - Registration flow will CRASH until migration runs
- ⚠️ No testing performed yet
- ⚠️ Password sent via WhatsApp (security concern - consider OTP instead)

**Action Required**:
1. Run migration 054 on production VPS
2. Test registration flow end-to-end
3. Consider OTP-based password reset instead of plain-text password

---

### 2. Existing User Login/Linking Flow

#### Current Implementation

**File**: `server/routes/whatsapp-webhook.js` (lines 304-378)

**Flow Steps**:
```
STEP 1: User Sends Email
  User: "john@example.com"
  System: Looks up user in users table
  If found: Generate 6-digit OTP, expires in 10 minutes
  If not found: "I couldn't find an account with that email"

STEP 2: User Enters OTP
  Jean: "Your verification code is: *123456*"
  User: "123456"
  System: Validates OTP, links account
  Updates whatsapp_sessions.user_id
  Updates users.phone

STEP 3: Confirmation
  Jean: "Account linked! ✅ You're now connected as John."
```

**Database Fields Used**:
```sql
whatsapp_sessions.flow_state = 'awaiting_otp'
whatsapp_sessions.otp = '123456'
whatsapp_sessions.otp_expires = '2026-05-06T12:30:00Z'
whatsapp_sessions.user_id = 12345  -- Linked user ID
```

**Status**: ✅ FULLY FUNCTIONAL

**Issues**:
- ⚠️ OTP shown in WhatsApp instead of sent via email (TODO comment at line 359)
- ⚠️ First-time user message says "Register at website" instead of offering WhatsApp registration
- ⚠️ Confusing UX - users don't know if they should register or login

**Action Required**:
1. Update first-time user message to offer WhatsApp registration
2. Implement email OTP delivery (optional)
3. Add logic to detect if user exists and route to appropriate flow

---

### 3. Authenticated Actions via WhatsApp

#### Current Implementation: NONE

**Gap**: No authenticated actions implemented via WhatsApp

#### Missing Actions for Jobseekers

**1. Apply for Job**

**Current State**: NOT IMPLEMENTED

**Expected Flow**:
```
User: "I want to apply for job #123"
System: Check if user is registered
  If NOT registered: "To apply, you need to register first. Would you like to register now?"
  If registered: Proceed with application
    - Check if CV uploaded
    - Check if profile complete
    - Submit application
    - Send confirmation
```

**Database Tables Needed**:
- `applications` (id, job_id, user_id, resume_url, cover_letter, status, applied_at)

**Implementation Estimate**: 150-200 lines

**Priority**: 🔴 HIGH - Core feature

---

**2. Upload CV**

**Current State**: PARTIAL - File upload handler exists (lines 824-850) but no flow

**Existing Handler** (lines 824-850):
```javascript
if (msg.mediaId && msg.mediaType === 'document' && user) {
  const isPdf = msg.mediaMime === 'application/pdf';
  const isDoc = msg.mediaMime?.includes('word');
  
  if (isPdf || isDoc) {
    const media = await downloadWhatsAppMedia(msg.mediaId);
    const filepath = await saveResume(user.id, media.buffer, media.ext);
    await sendWhatsAppMessage(phone, 
      `Resume received! ✅ I've saved your CV to your profile.`
    );
  }
}