const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Save a job
router.post('/:jobId', authenticateToken, (req, res) => {
  try {
    const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if already saved
    const existing = db.prepare(
      'SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?'
    ).get(req.user.id, req.params.jobId);

    if (existing) {
      return res.status(400).json({ error: 'Job already saved' });
    }

    const result = db.prepare(
      'INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)'
    ).run(req.user.id, req.params.jobId);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Job saved successfully' });
  } catch (error) {
    logger.error('Save job error', { error: error.message });
    res.status(500).json({ error: 'Failed to save job' });
  }
});

// Unsave a job
router.delete('/:jobId', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(
      'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?'
    ).run(req.user.id, req.params.jobId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved job not found' });
    }

    res.json({ message: 'Job unsaved successfully' });
  } catch (error) {
    logger.error('Unsave job error', { error: error.message });
    res.status(500).json({ error: 'Failed to unsave job' });
  }
});

// Get saved jobs
router.get('/', authenticateToken, (req, res) => {
  try {
    const savedJobs = db.prepare(`
      SELECT j.*, 
             sj.created_at as saved_at,
             pe.company_name,
             pe.logo_url
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE sj.user_id = ?
      ORDER BY sj.created_at DESC
    `).all(req.user.id);

    res.json(savedJobs);
  } catch (error) {
    logger.error('Get saved jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
});

module.exports = router;
