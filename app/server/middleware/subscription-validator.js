/**
 * Subscription Validator Middleware
 * 
 * Validates user's subscription status and attaches subscription info to request.
 * 
 * Usage:
 * - app.use('/api/protected', validateSubscription);
 * - Blocks access if subscription is not active
 * - Attaches req.subscription with user's subscription data
 * 
 * Task 20 Phase 2 - Milestone 4 (Middleware & Logic)
 */

const db = require('../database');

/**
 * Middleware to validate user's subscription status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this feature'
      });
    }

    const subscription = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.tier_id,
        us.start_date, us.end_date, us.status, us.auto_renew,
        st.name as tier_name, st.tier_type, st.price_pgk, st.price_usd,
        st.billing_period, st.features, st.credits_per_period,
        st.max_active_jobs, st.priority_support
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ? AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > datetime('now'))
      ORDER BY us.start_date DESC LIMIT 1
    `).get(req.user.id);

    if (!subscription) {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'This feature requires an active subscription. Please subscribe to continue.',
        upgrade_url: '/subscriptions'
      });
    }

    subscription.features = subscription.features ? JSON.parse(subscription.features) : [];
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription validation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate subscription. Please try again later.'
    });
  }
};

const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      req.subscription = null;
      return next();
    }

    const subscription = db.prepare(`
      SELECT 
        us.subscription_id, us.user_id, us.tier_id,
        us.start_date, us.end_date, us.status, us.auto_renew,
        st.name as tier_name, st.tier_type, st.price_pgk, st.price_usd,
        st.billing_period, st.features, st.credits_per_period,
        st.max_active_jobs, st.priority_support
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ? AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > datetime('now'))
      ORDER BY us.start_date DESC LIMIT 1
    `).get(req.user.id);

    if (subscription) {
      subscription.features = subscription.features ? JSON.parse(subscription.features) : [];
      req.subscription = subscription;
    } else {
      req.subscription = null;
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    req.subscription = null;
    next();
  }
};

module.exports = { validateSubscription, checkSubscription };
