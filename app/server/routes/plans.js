const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET / - List all active plans (public)
router.get('/', (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT * FROM plans 
      WHERE active = 1 
      ORDER BY price
    `).all();
    
    res.json({ plans });
  } catch (error) {
    logger.error('Error fetching plans', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

module.exports = router;
