const express = require('express');
const logger = require('../utils/logger');
const { getPersonalizedRecommendations, getPopularRecommendations } = require('../lib/recommendations');
const router = express.Router();

// GET /api/recommendations — auth optional
router.get('/', (req, res) => {
  try {
    let userId = null;
    let userRole = null;

    // Try to extract user from token (optional auth)
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wantokjobs-secret-key-2024');
        userId = decoded.id;
        userRole = decoded.role;
      } catch (e) {}
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    let data;
    let type;

    if (userId && userRole === 'jobseeker') {
      data = getPersonalizedRecommendations(userId, limit);
      type = 'personalized';
    } else {
      data = getPopularRecommendations(limit);
      type = 'popular';
    }

    res.json({ data, type });
  } catch (error) {
    logger.error('Recommendations error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

module.exports = router;
