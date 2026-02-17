const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const logger = require('../utils/logger');

// GET /api/testimonials — public, approved testimonials (featured first)
router.get('/', (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const testimonials = db.prepare(`
      SELECT id, name, role, company, quote, photo_url, rating, featured, created_at
      FROM testimonials
      WHERE status = 'approved'
      ORDER BY featured DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));
    res.json({ testimonials });
  } catch (error) {
    logger.error('Get testimonials error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// POST /api/testimonials — authenticated users submit
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, role, company, quote, photo_url, rating } = req.body;
    if (!name || !quote) {
      return res.status(400).json({ error: 'Name and quote are required' });
    }
    const r = parseInt(rating) || 5;
    if (r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const result = db.prepare(`
      INSERT INTO testimonials (user_id, name, role, company, quote, photo_url, rating, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, name, role || 'Jobseeker', company || null, quote, photo_url || null, r);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Testimonial submitted for review' });
  } catch (error) {
    logger.error('Submit testimonial error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit testimonial' });
  }
});

// GET /api/testimonials/admin/all — admin list all testimonials
router.get('/admin/all', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const testimonials = db.prepare(`
      SELECT * FROM testimonials ORDER BY created_at DESC
    `).all();
    res.json({ testimonials });
  } catch (error) {
    logger.error('Admin get testimonials error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// PATCH /api/testimonials/admin/:id — admin approve/reject/feature
router.patch('/admin/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status, featured } = req.body;
    const updates = [];
    const params = [];

    if (status && ['approved', 'rejected', 'pending'].includes(status)) {
      updates.push('status = ?');
      params.push(status);
    }
    if (featured !== undefined) {
      updates.push('featured = ?');
      params.push(featured ? 1 : 0);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(req.params.id);
    db.prepare(`UPDATE testimonials SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ message: 'Testimonial updated' });
  } catch (error) {
    logger.error('Admin update testimonial error', { error: error.message });
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

module.exports = router;
