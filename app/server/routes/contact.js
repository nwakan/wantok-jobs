const logger = require('../utils/logger');
const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sendContactFormAdminEmail, sendContactFormAutoReply } = require('../lib/email');
const { requireRole } = require('../middleware/role');
const { stripHtml, sanitizeEmail, isValidLength } = require('../utils/sanitizeHtml');

// POST / - Public contact form submission
router.post('/', validate(schemas.contact), (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Sanitize inputs to prevent XSS
    const safeName = stripHtml(name);
    const safeEmail = sanitizeEmail(email);
    const safeSubject = subject ? stripHtml(subject) : null;
    const safeMessage = stripHtml(message);

    if (!safeName || !safeEmail || !safeMessage) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    
    // Validate lengths
    if (!isValidLength(safeName, 100, 1)) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    }
    if (safeSubject && !isValidLength(safeSubject, 200)) {
      return res.status(400).json({ error: 'Subject must be 200 characters or less' });
    }
    if (!isValidLength(safeMessage, 5000, 1)) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    const result = db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `).run(safeName, safeEmail, safeSubject, safeMessage);

    // Send emails (admin notification + auto-reply)
    const contactData = { name: safeName, email: safeEmail, subject: safeSubject, message: safeMessage };
    sendContactFormAdminEmail(contactData).catch(() => {});
    sendContactFormAutoReply(contactData).catch(() => {});

    res.status(201).json({ 
      message: 'Contact message sent successfully',
      id: result.lastInsertRowid 
    });
  } catch (error) {
    logger.error('Error submitting contact message', { error: error.message });
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

// GET / - Admin list all contact messages
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM contact_messages';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const messages = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM contact_messages' + (status ? ' WHERE status = ?' : '')).get(...(status ? [status] : []));

    res.json({ messages, total: total.count });
  } catch (error) {
    logger.error('Error fetching contact messages', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// PUT /:id/reply - Admin reply to contact message
router.put('/:id/reply', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { admin_reply } = req.body;

    // Sanitize admin reply
    const safeAdminReply = admin_reply ? stripHtml(admin_reply) : null;
    
    if (safeAdminReply && !isValidLength(safeAdminReply, 5000)) {
      return res.status(400).json({ error: 'Reply must be 5000 characters or less' });
    }

    const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    db.prepare(`
      UPDATE contact_messages 
      SET admin_reply = ?, status = 'replied'
      WHERE id = ?
    `).run(safeAdminReply, id);

    const updated = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    res.json({ message: updated });
  } catch (error) {
    logger.error('Error replying to contact message', { error: error.message });
    res.status(500).json({ error: 'Failed to reply to contact message' });
  }
});

module.exports = router;
