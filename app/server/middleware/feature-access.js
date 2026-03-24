/**
 * Feature Access Middleware
 * 
 * Controls access to premium features based on subscription tier.
 * Blocks access if user doesn't have required feature in their subscription.
 * 
 * Usage:
 * - app.use('/api/premium-feature', requireFeature('ai_matching'));
 * - Checks if user's subscription includes required feature
 * - Returns 403 Forbidden with upgrade message if feature not available
 * 
 * Task 20 Phase 2 - Milestone 4 (Middleware & Logic)
 */

const db = require('../database');

/**
 * Middleware factory to require specific feature
 * @param {string} featureName - Feature name to check (e.g., 'ai_matching', 'priority_support')
 * @returns {Function} Express middleware
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this feature'
        });
      }

      const hasAccess = await checkFeatureAccess(req.user.id, featureName);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `This feature requires a premium subscription with ${featureName.replace(/_/g, ' ')} access.`,
          feature: featureName,
          upgrade_url: '/subscriptions'
        });
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify feature access. Please try again later.'
      });
    }
  };
};

/**
 * Check if user has access to specific feature
 * @param {number} userId - User ID
 * @param {string} featureName - Feature name to check
 * @returns {Promise<boolean>} True if user has access, false otherwise
 */
const checkFeatureAccess = async (userId, featureName) => {
  try {
    const subscription = db.prepare(`
      SELECT st.features
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ? AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > datetime('now'))
      ORDER BY us.start_date DESC LIMIT 1
    `).get(userId);

    if (!subscription || !subscription.features) {
      return false;
    }

    const features = JSON.parse(subscription.features);
    return features.includes(featureName);
  } catch (error) {
    console.error('Feature access check error:', error);
    return false;
  }
};

/**
 * Get all features for user's subscription
 * @param {number} userId - User ID
 * @returns {Promise<Array<string>>} Array of feature names
 */
const getSubscriptionFeatures = async (userId) => {
  try {
    const subscription = db.prepare(`
      SELECT st.features
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ? AND us.status = 'active'
      AND (us.end_date IS NULL OR us.end_date > datetime('now'))
      ORDER BY us.start_date DESC LIMIT 1
    `).get(userId);

    if (!subscription || !subscription.features) {
      return [];
    }

    return JSON.parse(subscription.features);
  } catch (error) {
    console.error('Get subscription features error:', error);
    return [];
  }
};

module.exports = { requireFeature, checkFeatureAccess, getSubscriptionFeatures };
