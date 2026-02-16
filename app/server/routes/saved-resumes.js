const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /:userId - Employer saves a jobseeker's resume
router.post('/:userId', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const { userId: jobseeker_id } = req.params;
    const { notes, folder } = req.body;
    const employer_id = req.user.id;

    // Verify jobseeker exists
    const jobseeker = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(jobseeker_id, 'jobseeker');
    if (!jobseeker) {
      return res.status(404).json({ error: 'Jobseeker not found' });
    }

    const result = db.prepare(`
      INSERT INTO saved_resumes (employer_id, jobseeker_id, notes, folder)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(employer_id, jobseeker_id) DO UPDATE SET
        notes = excluded.notes,
        folder = excluded.folder
    `).run(employer_id, jobseeker_id, notes, folder || 'default');

    const saved = db.prepare('SELECT * FROM saved_resumes WHERE employer_id = ? AND jobseeker_id = ?').get(employer_id, jobseeker_id);
    res.status(201).json({ saved_resume: saved });
  } catch (error) {
    console.error('Error saving resume:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// DELETE /:userId - Employer removes saved resume
router.delete('/:userId', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const { userId: jobseeker_id } = req.params;
    const employer_id = req.user.id;

    db.prepare('DELETE FROM saved_resumes WHERE employer_id = ? AND jobseeker_id = ?').run(employer_id, jobseeker_id);
    res.json({ message: 'Resume removed from saved' });
  } catch (error) {
    console.error('Error removing saved resume:', error);
    res.status(500).json({ error: 'Failed to remove saved resume' });
  }
});

// GET / - Get employer's saved resumes
router.get('/', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const employer_id = req.user.id;
    const { folder } = req.query;

    let query = `
      SELECT sr.*, 
        u.name as jobseeker_name, 
        u.email as jobseeker_email,
        pj.headline, pj.location, pj.skills, pj.cv_url
      FROM saved_resumes sr
      INNER JOIN users u ON sr.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
      WHERE sr.employer_id = ?
    `;

    const params = [employer_id];
    if (folder) {
      query += ' AND sr.folder = ?';
      params.push(folder);
    }

    query += ' ORDER BY sr.created_at DESC';

    const saved_resumes = db.prepare(query).all(...params);
    res.json({ saved_resumes });
  } catch (error) {
    console.error('Error fetching saved resumes:', error);
    res.status(500).json({ error: 'Failed to fetch saved resumes' });
  }
});

module.exports = router;
