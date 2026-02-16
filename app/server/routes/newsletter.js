const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// ─── Public: Subscribe to newsletter ─────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Check if already subscribed
    const existing = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email);
    if (existing) {
      if (!existing.subscribed) {
        // Re-subscribe
        db.prepare('UPDATE newsletter_subscribers SET subscribed = 1, name = COALESCE(?, name) WHERE email = ?')
          .run(name, email);
        return res.json({ message: 'Successfully re-subscribed to newsletter!' });
      }
      return res.json({ message: 'Already subscribed!' });
    }

    // New subscriber
    db.prepare('INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)').run(email, name || null);
    
    res.status(201).json({ message: 'Successfully subscribed to newsletter!' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// ─── Public: Unsubscribe from newsletter ─────────────────────────────
router.post('/unsubscribe', (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Mark as unsubscribed
    const result = db.prepare('UPDATE newsletter_subscribers SET subscribed = 0 WHERE email = ?').run(email);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ message: 'Successfully unsubscribed' });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// ─── Admin: Send newsletter ──────────────────────────────────────────
router.post('/send', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { subject, htmlContent, targetAudience = 'all', preview = false } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'subject and htmlContent are required' });
    }

    // Build recipient query
    let query = 'SELECT DISTINCT email, name FROM newsletter_subscribers WHERE subscribed = 1';
    const params = [];

    // Target audience filter
    if (targetAudience === 'employers') {
      query = `SELECT DISTINCT ns.email, COALESCE(ns.name, u.name) as name 
               FROM newsletter_subscribers ns 
               LEFT JOIN users u ON ns.email = u.email 
               WHERE ns.subscribed = 1 AND (u.role = 'employer' OR u.role IS NULL)`;
    } else if (targetAudience === 'jobseekers') {
      query = `SELECT DISTINCT ns.email, COALESCE(ns.name, u.name) as name 
               FROM newsletter_subscribers ns 
               LEFT JOIN users u ON ns.email = u.email 
               WHERE ns.subscribed = 1 AND (u.role = 'jobseeker' OR u.role IS NULL)`;
    }

    const recipients = db.prepare(query).all(...params);

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found for target audience' });
    }

    // Preview mode - just return recipient count
    if (preview) {
      return res.json({
        preview: true,
        recipientCount: recipients.length,
        targetAudience,
        subject,
        sampleRecipients: recipients.slice(0, 5).map(r => r.email)
      });
    }

    // Send emails via Brevo (batch processing with rate limiting)
    const { sendNewsletterBatch } = require('../lib/email-newsletter');
    const result = await sendNewsletterBatch({
      recipients,
      subject,
      htmlContent,
      targetAudience
    });

    // Log to newsletter_history
    db.prepare(`
      INSERT INTO newsletter_history (admin_id, subject, content, target_audience, recipient_count, sent_count, failed_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      subject,
      htmlContent,
      targetAudience,
      recipients.length,
      result.sent,
      result.failed
    );

    res.json({
      message: 'Newsletter sent successfully',
      recipientCount: recipients.length,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors?.slice(0, 10) // Return first 10 errors
    });

  } catch (error) {
    console.error('Newsletter send error:', error);
    res.status(500).json({ error: 'Failed to send newsletter', details: error.message });
  }
});

// ─── Admin: Get newsletter history ───────────────────────────────────
router.get('/history', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const history = db.prepare(`
      SELECT nh.*, u.name as admin_name
      FROM newsletter_history nh
      LEFT JOIN users u ON nh.admin_id = u.id
      ORDER BY nh.sent_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

    const total = db.prepare('SELECT COUNT(*) as count FROM newsletter_history').get().count;

    res.json({
      history,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Newsletter history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── Admin: Get subscriber stats ─────────────────────────────────────
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const stats = {
      totalSubscribers: db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE subscribed = 1').get().count,
      totalUnsubscribed: db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers WHERE subscribed = 0').get().count,
      employers: db.prepare(`
        SELECT COUNT(DISTINCT ns.email) as count 
        FROM newsletter_subscribers ns 
        JOIN users u ON ns.email = u.email 
        WHERE ns.subscribed = 1 AND u.role = 'employer'
      `).get().count,
      jobseekers: db.prepare(`
        SELECT COUNT(DISTINCT ns.email) as count 
        FROM newsletter_subscribers ns 
        JOIN users u ON ns.email = u.email 
        WHERE ns.subscribed = 1 AND u.role = 'jobseeker'
      `).get().count,
      recentSubscribers: db.prepare(`
        SELECT COUNT(*) as count FROM newsletter_subscribers 
        WHERE subscribed = 1 AND created_at > datetime('now', '-7 days')
      `).get().count,
      totalSent: db.prepare('SELECT COUNT(*) as count FROM newsletter_history').get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Newsletter stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
