const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /companies/:id/reviews — Get all reviews for a company
router.get('/companies/:id/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name
      FROM company_reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.company_id = ? AND r.approved = 1
      ORDER BY r.created_at DESC
    `).all(req.params.id);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM company_reviews
      WHERE company_id = ? AND approved = 1
    `).get(req.params.id);

    res.json({ reviews, stats });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /reviews — Create a new review
router.post('/reviews', authenticateToken, (req, res) => {
  try {
    const { company_id, rating, title, pros, cons, advice, is_current_employee } = req.body;

    if (!company_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'company_id and valid rating (1-5) required' });
    }

    // Check if company exists
    const company = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(company_id, 'employer');
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user already reviewed this company
    const existing = db.prepare('SELECT * FROM company_reviews WHERE company_id = ? AND reviewer_id = ?')
      .get(company_id, req.user.id);
    
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this company' });
    }

    const result = db.prepare(`
      INSERT INTO company_reviews (company_id, reviewer_id, rating, title, pros, cons, advice, is_current_employee, approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(company_id, req.user.id, rating, title || '', pros || '', cons || '', advice || '', is_current_employee ? 1 : 0);

    const review = db.prepare('SELECT * FROM company_reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ 
      review, 
      message: 'Review submitted successfully. It will be visible after approval.' 
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

module.exports = router;
