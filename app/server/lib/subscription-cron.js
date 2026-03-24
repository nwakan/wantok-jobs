/**
 * Subscription Cron Job
 * 
 * Automated subscription management:
 * - Check for expiring subscriptions (7 days, 3 days, 1 day before expiry)
 * - Send email notifications to users
 * - Process auto-renewals
 * - Suspend expired subscriptions
 * - Allocate credits on renewal
 * 
 * Run daily via cron: 0 2 * * * (2 AM daily)
 * 
 * Task 20 Phase 2 - Milestone 4 (Middleware & Logic)
 */

const db = require('../database');
const emailService = require('../services/email');

/**
 * Check for expiring subscriptions and send notifications
 */
const checkExpiringSubscriptions = async () => {
  try {
    console.log('[Subscription Cron] Checking for expiring subscriptions...');

    // Get subscriptions expiring in 7 days
    const expiring7Days = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.end_date,
        u.email, u.name,
        st.name as tier_name, st.price_pgk, st.price_usd
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.status = 'active'
      AND us.end_date IS NOT NULL
      AND date(us.end_date) = date('now', '+7 days')
    `).all();

    // Send 7-day expiry notifications
    for (const sub of expiring7Days) {
      await sendExpiryNotification(sub, 7);
    }

    // Get subscriptions expiring in 3 days
    const expiring3Days = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.end_date,
        u.email, u.name,
        st.name as tier_name, st.price_pgk, st.price_usd
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.status = 'active'
      AND us.end_date IS NOT NULL
      AND date(us.end_date) = date('now', '+3 days')
    `).all();

    // Send 3-day expiry notifications
    for (const sub of expiring3Days) {
      await sendExpiryNotification(sub, 3);
    }

    // Get subscriptions expiring tomorrow
    const expiring1Day = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.end_date,
        u.email, u.name,
        st.name as tier_name, st.price_pgk, st.price_usd
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.status = 'active'
      AND us.end_date IS NOT NULL
      AND date(us.end_date) = date('now', '+1 day')
    `).all();

    // Send 1-day expiry notifications
    for (const sub of expiring1Day) {
      await sendExpiryNotification(sub, 1);
    }

    console.log(`[Subscription Cron] Sent ${expiring7Days.length + expiring3Days.length + expiring1Day.length} expiry notifications`);
  } catch (error) {
    console.error('[Subscription Cron] Error checking expiring subscriptions:', error);
  }
};

/**
 * Send expiry notification email
 */
const sendExpiryNotification = async (subscription, daysRemaining) => {
  try {
    const subject = `Your ${subscription.tier_name} subscription expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
    const message = `
      Hi ${subscription.name},
      
      Your ${subscription.tier_name} subscription will expire on ${subscription.end_date}.
      
      Renew now to continue enjoying premium features:
      - Price: ${subscription.price_pgk} PGK / $${subscription.price_usd} USD
      
      Renew your subscription: https://wantokjobs.com/subscriptions/manage
      
      Questions? Contact us at support@wantokjobs.com
      
      Best regards,
      WantokJobs Team
    `;

    await emailService.send({
      to: subscription.email,
      subject,
      text: message
    });

    console.log(`[Subscription Cron] Sent ${daysRemaining}-day expiry notification to ${subscription.email}`);
  } catch (error) {
    console.error('[Subscription Cron] Error sending expiry notification:', error);
  }
};

/**
 * Process expired subscriptions
 */
const processExpiredSubscriptions = async () => {
  try {
    console.log('[Subscription Cron] Processing expired subscriptions...');

    // Get expired subscriptions
    const expired = db.prepare(`
      SELECT subscription_id, user_id, tier_id
      FROM user_subscriptions
      WHERE status = 'active'
      AND end_date IS NOT NULL
      AND end_date < datetime('now')
    `).all();

    // Suspend expired subscriptions
    const updateStmt = db.prepare(`
      UPDATE user_subscriptions
      SET status = 'expired'
      WHERE subscription_id = ?
    `);

    for (const sub of expired) {
      updateStmt.run(sub.subscription_id);
    }

    console.log(`[Subscription Cron] Suspended ${expired.length} expired subscriptions`);
  } catch (error) {
    console.error('[Subscription Cron] Error processing expired subscriptions:', error);
  }
};

/**
 * Process auto-renewals
 */
const processAutoRenewals = async () => {
  try {
    console.log('[Subscription Cron] Processing auto-renewals...');

    // Get subscriptions due for auto-renewal (expiring tomorrow)
    const renewals = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.tier_id, us.end_date,
        st.billing_period, st.credits_per_period
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.status = 'active'
      AND us.auto_renew = 1
      AND us.end_date IS NOT NULL
      AND date(us.end_date) = date('now', '+1 day')
    `).all();

    for (const renewal of renewals) {
      // Note: Actual payment processing would go here
      // For now, we'll just extend the subscription and allocate credits
      
      const newEndDate = calculateEndDate(renewal.billing_period);
      
      // Update subscription end date
      db.prepare(`
        UPDATE user_subscriptions
        SET end_date = ?
        WHERE subscription_id = ?
      `).run(newEndDate, renewal.subscription_id);

      // Allocate credits
      if (renewal.credits_per_period) {
        db.prepare(`
          INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
          VALUES (?, ?, 'credit', 'Auto-renewal: Monthly subscription credits')
        `).run(renewal.user_id, renewal.credits_per_period);
      }

      console.log(`[Subscription Cron] Auto-renewed subscription ${renewal.subscription_id}`);
    }

    console.log(`[Subscription Cron] Processed ${renewals.length} auto-renewals`);
  } catch (error) {
    console.error('[Subscription Cron] Error processing auto-renewals:', error);
  }
};

/**
 * Calculate end date based on billing period
 */
const calculateEndDate = (billingPeriod) => {
  const now = new Date();
  
  if (billingPeriod === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (billingPeriod === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  }
  
  return now.toISOString();
};

/**
 * Main cron job function
 */
const runSubscriptionCron = async () => {
  console.log('[Subscription Cron] Starting subscription cron job...');
  console.log(`[Subscription Cron] Current time: ${new Date().toISOString()}`);

  try {
    await checkExpiringSubscriptions();
    await processExpiredSubscriptions();
    await processAutoRenewals();

    console.log('[Subscription Cron] Subscription cron job completed successfully');
  } catch (error) {
    console.error('[Subscription Cron] Error in subscription cron job:', error);
  }
};

// Run if called directly
if (require.main === module) {
  runSubscriptionCron().then(() => {
    console.log('[Subscription Cron] Job finished. Exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('[Subscription Cron] Job failed:', error);
    process.exit(1);
  });
}

module.exports = { runSubscriptionCron };
