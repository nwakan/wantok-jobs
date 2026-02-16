/**
 * Credits & Billing API Routes
 * 
 * GET  /api/credits/status         — Current credit balances + trial info
 * GET  /api/credits/transactions   — Credit transaction history
 * GET  /api/credits/packages       — Available packages for purchase
 * POST /api/credits/trial/activate — Activate standard trial (one-time)
 * POST /api/credits/purchase       — Create order for a package
 * 
 * Admin:
 * POST /api/credits/admin/grant-trial     — Grant premium indefinite trial
 * POST /api/credits/admin/revoke-trial    — Revoke premium indefinite trial
 * POST /api/credits/admin/grant-credits   — Manually add credits
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const {
  getCreditStatus,
  getCreditTransactions,
  activateEmployerStandardTrial,
  activateJobSeekerStandardTrial,
  grantPremiumIndefiniteTrial,
  revokePremiumIndefiniteTrial,
  logCreditTransaction,
} = require('../lib/billing');

// GET /status — Current user's credit status
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = getCreditStatus(req.user.id);
    if (!status) return res.status(404).json({ error: 'Profile not found' });
    res.json(status);
  } catch (error) {
    console.error('Credit status error:', error);
    res.status(500).json({ error: 'Failed to fetch credit status' });
  }
});

// GET /transactions — Credit transaction history
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const transactions = getCreditTransactions(req.user.id, parseInt(limit), parseInt(offset));
    const total = db.prepare('SELECT COUNT(*) as n FROM credit_transactions WHERE user_id = ?').get(req.user.id).n;
    res.json({ transactions, total });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /packages — Available packages for the user's role
router.get('/packages', authenticateToken, (req, res) => {
  try {
    const packages = db.prepare(`
      SELECT * FROM packages 
      WHERE target_role = ? AND active = 1 AND package_type IN ('service_package', 'free')
      ORDER BY sort_order ASC
    `).all(req.user.role);
    res.json({ packages });
  } catch (error) {
    console.error('Packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// GET /packages/all — All packages (public, for pricing page)
router.get('/packages/all', (req, res) => {
  try {
    const packages = db.prepare(`
      SELECT * FROM packages 
      WHERE active = 1 AND package_type IN ('service_package', 'free')
      ORDER BY target_role, sort_order ASC
    `).all();
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// POST /trial/activate — Activate standard trial
router.post('/trial/activate', authenticateToken, (req, res) => {
  try {
    let result;
    if (req.user.role === 'employer') {
      result = activateEmployerStandardTrial(req.user.id);
    } else if (req.user.role === 'jobseeker') {
      result = activateJobSeekerStandardTrial(req.user.id);
    } else {
      return res.status(400).json({ error: 'Trials are for employers and jobseekers' });
    }
    
    if (!result.success) return res.status(400).json({ error: result.error });
    
    // Notify
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, 'trial_activated', 'Free Trial Activated! 🎉', ?, NULL)
    `).run(req.user.id, `Your 14-day free trial is now active! Explore all features until ${new Date(result.trialEndsAt).toLocaleDateString()}. No credit card required.`);
    
    res.json(result);
  } catch (error) {
    console.error('Trial activation error:', error);
    res.status(500).json({ error: 'Failed to activate trial' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────

// POST /admin/grant-trial — Admin grants premium indefinite trial
router.post('/admin/grant-trial', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    
    const result = grantPremiumIndefiniteTrial(user_id, req.user.email);
    if (!result.success) return res.status(400).json({ error: result.error });
    
    // Notify user
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (?, 'premium_trial_granted', 'Premium Access Granted! 🌟', 'You now have unlimited premium access to all WantokJobs features. This was granted by an administrator.', NULL)
    `).run(user_id);
    
    res.json(result);
  } catch (error) {
    console.error('Grant trial error:', error);
    res.status(500).json({ error: 'Failed to grant trial' });
  }
});

// POST /admin/revoke-trial — Admin revokes premium trial
router.post('/admin/revoke-trial', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    
    const result = revokePremiumIndefiniteTrial(user_id);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke trial' });
  }
});

// POST /admin/grant-credits — Admin manually adds credits
router.post('/admin/grant-credits', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { user_id, credit_type, amount, reason } = req.body;
    if (!user_id || !credit_type || !amount) {
      return res.status(400).json({ error: 'user_id, credit_type, and amount required' });
    }
    
    const newBalance = logCreditTransaction(user_id, credit_type, parseInt(amount), reason || 'admin_grant', null, null);
    
    // Log activity
    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
        .run(req.user.id, 'admin_grant_credits', 'user', user_id, JSON.stringify({ credit_type, amount, reason }));
    } catch(e) {}
    
    res.json({ success: true, newBalance, credit_type, amount: parseInt(amount) });
  } catch (error) {
    console.error('Grant credits error:', error);
    res.status(500).json({ error: error.message || 'Failed to grant credits' });
  }
});

module.exports = router;
