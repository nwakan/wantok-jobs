const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const db = new Database(path.join(__dirname, '../data/wantokjobs.db'));

// Track job view
router.post('/track-view', authenticateToken, (req, res) => {
  try {
    const { jobId } = req.body;
    const userId = req.user.id;

    // Insert into activity log
    const stmt = db.prepare(`
      INSERT INTO activity_log (user_id, action, entity_type, entity_id, created_at)
      VALUES (?, 'job_view', 'job', ?, datetime('now'))
    `);
    
    stmt.run(userId, jobId);

    res.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Get recently viewed jobs
router.get('/recent-views', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const views = db.prepare(`
      SELECT DISTINCT
        j.id,
        j.title,
        j.company_name,
        al.created_at as viewed_at,
        CASE 
          WHEN julianday('now') - julianday(al.created_at) < 1 THEN 
            CAST((julianday('now') - julianday(al.created_at)) * 24 AS INTEGER) || ' hours ago'
          ELSE 
            CAST(julianday('now') - julianday(al.created_at) AS INTEGER) || ' days ago'
        END as viewed_ago
      FROM activity_log al
      JOIN jobs j ON j.id = al.entity_id
      WHERE al.user_id = ?
        AND al.action = 'job_view'
        AND al.entity_type = 'job'
      ORDER BY al.created_at DESC
      LIMIT ?
    `).all(userId, limit);

    res.json(views);
  } catch (error) {
    console.error('Recent views error:', error);
    res.status(500).json({ error: 'Failed to fetch recent views' });
  }
});

// Track job search
router.post('/track-search', authenticateToken, (req, res) => {
  try {
    const { keyword, filters } = req.body;
    const userId = req.user.id;

    const metadata = JSON.stringify({ keyword, filters });

    const stmt = db.prepare(`
      INSERT INTO activity_log (user_id, action, entity_type, metadata, created_at)
      VALUES (?, 'job_search', 'search', ?, datetime('now'))
    `);
    
    stmt.run(userId, metadata);

    res.json({ success: true });
  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

// Get recent searches
router.get('/recent-searches', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const searches = db.prepare(`
      SELECT 
        id,
        metadata,
        created_at
      FROM activity_log
      WHERE user_id = ?
        AND action = 'job_search'
        AND entity_type = 'search'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    // Parse metadata JSON
    const parsed = searches.map(s => ({
      ...s,
      ...JSON.parse(s.metadata || '{}')
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Recent searches error:', error);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

module.exports = router;
