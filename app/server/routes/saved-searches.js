const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/saved-searches — list user's saved searches
router.get('/', authenticateToken, (req, res) => {
  try {
    const searches = db.prepare(
      'SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    // For each search, get matching job count
    const enriched = searches.map(s => {
      const conditions = ['1=1'];
      const params = [];

      if (s.query) {
        conditions.push("(title LIKE ? OR description LIKE ?)");
        params.push(`%${s.query}%`, `%${s.query}%`);
      }
      if (s.category) {
        conditions.push("category = ?");
        params.push(s.category);
      }
      if (s.location) {
        conditions.push("location LIKE ?");
        params.push(`%${s.location}%`);
      }
      if (s.experience_level) {
        conditions.push("experience_level = ?");
        params.push(s.experience_level);
      }
      if (s.salary_min) {
        conditions.push("salary_max >= ?");
        params.push(s.salary_min);
      }
      if (s.salary_max) {
        conditions.push("salary_min <= ?");
        params.push(s.salary_max);
      }

      const count = db.prepare(
        `SELECT COUNT(*) as count FROM jobs WHERE status = 'active' AND ${conditions.join(' AND ')}`
      ).get(...params);

      return { ...s, match_count: count?.count || 0 };
    });

    res.json({ searches: enriched });
  } catch (error) {
    logger.error('List saved searches error', { error: error.message });
    res.status(500).json({ error: 'Failed to load saved searches' });
  }
});

// POST /api/saved-searches — save current search criteria
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, query, category, location, experience_level, salary_min, salary_max, notify } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Limit saved searches per user
    const count = db.prepare('SELECT COUNT(*) as count FROM saved_searches WHERE user_id = ?').get(req.user.id);
    if (count.count >= 20) {
      return res.status(400).json({ error: 'Maximum 20 saved searches allowed' });
    }

    const result = db.prepare(`
      INSERT INTO saved_searches (user_id, name, query, category, location, experience_level, salary_min, salary_max, notify)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      name.trim(),
      query || '',
      category || '',
      location || '',
      experience_level || '',
      salary_min || null,
      salary_max || null,
      notify ? 1 : 0
    );

    res.status(201).json({ id: result.lastInsertRowid, message: 'Search saved successfully' });
  } catch (error) {
    logger.error('Save search error', { error: error.message });
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// PATCH /api/saved-searches/:id — toggle notifications
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    const search = db.prepare('SELECT * FROM saved_searches WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!search) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    const newNotify = search.notify ? 0 : 1;
    db.prepare('UPDATE saved_searches SET notify = ? WHERE id = ?').run(newNotify, req.params.id);

    res.json({ message: 'Notifications updated', notify: !!newNotify });
  } catch (error) {
    logger.error('Toggle saved search notifications error', { error: error.message });
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// DELETE /api/saved-searches/:id — remove saved search
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    logger.error('Delete saved search error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

module.exports = router;
