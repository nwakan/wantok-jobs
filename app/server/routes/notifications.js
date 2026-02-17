const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const { limit = 50, unread_only = false } = req.query;
    
    let query = `
      SELECT * FROM notifications
      WHERE user_id = ?
    `;
    
    if (unread_only === 'true') {
      query += ' AND read = 0';
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    
    const notifications = db.prepare(query).all(req.user.id, parseInt(limit));

    res.json({ data: notifications, total: notifications.length });
  } catch (error) {
    console.error('Get notifications error:', error);
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
    console.error('Get unread count error:', error);
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
    console.error('Mark read error:', error);
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
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Legacy route for backward compatibility
router.put('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
