const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { unread_only = false } = req.query;
    
    let where = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (unread_only === 'true') {
      where += ' AND read = 0';
    }
    
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM notifications ${where}`).get(...params);
    
    const notifications = db.prepare(`
      SELECT id, type, title, message, read, data, created_at
      FROM notifications ${where}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      data: notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get notifications error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND read = 0
    `).get(req.user.id);

    res.json({ count: result.count });
  } catch (error) {
    logger.error('Get unread count error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark read error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all or specific notifications as read
router.put('/mark-read', authenticateToken, (req, res) => {
  try {
    const { notification_ids } = req.body;

    if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      const placeholders = notification_ids.map(() => '?').join(',');
      db.prepare(`
        UPDATE notifications 
        SET read = 1 
        WHERE user_id = ? AND id IN (${placeholders})
      `).run(req.user.id, ...notification_ids);
      
      res.json({ message: `${notification_ids.length} notifications marked as read` });
    } else {
      // Mark all as read
      const result = db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
      res.json({ message: 'All notifications marked as read', count: result.changes });
    }
  } catch (error) {
    logger.error('Mark read error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Legacy route for backward compatibility
router.put('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
