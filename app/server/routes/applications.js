const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');
const { sendApplicationStatusEmail, sendNewApplicationEmail, sendApplicationConfirmationEmail } = require('../lib/email');
const { stripHtml, isValidLength } = require('../utils/sanitizeHtml');

const router = express.Router();

// Apply to job (jobseeker only)
router.post('/', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const { job_id, cover_letter, cv_url, phone, location, screening_answers } = req.body;

    // Sanitize all text inputs to prevent XSS
    const safeCoverLetter = cover_letter ? stripHtml(cover_letter) : null;
    const safePhone = phone ? stripHtml(phone) : null;
    const safeLocation = location ? stripHtml(location) : null;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID required' });
    }
    
    // Validate lengths
    if (safeCoverLetter && !isValidLength(safeCoverLetter, 5000)) {
      return res.status(400).json({ error: 'Cover letter must be 5000 characters or less' });
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

    // Create application with new fields
    const result = db.prepare(`
      INSERT INTO applications (job_id, jobseeker_id, cover_letter, cv_url)
      VALUES (?, ?, ?, ?)
    `).run(job_id, req.user.id, safeCoverLetter, finalCvUrl);

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
    
    // Store screening answers if provided
    if (screening_answers && Array.isArray(screening_answers) && screening_answers.length > 0) {
      try {
        // Check if screening_responses table exists
        const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='screening_responses'`).get();
        
        if (tableExists) {
          const insertResponse = db.prepare(`INSERT INTO screening_responses (application_id, question, answer) VALUES (?, ?, ?)`);
          for (const qa of screening_answers) {
            insertResponse.run(application.id, qa.question, qa.answer);
          }
        } else {
          // Store as JSON in application record
          db.prepare(`UPDATE applications SET notes = ? WHERE id = ?`).run(
            JSON.stringify({ screening_answers }),
            application.id
          );
        }
      } catch (e) {
        console.error('Failed to save screening answers:', e);
        // Continue anyway
      }
    }

    // Update profile with latest contact info if provided
    if (phone || location) {
      try {
        const updates = [];
        const params = [];
        if (phone) {
          updates.push('phone = ?');
          params.push(phone);
        }
        if (location) {
          updates.push('location = ?');
          params.push(location);
        }
        if (updates.length > 0) {
          params.push(req.user.id);
          db.prepare(`UPDATE profiles_jobseeker SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
        }
      } catch (e) {
        console.error('Failed to update profile:', e);
        // Continue anyway
      }
    }

    const applicant = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

    // Smart notification with match score
    notifEvents.onNewApplication(application, job, applicant || { name: 'A jobseeker' });

    // Email employer about new application
    const employer = db.prepare('SELECT email, name FROM users WHERE id = ?').get(job.employer_id);
    const appCount = db.prepare('SELECT COUNT(*) as n FROM applications WHERE job_id = ?').get(job.id)?.n;
    if (employer) sendNewApplicationEmail(employer, job.title, applicant?.name || 'A jobseeker', appCount).catch(() => {});

    // Email jobseeker confirmation
    const companyProfile = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(job.employer_id);
    sendApplicationConfirmationEmail({ email: req.user.email, name: applicant?.name }, job, companyProfile?.company_name || employer?.name || 'the employer').catch(() => {});

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

// Get applications for a job (employer - own jobs only, enhanced with full profile data)
router.get('/job/:jobId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { sort = 'date' } = req.query; // sort options: date, score, status

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Enhanced query with full profile data
    let query = `
      SELECT a.*,
             u.name as applicant_name,
             u.email as applicant_email,
             u.phone as applicant_phone,
             pj.phone as profile_phone,
             pj.location as applicant_location,
             pj.bio,
             pj.headline,
             pj.skills,
             pj.work_history,
             pj.education,
             pj.cv_url as profile_cv_url,
             pj.desired_job_type,
             pj.desired_salary_min,
             pj.desired_salary_max,
             pj.availability
      FROM applications a
      JOIN users u ON a.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
      WHERE a.job_id = ?
    `;

    // Sorting
    if (sort === 'score') {
      query += ' ORDER BY a.ai_score DESC NULLS LAST, a.applied_at DESC';
    } else if (sort === 'status') {
      query += ' ORDER BY a.status, a.applied_at DESC';
    } else {
      query += ' ORDER BY a.applied_at DESC';
    }

    const applications = db.prepare(query).all(req.params.jobId);

    // Get screening answers for each application if screening questions exist
    const hasScreening = db.prepare('SELECT COUNT(*) as count FROM screening_questions WHERE job_id = ?').get(req.params.jobId);
    
    if (hasScreening?.count > 0) {
      applications.forEach(app => {
        const answers = db.prepare(`
          SELECT sa.*, sq.question, sq.question_type
          FROM screening_answers sa
          INNER JOIN screening_questions sq ON sa.question_id = sq.id
          WHERE sa.application_id = ?
          ORDER BY sq.sort_order
        `).all(app.id);
        app.screening_answers = answers;
      });
    }

    res.json({ data: applications, total: applications.length });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PATCH /:id/notes - Add/update employer notes on applicant
router.patch('/:id/notes', authenticateToken, requireRole('employer', 'admin'), validate(schemas.applicationNotes), (req, res) => {
  try {
    const { notes } = req.body;

    const application = db.prepare(`
      SELECT a.*, j.employer_id
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

    // Add notes column if it doesn't exist (SQLite limitation workaround)
    try {
      db.exec('ALTER TABLE applications ADD COLUMN notes TEXT');
    } catch(e) {
      // Column already exists
    }

    db.prepare(`
      UPDATE applications SET notes = ?, updated_at = datetime('now') WHERE id = ?
    `).run(notes, req.params.id);

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    console.error('Update application notes error:', error);
    res.status(500).json({ error: 'Failed to update application notes' });
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

    // Email jobseeker about status change
    const jobseeker = db.prepare('SELECT email, name FROM users WHERE id = ?').get(application.jobseeker_id);
    const companyName = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(application.employer_id || job?.employer_id);
    if (jobseeker) sendApplicationStatusEmail(jobseeker, job?.title || 'a position', status, companyName?.company_name || 'the employer').catch(() => {});

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

// Add tag to application (employer)
router.post('/tag', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId, tag, color = 'blue' } = req.body;

    if (!applicationId || !tag) {
      return res.status(400).json({ error: 'Application ID and tag required' });
    }

    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Add tag to applicant_tags table
    db.prepare(`
      INSERT INTO applicant_tags (application_id, tag, color, created_by)
      VALUES (?, ?, ?, ?)
    `).run(applicationId, tag, color, req.user.id);

    // Update tags JSON array in applications table
    const existingTags = application.tags ? JSON.parse(application.tags) : [];
    existingTags.push({ tag, color });
    
    db.prepare(`
      UPDATE applications SET tags = ?, updated_at = datetime('now') WHERE id = ?
    `).run(JSON.stringify(existingTags), applicationId);

    res.json({ success: true, message: 'Tag added' });
  } catch (error) {
    console.error('Add tag error:', error);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// Rate applicant (employer)
router.post('/rate', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId, rating } = req.body;

    if (!applicationId || rating === undefined) {
      return res.status(400).json({ error: 'Application ID and rating required' });
    }

    if (rating < 0 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 0 and 5' });
    }

    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`
      UPDATE applications SET rating = ?, updated_at = datetime('now') WHERE id = ?
    `).run(rating, applicationId);

    res.json({ success: true, rating });
  } catch (error) {
    console.error('Rate applicant error:', error);
    res.status(500).json({ error: 'Failed to rate applicant' });
  }
});

// Save employer notes (employer)
router.post('/notes', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId, notes } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(applicationId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`
      UPDATE applications SET employer_notes = ?, updated_at = datetime('now') WHERE id = ?
    `).run(notes, applicationId);

    // Also log in applicant_notes table for history
    db.prepare(`
      INSERT INTO applicant_notes (application_id, note, created_by)
      VALUES (?, ?, ?)
    `).run(applicationId, notes, req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Save notes error:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Get upcoming application deadlines (jobs user might want to apply to)
router.get('/upcoming-deadlines', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get jobs with deadlines in next 7 days that user hasn't applied to yet
    // AND match user's interests (saved jobs, recent searches, etc.)
    const deadlines = db.prepare(`
      SELECT 
        j.id as job_id,
        j.title as job_title,
        j.company_name,
        j.application_deadline,
        CAST(julianday(j.application_deadline) - julianday('now') AS INTEGER) as days_left
      FROM jobs j
      LEFT JOIN saved_jobs sj ON sj.job_id = j.id AND sj.user_id = ?
      LEFT JOIN applications a ON a.job_id = j.id AND a.jobseeker_id = ?
      WHERE j.status = 'active'
        AND j.application_deadline IS NOT NULL
        AND date(j.application_deadline) >= date('now')
        AND date(j.application_deadline) <= date('now', '+7 days')
        AND a.id IS NULL
        AND sj.id IS NOT NULL
      ORDER BY j.application_deadline ASC
      LIMIT 5
    `).all(userId, userId);

    res.json(deadlines);
  } catch (error) {
    console.error('Upcoming deadlines error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
  }
});

module.exports = router;
