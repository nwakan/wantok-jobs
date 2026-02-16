const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Track job view (authenticated users only)
router.post('/track-view', authenticateToken, (req, res) => {
  try {
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Ensure activity_log table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          job_id INTEGER,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (job_id) REFERENCES jobs(id)
        )
      `);
    } catch (e) {}

    // Log the view
    db.prepare(`
      INSERT INTO activity_log (user_id, action, job_id)
      VALUES (?, 'view_job', ?)
    `).run(req.user.id, job_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Get recently viewed jobs
router.get('/recent-views', authenticateToken, (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentViews = db.prepare(`
      SELECT DISTINCT j.*, al.created_at as viewed_at
      FROM activity_log al
      JOIN jobs j ON al.job_id = j.id
      WHERE al.user_id = ? AND al.action = 'view_job'
      ORDER BY al.created_at DESC
      LIMIT ?
    `).all(req.user.id, parseInt(limit));

    res.json(recentViews);
  } catch (error) {
    // Table might not exist yet
    res.json([]);
  }
});

// Track job application (called after successful apply)
router.post('/track-apply', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Ensure activity_log table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          job_id INTEGER,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (job_id) REFERENCES jobs(id)
        )
      `);
    } catch (e) {}

    // Log the application
    db.prepare(`
      INSERT INTO activity_log (user_id, action, job_id)
      VALUES (?, 'apply_job', ?)
    `).run(req.user.id, job_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Track apply error:', error);
    res.status(500).json({ error: 'Failed to track application' });
  }
});

// Track search query
router.post('/track-search', authenticateToken, (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    // Ensure activity_log table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          job_id INTEGER,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (job_id) REFERENCES jobs(id)
        )
      `);
    } catch (e) {}

    // Log the search
    db.prepare(`
      INSERT INTO activity_log (user_id, action, metadata)
      VALUES (?, 'search', ?)
    `).run(req.user.id, JSON.stringify({ query }));

    res.json({ success: true });
  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

// Get recent searches
router.get('/recent-searches', authenticateToken, (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentSearches = db.prepare(`
      SELECT metadata, created_at
      FROM activity_log
      WHERE user_id = ? AND action = 'search'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(req.user.id, parseInt(limit));

    const searches = recentSearches.map(s => {
      try {
        return {
          query: JSON.parse(s.metadata).query,
          timestamp: s.created_at
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    res.json(searches);
  } catch (error) {
    // Table might not exist yet
    res.json([]);
  }
});

module.exports = router;
