const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / - List all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT * FROM categories 
      ORDER BY sort_order, name
    `).all();
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /:slug - Get category by slug with job count
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    
    const category = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM job_categories jc 
         INNER JOIN jobs j ON jc.job_id = j.id 
         WHERE jc.category_id = c.id AND j.status = 'active') as active_jobs
      FROM categories c
      WHERE c.slug = ?
    `).get(slug);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

module.exports = router;
