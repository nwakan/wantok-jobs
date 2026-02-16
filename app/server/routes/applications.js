const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');

const router = express.Router();

// Apply to job (jobseeker only)
router.post('/', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const { job_id, cover_letter, cv_url } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    // Check if job exists and is active
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(job_id, 'active');
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not active' });
    }

    // Check if already applied
    const existing = db.prepare(
      'SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?'
    ).get(job_id, req.user.id);

    if (existing) {
      return res.status(400).json({ error: 'Already applied to this job' });
    }

    // Get jobseeker CV if not provided
    let finalCvUrl = cv_url;
    if (!finalCvUrl) {
      const profile = db.prepare('SELECT cv_url FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
      finalCvUrl = profile?.cv_url;
    }

    // Create application
    const result = db.prepare(`
      INSERT INTO applications (job_id, jobseeker_id, cover_letter, cv_url)
      VALUES (?, ?, ?, ?)
    `).run(job_id, req.user.id, cover_letter, finalCvUrl);

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
    const applicant = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

    // Smart notification with match score
    notifEvents.onNewApplication(application, job, applicant || { name: 'A jobseeker' });

    // Log application event
    try {
      db.prepare(`INSERT INTO application_events (application_id, to_status, changed_by, notes) VALUES (?, 'applied', ?, 'Initial application')`).run(application.id, req.user.id);
    } catch(e) { /* table may not exist yet */ }

    res.status(201).json(application);
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get my applications (jobseeker)
router.get('/my', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const applications = db.prepare(`
      SELECT a.*,
             j.title as job_title,
             j.location,
             j.job_type,
             j.salary_min,
             j.salary_max,
             j.salary_currency,
             pe.company_name,
             pe.logo_url
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE a.jobseeker_id = ?
      ORDER BY a.applied_at DESC
    `).all(req.user.id);

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications for a job (employer - own jobs only)
router.get('/job/:jobId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const applications = db.prepare(`
      SELECT a.*,
             u.name as applicant_name,
             u.email as applicant_email,
             pj.phone,
             pj.location as applicant_location,
             pj.skills,
             pj.work_history,
             pj.education
      FROM applications a
      JOIN users u ON a.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
      WHERE a.job_id = ?
      ORDER BY a.applied_at DESC
    `).all(req.params.jobId);

    res.json(applications);
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Update application status (employer or admin)
router.put('/:id/status', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const validStatuses = ['applied', 'screening', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = db.prepare(`
      SELECT a.*, j.employer_id, j.title as job_title
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const oldStatus = application.status;

    db.prepare(`
      UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, req.params.id);

    // Rich notification with caring messages per status
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(application.job_id);
    notifEvents.onApplicationStatusChanged(application, status, job || { title: application.job_title });

    // Log application pipeline event
    try {
      db.prepare(`INSERT INTO application_events (application_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)`).run(application.id, oldStatus, status, req.user.id, `Status changed by ${req.user.role}`);
    } catch(e) { /* table may not exist yet */ }

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

module.exports = router;
