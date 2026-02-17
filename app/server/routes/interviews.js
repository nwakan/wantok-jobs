const { stripHtml, sanitizeEmail } = require('../utils/sanitizeHtml');
const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');
const { sendInterviewInviteEmail } = require('../lib/email');

const router = express.Router();

// Helper: create notification
function notify(userId, type, data) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, type, data.title || 'Interview Update', data.message || '', JSON.stringify(data));
  } catch (e) {
    logger.error('Interview notification error', { error: e.message });
  }
}

// POST /api/interviews — employer proposes interview (up to 3 time slots)
router.post('/', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { 
      application_id, 
      proposed_times,
      scheduled_at,
      duration_minutes = 60, 
      type = 'in-person',
      location,
      video_link,
      notes,
      interviewer_name,
      interviewer_email
    } = req.body;

    if (!application_id) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    // Validate proposed_times
    let times = proposed_times || (scheduled_at ? [scheduled_at] : []);
    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ error: 'At least one proposed time is required' });
    }
    if (times.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 time slots allowed' });
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

    const sanitizedLocation = location ? stripHtml(location) : null;
    const sanitizedNotes = notes ? stripHtml(notes) : null;
    const sanitizedInterviewerName = interviewer_name ? stripHtml(interviewer_name) : null;
    const sanitizedInterviewerEmail = interviewer_email ? (sanitizeEmail(interviewer_email) || interviewer_email) : null;

    // If only one time, schedule directly; otherwise propose
    const status = times.length === 1 ? 'scheduled' : 'proposed';
    const confirmedOrScheduled = times.length === 1 ? times[0] : null;

    const result = db.prepare(`
      INSERT INTO interviews (
        application_id, employer_id, jobseeker_id, proposed_times, 
        scheduled_at, confirmed_time, duration_minutes, type,
        location, video_link, notes, interviewer_name, interviewer_email, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      application_id, application.employer_id, application.jobseeker_id,
      JSON.stringify(times), confirmedOrScheduled, confirmedOrScheduled,
      duration_minutes, type, sanitizedLocation, video_link,
      sanitizedNotes, sanitizedInterviewerName, sanitizedInterviewerEmail, status
    );

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(result.lastInsertRowid);

    // Update application status
    if (application.status !== 'interview') {
      db.prepare(`UPDATE applications SET status = 'interview', updated_at = datetime('now') WHERE id = ?`).run(application_id);
      try {
        db.prepare(`
          INSERT INTO application_events (application_id, from_status, to_status, changed_by, notes)
          VALUES (?, ?, 'interview', ?, 'Interview scheduled')
        `).run(application_id, application.status, req.user.id);
      } catch (e) { /* ignore if table doesn't exist */ }
    }

    // Notification to jobseeker
    const companyProfile = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(application.employer_id);
    const companyName = companyProfile?.company_name || 'the employer';

    notify(application.jobseeker_id, 'interview_scheduled', {
      title: '📅 Interview Invitation',
      message: status === 'proposed' 
        ? `${companyName} has proposed ${times.length} time slot(s) for an interview for "${application.job_title}". Please confirm your preferred time.`
        : `${companyName} has scheduled an interview for "${application.job_title}" on ${new Date(times[0]).toLocaleString()}.`,
      interviewId: interview.id,
      applicationId: application_id,
      jobTitle: application.job_title
    });

    // Try sending email
    try {
      await sendInterviewInviteEmail(
        { email: application.applicant_email, name: application.applicant_name },
        { title: application.job_title },
        companyName,
        interview
      );
    } catch (emailErr) {
      logger.error('Failed to send interview email', { error: emailErr.message });
    }

    res.status(201).json(interview);
  } catch (error) {
    logger.error('Schedule interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// PATCH /api/interviews/:id/confirm — jobseeker confirms one time slot
router.patch('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { confirmed_time } = req.body;
    if (!confirmed_time) {
      return res.status(400).json({ error: 'confirmed_time is required' });
    }

    const interview = db.prepare(`
      SELECT i.*, a.jobseeker_id, j.employer_id, j.title as job_title
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) return res.status(404).json({ error: 'Interview not found' });

    // Only the jobseeker can confirm
    const jsId = interview.jobseeker_id || interview.jobseeker_id;
    if (req.user.id !== jsId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the applicant can confirm interview time' });
    }

    if (interview.status !== 'proposed' && interview.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot confirm interview with status "${interview.status}"` });
    }

    // Validate the confirmed_time is one of the proposed times
    const proposedTimes = interview.proposed_times ? JSON.parse(interview.proposed_times) : [];
    if (proposedTimes.length > 1 && !proposedTimes.includes(confirmed_time)) {
      return res.status(400).json({ error: 'Selected time must be one of the proposed times' });
    }

    db.prepare(`
      UPDATE interviews SET confirmed_time = ?, scheduled_at = ?, status = 'confirmed', updated_at = datetime('now')
      WHERE id = ?
    `).run(confirmed_time, confirmed_time, req.params.id);

    const updated = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);

    // Notify employer
    const jsProfile = db.prepare('SELECT name FROM users WHERE id = ?').get(jsId);
    notify(interview.employer_id, 'interview_confirmed', {
      title: '✅ Interview Confirmed',
      message: `${jsProfile?.name || 'Applicant'} confirmed the interview for "${interview.job_title}" on ${new Date(confirmed_time).toLocaleString()}.`,
      interviewId: interview.id,
      jobTitle: interview.job_title
    });

    res.json(updated);
  } catch (error) {
    logger.error('Confirm interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to confirm interview' });
  }
});

// PATCH /api/interviews/:id/cancel — either party cancels
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT i.*, a.jobseeker_id, j.employer_id, j.title as job_title
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) return res.status(404).json({ error: 'Interview not found' });

    const jsId = interview.jobseeker_id;
    const empId = interview.employer_id;
    if (req.user.id !== jsId && req.user.id !== empId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (interview.status === 'cancelled' || interview.status === 'completed') {
      return res.status(400).json({ error: `Cannot cancel interview with status "${interview.status}"` });
    }

    db.prepare(`UPDATE interviews SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

    // Notify the other party
    const cancelledBy = req.user.id === empId ? 'employer' : 'jobseeker';
    const notifyUserId = cancelledBy === 'employer' ? jsId : empId;
    const cancellerName = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id)?.name || 'A party';

    notify(notifyUserId, 'interview_cancelled', {
      title: '❌ Interview Cancelled',
      message: `${cancellerName} has cancelled the interview for "${interview.job_title}".`,
      interviewId: interview.id,
      jobTitle: interview.job_title
    });

    res.json({ message: 'Interview cancelled successfully' });
  } catch (error) {
    logger.error('Cancel interview error', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel interview' });
  }
});

// GET /api/interviews — list user's interviews (upcoming, past)
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, period } = req.query; // period: upcoming | past | all
    const userId = req.user.id;
    const role = req.user.role;

    let whereClause = '';
    const params = [];

    if (role === 'employer' || role === 'admin') {
      whereClause = 'WHERE j.employer_id = ?';
      params.push(userId);
    } else {
      whereClause = 'WHERE a.jobseeker_id = ?';
      params.push(userId);
    }

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    if (period === 'upcoming') {
      whereClause += " AND (datetime(i.scheduled_at) >= datetime('now') OR i.status IN ('proposed'))";
    } else if (period === 'past') {
      whereClause += " AND datetime(i.scheduled_at) < datetime('now') AND i.status NOT IN ('proposed')";
    }

    const interviews = db.prepare(`
      SELECT i.*,
             a.jobseeker_id,
             j.title as job_title,
             j.employer_id,
             j.location as job_location,
             u_js.name as applicant_name,
             u_js.email as applicant_email,
             pe.company_name,
             pe.logo_url
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN users u_js ON a.jobseeker_id = u_js.id
      LEFT JOIN profiles_employer pe ON j.employer_id = pe.user_id
      ${whereClause}
      ORDER BY CASE 
        WHEN i.status = 'proposed' THEN 0 
        WHEN i.status IN ('scheduled','confirmed') THEN 1 
        ELSE 2 
      END, i.scheduled_at ASC
    `).all(...params);

    // Parse proposed_times JSON
    const parsed = interviews.map(i => ({
      ...i,
      proposed_times: i.proposed_times ? JSON.parse(i.proposed_times) : []
    }));

    res.json(parsed);
  } catch (error) {
    logger.error('List interviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// GET /api/interviews/my — jobseeker's upcoming interviews (backward compat)
router.get('/my', authenticateToken, (req, res) => {
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
        AND i.status IN ('scheduled', 'confirmed', 'proposed')
      ORDER BY i.scheduled_at ASC
    `).all(req.user.id);

    const parsed = interviews.map(i => ({
      ...i,
      proposed_times: i.proposed_times ? JSON.parse(i.proposed_times) : []
    }));

    res.json(parsed);
  } catch (error) {
    logger.error('Get my interviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// GET /api/interviews/job/:jobId — employer's interviews for a specific job
router.get('/job/:jobId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const interviews = db.prepare(`
      SELECT i.*, a.jobseeker_id, u.name as applicant_name, u.email as applicant_email, j.title as job_title
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN users u ON a.jobseeker_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.job_id = ?
      ORDER BY i.scheduled_at ASC
    `).all(req.params.jobId);

    const parsed = interviews.map(i => ({
      ...i,
      proposed_times: i.proposed_times ? JSON.parse(i.proposed_times) : []
    }));

    res.json(parsed);
  } catch (error) {
    logger.error('Get job interviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// PUT /api/interviews/:id — update interview (employer)
router.put('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { scheduled_at, duration_minutes, type, location, video_link, notes, status, interviewer_name, interviewer_email, proposed_times } = req.body;
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
    if (proposed_times !== undefined) { updates.push('proposed_times = ?'); params.push(JSON.stringify(proposed_times)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

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

// PUT /api/interviews/:id/feedback — post-interview feedback
router.put('/:id/feedback', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { feedback, feedback_rating } = req.body;
    if (!feedback && !feedback_rating) return res.status(400).json({ error: 'Feedback or rating required' });
    if (feedback_rating && (feedback_rating < 1 || feedback_rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i JOIN applications a ON i.application_id = a.id JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    if (interview.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = ["status = 'completed'", "updated_at = datetime('now')"];
    const params = [];
    if (feedback !== undefined) { updates.push('feedback = ?'); params.push(feedback); }
    if (feedback_rating !== undefined) { updates.push('feedback_rating = ?'); params.push(feedback_rating); }
    params.push(req.params.id);

    db.prepare(`UPDATE interviews SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT * FROM interviews WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error('Post interview feedback error', { error: error.message });
    res.status(500).json({ error: 'Failed to post feedback' });
  }
});

// DELETE /api/interviews/:id — cancel interview (backward compat)
router.delete('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT i.*, a.job_id, j.employer_id
      FROM interviews i JOIN applications a ON i.application_id = a.id JOIN jobs j ON a.job_id = j.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) return res.status(404).json({ error: 'Interview not found' });
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
