const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { stripHtml, isValidLength } = require('../utils/sanitizeHtml');

// All routes require auth
router.use(authenticateToken);

// GET /conversations - list user's conversations
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = db.prepare(`
      SELECT c.*,
        ue.name as employer_name, ue.email as employer_email,
        uj.name as jobseeker_name, uj.email as jobseeker_email,
        j.title as job_title,
        cm.content as last_message,
        (SELECT COUNT(*) FROM conversation_messages cm2 
         WHERE cm2.conversation_id = c.id 
         AND cm2.sender_id != ? 
         AND cm2.read_at IS NULL) as unread_count
      FROM conversations c
      JOIN users ue ON c.employer_id = ue.id
      JOIN users uj ON c.jobseeker_id = uj.id
      LEFT JOIN jobs j ON c.job_id = j.id
      LEFT JOIN conversation_messages cm ON cm.id = (
        SELECT id FROM conversation_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.employer_id = ? OR c.jobseeker_id = ?
      ORDER BY c.last_message_at DESC
    `).all(userId, userId, userId);

    res.json({ data: conversations });
  } catch (error) {
    logger.error('Error listing conversations', { error: error.message });
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// GET /conversations/unread-count - total unread
router.get('/unread-count', (req, res) => {
  try {
    const userId = req.user.id;
    const { count } = db.prepare(`
      SELECT COUNT(*) as count FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE (c.employer_id = ? OR c.jobseeker_id = ?)
      AND cm.sender_id != ?
      AND cm.read_at IS NULL
    `).get(userId, userId, userId);
    res.json({ count });
  } catch (error) {
    logger.error('Error getting unread count', { error: error.message });
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// POST /conversations - start new conversation
router.post('/', (req, res) => {
  try {
    const { jobseeker_id, job_id, message } = req.body;
    const employer_id = req.user.id;

    if (!jobseeker_id || !message) {
      return res.status(400).json({ error: 'jobseeker_id and message are required' });
    }

    const safeContent = stripHtml(message);
    if (!isValidLength(safeContent, 5000, 1)) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    // Check recipient exists
    const recipient = db.prepare('SELECT id, role FROM users WHERE id = ?').get(jobseeker_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check for existing conversation between these users about this job
    let conversation;
    if (job_id) {
      conversation = db.prepare(
        'SELECT * FROM conversations WHERE employer_id = ? AND jobseeker_id = ? AND job_id = ?'
      ).get(employer_id, jobseeker_id, job_id);
    }
    if (!conversation) {
      conversation = db.prepare(
        'SELECT * FROM conversations WHERE employer_id = ? AND jobseeker_id = ? AND job_id IS NULL'
      ).get(employer_id, jobseeker_id);
    }

    if (!conversation) {
      const result = db.prepare(
        'INSERT INTO conversations (employer_id, jobseeker_id, job_id) VALUES (?, ?, ?)'
      ).run(employer_id, jobseeker_id, job_id || null);
      conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid);
    }

    // Insert message
    db.prepare(
      'INSERT INTO conversation_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
    ).run(conversation.id, employer_id, safeContent);
    db.prepare(
      "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?"
    ).run(conversation.id);

    res.status(201).json({ conversation });
  } catch (error) {
    logger.error('Error creating conversation', { error: error.message });
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /conversations/:id - get messages in conversation
router.get('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND (employer_id = ? OR jobseeker_id = ?)'
    ).get(convId, userId, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msgs = db.prepare(`
      SELECT cm.*, u.name as sender_name
      FROM conversation_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = ?
      ORDER BY cm.created_at ASC
    `).all(convId);

    // Mark messages as read
    db.prepare(`
      UPDATE conversation_messages SET read_at = datetime('now')
      WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL
    `).run(convId, userId);

    // Get conversation metadata
    const meta = db.prepare(`
      SELECT c.*,
        ue.name as employer_name, uj.name as jobseeker_name,
        j.title as job_title
      FROM conversations c
      JOIN users ue ON c.employer_id = ue.id
      JOIN users uj ON c.jobseeker_id = uj.id
      LEFT JOIN jobs j ON c.job_id = j.id
      WHERE c.id = ?
    `).get(convId);

    res.json({ conversation: meta, messages: msgs });
  } catch (error) {
    logger.error('Error getting conversation', { error: error.message });
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// POST /conversations/:id - send message in conversation
router.post('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const safeContent = stripHtml(message);
    if (!isValidLength(safeContent, 5000, 1)) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    const conversation = db.prepare(
      'SELECT * FROM conversations WHERE id = ? AND (employer_id = ? OR jobseeker_id = ?)'
    ).get(convId, userId, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = db.prepare(
      'INSERT INTO conversation_messages (conversation_id, sender_id, content) VALUES (?, ?, ?)'
    ).run(convId, userId, safeContent);

    db.prepare(
      "UPDATE conversations SET last_message_at = datetime('now') WHERE id = ?"
    ).run(convId);

    const msg = db.prepare(`
      SELECT cm.*, u.name as sender_name
      FROM conversation_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: msg });
  } catch (error) {
    logger.error('Error sending message', { error: error.message });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PATCH /conversations/messages/:id/read - mark single message as read
router.patch('/messages/:id/read', (req, res) => {
  try {
    const userId = req.user.id;
    const msgId = req.params.id;

    const msg = db.prepare(`
      SELECT cm.* FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE cm.id = ? AND (c.employer_id = ? OR c.jobseeker_id = ?) AND cm.sender_id != ?
    `).get(msgId, userId, userId, userId);

    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.prepare("UPDATE conversation_messages SET read_at = datetime('now') WHERE id = ?").run(msgId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking message read', { error: error.message });
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;
