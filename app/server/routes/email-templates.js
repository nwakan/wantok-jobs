const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Get all email templates (employer/admin)
router.get('/', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT * FROM email_templates
      WHERE active = 1
      ORDER BY name
    `).all();

    res.json(templates);
  } catch (error) {
    logger.error('Get email templates error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Get single email template
router.get('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const template = db.prepare(`
      SELECT * FROM email_templates WHERE id = ?
    `).get(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    logger.error('Get email template error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// Create custom email template (admin only)
router.post('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, subject, body_text, body_html, variables } = req.body;

    if (!name || !subject || !body_text) {
      return res.status(400).json({ error: 'Name, subject, and body_text required' });
    }

    const result = db.prepare(`
      INSERT INTO email_templates (name, subject, body_text, body_html, variables)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, subject, body_text, body_html || '', variables || '{}');

    const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(template);
  } catch (error) {
    logger.error('Create email template error', { error: error.message });
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Update email template (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { name, subject, body_text, body_html, variables, active } = req.body;

    const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    db.prepare(`
      UPDATE email_templates
      SET name = ?, subject = ?, body_text = ?, body_html = ?, variables = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || template.name,
      subject || template.subject,
      body_text || template.body_text,
      body_html !== undefined ? body_html : template.body_html,
      variables || template.variables,
      active !== undefined ? active : template.active,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    logger.error('Update email template error', { error: error.message });
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// Delete email template (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    db.prepare('DELETE FROM email_templates WHERE id = ?').run(req.params.id);

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('Delete email template error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete email template' });
  }
});

module.exports = router;
