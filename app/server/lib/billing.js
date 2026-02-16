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
 * Check expired plans → auto-create renewal invoices
 * Run daily via cron. Flow:
 *   Plan expires → create renewal order (status: pending) → email invoice
 *   If unpaid after 3/7/14 days → send reminders
 *   If unpaid after 21 days → downgrade to Free + final notice
 */
function checkExpiredPlans() {
  const results = { renewed: 0, reminded: 0, downgraded: 0, details: [] };

  // 1. Plans expiring today or already expired (with active plan) → auto-renew
  const expired = db.prepare(`
    SELECT pe.user_id, pe.subscription_plan_id, pe.plan_expires_at, 
           u.email, u.name, p.id as plan_id, p.name as plan_name, p.price, p.currency
    FROM profiles_employer pe
    JOIN users u ON pe.user_id = u.id
    JOIN plans p ON pe.subscription_plan_id = p.id
    WHERE pe.plan_expires_at IS NOT NULL 
    AND pe.plan_expires_at < datetime('now')
    AND pe.subscription_plan_id IS NOT NULL
    AND p.price > 0
  `).all();

  for (const emp of expired) {
    // Check if there's already a pending renewal order
    const existingOrder = db.prepare(
      "SELECT id FROM orders WHERE employer_id = ? AND plan_id = ? AND status = 'pending' AND notes LIKE '%renewal%'"
    ).get(emp.user_id, emp.plan_id);

    if (!existingOrder) {
      // Create renewal order
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const dayCount = db.prepare("SELECT COUNT(*) as n FROM orders WHERE created_at >= date('now')").get().n + 1;
      const invoice = `WJ-${dateStr}-${String(dayCount).padStart(4, '0')}`;

      db.prepare(`
        INSERT INTO orders (employer_id, plan_id, amount, currency, status, payment_method, invoice_number, notes)
        VALUES (?, ?, ?, ?, 'pending', 'bank_transfer', ?, ?)
      `).run(emp.user_id, emp.plan_id, emp.price, emp.currency, invoice, `Auto-renewal of ${emp.plan_name} plan`);

      // Keep plan active during grace period (21 days)
      const gracePeriod = new Date(Date.now() + 21 * 86400000).toISOString();
      db.prepare('UPDATE profiles_employer SET plan_expires_at = ? WHERE user_id = ?')
        .run(gracePeriod, emp.user_id);

      // Notify employer
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'invoice', 'Subscription Renewal Invoice', ?, ?)
      `).run(emp.user_id,
        `Your ${emp.plan_name} plan has been renewed. Invoice ${invoice} for K${emp.price.toLocaleString()} has been generated. Please complete payment via bank transfer to keep your plan active.`,
        JSON.stringify({ invoice, orderId: null, planName: emp.plan_name })
      );

      results.renewed++;
      results.details.push({ action: 'renewed', user: emp.email, plan: emp.plan_name, invoice });
    }
  }

  // 2. Send reminders for unpaid invoices (3, 7, 14 days old)
  const unpaidOrders = db.prepare(`
    SELECT o.id, o.employer_id, o.invoice_number, o.amount, o.currency, o.created_at, o.notes,
           u.email, u.name, p.name as plan_name,
           CAST(julianday('now') - julianday(o.created_at) AS INTEGER) as days_old
    FROM orders o
    JOIN users u ON o.employer_id = u.id
    JOIN plans p ON o.plan_id = p.id
    WHERE o.status = 'pending'
    AND o.notes LIKE '%renewal%'
  `).all();

  for (const order of unpaidOrders) {
    const daysOld = order.days_old;

    // Send reminders at 3, 7, 14 days
    if ([3, 7, 14].includes(daysOld)) {
      const urgency = daysOld >= 14 ? 'URGENT' : daysOld >= 7 ? 'Important' : 'Friendly';
      const daysLeft = 21 - daysOld;

      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'payment_reminder', ?, ?, ?)
      `).run(
        order.employer_id,
        `${urgency}: Payment Due — ${order.plan_name}`,
        daysOld >= 14
          ? `⚠️ Your invoice ${order.invoice_number} (K${order.amount.toLocaleString()}) is ${daysOld} days overdue. Your plan will be downgraded to Free in ${daysLeft} days if payment is not received. Please transfer to BSP account and use "${order.invoice_number}" as reference.`
          : daysOld >= 7
          ? `Your invoice ${order.invoice_number} (K${order.amount.toLocaleString()}) for the ${order.plan_name} plan is now ${daysOld} days old. Please complete your bank transfer to keep your plan active. ${daysLeft} days remaining.`
          : `Just a reminder — your renewal invoice ${order.invoice_number} (K${order.amount.toLocaleString()}) for the ${order.plan_name} plan is awaiting payment. Transfer to BSP and use "${order.invoice_number}" as reference.`,
        JSON.stringify({ invoice: order.invoice_number, daysOld, daysLeft })
      );

      results.reminded++;
      results.details.push({ action: `reminder_${daysOld}d`, user: order.email, invoice: order.invoice_number });
    }

    // 3. Downgrade after 21 days unpaid
    if (daysOld >= 21) {
      // Downgrade to free
      db.prepare('UPDATE profiles_employer SET subscription_plan_id = NULL, plan_expires_at = NULL WHERE user_id = ?')
        .run(order.employer_id);

      // Mark order as overdue
      db.prepare("UPDATE orders SET status = 'overdue', notes = ? WHERE id = ?")
        .run(`${order.notes || ''} | Downgraded after 21 days unpaid`, order.id);

      // Notify
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, 'plan_downgraded', 'Plan Downgraded to Free', ?, ?)
      `).run(
        order.employer_id,
        `Your ${order.plan_name} plan has been downgraded to the Free tier because invoice ${order.invoice_number} (K${order.amount.toLocaleString()}) was not paid within 21 days. You can resubscribe anytime from the Pricing page. If you have already paid, please contact support.`,
        JSON.stringify({ invoice: order.invoice_number, previousPlan: order.plan_name })
      );

      results.downgraded++;
      results.details.push({ action: 'downgraded', user: order.email, plan: order.plan_name, invoice: order.invoice_number });
    }
  }

  return results;
}

/**
 * Send invoice emails for all pending renewal orders
 * Called by the billing cron after checkExpiredPlans()
 */
function sendRenewalEmails() {
  const { sendEmail } = require('./email');
  const results = { sent: 0, errors: 0 };

  // Get all pending renewal orders that haven't had an email today
  const pendingRenewals = db.prepare(`
    SELECT o.id, o.employer_id, o.invoice_number, o.amount, o.currency, o.created_at,
           u.email, u.name, p.name as plan_name,
           CAST(julianday('now') - julianday(o.created_at) AS INTEGER) as days_old
    FROM orders o
    JOIN users u ON o.employer_id = u.id
    JOIN plans p ON o.plan_id = p.id
    WHERE o.status = 'pending'
    AND o.notes LIKE '%renewal%'
  `).all();

  for (const order of pendingRenewals) {
    // Only email on creation day (0) and reminder days (3, 7, 14)
    if (![0, 3, 7, 14].includes(order.days_old)) continue;

    const daysLeft = 21 - order.days_old;
    const isUrgent = order.days_old >= 14;
    const isReminder = order.days_old > 0;

    const subject = isUrgent
      ? `⚠️ URGENT: Invoice ${order.invoice_number} — ${daysLeft} days to pay`
      : isReminder
      ? `Reminder: Invoice ${order.invoice_number} — ${order.plan_name} renewal`
      : `Invoice ${order.invoice_number} — ${order.plan_name} plan renewal`;

    sendEmail({
      to: order.email, toName: order.name, tags: ['billing', 'renewal'],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:${isUrgent ? '#dc2626' : '#16a34a'};padding:24px;text-align:center;">
          <h1 style="color:white;margin:0;">WantokJobs</h1>
        </div>
        <div style="padding:28px;">
          <p style="font-size:16px;color:#111827;">Hi ${order.name},</p>
          ${isUrgent ? `
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin:16px 0;">
              <p style="margin:0;font-size:14px;color:#991b1b;">
                ⚠️ <strong>Your plan will be downgraded to Free in ${daysLeft} days</strong> if payment is not received.
              </p>
            </div>
          ` : ''}
          <p style="font-size:15px;color:#374151;line-height:1.7;">
            ${isReminder
              ? `This is a reminder that your <strong>${order.plan_name}</strong> plan renewal invoice is still pending.`
              : `Your <strong>${order.plan_name}</strong> plan has expired and a renewal invoice has been generated.`}
          </p>
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:20px 0;background:#f9fafb;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
              <tr><td style="padding:4px 0;color:#6b7280;">Invoice</td><td style="padding:4px 0;text-align:right;color:#111827;"><strong>${order.invoice_number}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;">Plan</td><td style="padding:4px 0;text-align:right;color:#111827;">${order.plan_name}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;">Amount Due</td><td style="padding:4px 0;text-align:right;color:#111827;"><strong style="font-size:18px;">K${order.amount.toLocaleString()}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;">Payment Due</td><td style="padding:4px 0;text-align:right;color:${isUrgent ? '#dc2626' : '#111827'};">${daysLeft} days remaining</td></tr>
            </table>
          </div>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><strong>💳 Bank Transfer Details:</strong></p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#1e40af;">
              <tr><td style="padding:3px 0;width:100px;">Bank</td><td style="padding:3px 0;"><strong>${BANK_DETAILS.bank}</strong></td></tr>
              <tr><td style="padding:3px 0;">Account</td><td style="padding:3px 0;"><strong>${BANK_DETAILS.accountName}</strong></td></tr>
              <tr><td style="padding:3px 0;">Account No.</td><td style="padding:3px 0;"><strong>${BANK_DETAILS.accountNumber}</strong></td></tr>
              <tr><td style="padding:3px 0;">Branch</td><td style="padding:3px 0;">${BANK_DETAILS.branch}</td></tr>
              <tr><td style="padding:3px 0;">Reference</td><td style="padding:3px 0;"><strong style="color:#dc2626;">${order.invoice_number}</strong></td></tr>
            </table>
          </div>
          <p style="text-align:center;margin:24px 0 8px;">
            <a href="${process.env.APP_URL || 'https://wantokjobs.com'}/dashboard/employer/orders-billing" style="background:#16a34a;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">View My Orders</a>
          </p>
          <p style="font-size:13px;color:#6b7280;margin-top:16px;text-align:center;">
            Already paid? It can take up to 24 hours for manual verification. Contact support@wantokjobs.com if needed.
          </p>
        </div>
        <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
          WantokJobs — Connecting Papua New Guinea's talent with opportunity
        </div>
      </div>`,
    }).then(() => results.sent++).catch(() => results.errors++);
  }

  return results;
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
  sendRenewalEmails,
  getSubscriptionStatus,
};
