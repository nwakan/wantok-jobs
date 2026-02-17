const { stripHtml, sanitizeEmail } = require('../utils/sanitizeHtml');
const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');
const { sendInterviewInviteEmail } = require('../lib/email');

const router = express.Router();

// Schedule interview (employer only)
router.post('/', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { 
      application_id, 
      scheduled_at, 
      duration_minutes = 60, 
      type = 'in-person',
      location,
      video_link,
      notes,
      interviewer_name,
      interviewer_email
    } = req.body;

    // Sanitize text inputs
    if (location) req.body.location = stripHtml(location);
    if (notes) req.body.notes = stripHtml(notes);
    if (interviewer_name) req.body.interviewer_name = stripHtml(interviewer_name);
    if (interviewer_email) req.body.interviewer_email = sanitizeEmail(interviewer_email) || interviewer_email;

    if (!application_id || !scheduled_at) {
      return res.status(400).json({ error: 'Application ID and scheduled time required' });
    }

    // Verify application belongs to employer's job
    const application = db.prepare(`
      SELECT a.*, j.employer_id, j.title as job_title, j.id as job_id,
             u.email as applicant_email, u.name as applicant_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.jobseeker_id = u.id
      WHERE a.id = ?
    `).get(application_id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Create interview
    const result = db.prepare(`
      INSERT INTO interviews (
        application_id, scheduled_at, duration_minutes, type, 
        location, video_link, notes, interviewer_name, interviewer_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      application_id, scheduled_at, duration_minutes, type,
      location, video_link, notes, interviewer_name, interviewer_email
    );

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(result.lastInsertRowid);

    // Auto-set application status to 'interview' if not already
    if (application.status !== 'interview') {
      db.prepare(`UPDATE applications SET status = 'interview', updated_at = datetime('now') WHERE id = ?`).run(application_id);
      
      // Log status change
      db.prepare(`
        INSERT INTO application_events (application_id, from_status, to_status, changed_by, notes)
        VALUES (?, ?, 'interview', ?, 'Interview scheduled')
      `).run(application_id, application.status, req.user.id);
    }

    // Send notification
    notifEvents.onInterviewScheduled(application, interview);

    // Send email to jobseeker
    const companyProfile = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(application.employer_id);
    const companyName = companyProfile?.company_name || 'the employer';

    try {
      await sendInterviewInviteEmail(
        { email: application.applicant_email, name: application.applicant_name },
        { title: application.job_title },
        companyName,
        interview
      );
    } catch (emailErr) {
      logger.error('Failed to send interview email', { error: emailErr.message });
      // Continue anyway
    }

    res.status(201).json(interview);
  } catch (error) {
    logger.error('Schedule interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// Get all interviews for a job (employer)
router.get('/job/:jobId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const interviews = db.prepare(`
      SELECT i.*, 
             a.jobseeker_id,
             u.name as applicant_name,
             u.email as applicant_email,
             j.title as job_title
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN users u ON a.jobseeker_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.job_id = ?
      ORDER BY i.scheduled_at ASC
    `).all(req.params.jobId);

    res.json(interviews);
  } catch (error) {
    logger.error('Get job interviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Get my upcoming interviews (jobseeker)
router.get('/my', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const interviews = db.prepare(`
      SELECT i.*,
             j.title as job_title,
             j.location as job_location,
             j.employer_id,
             pe.company_name,
             pe.logo_url
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      WHERE a.jobseeker_id = ?
        AND i.status IN ('scheduled')
        AND datetime(i.scheduled_at) >= datetime('now')
      ORDER BY i.scheduled_at ASC
    `).all(req.user.id);

    res.json(interviews);
  } catch (error) {
    logger.error('Get my interviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Update interview
router.put('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { 
      scheduled_at, 
      duration_minutes, 
      type,
      location,
      video_link,
      notes,
      status,
      interviewer_name,
      interviewer_email
    } = req.body;

    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (scheduled_at !== undefined) { updates.push('scheduled_at = ?'); params.push(scheduled_at); }
    if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); params.push(duration_minutes); }
    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (video_link !== undefined) { updates.push('video_link = ?'); params.push(video_link); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (interviewer_name !== undefined) { updates.push('interviewer_name = ?'); params.push(interviewer_name); }
    if (interviewer_email !== undefined) { updates.push('interviewer_email = ?'); params.push(interviewer_email); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE interviews SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    logger.error('Update interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// Post interview feedback
router.put('/:id/feedback', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { feedback, feedback_rating } = req.body;

    if (!feedback && !feedback_rating) {
      return res.status(400).json({ error: 'Feedback or rating required' });
    }

    if (feedback_rating && (feedback_rating < 1 || feedback_rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = ["status = 'completed'", "updated_at = datetime('now')"];
    const params = [];

    if (feedback !== undefined) {
      updates.push('feedback = ?');
      params.push(feedback);
    }

    if (feedback_rating !== undefined) {
      updates.push('feedback_rating = ?');
      params.push(feedback_rating);
    }

    params.push(req.params.id);

    db.prepare(`UPDATE interviews SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    logger.error('Post interview feedback error', { error: error.message });
    res.status(500).json({ error: 'Failed to post feedback' });
  }
});

// Cancel interview
router.delete('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`UPDATE interviews SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

    res.json({ message: 'Interview cancelled successfully' });
  } catch (error) {
    logger.error('Cancel interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel interview' });
  }
});

module.exports = router;
