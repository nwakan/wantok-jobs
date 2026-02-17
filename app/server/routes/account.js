const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/account/data-export - Export all user data as JSON
router.get('/data-export', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const user = db.prepare(`
      SELECT id, name, email, role, phone, province, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Profile (jobseeker or employer)
    let profile = null;
    if (user.role === 'jobseeker') {
      profile = db.prepare(`SELECT * FROM profiles_jobseeker WHERE user_id = ?`).get(userId);
    } else if (user.role === 'employer') {
      profile = db.prepare(`SELECT * FROM profiles_employer WHERE user_id = ?`).get(userId);
    }

    // Applications
    const applications = db.prepare(`
      SELECT a.*, j.title as job_title, j.company
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.jobseeker_id = ?
      ORDER BY a.applied_at DESC
    `).all(userId);

    // Saved jobs
    const savedJobs = db.prepare(`
      SELECT sj.*, j.title as job_title, j.company
      FROM saved_jobs sj
      LEFT JOIN jobs j ON sj.job_id = j.id
      WHERE sj.user_id = ?
      ORDER BY sj.created_at DESC
    `).all(userId);

    // Messages/conversations
    let messages = [];
    try {
      messages = db.prepare(`
        SELECT * FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        ORDER BY created_at DESC
        LIMIT 1000
      `).all(userId, userId);
    } catch {
      // messages table may not exist
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      user,
      profile,
      applications,
      saved_jobs: savedJobs,
      messages,
    };

    res.setHeader('Content-Disposition', `attachment; filename="wantokjobs-data-export-${userId}.json"`);
    res.json(exportData);
  } catch (err) {
    logger.error('Data export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// DELETE /api/account - Soft delete account (anonymize data)
router.delete('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    const user = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.status === 'deleted') {
      return res.status(400).json({ error: 'Account already deleted' });
    }

    const anonymized = `deleted_user_${userId}`;
    const now = new Date().toISOString();

    const txn = db.transaction(() => {
      // Anonymize user record
      db.prepare(`
        UPDATE users SET
          name = ?,
          email = ?,
          phone = NULL,
          province = NULL,
          password = 'DELETED',
          status = 'deleted',
          updated_at = ?
        WHERE id = ?
      `).run(anonymized, `${anonymized}@deleted.wantokjobs.com`, now, userId);

      // Clear jobseeker profile
      try {
        db.prepare(`
          UPDATE profiles_jobseeker SET
            headline = NULL,
            summary = NULL,
            skills = NULL,
            experience = NULL,
            education = NULL,
            resume_url = NULL,
            photo_url = NULL,
            phone = NULL,
            address = NULL
          WHERE user_id = ?
        `).run(userId);
      } catch { /* table may not have all columns */ }

      // Clear employer profile
      try {
        db.prepare(`
          UPDATE profiles_employer SET
            company_name = ?,
            description = NULL,
            website = NULL,
            logo_url = NULL,
            phone = NULL,
            address = NULL
          WHERE user_id = ?
        `).run(anonymized, userId);
      } catch { /* table may not have all columns */ }
    });

    txn();

    logger.info(`Account soft-deleted: user ${userId}`);
    res.json({ message: 'Account deleted successfully. Your data has been anonymized.' });
  } catch (err) {
    logger.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
