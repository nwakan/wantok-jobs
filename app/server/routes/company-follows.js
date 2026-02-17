const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/company-follows/:employerId - Follow a company
router.post('/:employerId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const employerId = parseInt(req.params.employerId);

    // Verify employer exists
    const employer = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(employerId, 'employer');
    if (!employer) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Can't follow yourself
    if (userId === employerId) {
      return res.status(400).json({ error: 'Cannot follow your own company' });
    }

    try {
      db.prepare('INSERT INTO company_follows (user_id, employer_id) VALUES (?, ?)').run(userId, employerId);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.json({ message: 'Already following', following: true });
      }
      throw err;
    }

    try { require('./badges').checkAndAwardBadges(req.user.id); } catch {}
    res.status(201).json({ message: 'Now following company', following: true });
  } catch (error) {
    logger.error('Follow company error', { error: error.message });
    res.status(500).json({ error: 'Failed to follow company' });
  }
});

// DELETE /api/company-follows/:employerId - Unfollow a company
router.delete('/:employerId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const employerId = parseInt(req.params.employerId);

    db.prepare('DELETE FROM company_follows WHERE user_id = ? AND employer_id = ?').run(userId, employerId);
    res.json({ message: 'Unfollowed company', following: false });
  } catch (error) {
    logger.error('Unfollow company error', { error: error.message });
    res.status(500).json({ error: 'Failed to unfollow company' });
  }
});

// GET /api/company-follows - Get companies I follow
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const follows = db.prepare(`
      SELECT cf.id, cf.employer_id, cf.created_at,
             pe.company_name, pe.logo_url, pe.industry, pe.location,
             (SELECT COUNT(*) FROM jobs WHERE employer_id = cf.employer_id AND status = 'active') as active_jobs
      FROM company_follows cf
      JOIN profiles_employer pe ON cf.employer_id = pe.user_id
      WHERE cf.user_id = ?
      ORDER BY cf.created_at DESC
    `).all(userId);

    res.json({ data: follows });
  } catch (error) {
    logger.error('Get followed companies error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch followed companies' });
  }
});

// GET /api/company-follows/check/:employerId - Check if following
router.get('/check/:employerId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const employerId = parseInt(req.params.employerId);

    const follow = db.prepare('SELECT id FROM company_follows WHERE user_id = ? AND employer_id = ?').get(userId, employerId);
    res.json({ following: !!follow });
  } catch (error) {
    logger.error('Check follow error', { error: error.message });
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// GET /api/company-follows/followers/:employerId - Get follower count (public)
router.get('/followers/:employerId', (req, res) => {
  try {
    const employerId = parseInt(req.params.employerId);
    const { count } = db.prepare('SELECT COUNT(*) as count FROM company_follows WHERE employer_id = ?').get(employerId);
    res.json({ count });
  } catch (error) {
    logger.error('Get followers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch follower count' });
  }
});

module.exports = router;
