const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeHtml, stripHtml } = require('../utils/sanitizeHtml');

const router = express.Router();

/**
 * Helper: Calculate if a feature is "considered" (>= 30% of users voted)
 */
function calculateConsidered(voteCount) {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const threshold = Math.ceil(totalUsers * 0.3);
  return voteCount >= threshold;
}

/**
 * Helper: Update vote and comment counts for a feature
 */
function updateFeatureCounts(featureId) {
  const voteCount = db.prepare('SELECT COUNT(*) as count FROM feature_votes WHERE feature_id = ?').get(featureId).count;
  const commentCount = db.prepare('SELECT COUNT(*) as count FROM feature_comments WHERE feature_id = ?').get(featureId).count;
  db.prepare('UPDATE feature_requests SET vote_count = ?, comment_count = ?, updated_at = datetime("now") WHERE id = ?')
    .run(voteCount, commentCount, featureId);
}

/**
 * GET /api/features/stats
 * Public: Get feature request statistics
 */
router.get('/stats', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM feature_requests').get().count;
    const planned = db.prepare('SELECT COUNT(*) as count FROM feature_requests WHERE status = ?').get('planned').count;
    const inProgress = db.prepare('SELECT COUNT(*) as count FROM feature_requests WHERE status = ?').get('in_progress').count;
    const completed = db.prepare('SELECT COUNT(*) as count FROM feature_requests WHERE status = ?').get('completed').count;
    
    let yourVotes = 0;
    if (req.user) {
      yourVotes = db.prepare('SELECT COUNT(*) as count FROM feature_votes WHERE user_id = ?').get(req.user.id).count;
    }

    res.json({ total, planned, inProgress, completed, yourVotes });
  } catch (error) {
    logger.error('Get feature stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/features
 * Public: List all feature requests with filters
 */
router.get('/', (req, res) => {
  try {
    const { status, category, sort = 'votes' } = req.query;
    
    let where = [];
    let binds = [];
    
    if (status) {
      where.push('fr.status = ?');
      binds.push(status);
    }
    if (category) {
      where.push('fr.category = ?');
      binds.push(category);
    }
    
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    
    // Sort options
    let orderBy = 'ORDER BY fr.vote_count DESC, fr.created_at DESC';
    if (sort === 'recent') {
      orderBy = 'ORDER BY fr.created_at DESC';
    } else if (sort === 'oldest') {
      orderBy = 'ORDER BY fr.created_at ASC';
    }
    
    const features = db.prepare(`
      SELECT 
        fr.*,
        u.name as submitter_name,
        (SELECT COUNT(*) FROM feature_votes WHERE feature_id = fr.id AND user_id = ?) as user_voted
      FROM feature_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      ${whereClause}
      ${orderBy}
    `).all(req.user?.id || 0, ...binds);
    
    // Add considered flag and extract first name only
    const enriched = features.map(f => {
      const firstName = f.submitter_name ? f.submitter_name.split(' ')[0] : 'Anonymous';
      return {
        ...f,
        submitter_name: firstName,
        considered: calculateConsidered(f.vote_count),
        user_voted: f.user_voted > 0
      };
    });
    
    res.json(enriched);
  } catch (error) {
    logger.error('List features error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

/**
 * GET /api/features/:id
 * Public: Get single feature with details
 */
router.get('/:id', (req, res) => {
  try {
    const feature = db.prepare(`
      SELECT 
        fr.*,
        u.name as submitter_name,
        (SELECT COUNT(*) FROM feature_votes WHERE feature_id = fr.id AND user_id = ?) as user_voted
      FROM feature_requests fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?
    `).get(req.user?.id || 0, req.params.id);
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const firstName = feature.submitter_name ? feature.submitter_name.split(' ')[0] : 'Anonymous';
    
    res.json({
      ...feature,
      submitter_name: firstName,
      considered: calculateConsidered(feature.vote_count),
      user_voted: feature.user_voted > 0
    });
  } catch (error) {
    logger.error('Get feature error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch feature' });
  }
});

/**
 * POST /api/features
 * Auth required: Submit new feature request
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, category = 'general' } = req.body;
    
    // Validation
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const cleanTitle = stripHtml(title).trim();
    const cleanDescription = stripHtml(description).trim();
    
    if (cleanTitle.length < 5) {
      return res.status(400).json({ error: 'Title must be at least 5 characters' });
    }
    if (cleanDescription.length < 20) {
      return res.status(400).json({ error: 'Description must be at least 20 characters' });
    }
    if (cleanTitle.length > 200) {
      return res.status(400).json({ error: 'Title must be less than 200 characters' });
    }
    if (cleanDescription.length > 2000) {
      return res.status(400).json({ error: 'Description must be less than 2000 characters' });
    }
    
    const validCategories = ['general', 'jobs', 'employers', 'jobseekers', 'transparency', 'mobile', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    const result = db.prepare(`
      INSERT INTO feature_requests (user_id, title, description, category)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, cleanTitle, cleanDescription, category);
    
    logger.info('Feature request created', { 
      featureId: result.lastInsertRowid, 
      userId: req.user.id,
      category 
    });
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      message: 'Feature request submitted successfully' 
    });
  } catch (error) {
    logger.error('Create feature error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to submit feature request' });
  }
});

/**
 * POST /api/features/:id/vote
 * Auth required: Toggle vote on feature request
 */
router.post('/:id/vote', authenticateToken, (req, res) => {
  try {
    const feature = db.prepare('SELECT id FROM feature_requests WHERE id = ?').get(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    // Check if already voted
    const existing = db.prepare(
      'SELECT id FROM feature_votes WHERE feature_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);
    
    if (existing) {
      // Unvote
      db.prepare('DELETE FROM feature_votes WHERE id = ?').run(existing.id);
      updateFeatureCounts(req.params.id);
      
      logger.info('Feature vote removed', { featureId: req.params.id, userId: req.user.id });
      return res.json({ message: 'Vote removed', voted: false });
    } else {
      // Vote
      db.prepare(
        'INSERT INTO feature_votes (feature_id, user_id) VALUES (?, ?)'
      ).run(req.params.id, req.user.id);
      updateFeatureCounts(req.params.id);
      
      logger.info('Feature vote added', { featureId: req.params.id, userId: req.user.id });
      return res.json({ message: 'Vote added', voted: true });
    }
  } catch (error) {
    logger.error('Vote feature error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to vote' });
  }
});

/**
 * GET /api/features/:id/comments
 * Public: List comments for a feature
 */
router.get('/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT 
        fc.*,
        u.name as commenter_name
      FROM feature_comments fc
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE fc.feature_id = ?
      ORDER BY fc.created_at ASC
    `).all(req.params.id);
    
    // Extract first names only
    const enriched = comments.map(c => ({
      ...c,
      commenter_name: c.commenter_name ? c.commenter_name.split(' ')[0] : 'Anonymous'
    }));
    
    res.json(enriched);
  } catch (error) {
    logger.error('Get feature comments error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /api/features/:id/comment
 * Auth required: Add comment to feature request
 */
router.post('/:id/comment', authenticateToken, (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    const cleanComment = stripHtml(comment).trim();
    
    if (cleanComment.length < 3) {
      return res.status(400).json({ error: 'Comment must be at least 3 characters' });
    }
    if (cleanComment.length > 1000) {
      return res.status(400).json({ error: 'Comment must be less than 1000 characters' });
    }
    
    const feature = db.prepare('SELECT id FROM feature_requests WHERE id = ?').get(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const result = db.prepare(
      'INSERT INTO feature_comments (feature_id, user_id, comment) VALUES (?, ?, ?)'
    ).run(req.params.id, req.user.id, cleanComment);
    
    updateFeatureCounts(req.params.id);
    
    logger.info('Feature comment added', { 
      featureId: req.params.id, 
      commentId: result.lastInsertRowid, 
      userId: req.user.id 
    });
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      message: 'Comment added successfully' 
    });
  } catch (error) {
    logger.error('Add feature comment error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * PATCH /api/features/:id
 * Admin only: Update feature status and admin response
 */
router.patch('/:id', authenticateToken, (req, res) => {
  try {
    // Check admin role
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status, admin_response } = req.body;
    
    const validStatuses = ['submitted', 'under_review', 'planned', 'in_progress', 'completed', 'declined'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const feature = db.prepare('SELECT * FROM feature_requests WHERE id = ?').get(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    const updates = [];
    const values = [];
    
    if (status) {
      updates.push('status = ?');
      values.push(status);
      
      // Set completed_at if status is completed
      if (status === 'completed' && !feature.completed_at) {
        updates.push('completed_at = datetime("now")');
      }
    }
    
    if (admin_response !== undefined) {
      const cleanResponse = admin_response ? stripHtml(admin_response).trim() : null;
      updates.push('admin_response = ?');
      values.push(cleanResponse);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push('updated_at = datetime("now")');
    values.push(req.params.id);
    
    db.prepare(`
      UPDATE feature_requests 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);
    
    logger.info('Feature request updated', { 
      featureId: req.params.id, 
      adminId: req.user.id,
      status,
      hasResponse: !!admin_response
    });
    
    res.json({ message: 'Feature request updated successfully' });
  } catch (error) {
    logger.error('Update feature error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update feature request' });
  }
});

/**
 * DELETE /api/features/:id
 * Admin only: Delete inappropriate feature request
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    // Check admin role
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = db.prepare('DELETE FROM feature_requests WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Feature request not found' });
    }
    
    logger.warn('Feature request deleted', { 
      featureId: req.params.id, 
      adminId: req.user.id 
    });
    
    res.json({ message: 'Feature request deleted successfully' });
  } catch (error) {
    logger.error('Delete feature error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to delete feature request' });
  }
});

module.exports = router;
