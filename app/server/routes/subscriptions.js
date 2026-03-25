const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const dbPath = path.join(__dirname, '../data/wantokjobs.db');

function getDb() {
  return new Database(dbPath);
}

// GET /api/subscriptions/tiers - List all available subscription tiers
router.get('/tiers', (req, res) => {
  const db = getDb();
  try {
    const { tier_type } = req.query;
    let query = `
      SELECT st.*, 
             COALESCE(pc.price_pgk, st.price_pgk) as price_pgk,
             COALESCE(pc.price_usd, st.price_usd) as price_usd
      FROM subscription_tiers st
      LEFT JOIN pricing_config pc ON st.pricing_config_id = pc.id AND pc.is_active = 1
      WHERE st.is_active = 1
    `;
    const params = [];
    if (tier_type) {
      query += ' AND st.tier_type = ?';
      params.push(tier_type);
    }
    query += ' ORDER BY st.display_order ASC';
    const stmt = db.prepare(query);
    const tiers = stmt.all(...params);
    const tiersWithFeatures = tiers.map(tier => ({
      ...tier,
      features: JSON.parse(tier.features)
    }));
    res.json({ success: true, tiers: tiersWithFeatures });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription tiers' });
  } finally {
    db.close();
  }
});

// GET /api/subscriptions/current - Get current user active subscription
router.get('/current', authenticateToken, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user.id;
    const stmt = db.prepare(`
      SELECT us.*, st.name as tier_name, st.tier_type, 
             COALESCE(pc.price_pgk, st.price_pgk) as price_pgk,
             COALESCE(pc.price_usd, st.price_usd) as price_usd,
             st.billing_period, st.features, st.credits_per_period, st.max_active_jobs,
             st.priority_support
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      LEFT JOIN pricing_config pc ON st.pricing_config_id = pc.id AND pc.is_active = 1
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC LIMIT 1
    `);
    const subscription = stmt.get(userId);
    if (!subscription) {
      return res.json({ success: true, subscription: null, message: 'No active subscription found' });
    }
    subscription.features = JSON.parse(subscription.features);
    const endDate = new Date(subscription.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    res.json({
      success: true,
      subscription: { ...subscription, days_remaining: daysRemaining, is_expired: daysRemaining < 0 }
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  } finally {
    db.close();
  }
});

// POST /api/subscriptions/subscribe - Create new subscription
router.post('/subscribe', authenticateToken, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user.id;
    const { tier_id, payment_method } = req.body;
    if (!tier_id) {
      return res.status(400).json({ success: false, error: 'tier_id is required' });
    }
    const tierStmt = db.prepare(`
      SELECT st.*,
             COALESCE(pc.price_pgk, st.price_pgk) as price_pgk,
             COALESCE(pc.price_usd, st.price_usd) as price_usd
      FROM subscription_tiers st
      LEFT JOIN pricing_config pc ON st.pricing_config_id = pc.id AND pc.is_active = 1
      WHERE st.tier_id = ? AND st.is_active = 1
    `);
    const tier = tierStmt.get(tier_id);
    if (!tier) {
      return res.status(404).json({ success: false, error: 'Subscription tier not found or inactive' });
    }
    const activeSubStmt = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?');
    const activeSub = activeSubStmt.get(userId, 'active');
    if (activeSub) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription. Please cancel or upgrade existing subscription.'
      });
    }
    const startDate = new Date().toISOString();
    let endDate;
    if (tier.billing_period === 'monthly') {
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (tier.billing_period === 'annual') {
      endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (tier.billing_period === 'per_job') {
      endDate = new Date('2099-12-31');
    }
    endDate = endDate.toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO user_subscriptions (
        user_id, tier_id, start_date, end_date, auto_renew, status, payment_method, next_billing_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertStmt.run(
      userId, tier_id, startDate, endDate, 1, 'active', payment_method || 'manual',
      tier.billing_period !== 'per_job' ? endDate : null
    );
    const subscriptionId = result.lastInsertRowid;
    const historyStmt = db.prepare(`
      INSERT INTO subscription_history (
        subscription_id, billing_date, amount_pgk, amount_usd, payment_status, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    historyStmt.run(subscriptionId, startDate, tier.price_pgk, tier.price_usd, 'paid', payment_method || 'manual');
    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription: {
        subscription_id: subscriptionId,
        tier_name: tier.name,
        start_date: startDate,
        end_date: endDate,
        price_pgk: tier.price_pgk,
        price_usd: tier.price_usd
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to create subscription' });
  } finally {
    db.close();
  }
});

// PUT /api/subscriptions/manage - Update or cancel subscription
router.put('/manage', authenticateToken, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user.id;
    const { action, auto_renew } = req.body;
    const subStmt = db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?');
    const subscription = subStmt.get(userId, 'active');
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }
    if (action === 'cancel') {
      const updateStmt = db.prepare('UPDATE user_subscriptions SET status = ?, auto_renew = 0 WHERE subscription_id = ?');
      updateStmt.run('cancelled', subscription.subscription_id);
      res.json({ success: true, message: 'Subscription cancelled successfully', subscription: { ...subscription, status: 'cancelled', auto_renew: 0 } });
    } else if (action === 'update_renewal') {
      if (typeof auto_renew !== 'boolean') {
        return res.status(400).json({ success: false, error: 'auto_renew must be a boolean' });
      }
      const updateStmt = db.prepare('UPDATE user_subscriptions SET auto_renew = ? WHERE subscription_id = ?');
      updateStmt.run(auto_renew ? 1 : 0, subscription.subscription_id);
      res.json({ success: true, message: 'Auto-renewal setting updated', subscription: { ...subscription, auto_renew: auto_renew ? 1 : 0 } });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action. Use "cancel" or "update_renewal"' });
    }
  } catch (error) {
    console.error('Error managing subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to manage subscription' });
  } finally {
    db.close();
  }
});

// GET /api/subscriptions/history - Get billing history
router.get('/history', authenticateToken, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user.id;
    const stmt = db.prepare(`
      SELECT sh.*, st.name as tier_name
      FROM subscription_history sh
      JOIN user_subscriptions us ON sh.subscription_id = us.subscription_id
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ?
      ORDER BY sh.billing_date DESC
    `);
    const history = stmt.all(userId);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch billing history' });
  } finally {
    db.close();
  }
});

// POST /api/subscriptions/validate-feature - Check feature access
router.post('/validate-feature', authenticateToken, (req, res) => {
  const db = getDb();
  try {
    const userId = req.user.id;
    const { feature_name } = req.body;
    if (!feature_name) {
      return res.status(400).json({ success: false, error: 'feature_name is required' });
    }
    const subStmt = db.prepare(`
      SELECT us.*, st.features
      FROM user_subscriptions us
      JOIN subscription_tiers st ON us.tier_id = st.tier_id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC LIMIT 1
    `);
    const subscription = subStmt.get(userId);
    if (!subscription) {
      return res.json({ success: true, has_access: false, message: 'No active subscription' });
    }
    const features = JSON.parse(subscription.features);
    const hasAccess = features.includes(feature_name);
    res.json({ success: true, has_access: hasAccess, feature_name, tier_id: subscription.tier_id });
  } catch (error) {
    console.error('Error validating feature access:', error);
    res.status(500).json({ success: false, error: 'Failed to validate feature access' });
  } finally {
    db.close();
  }
});

module.exports = router;
