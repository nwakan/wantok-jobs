/**
 * WantokJobs Credit-Based Billing Engine
 * 
 * Prepaid credit model for PNG/Pacific markets:
 * - Employers buy credit packages (job posting, AI matching, candidate search)
 * - Jobseekers buy alert credit packages
 * - Credits persist until used (annual reset)
 * - Standard trial (14-day, one-time) and Premium Indefinite Trial (admin-granted)
 * - Manual bank transfer with admin approval
 */

const db = require('../database');

const BANK_DETAILS = {
  bank: 'Bank of South Pacific (BSP)',
  accountName: 'WantokJobs Ltd',
  accountNumber: '1234-5678-9012',  // TODO: Replace with real account
  branch: 'Port Moresby',
  swiftCode: 'BSPNPGPM',
  currency: 'PGK',
  reference: '(Your Invoice Number)',
};

// ─── Credit Operations ─────────────────────────────────────────────

/**
 * Log a credit transaction and return the new balance
 */
function logCreditTransaction(userId, creditType, amount, reason, referenceType, referenceId) {
  // Get current balance
  const balanceField = getCreditField(creditType, userId);
  const table = balanceField.table;
  const field = balanceField.field;
  
  const profile = db.prepare(`SELECT ${field} FROM ${table} WHERE user_id = ?`).get(userId);
  if (!profile) throw new Error(`Profile not found for user ${userId}`);
  
  const currentBalance = profile[field] || 0;
  const newBalance = currentBalance + amount;
  
  // Update balance
  db.prepare(`UPDATE ${table} SET ${field} = ? WHERE user_id = ?`).run(newBalance, userId);
  
  // Log transaction
  db.prepare(`
    INSERT INTO credit_transactions (user_id, credit_type, amount, balance_after, reason, reference_type, reference_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, creditType, amount, newBalance, reason, referenceType || null, referenceId || null);
  
  return newBalance;
}

/**
 * Map credit type to the correct profile table and field
 */
function getCreditField(creditType, userId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  
  if (user.role === 'employer') {
    const map = {
      'job_posting': 'current_job_posting_credits',
      'ai_matching': 'current_ai_matching_credits',
      'candidate_search': 'current_candidate_search_credits',
    };
    return { table: 'profiles_employer', field: map[creditType] };
  } else if (user.role === 'jobseeker') {
    const map = { 'alert': 'current_alert_credits' };
    return { table: 'profiles_jobseeker', field: map[creditType] };
  }
  throw new Error(`Invalid role for credits: ${user.role}`);
}

// ─── Trial System ───────────────────────────────────────────────────

/**
 * Check if user has an active trial (standard or premium indefinite)
 */
function hasActiveTrial(userId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) return { active: false };
  
  const table = user.role === 'employer' ? 'profiles_employer' : 'profiles_jobseeker';
  const profile = db.prepare(`
    SELECT has_premium_indefinite_trial, has_standard_trial_activated, standard_trial_end_date
    FROM ${table} WHERE user_id = ?
  `).get(userId);
  
  if (!profile) return { active: false };
  
  // Premium indefinite trial — always active
  if (profile.has_premium_indefinite_trial) {
    return { active: true, type: 'premium_indefinite' };
  }
  
  // Standard trial — check expiry
  if (profile.has_standard_trial_activated && profile.standard_trial_end_date) {
    if (new Date(profile.standard_trial_end_date) > new Date()) {
      return { active: true, type: 'standard', expiresAt: profile.standard_trial_end_date };
    }
  }
  
  return { active: false };
}

/**
 * Activate standard trial for an employer (one-time only)
 */
function activateEmployerStandardTrial(employerId) {
  const profile = db.prepare(
    'SELECT has_standard_trial_activated FROM profiles_employer WHERE user_id = ?'
  ).get(employerId);
  
  if (!profile) return { success: false, error: 'Employer profile not found' };
  if (profile.has_standard_trial_activated) return { success: false, error: 'Trial already used — each account gets one free trial' };
  
  // Get trial package
  const trialPkg = db.prepare("SELECT * FROM packages WHERE slug = 'employer-trial' AND active = 1").get();
  const durationDays = trialPkg?.trial_duration_days || 14;
  const endDate = new Date(Date.now() + durationDays * 86400000).toISOString();
  
  db.prepare(`
    UPDATE profiles_employer 
    SET has_standard_trial_activated = 1, standard_trial_end_date = ?, feature_tier = 'basic'
    WHERE user_id = ?
  `).run(endDate, employerId);
  
  // Grant trial credits
  if (trialPkg) {
    if (trialPkg.job_posting_credits > 0)
      logCreditTransaction(employerId, 'job_posting', trialPkg.job_posting_credits, 'trial_activation', 'package', trialPkg.id);
    if (trialPkg.ai_matching_credits > 0)
      logCreditTransaction(employerId, 'ai_matching', trialPkg.ai_matching_credits, 'trial_activation', 'package', trialPkg.id);
    if (trialPkg.candidate_search_credits > 0)
      logCreditTransaction(employerId, 'candidate_search', trialPkg.candidate_search_credits, 'trial_activation', 'package', trialPkg.id);
  }
  
  return {
    success: true,
    trialEndsAt: endDate,
    credits: {
      job_posting: trialPkg?.job_posting_credits || 3,
      ai_matching: trialPkg?.ai_matching_credits || 2,
      candidate_search: trialPkg?.candidate_search_credits || 5,
    },
  };
}

/**
 * Activate standard trial for a jobseeker (one-time only)
 */
function activateJobSeekerStandardTrial(jobseekerId) {
  const profile = db.prepare(
    'SELECT has_standard_trial_activated FROM profiles_jobseeker WHERE user_id = ?'
  ).get(jobseekerId);
  
  if (!profile) return { success: false, error: 'Jobseeker profile not found' };
  if (profile.has_standard_trial_activated) return { success: false, error: 'Trial already used' };
  
  const trialPkg = db.prepare("SELECT * FROM packages WHERE slug = 'jobseeker-trial' AND active = 1").get();
  const durationDays = trialPkg?.trial_duration_days || 14;
  const endDate = new Date(Date.now() + durationDays * 86400000).toISOString();
  
  db.prepare(`
    UPDATE profiles_jobseeker 
    SET has_standard_trial_activated = 1, standard_trial_end_date = ?
    WHERE user_id = ?
  `).run(endDate, jobseekerId);
  
  if (trialPkg?.alert_credits > 0)
    logCreditTransaction(jobseekerId, 'alert', trialPkg.alert_credits, 'trial_activation', 'package', trialPkg.id);
  if (trialPkg?.auto_apply_enabled)
    db.prepare('UPDATE profiles_jobseeker SET auto_apply_enabled = 1 WHERE user_id = ?').run(jobseekerId);
  
  return { success: true, trialEndsAt: endDate, alertCredits: trialPkg?.alert_credits || 20 };
}

/**
 * Admin grants premium indefinite trial
 */
function grantPremiumIndefiniteTrial(userId, adminEmail) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) return { success: false, error: 'User not found' };
  
  const table = user.role === 'employer' ? 'profiles_employer' : 'profiles_jobseeker';
  const tierUpdate = user.role === 'employer' ? ", feature_tier = 'enterprise'" : '';
  
  db.prepare(`
    UPDATE ${table} 
    SET has_premium_indefinite_trial = 1, premium_trial_override_by = ? ${tierUpdate}
    WHERE user_id = ?
  `).run(adminEmail || 'admin', userId);
  
  return { success: true, userId, type: 'premium_indefinite' };
}

/**
 * Admin revokes premium indefinite trial
 */
function revokePremiumIndefiniteTrial(userId) {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) return { success: false, error: 'User not found' };
  
  const table = user.role === 'employer' ? 'profiles_employer' : 'profiles_jobseeker';
  const tierReset = user.role === 'employer' ? ", feature_tier = 'free'" : '';
  
  db.prepare(`
    UPDATE ${table} 
    SET has_premium_indefinite_trial = 0, premium_trial_override_by = NULL ${tierReset}
    WHERE user_id = ?
  `).run(userId);
  
  return { success: true };
}

// ─── Credit Consumption ─────────────────────────────────────────────

/**
 * Consume an employer credit (returns 402-style error if insufficient)
 * Smart logic: premium trial → no deduction, active standard trial → no deduction
 */
function consumeEmployerServiceCredit(employerId, creditType) {
  // Check trial status first
  const trial = hasActiveTrial(employerId);
  if (trial.active) {
    // Trial users don't consume credits
    return { success: true, consumed: false, reason: `${trial.type}_trial_active`, balance: null };
  }
  
  const fieldMap = {
    'job_posting': 'current_job_posting_credits',
    'ai_matching': 'current_ai_matching_credits',
    'candidate_search': 'current_candidate_search_credits',
  };
  const field = fieldMap[creditType];
  if (!field) return { success: false, error: `Invalid credit type: ${creditType}` };
  
  const profile = db.prepare(`SELECT ${field} FROM profiles_employer WHERE user_id = ?`).get(employerId);
  if (!profile) return { success: false, error: 'Employer profile not found' };
  
  const current = profile[field] || 0;
  if (current <= 0) {
    return { 
      success: false, 
      error: `Insufficient ${creditType.replace('_', ' ')} credits. Purchase a credit package to continue.`,
      balance: 0,
      code: 402,
    };
  }
  
  const newBalance = logCreditTransaction(employerId, creditType, -1, 'consumed', null, null);
  return { success: true, consumed: true, balance: newBalance };
}

/**
 * Consume a jobseeker alert credit
 */
function consumeJobSeekerAlertCredit(jobseekerId) {
  const trial = hasActiveTrial(jobseekerId);
  if (trial.active) {
    return { success: true, consumed: false, reason: `${trial.type}_trial_active` };
  }
  
  const profile = db.prepare('SELECT current_alert_credits FROM profiles_jobseeker WHERE user_id = ?').get(jobseekerId);
  if (!profile) return { success: false, error: 'Jobseeker profile not found' };
  
  if ((profile.current_alert_credits || 0) <= 0) {
    return { success: false, error: 'Insufficient alert credits. Purchase an alert pack to continue.', code: 402 };
  }
  
  const newBalance = logCreditTransaction(jobseekerId, 'alert', -1, 'consumed', null, null);
  return { success: true, consumed: true, balance: newBalance };
}

// ─── Package Purchase ───────────────────────────────────────────────

/**
 * Add credits from a purchased package (called when admin approves payment)
 */
function addCreditPackage(userId, packageId, orderId) {
  const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(packageId);
  if (!pkg) return { success: false, error: 'Package not found' };
  
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId);
  if (!user) return { success: false, error: 'User not found' };
  
  if (user.role === 'employer') {
    if (pkg.job_posting_credits > 0)
      logCreditTransaction(userId, 'job_posting', pkg.job_posting_credits, 'package_purchase', 'order', orderId);
    if (pkg.ai_matching_credits > 0)
      logCreditTransaction(userId, 'ai_matching', pkg.ai_matching_credits, 'package_purchase', 'order', orderId);
    if (pkg.candidate_search_credits > 0)
      logCreditTransaction(userId, 'candidate_search', pkg.candidate_search_credits, 'package_purchase', 'order', orderId);
    
    // Upgrade feature tier if package tier is higher
    db.prepare(`
      UPDATE profiles_employer SET feature_tier = MAX(feature_tier, ?) WHERE user_id = ?
    `).run(pkg.feature_tier, userId);
    // SQLite MAX on text won't work — use explicit logic
    const currentTier = db.prepare('SELECT feature_tier FROM profiles_employer WHERE user_id = ?').get(userId)?.feature_tier || 'free';
    const tierRank = { free: 0, basic: 1, professional: 2, enterprise: 3 };
    if ((tierRank[pkg.feature_tier] || 0) > (tierRank[currentTier] || 0)) {
      db.prepare('UPDATE profiles_employer SET feature_tier = ? WHERE user_id = ?').run(pkg.feature_tier, userId);
    }
  } else if (user.role === 'jobseeker') {
    if (pkg.alert_credits > 0)
      logCreditTransaction(userId, 'alert', pkg.alert_credits, 'package_purchase', 'order', orderId);
    if (pkg.auto_apply_enabled)
      db.prepare('UPDATE profiles_jobseeker SET auto_apply_enabled = 1 WHERE user_id = ?').run(userId);
    if (pkg.id)
      db.prepare('UPDATE profiles_jobseeker SET active_package_id = ? WHERE user_id = ?').run(pkg.id, userId);
  }
  
  return {
    success: true,
    package: pkg.name,
    credits: {
      job_posting: pkg.job_posting_credits,
      ai_matching: pkg.ai_matching_credits,
      candidate_search: pkg.candidate_search_credits,
      alert: pkg.alert_credits,
    },
  };
}

// ─── Job Posting Check ──────────────────────────────────────────────

/**
 * Check if employer can post a job (credits or trial)
 */
function canPostJob(employerId) {
  const profile = db.prepare(`
    SELECT current_job_posting_credits, has_premium_indefinite_trial, 
           has_standard_trial_activated, standard_trial_end_date, feature_tier
    FROM profiles_employer WHERE user_id = ?
  `).get(employerId);

  if (!profile) return { allowed: false, reason: 'Employer profile not found' };

  const trial = hasActiveTrial(employerId);
  
  // Premium indefinite trial — unlimited
  if (trial.active && trial.type === 'premium_indefinite') {
    return { allowed: true, reason: 'Premium trial — unlimited posting', trial: true, credits: null };
  }
  
  // Active standard trial — allowed (no credit cost)
  if (trial.active && trial.type === 'standard') {
    return { allowed: true, reason: 'Standard trial active', trial: true, trialEndsAt: trial.expiresAt, credits: profile.current_job_posting_credits || 0 };
  }
  
  // Free tier: 1 active job allowed
  const credits = profile.current_job_posting_credits || 0;
  if (credits <= 0) {
    // Check if they have at least the free tier allowance
    const activeJobCount = db.prepare(
      "SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = 'active'"
    ).get(employerId).n;
    
    if (activeJobCount < 1) {
      return { allowed: true, reason: 'Free tier — 1 active job', trial: false, credits: 0, freeSlot: true };
    }
    
    return {
      allowed: false,
      reason: 'No job posting credits remaining. Purchase a credit package to post more jobs.',
      credits: 0,
      trial: false,
    };
  }
  
  return { allowed: true, credits, trial: false };
}

// ─── Order Management ───────────────────────────────────────────────

/**
 * Approve an order → grant credits
 */
function approveOrder(orderId, adminId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status === 'completed') return { success: false, error: 'Order already completed' };
  if (order.status === 'rejected') return { success: false, error: 'Order was rejected' };
  
  // Mark approved
  db.prepare(`
    UPDATE orders SET status = 'approved', approved_by = ?, approved_at = datetime('now')
    WHERE id = ?
  `).run(adminId, orderId);
  
  // If package-based order, grant credits
  let creditResult = null;
  if (order.package_id) {
    creditResult = addCreditPackage(order.user_id || order.employer_id, order.package_id, orderId);
  }
  
  // Mark completed
  db.prepare(`
    UPDATE orders SET status = 'completed', completed_at = datetime('now')
    WHERE id = ?
  `).run(orderId);
  
  return { success: true, orderId, creditResult };
}

/**
 * Reject an order
 */
function rejectOrder(orderId, reason) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  
  db.prepare("UPDATE orders SET status = 'rejected', notes = ? WHERE id = ?")
    .run(reason || 'Payment not received', orderId);
  
  return { success: true };
}

// ─── Annual Credit Reset ────────────────────────────────────────────

/**
 * Reset all credits to 0 once per year (skip premium indefinite users)
 * Run via cron on Jan 1
 */
function resetAnnualCredits() {
  const currentYear = new Date().getFullYear();
  const results = { employers: 0, jobseekers: 0, skipped: 0 };
  
  // Employers
  const employers = db.prepare(`
    SELECT user_id, current_job_posting_credits, current_ai_matching_credits, current_candidate_search_credits,
           has_premium_indefinite_trial, last_annual_credit_reset_year
    FROM profiles_employer
    WHERE has_premium_indefinite_trial = 0
    AND (last_annual_credit_reset_year IS NULL OR last_annual_credit_reset_year < ?)
  `).all(currentYear);
  
  for (const emp of employers) {
    if (emp.current_job_posting_credits > 0)
      logCreditTransaction(emp.user_id, 'job_posting', -emp.current_job_posting_credits, 'annual_reset', null, null);
    if (emp.current_ai_matching_credits > 0)
      logCreditTransaction(emp.user_id, 'ai_matching', -emp.current_ai_matching_credits, 'annual_reset', null, null);
    if (emp.current_candidate_search_credits > 0)
      logCreditTransaction(emp.user_id, 'candidate_search', -emp.current_candidate_search_credits, 'annual_reset', null, null);
    
    db.prepare('UPDATE profiles_employer SET last_annual_credit_reset_year = ? WHERE user_id = ?').run(currentYear, emp.user_id);
    results.employers++;
  }
  
  // Jobseekers
  const jobseekers = db.prepare(`
    SELECT user_id, current_alert_credits, has_premium_indefinite_trial, last_annual_credit_reset_year
    FROM profiles_jobseeker
    WHERE has_premium_indefinite_trial = 0
    AND (last_annual_credit_reset_year IS NULL OR last_annual_credit_reset_year < ?)
  `).all(currentYear);
  
  for (const js of jobseekers) {
    if (js.current_alert_credits > 0)
      logCreditTransaction(js.user_id, 'alert', -js.current_alert_credits, 'annual_reset', null, null);
    
    db.prepare('UPDATE profiles_jobseeker SET last_annual_credit_reset_year = ? WHERE user_id = ?').run(currentYear, js.user_id);
    results.jobseekers++;
  }
  
  return results;
}

// ─── Status Queries ─────────────────────────────────────────────────

/**
 * Get full credit & billing status for a user
 */
function getCreditStatus(userId) {
  const user = db.prepare('SELECT id, role, name, email FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  
  const trial = hasActiveTrial(userId);
  
  if (user.role === 'employer') {
    const profile = db.prepare(`
      SELECT current_job_posting_credits, current_ai_matching_credits, current_candidate_search_credits,
             feature_tier, has_standard_trial_activated, standard_trial_end_date,
             has_premium_indefinite_trial, premium_trial_override_by, last_annual_credit_reset_year,
             total_jobs_posted
      FROM profiles_employer WHERE user_id = ?
    `).get(userId);
    
    if (!profile) return null;
    
    const activeJobs = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = 'active'").get(userId).n;
    
    return {
      role: 'employer',
      credits: {
        job_posting: profile.current_job_posting_credits || 0,
        ai_matching: profile.current_ai_matching_credits || 0,
        candidate_search: profile.current_candidate_search_credits || 0,
      },
      featureTier: profile.feature_tier || 'free',
      trial: trial.active ? trial : null,
      trialUsed: !!profile.has_standard_trial_activated,
      activeJobs,
      totalJobsPosted: profile.total_jobs_posted || 0,
      lastAnnualReset: profile.last_annual_credit_reset_year,
    };
  } else if (user.role === 'jobseeker') {
    const profile = db.prepare(`
      SELECT current_alert_credits, auto_apply_enabled, has_standard_trial_activated,
             standard_trial_end_date, has_premium_indefinite_trial, last_annual_credit_reset_year
      FROM profiles_jobseeker WHERE user_id = ?
    `).get(userId);
    
    if (!profile) return null;
    
    return {
      role: 'jobseeker',
      credits: { alert: profile.current_alert_credits || 0 },
      autoApply: !!profile.auto_apply_enabled,
      trial: trial.active ? trial : null,
      trialUsed: !!profile.has_standard_trial_activated,
      lastAnnualReset: profile.last_annual_credit_reset_year,
    };
  }
  
  return { role: user.role, credits: {}, trial: null };
}

/**
 * Get credit transaction history for a user
 */
function getCreditTransactions(userId, limit = 50, offset = 0) {
  return db.prepare(`
    SELECT * FROM credit_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, limit, offset);
}

// ─── Legacy Compatibility ───────────────────────────────────────────

/**
 * Legacy getSubscriptionStatus wrapper (for backward compat)
 */
function getSubscriptionStatus(employerId) {
  const status = getCreditStatus(employerId);
  if (!status) return { plan: 'Free', price: 0, currency: 'PGK' };
  
  return {
    plan: status.featureTier === 'free' ? 'Free' : status.featureTier.charAt(0).toUpperCase() + status.featureTier.slice(1),
    credits: status.credits,
    trial: status.trial,
    trialUsed: status.trialUsed,
    activeJobs: status.activeJobs,
    featureTier: status.featureTier,
  };
}

/**
 * Legacy activatePlan wrapper — maps old plan activation to credit system
 */
function activatePlan(orderId) {
  return approveOrder(orderId, null);
}

module.exports = {
  BANK_DETAILS,
  // Core credit operations
  logCreditTransaction,
  consumeEmployerServiceCredit,
  consumeJobSeekerAlertCredit,
  addCreditPackage,
  canPostJob,
  // Trial system
  hasActiveTrial,
  activateEmployerStandardTrial,
  activateJobSeekerStandardTrial,
  grantPremiumIndefiniteTrial,
  revokePremiumIndefiniteTrial,
  // Order management
  approveOrder,
  rejectOrder,
  // Annual reset
  resetAnnualCredits,
  // Status queries
  getCreditStatus,
  getCreditTransactions,
  // Legacy compat
  getSubscriptionStatus,
  activatePlan,
};
