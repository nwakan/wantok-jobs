const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const logger = require('../utils/logger');

// GET /api/training/providers - List training providers
router.get('/providers', (req, res) => {
  try {
    const { category, location, search, limit = 20, offset = 0 } = req.query;
    let query = 'SELECT * FROM training_providers WHERE active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (location) {
      query += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY featured DESC, name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const providers = db.prepare(query).all(...params);
    const { count } = db.prepare('SELECT COUNT(*) as count FROM training_providers WHERE active = 1').get();

    res.json({ data: providers, total: count });
  } catch (error) {
    logger.error('Get training providers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch training providers' });
  }
});

// GET /api/training/courses - List courses
router.get('/courses', (req, res) => {
  try {
    const { category, provider_id, mode, search, limit = 20, offset = 0 } = req.query;
    let query = `
      SELECT tc.*, tp.name as provider_name, tp.logo_url as provider_logo
      FROM training_courses tc
      JOIN training_providers tp ON tc.provider_id = tp.id
      WHERE tc.active = 1 AND tp.active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND tc.category = ?';
      params.push(category);
    }
    if (provider_id) {
      query += ' AND tc.provider_id = ?';
      params.push(parseInt(provider_id));
    }
    if (mode) {
      query += ' AND tc.mode = ?';
      params.push(mode);
    }
    if (search) {
      query += ' AND (tc.title LIKE ? OR tc.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY tc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const courses = db.prepare(query).all(...params);
    res.json({ data: courses });
  } catch (error) {
    logger.error('Get training courses error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch training courses' });
  }
});

// POST /api/training/providers - Admin: create provider
router.post('/providers', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, description, website, location, category, logo_url, featured } = req.body;
    if (!name) return res.status(400).json({ error: 'Provider name required' });

    const result = db.prepare(`
      INSERT INTO training_providers (name, description, website, location, category, logo_url, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, description, website, location, category, logo_url, featured || 0);

    const provider = db.prepare('SELECT * FROM training_providers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(provider);
  } catch (error) {
    logger.error('Create training provider error', { error: error.message });
    res.status(500).json({ error: 'Failed to create training provider' });
  }
});

// POST /api/training/courses - Admin: create course
router.post('/courses', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { provider_id, title, description, category, duration, price, currency, mode, url } = req.body;
    if (!provider_id || !title) return res.status(400).json({ error: 'Provider ID and title required' });

    const result = db.prepare(`
      INSERT INTO training_courses (provider_id, title, description, category, duration, price, currency, mode, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(provider_id, title, description, category, duration, price, currency || 'PGK', mode || 'in-person', url);

    const course = db.prepare('SELECT * FROM training_courses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(course);
  } catch (error) {
    logger.error('Create training course error', { error: error.message });
    res.status(500).json({ error: 'Failed to create training course' });
  }
});

module.exports = router;
