const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// POST /subscribe - Public email subscription (no auth needed)
router.post('/subscribe', (req, res) => {
  try {
    const { email, frequency } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    // Check if already subscribed
    const existing = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email);
    if (existing) {
      return res.json({ message: 'Already subscribed', subscribed: true });
    }
    // Add to newsletter
    try {
      db.prepare('INSERT INTO newsletter_subscribers (email, status) VALUES (?, ?)').run(email, 'active');
    } catch (e) {
      // Table might not exist, create it
      db.prepare('CREATE TABLE IF NOT EXISTS newsletter_subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, status TEXT DEFAULT "active", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
      db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email, status) VALUES (?, ?)').run(email, 'active');
    }
    res.status(201).json({ message: 'Subscribed successfully', subscribed: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// POST / - Create job alert
router.post('/', authenticateToken, validate(schemas.jobAlert), (req, res) => {
  try {
    const { keywords, category_id, location, job_type, salary_min, frequency, channel } = req.body;
    const user_id = req.user.id;

    const result = db.prepare(`
      INSERT INTO job_alerts (user_id, keywords, category_id, location, job_type, salary_min, frequency, channel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, keywords, category_id, location, job_type, salary_min, frequency || 'daily', channel || 'email');

    const alert = db.prepare('SELECT * FROM job_alerts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ alert });
  } catch (error) {
    console.error('Error creating job alert:', error);
    res.status(500).json({ error: 'Failed to create job alert' });
  }
});

// GET / - Get user's job alerts
router.get('/', authenticateToken, (req, res) => {
  try {
    const user_id = req.user.id;

    const alerts = db.prepare(`
      SELECT ja.*, c.name as category_name 
      FROM job_alerts ja
      LEFT JOIN categories c ON ja.category_id = c.id
      WHERE ja.user_id = ?
      ORDER BY ja.created_at DESC
    `).all(user_id);

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching job alerts:', error);
    res.status(500).json({ error: 'Failed to fetch job alerts' });
  }
});

// PUT /:id - Update job alert
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const { keywords, category_id, location, job_type, salary_min, frequency, channel, active } = req.body;

    // Verify ownership
    const alert = db.prepare('SELECT * FROM job_alerts WHERE id = ? AND user_id = ?').get(id, user_id);
    if (!alert) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    db.prepare(`
      UPDATE job_alerts 
      SET keywords = ?, category_id = ?, location = ?, job_type = ?, 
          salary_min = ?, frequency = ?, channel = ?, active = ?
      WHERE id = ?
    `).run(keywords, category_id, location, job_type, salary_min, frequency, channel, active !== undefined ? active : 1, id);

    const updated = db.prepare('SELECT * FROM job_alerts WHERE id = ?').get(id);
    res.json({ alert: updated });
  } catch (error) {
    console.error('Error updating job alert:', error);
    res.status(500).json({ error: 'Failed to update job alert' });
  }
});

// DELETE /:id - Delete job alert
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Verify ownership
    const alert = db.prepare('SELECT * FROM job_alerts WHERE id = ? AND user_id = ?').get(id, user_id);
    if (!alert) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    db.prepare('DELETE FROM job_alerts WHERE id = ?').run(id);
    res.json({ message: 'Job alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting job alert:', error);
    res.status(500).json({ error: 'Failed to delete job alert' });
  }
});

module.exports = router;
