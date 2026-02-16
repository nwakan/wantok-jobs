const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sendContactFormAdminEmail, sendContactFormAutoReply } = require('../lib/email');
const { requireRole } = require('../middleware/role');

// POST / - Public contact form submission
router.post('/', validate(schemas.contact), (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const result = db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `).run(name, email, subject, message);

    // Send emails (admin notification + auto-reply)
    const contactData = { name, email, subject, message };
    sendContactFormAdminEmail(contactData).catch(() => {});
    sendContactFormAutoReply(contactData).catch(() => {});

    res.status(201).json({ 
      message: 'Contact message sent successfully',
      id: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Error submitting contact message:', error);
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
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// PUT /:id/reply - Admin reply to contact message
router.put('/:id/reply', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { admin_reply } = req.body;

    const message = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({ error: 'Contact message not found' });
    }

    db.prepare(`
      UPDATE contact_messages 
      SET admin_reply = ?, status = 'replied'
      WHERE id = ?
    `).run(admin_reply, id);

    const updated = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(id);
    res.json({ message: updated });
  } catch (error) {
    console.error('Error replying to contact message:', error);
    res.status(500).json({ error: 'Failed to reply to contact message' });
  }
});

module.exports = router;
