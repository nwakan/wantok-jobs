const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { stripHtml, isValidLength } = require('../utils/sanitizeHtml');

// POST / - Send message
router.post('/', authenticateToken, validate(schemas.message), (req, res) => {
  try {
    const { to_user_id, subject, body } = req.body;
    const from_user_id = req.user.id;

    // Sanitize inputs to prevent XSS
    const safeSubject = subject ? stripHtml(subject) : '';
    const safeBody = body ? stripHtml(body) : '';

    // Validate lengths
    if (!isValidLength(safeSubject, 200, 1)) {
      return res.status(400).json({ error: 'Subject must be between 1 and 200 characters' });
    }
    if (!isValidLength(safeBody, 5000, 1)) {
      return res.status(400).json({ error: 'Message body must be between 1 and 5000 characters' });
    }

    // Verify recipient exists
    const recipient = db.prepare('SELECT * FROM users WHERE id = ?').get(to_user_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const result = db.prepare(`
      INSERT INTO admin_messages (from_user_id, to_user_id, subject, body)
      VALUES (?, ?, ?, ?)
    `).run(from_user_id, to_user_id, safeSubject, safeBody);

    const message = db.prepare('SELECT * FROM admin_messages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET / - Get inbox
router.get('/', authenticateToken, (req, res) => {
  try {
    const user_id = req.user.id;
    const { type = 'received' } = req.query; // received or sent

    let query;
    if (type === 'sent') {
      query = `
        SELECT m.*, u.name as recipient_name, u.email as recipient_email
        FROM admin_messages m
        INNER JOIN users u ON m.to_user_id = u.id
        WHERE m.from_user_id = ?
        ORDER BY m.created_at DESC
      `;
    } else {
      query = `
        SELECT m.*, u.name as sender_name, u.email as sender_email
        FROM admin_messages m
        INNER JOIN users u ON m.from_user_id = u.id
        WHERE m.to_user_id = ?
        ORDER BY m.created_at DESC
      `;
    }

    const messages = db.prepare(query).all(user_id);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /:id - Get message detail
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const message = db.prepare(`
      SELECT m.*, 
        uf.name as sender_name, uf.email as sender_email,
        ut.name as recipient_name, ut.email as recipient_email
      FROM admin_messages m
      INNER JOIN users uf ON m.from_user_id = uf.id
      INNER JOIN users ut ON m.to_user_id = ut.id
      WHERE m.id = ? AND (m.from_user_id = ? OR m.to_user_id = ?)
    `).get(id, user_id, user_id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if recipient
    if (message.to_user_id === user_id && message.read === 0) {
      db.prepare('UPDATE admin_messages SET read = 1 WHERE id = ?').run(id);
      message.read = 1;
    }

    res.json({ message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// PUT /:id/read - Mark message as read
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const message = db.prepare('SELECT * FROM admin_messages WHERE id = ? AND to_user_id = ?').get(id, user_id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.prepare('UPDATE admin_messages SET read = 1 WHERE id = ?').run(id);
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;
