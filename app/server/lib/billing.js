/**
 * WantokJobs Billing & Subscription Engine
 * 
 * Manual bank transfer flow:
 * 1. Employer selects plan → order created (status: pending)
 * 2. Employer transfers to bank account
 * 3. Admin verifies payment → marks order as paid
 * 4. System activates plan on employer profile
 * 5. Cron checks for expired plans daily
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

/**
 * Check if employer can post a job based on their plan
 * Returns { allowed: bool, reason: string, plan: object|null, usage: object }
 */
function canPostJob(employerId) {
  const profile = db.prepare(`
    SELECT subscription_plan_id, plan_expires_at, total_jobs_posted 
    FROM profiles_employer WHERE user_id = ?
  `).get(employerId);

  if (!profile) {
    return { allowed: false, reason: 'Employer profile not found' };
  }

  const planId = profile.subscription_plan_id;
  const expiresAt = profile.plan_expires_at;

  // No plan = free tier
  if (!planId) {
    const freePlan = db.prepare('SELECT * FROM plans WHERE name = ? AND active = 1').get('Free');
    const activeJobCount = db.prepare(
      'SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = ?'
    ).get(employerId, 'active').n;

    if (!freePlan) return { allowed: true, plan: null, usage: { active: activeJobCount, limit: 1 } };

    return {
      allowed: activeJobCount < freePlan.job_limit,
      reason: activeJobCount >= freePlan.job_limit
        ? `Free plan allows ${freePlan.job_limit} active job${freePlan.job_limit > 1 ? 's' : ''}. Upgrade your plan to post more.`
        : null,
      plan: freePlan,
      usage: { active: activeJobCount, limit: freePlan.job_limit },
    };
  }

  // Has plan — check expiry
  if (expiresAt && new Date(expiresAt) < new Date()) {
    // Plan expired — reset to free
    db.prepare('UPDATE profiles_employer SET subscription_plan_id = NULL, plan_expires_at = NULL WHERE user_id = ?').run(employerId);
    return canPostJob(employerId); // Recurse with free tier
  }

  // Active plan — check limit
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
  if (!plan) return { allowed: true, plan: null, usage: {} };

  const activeJobCount = db.prepare(
    'SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = ?'
  ).get(employerId, 'active').n;

  const limit = plan.job_limit === 999 ? Infinity : plan.job_limit;

  return {
    allowed: activeJobCount < limit,
    reason: activeJobCount >= limit
      ? `Your ${plan.name} plan allows ${plan.job_limit} active jobs. You have ${activeJobCount}. Upgrade to post more.`
      : null,
    plan,
    usage: { active: activeJobCount, limit: plan.job_limit },
  };
}

/**
 * Activate a plan for an employer (called when admin approves payment)
 */
function activatePlan(orderId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { success: false, error: 'Order not found' };
  if (order.status === 'completed') return { success: false, error: 'Order already completed' };

  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(order.plan_id);
  if (!plan) return { success: false, error: 'Plan not found' };

  const expiresAt = plan.duration_days > 0
    ? new Date(Date.now() + plan.duration_days * 86400000).toISOString()
    : null;

  // Update employer profile with plan
  db.prepare(`
    UPDATE profiles_employer 
    SET subscription_plan_id = ?, plan_expires_at = ?
    WHERE user_id = ?
  `).run(plan.id, expiresAt, order.employer_id);

  // Mark order as completed
  db.prepare(`
    UPDATE orders SET status = 'completed', completed_at = datetime('now')
    WHERE id = ?
  `).run(orderId);

  return {
    success: true,
    plan: plan.name,
    expiresAt,
    employerId: order.employer_id,
  };
}

/**
 * Reject/cancel an order
 */
function rejectOrder(orderId, reason) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return { success: false, error: 'Order not found' };

  db.prepare("UPDATE orders SET status = 'rejected', notes = ? WHERE id = ?")
    .run(reason || 'Payment not received', orderId);

  return { success: true };
}

/**
 * Check and expire old plans (run daily via cron)
 */
function checkExpiredPlans() {
  const expired = db.prepare(`
    SELECT pe.user_id, pe.subscription_plan_id, pe.plan_expires_at, u.email, u.name, p.name as plan_name
    FROM profiles_employer pe
    JOIN users u ON pe.user_id = u.id
    LEFT JOIN plans p ON pe.subscription_plan_id = p.id
    WHERE pe.plan_expires_at IS NOT NULL 
    AND pe.plan_expires_at < datetime('now')
    AND pe.subscription_plan_id IS NOT NULL
  `).all();

  expired.forEach(emp => {
    db.prepare('UPDATE profiles_employer SET subscription_plan_id = NULL, plan_expires_at = NULL WHERE user_id = ?')
      .run(emp.user_id);
  });

  return { expired: expired.length, details: expired };
}

/**
 * Get employer's current subscription status
 */
function getSubscriptionStatus(employerId) {
  const profile = db.prepare(`
    SELECT pe.subscription_plan_id, pe.plan_expires_at, pe.total_jobs_posted,
           p.name as plan_name, p.price, p.currency, p.job_limit, p.featured_jobs,
           p.resume_views, p.ai_screening, p.priority_support, p.duration_days
    FROM profiles_employer pe
    LEFT JOIN plans p ON pe.subscription_plan_id = p.id
    WHERE pe.user_id = ?
  `).get(employerId);

  if (!profile || !profile.plan_name) {
    const freePlan = db.prepare('SELECT * FROM plans WHERE name = ? AND active = 1').get('Free');
    const activeJobs = db.prepare('SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = ?').get(employerId, 'active').n;
    return {
      plan: 'Free',
      price: 0,
      currency: 'PGK',
      expiresAt: null,
      activeJobs,
      jobLimit: freePlan?.job_limit || 1,
      features: { featured_jobs: 0, resume_views: 10, ai_screening: false, priority_support: false },
    };
  }

  const activeJobs = db.prepare('SELECT COUNT(*) as n FROM jobs WHERE employer_id = ? AND status = ?').get(employerId, 'active').n;
  const daysLeft = profile.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(profile.plan_expires_at) - Date.now()) / 86400000))
    : null;

  return {
    plan: profile.plan_name,
    price: profile.price,
    currency: profile.currency,
    expiresAt: profile.plan_expires_at,
    daysLeft,
    activeJobs,
    jobLimit: profile.job_limit,
    features: {
      featured_jobs: profile.featured_jobs,
      resume_views: profile.resume_views,
      ai_screening: !!profile.ai_screening,
      priority_support: !!profile.priority_support,
    },
  };
}

module.exports = {
  BANK_DETAILS,
  canPostJob,
  activatePlan,
  rejectOrder,
  checkExpiredPlans,
  getSubscriptionStatus,
};
