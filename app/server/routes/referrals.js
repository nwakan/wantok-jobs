const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const billing = require('../lib/billing');
const logger = require('../utils/logger');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(name) {
  const prefix = (name || 'USR').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
  let rand = '';
  for (let i = 0; i < 5; i++) rand += CHARS[Math.floor(Math.random() * CHARS.length)];
  return `WJ-${prefix}-${rand}`;
}

function ensureReferralCode(userId) {
  const user = db.prepare('SELECT id, name, referral_code FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  if (user.referral_code) return user.referral_code;

  let code, attempts = 0;
  do {
    code = generateCode(user.name);
    attempts++;
  } while (attempts < 100 && db.prepare('SELECT 1 FROM users WHERE referral_code = ?').get(code));

  db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, userId);
  return code;
}

// GET /api/referrals/my-code
router.get('/my-code', authenticateToken, (req, res) => {
  try {
    const code = ensureReferralCode(req.user.id);
    if (!code) return res.status(404).json({ error: 'User not found' });
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.json({
      code,
      link: `${baseUrl}/register?ref=${code}`,
    });
  } catch (err) {
    logger.error('Referral code error', { error: err.message });
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// GET /api/referrals/stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_referred,
        SUM(CASE WHEN status IN ('completed','credited') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'credited' THEN credits_earned ELSE 0 END) as total_credits
      FROM referrals WHERE referrer_id = ?
    `).get(req.user.id);

    const recent = db.prepare(`
      SELECT r.referred_email, r.status, r.credits_earned, r.created_at, r.completed_at,
             u.name as referred_name
      FROM referrals r
      LEFT JOIN users u ON u.id = r.referred_user_id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC LIMIT 10
    `).all(req.user.id);

    res.json({
      total_referred: stats.total_referred || 0,
      completed: stats.completed || 0,
      total_credits: stats.total_credits || 0,
      recent,
    });
  } catch (err) {
    logger.error('Referral stats error', { error: err.message });
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// POST /api/referrals/track — track referral click, set cookie
router.post('/track', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Referral code required' });

    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code);
    if (!referrer) return res.status(404).json({ error: 'Invalid referral code' });

    // Set cookie for 30 days
    res.cookie('ref_code', code, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Referral track error', { error: err.message });
    res.status(500).json({ error: 'Failed to track referral' });
  }
});

/**
 * Process referral on registration. Call from auth register route.
 * @param {number} newUserId
 * @param {string} email
 * @param {string|null} refCode - from cookie or query
 */
function processReferral(newUserId, email, refCode) {
  if (!refCode) return;
  try {
    const referrer = db.prepare('SELECT id, role FROM users WHERE referral_code = ?').get(refCode);
    if (!referrer || referrer.id === newUserId) return;

    // Check if already referred
    const existing = db.prepare('SELECT id FROM referrals WHERE referred_email = ? AND referrer_id = ?').get(email, referrer.id);
    if (existing) {
      // Update existing pending referral
      db.prepare(`
        UPDATE referrals SET referred_user_id = ?, status = 'completed', completed_at = datetime('now')
        WHERE id = ?
      `).run(newUserId, existing.id);
    } else {
      db.prepare(`
        INSERT INTO referrals (referrer_id, referred_email, referred_user_id, referral_code, status, completed_at)
        VALUES (?, ?, ?, ?, 'completed', datetime('now'))
      `).run(referrer.id, email, newUserId, refCode);
    }

    // Credit both parties
    try {
      billing.logCreditTransaction(referrer.id, referrer.role === 'employer' ? 'job_post' : 'alert', 50, 'Referral bonus - friend joined', 'referral', newUserId);
    } catch (e) {
      logger.error('Referral credit (referrer) error', { error: e.message });
    }

    const newUser = db.prepare('SELECT role FROM users WHERE id = ?').get(newUserId);
    try {
      billing.logCreditTransaction(newUserId, newUser?.role === 'employer' ? 'job_post' : 'alert', 25, 'Welcome bonus - referred by friend', 'referral', referrer.id);
    } catch (e) {
      logger.error('Referral credit (new user) error', { error: e.message });
    }

    // Mark as credited
    db.prepare(`
      UPDATE referrals SET status = 'credited', credits_earned = 50
      WHERE referrer_id = ? AND referred_user_id = ? AND status = 'completed'
    `).run(referrer.id, newUserId);

  } catch (err) {
    logger.error('Process referral error', { error: err.message });
  }
}

module.exports = router;
module.exports.processReferral = processReferral;
module.exports.ensureReferralCode = ensureReferralCode;
