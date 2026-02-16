const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate, schemas } = require('../middleware/validate');

// POST /:userId - Employer saves a jobseeker's resume/profile
router.post('/:userId', authenticateToken, requireRole('employer'), validate(schemas.savedResume), (req, res) => {
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

    const result = db.prepare('DELETE FROM saved_resumes WHERE employer_id = ? AND jobseeker_id = ?').run(employer_id, jobseeker_id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Saved resume not found' });
    }

    res.json({ message: 'Resume removed from saved' });
  } catch (error) {
    console.error('Error removing saved resume:', error);
    res.status(500).json({ error: 'Failed to remove saved resume' });
  }
});

// GET / - Get employer's saved resumes with full profile data
router.get('/', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const employer_id = req.user.id;
    const { folder } = req.query;

    let query = `
      SELECT sr.*, 
        u.name as jobseeker_name, 
        u.email as jobseeker_email,
        u.phone as jobseeker_phone,
        pj.headline, 
        pj.location, 
        pj.bio,
        pj.skills, 
        pj.work_history,
        pj.education,
        pj.cv_url,
        pj.desired_job_type,
        pj.desired_salary_min,
        pj.desired_salary_max,
        pj.availability,
        pj.profile_complete
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

    // Parse JSON fields for easier frontend consumption
    saved_resumes.forEach(resume => {
      if (resume.skills) {
        try {
          resume.skills = JSON.parse(resume.skills);
        } catch(e) {
          resume.skills = [];
        }
      }
      if (resume.work_history) {
        try {
          resume.work_history = JSON.parse(resume.work_history);
        } catch(e) {
          resume.work_history = [];
        }
      }
      if (resume.education) {
        try {
          resume.education = JSON.parse(resume.education);
        } catch(e) {
          resume.education = [];
        }
      }
    });

    // Get list of unique folders for this employer
    const folders = db.prepare(`
      SELECT DISTINCT folder, COUNT(*) as count
      FROM saved_resumes
      WHERE employer_id = ?
      GROUP BY folder
      ORDER BY folder
    `).all(employer_id);

    res.json({ saved_resumes, folders, total: saved_resumes.length });
  } catch (error) {
    console.error('Error fetching saved resumes:', error);
    res.status(500).json({ error: 'Failed to fetch saved resumes' });
  }
});

module.exports = router;
