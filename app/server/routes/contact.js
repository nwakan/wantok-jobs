const logger = require('../utils/logger');
const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { sendContactFormAdminEmail, sendContactFormAutoReply, sendEmail } = require('../lib/email');
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

// POST /employer/:employer_id - Job seeker contact employer
router.post('/employer/:employer_id', authenticateToken, async (req, res) => {
  try {
    const { employer_id } = req.params;
    const { name, email, message, jobTitle } = req.body;

    // Sanitize inputs
    const safeName = stripHtml(name);
    const safeEmail = sanitizeEmail(email);
    const safeMessage = stripHtml(message);
    const safeJobTitle = jobTitle ? stripHtml(jobTitle) : null;

    // Validate inputs
    if (!safeName || !safeEmail || !safeMessage) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    // Validate lengths
    if (!isValidLength(safeName, 100, 1)) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    }
    if (!isValidLength(safeMessage, 5000, 1)) {
      return res.status(400).json({ error: 'Message must be between 1 and 5000 characters' });
    }

    // Load employer from database
    const employer = db.prepare(`
      SELECT u.id, u.name, u.email as user_email,
             pe.email as profile_email, pe.phone, pe.contact_preference,
             pe.company_name
      FROM users u
      LEFT JOIN profiles_employer pe ON pe.user_id = u.id
      WHERE u.id = ? AND u.role = 'employer'
    `).get(employer_id);

    if (!employer) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    // Get employer email (prefer profile email, fallback to user email)
    const employerEmail = employer.profile_email || employer.user_email;

    if (!employerEmail) {
      return res.status(400).json({ error: 'Employer has no email address' });
    }

    // Build email HTML
    const emailHtml = `
      <h2>New Message from WantokJobs Job Seeker</h2>
      <p>Hello ${employer.name || 'there'},</p>
      <p>You have received a message from a job seeker on WantokJobs:</p>
      <hr>
      <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
      ${safeJobTitle ? `<p><strong>Regarding:</strong> ${safeJobTitle}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${safeMessage.replace(/\n/g, '<br>')}</p>
      <hr>
      <p>To respond, simply reply to this email.</p>
      <p>Best regards,<br>WantokJobs Team</p>
    `;

    // Send email
    await sendEmail({
      to: employerEmail,
      toName: employer.name,
      subject: `WantokJobs: Message from ${safeName}${safeJobTitle ? ` regarding ${safeJobTitle}` : ''}`,
      html: emailHtml,
      replyTo: safeEmail,
      tags: ['contact-employer', 'job-seeker-inquiry']
    });

    logger.info('Employer contact message sent', { 
      employerId: employer_id, 
      jobSeekerId: req.user.id,
      hasJobTitle: !!safeJobTitle
    });

    res.status(200).json({ 
      message: 'Message sent successfully',
      employerName: employer.name
    });
  } catch (error) {
    logger.error('Error sending employer contact message', { error: error.message });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
