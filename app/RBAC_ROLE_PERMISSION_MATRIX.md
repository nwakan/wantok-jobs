# WantokJobs RBAC Role/Permission Matrix

**Document Version:** 1.0
**Last Updated:** 2026-03-25 00:06 UTC
**Status:** Production Documentation

---

## Overview

This document provides a comprehensive matrix of all user roles in the WantokJobs platform and their associated permissions across API endpoints, features, and resources.

**Role Hierarchy:**
1. **Platform Super Admin** (highest authority)
2. **Agency Admin** (manages multiple employers)
3. **Employer Admin** (manages single employer)
4. **Recruiter** (employer staff)
5. **Jobseeker** (applicants)
6. **Guest** (unauthenticated users)

---

## Role Definitions

### 1. Platform Super Admin
**Database:** `users.role = 'admin'`
**Description:** Platform administrator with full system access
**Scope:** Global (all employers, all data)

**Core Capabilities:**
- Full CRUD on all resources
- User management (create, modify, delete, impersonate)
- Content moderation (jobs, employers, reviews)
- System configuration
- Analytics access (all data)
- Financial management (payments, refunds)
- Security management (fraud flags, IP blocks)

### 2. Agency Admin
**Database:** `users.role = 'agency'`
**Description:** Recruitment agency managing multiple employer accounts
**Scope:** Multi-tenant (assigned employers only)

**Core Capabilities:**
- Manage assigned employer accounts
- Post jobs on behalf of employers
- View applications across assigned employers
- Manage employer staff (recruiters)
- Analytics access (assigned employers only)
- Billing management (assigned employers)

### 3. Employer Admin
**Database:** `users.role = 'employer'`
**Description:** Employer account owner
**Scope:** Single-tenant (own employer only)

**Core Capabilities:**
- Full CRUD on own jobs
- View/manage own applications
- Manage employer profile
- Manage employer staff (recruiters)
- Analytics access (own employer only)
- Billing management (own account)
- Subscription management

### 4. Recruiter
**Database:** `users.role = 'recruiter'`
**Description:** Employer staff member
**Scope:** Single-tenant (assigned employer only)

**Core Capabilities:**
- Create/edit jobs (employer approval may be required)
- View/manage applications
- Communicate with candidates
- Limited analytics access
- No billing access
- No staff management

### 5. Jobseeker
**Database:** `users.role = 'jobseeker'` (default)
**Description:** Job applicant
**Scope:** Own profile and applications only

**Core Capabilities:**
- Browse/search jobs
- Apply to jobs
- Manage own profile/resume
- Track own applications
- Save jobs/searches
- Job alerts
- Limited analytics (own activity)

### 6. Guest
**Database:** Not authenticated
**Description:** Unauthenticated visitor
**Scope:** Public content only

**Core Capabilities:**
- Browse/search public jobs
- View employer profiles (public)
- Register account
- Quick-apply (limited)

---

## Permission Matrix by Resource

### Jobs Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Browse/Search | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Public | ✅ Public |
| View Details | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Public | ✅ Public |
| Create | ✅ Any | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Edit | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Delete | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Own (soft) | ❌ | ❌ |
| Close | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Feature/Promote | ✅ All | ❌ | ⚠️ Paid | ⚠️ Paid | ❌ | ❌ |
| Moderate/Flag | ✅ All | ❌ | ❌ | ❌ | ⚠️ Report | ⚠️ Report |
| Analytics | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |

**Legend:**
- ✅ Full access
- ⚠️ Conditional access (requires subscription, approval, etc.)
- ❌ No access

---


### Applications Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Browse All | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| View Details | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ✅ Own | ❌ |
| Submit Application | ❌ | ❌ | ❌ | ❌ | ✅ All | ⚠️ Quick-apply |
| Edit Application | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ⚠️ Before review | ❌ |
| Withdraw Application | ✅ All | ✅ Assigned | ❌ | ❌ | ✅ Own | ❌ |
| Change Status | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Download Resume | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Contact Candidate | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Schedule Interview | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Send Offer | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Admin approval | ❌ | ❌ |
| View Analytics | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ✅ Own | ❌ |
| Export Data | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Limited | ❌ | ❌ |

---

### Employers Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Browse/Search | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Public |
| View Profile | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Public | ✅ Public |
| Create | ✅ Any | ✅ Assigned | ❌ | ❌ | ❌ | ❌ |
| Edit Profile | ✅ All | ✅ Assigned | ✅ Own | ❌ | ❌ | ❌ |
| Delete | ✅ All | ⚠️ Assigned (soft) | ❌ | ❌ | ❌ | ❌ |
| Verify | ✅ All | ❌ | ⚠️ Request | ⚠️ Request | ❌ | ❌ |
| Manage Staff | ✅ All | ✅ Assigned | ✅ Own | ❌ | ❌ | ❌ |
| View Reviews | ✅ All | ✅ All | ✅ All | ✅ All | ✅ Public | ✅ Public |
| Respond to Reviews | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Assigned | ❌ | ❌ |
| Claim Profile | ✅ All | ✅ Assigned | ⚠️ Request | ❌ | ❌ | ⚠️ Request |
| Follow | ❌ | ❌ | ❌ | ❌ | ✅ All | ❌ |
| Analytics | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Limited | ❌ | ❌ |

---

### Users Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Browse All Users | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ❌ | ❌ | ❌ |
| View Profile | ✅ All | ✅ Staff/Candidates | ✅ Staff/Candidates | ✅ Candidates | ✅ Public | ✅ Public |
| Create User | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ❌ | ❌ | ⚠️ Register |
| Edit Profile | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ✅ Own | ✅ Own | ❌ |
| Delete User | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ❌ | ⚠️ Own (deactivate) | ❌ |
| Change Role | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Suspend/Ban | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Activity | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ✅ Own | ✅ Own | ❌ |
| Impersonate | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ All | ⚠️ Staff only | ⚠️ Staff only | ✅ Own | ✅ Own | ❌ |

---

### Analytics Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Platform Analytics | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Employer Analytics | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Limited | ❌ | ❌ |
| Job Analytics | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ❌ | ❌ |
| Application Analytics | ✅ All | ✅ Assigned | ✅ Own | ✅ Own | ✅ Own | ❌ |
| Jobseeker Analytics | ✅ All | ❌ | ❌ | ❌ | ✅ Own | ❌ |
| Market Intelligence | ✅ All | ⚠️ Paid | ⚠️ Paid | ❌ | ⚠️ Paid | ❌ |
| Export Reports | ✅ All | ✅ Assigned | ✅ Own | ⚠️ Limited | ✅ Own | ❌ |

---

### Billing Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| View Invoices | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| Download Invoices | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| Purchase Credits | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| Subscribe | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| Manage Subscription | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| View Billing History | ✅ All | ✅ Assigned | ✅ Own | ❌ | ✅ Own | ❌ |
| Issue Refunds | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Adjust Credits | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### Admin Resource

| Action | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|--------|-------------|--------------|----------------|-----------|-----------|-------|
| Access Admin Panel | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Moderate Jobs | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Moderate Employers | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Moderate Reviews | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| View System Logs | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Pricing | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Fraud Flags | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage IP Blocks | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Run Verifications | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |

## API Endpoint Mapping by Role

### Authentication & Authorization Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/auth/register | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/auth/login | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/auth/logout | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/auth/profile | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/auth/profile | PUT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/auth/verify-email | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/auth/forgot-password | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/auth/reset-password | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/auth/change-password | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### Job Management Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/jobs | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/jobs | POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/:id | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/jobs/:id | PUT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/:id | DELETE | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| /api/jobs/:id/close | POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/:id/reopen | POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/:id/analytics | GET | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/:id/applicants | GET | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/jobs/search | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/jobs/categories | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/jobs/saved | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/jobs/:id/save | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/jobs/:id/unsave | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### Application Management Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/applications | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/applications | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| /api/applications/:id | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/applications/:id | PUT | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| /api/applications/:id/status | PUT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/applications/:id/withdraw | POST | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| /api/applications/:id/notes | POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/applications/:id/interview | POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/applications/:id/offer | POST | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| /api/applications/quick-apply | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Employer Management Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/employers | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/employers | POST | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| /api/employers/:id | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/employers/:id | PUT | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| /api/employers/:id | DELETE | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| /api/employers/:id/staff | GET | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| /api/employers/:id/staff | POST | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| /api/employers/:id/staff/:userId | DELETE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| /api/employers/:id/reviews | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/employers/:id/reviews | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/employers/:id/claim | POST | ✅ | ✅ | ⚠️ | ❌ | ❌ | ⚠️ |
| /api/employers/:id/follow | POST | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| /api/employers/:id/unfollow | DELETE | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

### Analytics Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/analytics/platform | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/analytics/employer/:id | GET | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ |
| /api/analytics/job/:id | GET | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /api/analytics/jobseeker | GET | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| /api/analytics/market | GET | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ❌ |

---

### Billing & Subscription Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/subscriptions/tiers | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/subscriptions/current | GET | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/subscriptions/subscribe | POST | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/subscriptions/manage | PUT | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/subscriptions/history | GET | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/wallet/balance | GET | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/wallet/topup | POST | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/wallet/transactions | GET | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/payment/intent | POST | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| /api/payment/webhook | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Admin Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/admin/users | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/users/:id | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/users/:id | PUT | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/users/:id | DELETE | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/users/:id/suspend | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/users/:id/unsuspend | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/jobs | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/jobs/:id/approve | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/jobs/:id/reject | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/employers | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/employers/:id/verify | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/pricing | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/pricing | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/pricing/:id | PUT | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/pricing/:id | DELETE | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/verification | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/fraud-flags | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/fraud-flags/:id/resolve | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/blocked-ips | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/blocked-ips | POST | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/blocked-ips/:id | DELETE | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/stats | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /api/admin/logs | GET | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### User Management Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/users/:id | GET | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| /api/users/:id | PUT | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |
| /api/users/:id/deactivate | POST | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ |
| /api/users/:id/avatar | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/users/:id/resume | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/users/:id/preferences | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/users/:id/preferences | PUT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/users/:id/activity | GET | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |

---

### Miscellaneous Endpoints

| Endpoint | Method | Super Admin | Agency Admin | Employer Admin | Recruiter | Jobseeker | Guest |
|----------|--------|-------------|--------------|----------------|-----------|-----------|-------|
| /api/categories | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/locations | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/search | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/stats | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/health | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/sitemap | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/newsletter/subscribe | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/newsletter/unsubscribe | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/contact | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /api/job-alerts | GET | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/job-alerts | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| /api/job-alerts/:id | DELETE | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Feature Access Rules by Subscription Tier

### Employer/Agency Subscription Tiers

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| **Job Postings** |
| Active jobs | 1 | 5 | 20 | Unlimited |
| Job duration | 30 days | 30 days | 60 days | 90 days |
| Featured jobs | ❌ | 1 | 5 | Unlimited |
| Job renewal | ❌ | ✅ | ✅ | ✅ |
| **Candidate Management** |
| Application views | 10 | 100 | 500 | Unlimited |
| Resume downloads | 5 | 50 | 200 | Unlimited |
| Saved candidates | 10 | 50 | 200 | Unlimited |
| Candidate notes | ❌ | ✅ | ✅ | ✅ |
| Interview scheduling | ❌ | ✅ | ✅ | ✅ |
| **Analytics** |
| Job analytics | Basic | Standard | Advanced | Advanced |
| Application insights | ❌ | ✅ | ✅ | ✅ |
| Market intelligence | ❌ | ❌ | ✅ | ✅ |
| Custom reports | ❌ | ❌ | ❌ | ✅ |
| **Communication** |
| Email templates | 3 | 10 | Unlimited | Unlimited |
| Bulk messaging | ❌ | ❌ | ✅ | ✅ |
| WhatsApp integration | ❌ | ❌ | ❌ | ✅ |
| SMS notifications | ❌ | ❌ | ⚠️ Add-on | ✅ |
| **AI Features** |
| AI job descriptions | ❌ | 5/month | 20/month | Unlimited |
| AI candidate matching | ❌ | ❌ | ✅ | ✅ |
| AI screening questions | ❌ | ❌ | ✅ | ✅ |
| AI interview summaries | ❌ | ❌ | ❌ | ✅ |
| **Support** |
| Email support | ✅ | ✅ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| Dedicated account manager | ❌ | ❌ | ❌ | ✅ |
| **Branding** |
| Custom branding | ❌ | ❌ | ❌ | ✅ |
| White-label (Agencies) | ❌ | ❌ | ❌ | ✅ |

---

### Jobseeker Subscription Tiers

| Feature | Free | Premium | Pro |
|---------|------|---------|-----|
| **Job Search** |
| Job applications | 10/month | 50/month | Unlimited |
| Saved jobs | 10 | 50 | Unlimited |
| Job alerts | 3 | 10 | Unlimited |
| Custom search filters | Basic | Advanced | Advanced |
| **Profile** |
| Resume uploads | 1 | 3 | Unlimited |
| Portfolio items | 3 | 10 | Unlimited |
| Profile visibility | Standard | Enhanced | Premium |
| Featured profile | ❌ | ❌ | ✅ |
| **Analytics** |
| Application tracking | Basic | Standard | Advanced |
| Profile views | ❌ | ✅ | ✅ |
| Market insights | ❌ | ❌ | ✅ |
| **AI Features** |
| AI resume builder | ❌ | ✅ | ✅ |
| AI cover letters | ❌ | 5/month | Unlimited |
| AI interview prep | ❌ | ❌ | ✅ |
| AI career coach | ❌ | ❌ | ✅ |
| **Support** |
| Email support | ✅ | ✅ | ✅ |
| Priority support | ❌ | ✅ | ✅ |
| Career counseling | ❌ | ❌ | ✅ |

---

## Implementation Notes

### Authentication & Authorization

**JWT Token Structure:**
```javascript
{
  id: user.id,
  email: user.email,
  role: user.role,
  employer_id: user.employer_id // null for jobseekers
}
```

**Middleware Stack:**
1. `authenticateToken`: Verifies JWT, attaches `req.user`
2. `requireRole(['employer', 'admin'])`: Checks user role
3. `requireEmployer`: Verifies employer_id ownership
4. `requireSubscription('professional')`: Checks subscription tier

**Route Protection Pattern:**
```javascript
router.post('/api/jobs',
  authenticateToken,
  requireRole(['employer', 'admin']),
  requireSubscription('starter'), // Minimum tier
  async (req, res) => { /* handler */ }
);
```

### Multi-Tenant Isolation

**Database Queries:**
- All queries filtered by `employer_id` or `user_id`
- Jobs table: `WHERE employer_id = ?`
- Applications table: `WHERE user_id = ? OR job_id IN (SELECT id FROM jobs WHERE employer_id = ?)`

**Tenant Validation:**
```javascript
// Verify ownership before update/delete
const job = await db.get('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.employer_id]);
if (!job) return res.status(403).json({ error: 'Forbidden' });
```

### Subscription Enforcement

**Feature Gating:**
```javascript
const subscription = await getSubscription(req.user.employer_id);
if (subscription.tier === 'free' && activeJobCount >= 1) {
  return res.status(403).json({ error: 'Upgrade to post more jobs' });
}
```

**Credit System:**
- Premium features consume credits from wallet
- Auto-debit on feature use
- Low balance warnings at 20% threshold

### Security Considerations

**Password Management:**
- Bcrypt hashing (cost factor 10)
- Passwords never stored in plain text
- Password change invalidates all JWT tokens (via `password_changed_at` timestamp)

**Rate Limiting:**
- Authentication endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- File uploads: 10 requests/hour
- Search queries: 60 requests/minute

**Input Validation:**
- All inputs sanitized via `validator` library
- SQL injection prevention via parameterized queries
- XSS prevention via `xss` library
- File upload restrictions (type, size)

### Audit Logging

**Logged Events:**
- User login/logout
- Password changes
- Role changes (admin only)
- Subscription changes
- Job posting/deletion
- Application submission
- Payment transactions
- Admin actions (verification, moderation, suspension)

**Log Retention:**
- Security logs: 1 year
- Audit logs: 2 years
- Transaction logs: 7 years (compliance)

---

## Version History

### Version 1.0 (2026-03-25)
**Initial Release**
- 6 user roles defined
- 7 resource permission matrices
- 9 API endpoint categories documented
- 70+ endpoints mapped
- Feature access rules for 2 subscription models
- Implementation notes and security considerations

**Created by:** Agent Zero (Autonomous AI)
**Review Status:** Pending human review
**Production Status:** Documentation reflects production implementation as of 2026-03-25

---

## Summary

This document provides a comprehensive overview of the WantokJobs RBAC system, including:

1. **Role Definitions**: 6 distinct roles (Super Admin, Agency Admin, Employer Admin, Recruiter, Jobseeker, Guest)
2. **Resource Permissions**: 7 core resources with detailed permission matrices
3. **API Endpoint Mapping**: 70+ endpoints with role-based access control
4. **Feature Access Rules**: Subscription-based feature gating for employers and jobseekers
5. **Implementation Details**: JWT authentication, middleware stack, multi-tenant isolation, security considerations

**Key Security Features:**
- JWT-based authentication with role and tenant information
- Multi-level middleware stack for granular access control
- Strict multi-tenant isolation at database level
- Subscription-based feature gating
- Comprehensive audit logging
- Rate limiting and input validation

**Compliance:**
- GDPR-aware (consent management, data export, deletion)
- CAN-SPAM compliant (email opt-out)
- Audit trail for all sensitive operations
- 7-year transaction log retention

**Maintenance:**
- Document should be updated when:
  - New roles are added
  - Permission changes are made
  - New API endpoints are created
  - Subscription tiers are modified
  - Security policies change

**Review Schedule:** Quarterly (every 3 months)

---

**End of Document**
