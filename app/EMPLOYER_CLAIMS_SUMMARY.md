# Employer Profile Claim & Ownership System

## Overview
Complete system for allowing employers to **claim ownership** of their auto-created, already-verified profiles on WantokJobs via official email domain or phone number verification.

## Important Distinction: Claiming ≠ Verifying

**This system is about OWNERSHIP, not verification:**
- All existing employer profiles are already verified (`verified=1`) ✅
- Claiming proves "this is MY company" - ownership proof
- New users created through claims are **fully active** immediately
- This is different from new employer registration (which still needs verification)
- The employer profile itself remains verified throughout the claim process

## Files Created

### 1. Database Migration
**File:** `server/migrate-employer-claims.js`
- Adds claim fields to `profiles_employer` table:
  - `claimed`, `claimed_by`, `claimed_at`, `claim_method`
  - `official_email_domain`, `official_phone`
  - `social_facebook`, `social_linkedin`, `social_twitter`
- Creates `employer_claims` table for tracking verification attempts
- Adds indexes for performance

**Run migration:**
```bash
node server/migrate-employer-claims.js
```

### 2. API Routes
**File:** `server/routes/employer-claims.js`

**Public Endpoints:**
- `GET /api/employers/:id/claim-status` - Check if profile is claimed/claimable
- `POST /api/employers/:id/claim/start` - Start verification (sends OTP)
- `POST /api/employers/:id/claim/verify` - Verify OTP and complete claim

**Admin Endpoints:**
- `GET /api/admin/employer-claims` - List all claims with filters
- `PUT /api/admin/employer-claims/:id` - Approve/reject claim
- `POST /api/admin/employer-claims/override` - Manually assign profile to user

**Features:**
- Email domain verification against official company domain
- Phone number verification against official company phone
- 6-digit OTP with 10-minute expiry
- Rate limiting: 3 attempts per hour per IP/employer
- Auto-creates **fully active** user accounts on successful verification
- Admin review workflow for edge cases

**User Account Creation:**
When a claim is verified, the system:
1. Creates a new user account (or links existing one)
2. Sets `email_verified=1` (they proved ownership)
3. Sets `account_status='active'` (no waiting period)
4. Sets `role='employer'`
5. Sets `force_password_reset=1` (they'll set their own password)
6. Links user to the claimed employer profile
7. **Does NOT change** the employer profile's `verified` status (already 1)

### 3. Domain Extraction Script
**File:** `server/extract-employer-domains.js`
- Extracts official email domains from website URLs
- Normalizes phone numbers
- Extracts social media profiles (Facebook, LinkedIn, Twitter)
- Filters generic domains (gmail, yahoo, etc.)
- Backfills existing employer profiles

**Run extraction:**
```bash
node server/extract-employer-domains.js
```

**Results:**
- Processed 588 employer profiles
- Extracted 325 domains (47.2% coverage)
- Found 271 Facebook profiles
- Normalized 2 phone numbers

### 4. Frontend - Public Claim Page
**File:** `client/src/pages/ClaimEmployer.jsx`

**Features:**
- 4-step wizard interface:
  1. Introduction & benefits
  2. Choose verification method (email/phone)
  3. Enter verification code
  4. Success / pending approval
- Company profile preview
- Real-time validation
- Auto-login on successful verification
- Professional, trustworthy UI

**Route:** `/employers/:id/claim`

### 5. Frontend - Admin Dashboard
**File:** `client/src/pages/dashboard/admin/EmployerClaims.jsx`

**Features:**
- List all claims with status filters
- Approve/reject workflow with admin notes
- Manual profile assignment (override)
- Company details and verification info display
- Status badges (pending, verified, rejected, expired)

**Route:** `/dashboard/admin/employer-claims`

## Files Modified

### 1. Backend Routes Registration
**File:** `server/index.js`
- Added claim rate limiter (3/hour)
- Registered employer claims routes:
  ```javascript
  app.use('/api/employers', claimLimiter, require('./routes/employer-claims'));
  app.use('/api/admin/employer-claims', authenticateToken, require('./routes/employer-claims'));
  ```

### 2. Frontend Routes Registration
**File:** `client/src/App.jsx`
- Added lazy imports for ClaimEmployer and AdminEmployerClaims
- Registered public route: `/employers/:id/claim`
- Registered admin route: `/dashboard/admin/employer-claims`

### 3. Company Profile Page
**File:** `client/src/pages/CompanyProfile.jsx`
- Added Shield icon import
- Added claimStatus state
- Fetches claim status on load
- Displays "Claim this profile" button for unclaimed profiles
- Button links to `/employers/:id/claim`

## Database Schema

### profiles_employer (new columns)
```sql
claimed INTEGER DEFAULT 0              -- Ownership claimed flag
claimed_by INTEGER (user_id)          -- Who claimed it
claimed_at TEXT                        -- When claimed
claim_method TEXT (email|phone|admin)  -- How they proved ownership
official_email_domain TEXT             -- For verification
official_phone TEXT                    -- For verification
social_facebook TEXT                   -- Extracted from data
social_linkedin TEXT                   -- Extracted from data
social_twitter TEXT                    -- Extracted from data

-- NOTE: verified column is NOT touched by claim system
-- All migrated profiles are already verified=1
```

**What the claim process updates:**
- ✅ `claimed`, `claimed_by`, `claimed_at`, `claim_method` (ownership tracking)
- ✅ `user_id` (links to user account)
- ❌ `verified` status (already 1, never changed)

### employer_claims (new table)
```sql
id INTEGER PRIMARY KEY
employer_profile_id INTEGER
user_id INTEGER
claim_method TEXT (email|phone|admin_override)
verification_value TEXT
verification_code TEXT (6-digit OTP)
code_expires_at TEXT
status TEXT (pending|verified|rejected|expired)
admin_notes TEXT
created_at TEXT
verified_at TEXT
ip_address TEXT
```

## Claiming vs Fresh Registration

| Feature | Claiming Existing Profile | Fresh Employer Registration |
|---------|--------------------------|----------------------------|
| **Purpose** | Prove ownership of existing company | Create new company profile |
| **Profile Status** | Already verified ✅ | Needs verification ⏳ |
| **User Account** | Fully active immediately | Limited until verified |
| **Process** | Verify email/phone → claim | Register → verify later |
| **Access** | Full dashboard access | Browse + limited actions |
| **Use Case** | Real employer claiming their profile | New employer joining platform |

**Key Insight:** Claiming is faster and simpler because the employer profile is already vetted and verified. The user just needs to prove "this is my company."

## Security Features

1. **Rate Limiting:**
   - 3 claim attempts per hour per IP/employer
   - Prevents brute force attacks

2. **Domain Verification:**
   - Email domain must match official company domain or website domain
   - Generic domains (gmail, yahoo) are rejected
   - No official domain = flagged for admin review

3. **Phone Verification:**
   - Phone must match official company phone exactly
   - Only available if official phone is on file

4. **OTP Security:**
   - 6-digit codes
   - 10-minute expiry
   - One-time use only

5. **Admin Review:**
   - Claims without official domain require approval
   - Admin can view all verification details
   - Audit trail maintained

## Usage Flow

### Employer Claims Ownership:
1. Employer visits their company profile page (already verified)
2. Clicks "Is this your company? Claim it" button
3. Redirected to `/employers/:id/claim`
4. Chooses verification method (email/phone)
5. Enters official email/phone to prove ownership
6. Receives verification code (email/SMS - currently displayed for dev)
7. Enters code to verify
8. **Account created and logged in immediately** (or pending admin review)
9. Full access to employer dashboard - no waiting period
10. Company profile remains verified throughout

### Admin Reviews Claim:
1. Admin visits `/dashboard/admin/employer-claims`
2. Filters by status (pending/verified/rejected)
3. Reviews claim details (company, method, verification value)
4. Approves or rejects with notes
5. Can manually override to assign any profile to any user

## Next Steps (Production)

1. **Email Integration:**
   - Configure SMTP settings
   - Send OTP codes via email instead of displaying them
   - Send welcome emails on successful claim

2. **SMS Integration:**
   - Set up SMS provider (Twitch, AWS SNS, etc.)
   - Send OTP codes via SMS for phone verification

3. **Notifications:**
   - Email notifications for admin review status
   - In-app notifications for claim updates

4. **Analytics:**
   - Track claim conversion rates
   - Monitor verification success/failure reasons
   - Dashboard for claim metrics

5. **Enhancements:**
   - Support multiple verification methods per profile
   - Allow claiming via business registration documents
   - Add company verification badges

## Testing

### Test Scenarios:
1. ✅ Claim with matching email domain
2. ✅ Claim with non-matching email domain (should fail)
3. ✅ Claim with generic email (should fail)
4. ✅ Claim with no official domain (needs admin review)
5. ✅ Claim with matching phone number
6. ✅ Expired OTP (should fail)
7. ✅ Invalid OTP (should fail)
8. ✅ Rate limiting (3 attempts max)
9. ✅ Admin approval workflow
10. ✅ Manual override

### Example Companies to Test:
- Bank South Pacific (BSP) - has domain: bsp.com.pg
- Air Niugini - has domain: airniugini.com.pg
- Coffee Industry Corporation - has domain: cic.org.pg

## Maintenance

### Periodic Tasks:
1. Run domain extraction script monthly to update new profiles:
   ```bash
   node server/extract-employer-domains.js
   ```

2. Clean up expired claims:
   ```sql
   UPDATE employer_claims 
   SET status = 'expired' 
   WHERE status = 'pending' 
   AND datetime(code_expires_at) < datetime('now');
   ```

3. Monitor claim success rates and adjust verification rules

## Support

For issues or questions:
- Check logs: `server/logs/`
- Database queries: Use `server/database.js`
- API testing: Use Postman or curl

## License
Part of WantokJobs platform - proprietary code.
