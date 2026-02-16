const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / - List all categories with real job counts
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.icon, c.icon_name,
        c.description, c.featured, c.trending,
        c.meta_title, c.meta_description, c.sort_order,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `).all();
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /featured - Get featured categories
router.get('/featured', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name, c.description,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id
      WHERE c.featured = 1
      GROUP BY c.id
      ORDER BY active_jobs DESC, c.sort_order
      LIMIT 12
    `).all();
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching featured categories:', error);
    res.status(500).json({ error: 'Failed to fetch featured categories' });
  }
});

// GET /trending - Get trending categories
router.get('/trending', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name, c.description,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id
      WHERE c.trending = 1
      GROUP BY c.id
      ORDER BY active_jobs DESC, c.sort_order
      LIMIT 8
    `).all();
    
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching trending categories:', error);
    res.status(500).json({ error: 'Failed to fetch trending categories' });
  }
});

// GET /:slug - Get category by slug with comprehensive data
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get category with real job count
    const category = db.prepare(`
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.icon, c.icon_name,
        c.description, c.featured, c.trending,
        c.meta_title, c.meta_description, c.sort_order,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id
      WHERE c.slug = ?
      GROUP BY c.id
    `).get(slug);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get related categories (similar job counts or same parent)
    const relatedCategories = db.prepare(`
      SELECT 
        c.id, c.name, c.slug, c.icon_name,
        COUNT(DISTINCT CASE WHEN j.status = 'active' THEN j.id END) as active_jobs
      FROM categories c
      LEFT JOIN job_categories jc ON c.id = jc.category_id
      LEFT JOIN jobs j ON jc.job_id = j.id
      WHERE c.id != ?
      GROUP BY c.id
      ORDER BY ABS(? - active_jobs), c.sort_order
      LIMIT 6
    `).all(category.id, category.active_jobs);
    
    // Get top employers hiring in this category
    const topEmployers = db.prepare(`
      SELECT DISTINCT
        j.company_display_name,
        j.company_logo,
        COUNT(DISTINCT j.id) as job_count
      FROM jobs j
      INNER JOIN job_categories jc ON j.id = jc.job_id
      WHERE jc.category_id = ? AND j.status = 'active'
      GROUP BY j.company_display_name
      ORDER BY job_count DESC
      LIMIT 10
    `).all(category.id);
    
    res.json({
      category,
      related: relatedCategories,
      topEmployers
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// GET /:slug/jobs - Get jobs for a category (paginated)
router.get('/:slug/jobs', (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get category ID
    const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get jobs in category
    const jobs = db.prepare(`
      SELECT DISTINCT
        j.id, j.title, j.company_display_name, j.company_logo,
        j.location, j.job_type, j.experience_level, j.industry,
        j.created_at, j.application_deadline, j.salary_min, j.salary_max
      FROM jobs j
      INNER JOIN job_categories jc ON j.id = jc.job_id
      WHERE jc.category_id = ? AND j.status = 'active'
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `).all(category.id, limit, offset);
    
    // Get total count
    const total = db.prepare(`
      SELECT COUNT(DISTINCT j.id) as count
      FROM jobs j
      INNER JOIN job_categories jc ON j.id = jc.job_id
      WHERE jc.category_id = ? AND j.status = 'active'
    `).get(category.id).count;
    
    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching category jobs:', error);
    res.status(500).json({ error: 'Failed to fetch category jobs' });
  }
});

module.exports = router;
