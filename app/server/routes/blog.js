const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / — Published articles with pagination
router.get('/', (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    let where = "WHERE a.status = 'published'";
    const params = [];
    if (category) { where += ' AND a.category = ?'; params.push(category); }
    
    const articles = db.prepare(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.category, a.tags, a.featured_image,
             a.views, a.published_at, a.created_at, u.name as author_name
      FROM articles a JOIN users u ON a.author_id = u.id
      ${where}
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    const total = db.prepare(`SELECT COUNT(*) as n FROM articles a ${where}`).get(...params).n;
    res.json({ articles, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /:slug — Single article by slug
router.get('/:slug', (req, res) => {
  try {
    const article = db.prepare(`
      SELECT a.*, u.name as author_name
      FROM articles a JOIN users u ON a.author_id = u.id
      WHERE a.slug = ? AND a.status = 'published'
    `).get(req.params.slug);
    
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    // Increment views
    db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router;
