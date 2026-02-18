const logger = require('../utils/logger');
const { validate, schemas } = require("../middleware/validate");
const express = require('express');
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { events: notifEvents } = require('../lib/notifications');
const { sendApplicationStatusEmail, sendNewApplicationEmail, sendApplicationConfirmationEmail } = require('../lib/email');
const { stripHtml, isValidLength } = require('../utils/sanitizeHtml');

const router = express.Router();

// ─── Quick Apply: Resume upload config ──────────────────────────────
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const RESUME_DIR = path.join(dataDir, 'uploads', 'resumes');
if (!fs.existsSync(RESUME_DIR)) fs.mkdirSync(RESUME_DIR, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESUME_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const resumeFilter = (req, file, cb) => {
  const allowed = /\.(pdf|doc|docx)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed'), false);
  }
};
const resumeUpload = multer({ storage: resumeStorage, fileFilter: resumeFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Strip employer-only fields from application data before sending to jobseekers
function sanitizeApplicationForJobseeker(app) {
  if (!app) return app;
  const sanitized = { ...app };
  delete sanitized.notes;
  delete sanitized.employer_notes;
  delete sanitized.rating;
  delete sanitized.tags;
  delete sanitized.ai_score;
  delete sanitized.match_score;
  delete sanitized.match_notes;
  delete sanitized.source;
  delete sanitized.reviewer;
  delete sanitized.screening_answers;
  return sanitized;
}

// AI Resume Scoring Function
function calculateMatchScore(jobseeker, job) {
  let score = 0;
  let maxScore = 100;

  try {
    // 1. Skills Match (40 points)
    if (job.requirements && jobseeker.skills) {
      const jobSkills = typeof job.requirements === 'string' 
        ? JSON.parse(job.requirements || '[]') 
        : (Array.isArray(job.requirements) ? job.requirements : []);
      const candidateSkills = typeof jobseeker.skills === 'string' 
        ? JSON.parse(jobseeker.skills || '[]') 
        : (Array.isArray(jobseeker.skills) ? jobseeker.skills : []);

      if (jobSkills.length > 0) {
        const jobSkillsLower = jobSkills.map(s => (typeof s === 'string' ? s : s.name || '').toLowerCase());
        const candidateSkillsLower = candidateSkills.map(s => (typeof s === 'string' ? s : s.name || s.skill || '').toLowerCase());
        
        const matchCount = jobSkillsLower.filter(js => 
          candidateSkillsLower.some(cs => cs.includes(js) || js.includes(cs))
        ).length;
        
        score += Math.min(40, (matchCount / jobSkills.length) * 40);
      } else {
        score += 20; // Give partial credit if no specific skills listed
      }
    } else {
      score += 20; // Partial credit if data missing
    }

    // 2. Experience Level Match (25 points)
    if (job.experience_level && jobseeker.work_history) {
      const workHistory = typeof jobseeker.work_history === 'string' 
        ? JSON.parse(jobseeker.work_history || '[]') 
        : (Array.isArray(jobseeker.work_history) ? jobseeker.work_history : []);

      const totalYears = workHistory.reduce((sum, exp) => {
        if (exp.start_date) {
          const start = new Date(exp.start_date);
          const end = exp.end_date ? new Date(exp.end_date) : new Date();
          const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
          return sum + years;
        }
        return sum;
      }, 0);

      const expLevel = job.experience_level.toLowerCase();
      if (expLevel.includes('entry') || expLevel.includes('junior')) {
        score += totalYears >= 0 && totalYears <= 3 ? 25 : (totalYears > 3 ? 20 : 15);
      } else if (expLevel.includes('mid') || expLevel.includes('intermediate')) {
        score += totalYears >= 2 && totalYears <= 6 ? 25 : (Math.abs(totalYears - 4) <= 3 ? 15 : 10);
      } else if (expLevel.includes('senior')) {
        score += totalYears >= 5 ? 25 : (totalYears >= 3 ? 15 : 5);
      } else {
        score += 15; // Default partial credit
      }
    } else {
      score += 15; // Partial credit if data missing
    }

    // 3. Location Match (15 points)
    if (job.location && jobseeker.location) {
      const jobLoc = job.location.toLowerCase();
      const candidateLoc = jobseeker.location.toLowerCase();
      
      if (candidateLoc === jobLoc) {
        score += 15; // Perfect match
      } else if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
        score += 10; // Partial match (e.g., city vs province)
      } else if (job.country && jobseeker.country && job.country.toLowerCase() === jobseeker.country.toLowerCase()) {
        score += 5; // Same country
      }
    } else {
      score += 5; // Partial credit if data missing
    }

    // 4. Education Relevance (10 points)
    if (jobseeker.education) {
      const education = typeof jobseeker.education === 'string' 
        ? JSON.parse(jobseeker.education || '[]') 
        : (Array.isArray(jobseeker.education) ? jobseeker.education : []);

      if (education.length > 0) {
        const highestDegree = education[0]?.degree?.toLowerCase() || '';
        if (highestDegree.includes('bachelor') || highestDegree.includes('degree')) {
          score += 10;
        } else if (highestDegree.includes('master') || highestDegree.includes('phd')) {
          score += 10;
        } else if (highestDegree.includes('diploma') || highestDegree.includes('certificate')) {
          score += 7;
        } else {
          score += 5;
        }
      } else {
        score += 3;
      }
    } else {
      score += 3;
    }

    // 5. Profile Completeness Bonus (10 points)
    let completeness = 0;
    if (jobseeker.bio) completeness += 2;
    if (jobseeker.skills) completeness += 2;
    if (jobseeker.work_history) completeness += 2;
    if (jobseeker.education) completeness += 2;
    if (jobseeker.cv_url) completeness += 2;
    score += completeness;

  } catch (error) {
    logger.error('Error calculating match score', { error: error.message });
    return 50; // Default middle score on error
  }

  return Math.round(Math.min(score, maxScore));
}


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

    // Get jobseeker CV if not provided
    let finalCvUrl = cv_url;
    if (!finalCvUrl) {
      const profile = db.prepare('SELECT cv_url FROM profiles_jobseeker WHERE user_id = ?').get(req.user.id);
      finalCvUrl = profile?.cv_url;
    }

    // Get jobseeker profile for AI scoring
    const jobseekerProfile = db.prepare(`
      SELECT pj.*, u.email, u.name
      FROM profiles_jobseeker pj
      JOIN users u ON pj.user_id = u.id
      WHERE pj.user_id = ?
    `).get(req.user.id);

    // Calculate AI match score
    const matchScore = calculateMatchScore(jobseekerProfile || {}, job);

    // Create application with AI score (UNIQUE constraint prevents duplicates atomically)
    let result;
    try {
      result = db.prepare(`
        INSERT INTO applications (job_id, jobseeker_id, cover_letter, cv_url, ai_score)
        VALUES (?, ?, ?, ?, ?)
      `).run(job_id, req.user.id, safeCoverLetter, finalCvUrl, matchScore);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
        return res.status(400).json({ error: 'Already applied to this job' });
      }
      throw err;
    }

    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
    
    // Store screening answers if provided
    if (screening_answers && Array.isArray(screening_answers) && screening_answers.length > 0) {
      try {
        // Check if screening_responses table exists
        const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='screening_responses'`).get();
        
        if (tableExists) {
          const insertResponse = db.prepare(`INSERT INTO screening_responses (application_id, question, answer) VALUES (?, ?, ?)`);
          for (const qa of screening_answers) {
            // Sanitize screening answers
            const safeQuestion = qa.question ? stripHtml(qa.question) : '';
            const safeAnswer = qa.answer ? stripHtml(qa.answer) : '';
            insertResponse.run(application.id, safeQuestion, safeAnswer);
          }
        } else {
          // Sanitize before storing as JSON
          const sanitizedAnswers = screening_answers.map(qa => ({
            question: qa.question ? stripHtml(qa.question) : '',
            answer: qa.answer ? stripHtml(qa.answer) : ''
          }));
          db.prepare(`UPDATE applications SET notes = ? WHERE id = ?`).run(
            JSON.stringify({ screening_answers: sanitizedAnswers }),
            application.id
          );
        }
      } catch (e) {
        logger.error('Failed to save screening answers', { error: e.message });
        // Continue anyway
      }
    }

    // Update profile with latest contact info if provided
    if (safePhone || safeLocation) {
      try {
        const updates = [];
        const params = [];
        if (safePhone) {
          updates.push('phone = ?');
          params.push(safePhone);
        }
        if (safeLocation) {
          updates.push('location = ?');
          params.push(safeLocation);
        }
        if (updates.length > 0) {
          params.push(req.user.id);
          db.prepare(`UPDATE profiles_jobseeker SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
        }
      } catch (e) {
        logger.error('Failed to update profile', { error: e.message });
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
    db.prepare(`INSERT INTO application_events (application_id, to_status, changed_by, notes) VALUES (?, 'pending', ?, 'Initial application')`).run(application.id, req.user.id);

    // Check badges after application submit
    try { require('./badges').checkAndAwardBadges(req.user.id); } catch {}

    res.status(201).json(application);
  } catch (error) {
    logger.error('Apply error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ─── Quick Apply (no account needed) ────────────────────────────────
router.post('/quick-apply', resumeUpload.single('resume'), (req, res) => {
  try {
    const { job_id, name, email, phone, cover_letter } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !job_id) {
      return res.status(400).json({ error: 'Name, email, phone, and job_id are required' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Sanitize inputs
    const safeName = stripHtml(name);
    const safeEmail = stripHtml(email).toLowerCase().trim();
    const safePhone = stripHtml(phone);
    const safeCoverLetter = cover_letter ? stripHtml(cover_letter) : null;

    if (safeCoverLetter && !isValidLength(safeCoverLetter, 500)) {
      return res.status(400).json({ error: 'Cover letter must be 500 characters or less' });
    }

    // Check if job exists and is active
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(job_id, 'active');
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not active' });
    }

    // Check if this email already applied to this job (prevent duplicates)
    const existing = db.prepare(
      'SELECT id FROM applications WHERE job_id = ? AND guest_email = ?'
    ).get(job_id, safeEmail);
    if (existing) {
      return res.status(400).json({ error: 'You have already applied to this job with this email' });
    }

    // Also check if a registered user with this email already applied
    const registeredUser = db.prepare('SELECT id FROM users WHERE email = ?').get(safeEmail);
    if (registeredUser) {
      const registeredApp = db.prepare(
        'SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?'
      ).get(job_id, registeredUser.id);
      if (registeredApp) {
        return res.status(400).json({ error: 'An account with this email has already applied to this job. Please login to view your application.' });
      }
    }

    // Handle resume file
    let resumePath = null;
    if (req.file) {
      resumePath = `/uploads/resumes/${req.file.filename}`;
    }

    // Insert application
    let result;
    try {
      result = db.prepare(`
        INSERT INTO applications (job_id, applicant_type, guest_name, guest_email, guest_phone, cover_letter, resume_path, status)
        VALUES (?, 'quick', ?, ?, ?, ?, ?, 'pending')
      `).run(job_id, safeName, safeEmail, safePhone, safeCoverLetter, resumePath);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
        return res.status(400).json({ error: 'Already applied to this job' });
      }
      throw err;
    }

    const applicationId = result.lastInsertRowid;

    // Send confirmation email to applicant
    const companyProfile = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(job.employer_id);
    const employer = db.prepare('SELECT email, name FROM users WHERE id = ?').get(job.employer_id);
    sendApplicationConfirmationEmail(
      { email: safeEmail, name: safeName },
      job,
      companyProfile?.company_name || employer?.name || 'the employer'
    ).catch(() => {});

    // Send notification to employer
    const appCount = db.prepare('SELECT COUNT(*) as n FROM applications WHERE job_id = ?').get(job.id)?.n;
    if (employer) {
      sendNewApplicationEmail(employer, job.title, safeName, appCount).catch(() => {});
    }

    // Notify via in-app notifications
    const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
    notifEvents.onNewApplication(application, job, { name: safeName });

    // Log application event
    try {
      db.prepare(
        `INSERT INTO application_events (application_id, to_status, notes) VALUES (?, 'pending', 'Quick apply (no account)')`
      ).run(applicationId);
    } catch (e) {
      // application_events may have required changed_by — ignore
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId
    });
  } catch (error) {
    logger.error('Quick apply error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get my applications (jobseeker)
router.get('/my', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { total } = db.prepare(
      'SELECT COUNT(*) as total FROM applications WHERE jobseeker_id = ?'
    ).get(req.user.id);

    const applications = db.prepare(`
      SELECT a.id,
             a.job_id,
             a.status,
             a.cover_letter,
             a.cv_url,
             a.applied_at,
             a.updated_at,
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
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.json({
      data: applications.map(sanitizeApplicationForJobseeker),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get applications error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications for a job (employer - own jobs only, enhanced with full profile data)
router.get('/job/:jobId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { sort = 'date' } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const job = db.prepare('SELECT id, employer_id FROM jobs WHERE id = ?').get(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Enhanced query with full profile data (supports both registered and quick-apply)
    let query = `
      SELECT a.*,
             COALESCE(u.name, a.guest_name) as applicant_name,
             COALESCE(u.email, a.guest_email) as applicant_email,
             COALESCE(u.phone, a.guest_phone) as applicant_phone,
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
      LEFT JOIN users u ON a.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
      WHERE a.job_id = ?
    `;

    // Count total
    const { total } = db.prepare('SELECT COUNT(*) as total FROM applications WHERE job_id = ?').get(req.params.jobId);

    // Sorting
    if (sort === 'score') {
      query += ' ORDER BY a.ai_score DESC NULLS LAST, a.applied_at DESC';
    } else if (sort === 'status') {
      query += ' ORDER BY a.status, a.applied_at DESC';
    } else {
      query += ' ORDER BY a.applied_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';

    const applications = db.prepare(query).all(req.params.jobId, limit, offset);

    // Batch-load screening answers for all applications (avoids N+1)
    if (applications.length > 0) {
      const hasScreening = db.prepare('SELECT COUNT(*) as count FROM screening_questions WHERE job_id = ?').get(req.params.jobId);
      
      if (hasScreening?.count > 0) {
        const appIds = applications.map(a => a.id);
        const placeholders = appIds.map(() => '?').join(',');
        const allAnswers = db.prepare(`
          SELECT sa.*, sq.question, sq.question_type
          FROM screening_answers sa
          INNER JOIN screening_questions sq ON sa.question_id = sq.id
          WHERE sa.application_id IN (${placeholders})
          ORDER BY sq.sort_order
        `).all(...appIds);
        
        // Group answers by application_id
        const answersByApp = {};
        for (const ans of allAnswers) {
          if (!answersByApp[ans.application_id]) answersByApp[ans.application_id] = [];
          answersByApp[ans.application_id].push(ans);
        }
        for (const app of applications) {
          app.screening_answers = answersByApp[app.id] || [];
        }
      }
    }

    res.json({
      data: applications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get job applications error', { error: error.message });
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
    logger.error('Update application notes error', { error: error.message });
    res.status(500).json({ error: 'Failed to update application notes' });
  }
});

// Update application status (employer or admin) — supports both PUT and PATCH
function handleStatusUpdate(req, res) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }

    const validStatuses = ['applied', 'pending', 'screening', 'reviewed', 'shortlisted', 'interview', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Valid: ' + validStatuses.join(', ') });
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

    // Validate status transition
    const validTransitions = {
      'applied': ['screening', 'reviewed', 'shortlisted', 'rejected', 'withdrawn'],
      'pending': ['screening', 'reviewed', 'shortlisted', 'rejected', 'withdrawn'],
      'screening': ['shortlisted', 'rejected', 'withdrawn'],
      'reviewed': ['shortlisted', 'rejected', 'withdrawn'],
      'shortlisted': ['interview', 'interviewed', 'rejected', 'withdrawn'],
      'interview': ['offered', 'rejected', 'withdrawn'],
      'interviewed': ['offered', 'rejected', 'withdrawn'],
      'offered': ['hired', 'rejected', 'withdrawn'],
      'hired': [],
      'rejected': [],
      'withdrawn': []
    };

    // Allow jobseeker to withdraw only
    if (status === 'withdrawn' && req.user.id !== application.jobseeker_id) {
      return res.status(403).json({ error: 'Only jobseeker can withdraw application' });
    }

    // Check if transition is valid (skip check for admin)
    if (req.user.role !== 'admin' && !validTransitions[oldStatus]?.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition from '${oldStatus}' to '${status}'`,
        allowedTransitions: validTransitions[oldStatus] || []
      });
    }

    db.prepare(`
      UPDATE applications SET status = ?, status_updated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(status, req.params.id);

    // Auto-generate onboarding checklist when hired
    if (status === 'hired') {
      try {
        const { generateOnboardingChecklist } = require('./onboarding');
        
        // Check if checklist already exists
        const existingChecklist = db.prepare(
          'SELECT COUNT(*) as count FROM onboarding_checklists WHERE application_id = ?'
        ).get(req.params.id);
        
        if (existingChecklist.count === 0) {
          generateOnboardingChecklist(req.params.id);
        }
      } catch (error) {
        logger.error('Failed to generate onboarding checklist', { error: error.message });
        // Don't fail the status update if checklist generation fails
      }
    }

    // Rich notification with caring messages per status
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(application.job_id);
    notifEvents.onApplicationStatusChanged(application, status, job || { title: application.job_title });

    // Email jobseeker about status change
    const jobseeker = db.prepare('SELECT email, name FROM users WHERE id = ?').get(application.jobseeker_id);
    const companyName = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(application.employer_id || job?.employer_id);
    if (jobseeker) sendApplicationStatusEmail(jobseeker, job?.title || 'a position', status, companyName?.company_name || 'the employer').catch(() => {});

    // Log application pipeline event
    db.prepare(`INSERT INTO application_events (application_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)`).run(application.id, oldStatus, status, req.user.id, `Status changed by ${req.user.role}`);

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

    res.json(updated);
  } catch (error) {
    logger.error('Update application error', { error: error.message });
    res.status(500).json({ error: 'Failed to update application' });
  }
}
router.put('/:id/status', authenticateToken, requireRole('employer', 'admin'), handleStatusUpdate);
router.patch('/:id/status', authenticateToken, requireRole('employer', 'admin'), handleStatusUpdate);

// POST /:id/notes - Add employer notes to a specific application
router.post('/:id/notes', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ error: 'Notes required' });

    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.prepare(`UPDATE applications SET employer_notes = ?, updated_at = datetime('now') WHERE id = ?`).run(notes, req.params.id);

    // Log in applicant_notes table for history
    try {
      db.prepare(`INSERT INTO applicant_notes (application_id, note, created_by) VALUES (?, ?, ?)`).run(req.params.id, notes, req.user.id);
    } catch (e) { /* table may not exist */ }

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error('Add application notes error', { error: error.message });
    res.status(500).json({ error: 'Failed to add notes' });
  }
});

// GET /:id/events - Get status change history for an application
router.get('/:id/events', authenticateToken, (req, res) => {
  try {
    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Jobseekers can see their own, employers can see their jobs'
    if (req.user.role === 'jobseeker' && application.jobseeker_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.user.role === 'employer' && application.employer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const events = db.prepare(`
      SELECT ae.*, u.name as changed_by_name
      FROM application_events ae
      LEFT JOIN users u ON ae.changed_by = u.id
      WHERE ae.application_id = ?
      ORDER BY ae.created_at ASC
    `).all(req.params.id);

    res.json(events);
  } catch (error) {
    logger.error('Get application events error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Withdraw application (jobseeker only)
router.post('/:id/withdraw', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const application = db.prepare(`
      SELECT a.*, j.title as job_title, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.jobseeker_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (application.status === 'withdrawn') {
      return res.status(400).json({ error: 'Application already withdrawn' });
    }

    if (['hired', 'rejected'].includes(application.status)) {
      return res.status(400).json({ error: `Cannot withdraw a ${application.status} application` });
    }

    const oldStatus = application.status;

    db.prepare(`UPDATE applications SET status = 'withdrawn', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

    // Log event
    db.prepare(`INSERT INTO application_events (application_id, from_status, to_status, changed_by, notes) VALUES (?, ?, 'withdrawn', ?, 'Withdrawn by jobseeker')`).run(application.id, oldStatus, req.user.id);

    // Notify employer
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(application.job_id);
    notifEvents.onApplicationStatusChanged(application, 'withdrawn', job || { title: application.job_title });

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json(sanitizeApplicationForJobseeker(updated));
  } catch (error) {
    logger.error('Withdraw application error', { error: error.message });
    res.status(500).json({ error: 'Failed to withdraw application' });
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
    logger.error('Add tag error', { error: error.message });
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
    logger.error('Rate applicant error', { error: error.message });
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
    logger.error('Save notes error', { error: error.message });
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
    logger.error('Upcoming deadlines error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
  }
});

// GET /api/applications/compare - Compare multiple candidates (employer only)
router.get('/compare', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { ids } = req.query; // e.g., ?ids=1,2,3

    if (!ids) {
      return res.status(400).json({ error: 'Application IDs required' });
    }

    const applicationIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (applicationIds.length < 2 || applicationIds.length > 4) {
      return res.status(400).json({ error: 'Please select 2-4 applications to compare' });
    }

    // Get applications with full profile data
    const placeholders = applicationIds.map(() => '?').join(',');
    const applications = db.prepare(`
      SELECT a.*,
             u.name as applicant_name,
             u.email as applicant_email,
             pj.phone,
             pj.location as applicant_location,
             pj.bio,
             pj.headline,
             pj.skills,
             pj.work_history,
             pj.education,
             pj.cv_url as profile_cv_url,
             j.employer_id,
             j.title as job_title
      FROM applications a
      JOIN users u ON a.jobseeker_id = u.id
      LEFT JOIN profiles_jobseeker pj ON u.id = pj.user_id
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id IN (${placeholders})
    `).all(...applicationIds);

    if (applications.length !== applicationIds.length) {
      return res.status(404).json({ error: 'One or more applications not found' });
    }

    // Verify all applications belong to employer's jobs
    const employerId = req.user.id;
    const unauthorized = applications.some(app => app.employer_id !== employerId && req.user.role !== 'admin');

    if (unauthorized) {
      return res.status(403).json({ error: 'Not authorized to view one or more applications' });
    }

    // Get screening answers for each application
    applications.forEach(app => {
      const answers = db.prepare(`
        SELECT sa.*, sq.question, sq.question_type
        FROM screening_answers sa
        INNER JOIN screening_questions sq ON sa.question_id = sq.id
        WHERE sa.application_id = ?
        ORDER BY sq.sort_order
      `).all(app.id);
      app.screening_answers = answers;

      // Parse JSON fields
      if (app.skills) {
        try {
          app.skills = JSON.parse(app.skills);
        } catch (e) {
          app.skills = [];
        }
      }
      if (app.work_history) {
        try {
          app.work_history = JSON.parse(app.work_history);
        } catch (e) {
          app.work_history = [];
        }
      }
      if (app.education) {
        try {
          app.education = JSON.parse(app.education);
        } catch (e) {
          app.education = [];
        }
      }
      if (app.tags) {
        try {
          app.tags = JSON.parse(app.tags);
        } catch (e) {
          app.tags = [];
        }
      }
    });

    res.json({ data: applications });
  } catch (error) {
    logger.error('Compare applications error', { error: error.message });
    res.status(500).json({ error: 'Failed to compare applications' });
  }
});

// POST /api/applications/:id/review - Submit review (employer team member)
router.post('/:id/review', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { recommendation, rating, strengths, concerns, notes } = req.body;

    if (!recommendation || !rating) {
      return res.status(400).json({ error: 'Recommendation and rating required' });
    }

    if (!['hire', 'maybe', 'no-hire'].includes(recommendation)) {
      return res.status(400).json({ error: 'Invalid recommendation' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify application exists and belongs to employer's job
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

    // Check if user already reviewed this application
    const existing = db.prepare(`
      SELECT id FROM application_reviews
      WHERE application_id = ? AND reviewer_id = ?
    `).get(req.params.id, req.user.id);

    if (existing) {
      // Update existing review
      db.prepare(`
        UPDATE application_reviews
        SET recommendation = ?,
            rating = ?,
            strengths = ?,
            concerns = ?,
            notes = ?
        WHERE id = ?
      `).run(recommendation, rating, strengths || null, concerns || null, notes || null, existing.id);

      const updated = db.prepare('SELECT * FROM application_reviews WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    // Create new review
    const result = db.prepare(`
      INSERT INTO application_reviews
      (application_id, reviewer_id, recommendation, rating, strengths, concerns, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.id, req.user.id, recommendation, rating, strengths || null, concerns || null, notes || null);

    const review = db.prepare('SELECT * FROM application_reviews WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(review);
  } catch (error) {
    logger.error('Submit review error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/applications/:id/reviews - Get all reviews for an application (employer only)
router.get('/:id/reviews', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    // Verify application exists and belongs to employer's job
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

    // Get all reviews
    const reviews = db.prepare(`
      SELECT ar.*,
             u.name as reviewer_name
      FROM application_reviews ar
      JOIN users u ON ar.reviewer_id = u.id
      WHERE ar.application_id = ?
      ORDER BY ar.created_at DESC
    `).all(req.params.id);

    // Calculate summary
    const summary = {
      total: reviews.length,
      average_rating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
      recommendations: {
        hire: reviews.filter(r => r.recommendation === 'hire').length,
        maybe: reviews.filter(r => r.recommendation === 'maybe').length,
        'no-hire': reviews.filter(r => r.recommendation === 'no-hire').length
      }
    };

    res.json({ reviews, summary });
  } catch (error) {
    logger.error('Get reviews error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/jobs/:id/quick-apply - One-click apply for authenticated jobseekers (Part 2.7)
router.post('/jobs/:id/quick-apply', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get job
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(jobId, 'active');
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not active' });
    }

    // Get jobseeker profile
    const profile = db.prepare('SELECT * FROM profiles_jobseeker WHERE user_id = ?').get(userId);
    if (!profile) {
      return res.status(400).json({ error: 'Please complete your profile first' });
    }

    // Validate minimum requirements
    if (!profile.cv_url) {
      return res.status(400).json({ 
        error: 'CV required', 
        message: 'Please upload your CV before applying',
        action: 'upload_cv'
      });
    }

    if (!profile.skills || profile.profile_complete < 50) {
      return res.status(400).json({ 
        error: 'Profile incomplete', 
        message: 'Please complete at least 50% of your profile to apply',
        action: 'complete_profile'
      });
    }

    // Check if already applied
    const existing = db.prepare(
      'SELECT id FROM applications WHERE job_id = ? AND jobseeker_id = ?'
    ).get(jobId, userId);
    if (existing) {
      return res.status(400).json({ error: 'You have already applied to this job' });
    }

    // Auto-generate cover letter
    const coverLetter = generateCoverLetter(profile, job, req.user.name);

    // Calculate match score
    const { calculateCompatibility } = require('../utils/compatibility');
    const compatibility = calculateCompatibility(profile, job);

    // Create application
    const result = db.prepare(`
      INSERT INTO applications (
        job_id, jobseeker_id, cover_letter, cv_url, 
        status, match_score, source
      ) VALUES (?, ?, ?, ?, 'applied', ?, 'quick-apply')
    `).run(jobId, userId, coverLetter, profile.cv_url, compatibility.score);

    const applicationId = result.lastInsertRowid;

    // Update job applications count
    db.prepare('UPDATE jobs SET applications_count = applications_count + 1 WHERE id = ?').run(jobId);

    // Send confirmation email
    const companyProfile = db.prepare('SELECT company_name FROM profiles_employer WHERE user_id = ?').get(job.employer_id);
    const employer = db.prepare('SELECT email, name FROM users WHERE id = ?').get(job.employer_id);
    sendApplicationConfirmationEmail(
      { email: req.user.email, name: req.user.name },
      job,
      companyProfile?.company_name || employer?.name || 'the employer'
    ).catch(() => {});

    // Notify employer
    const appCount = db.prepare('SELECT COUNT(*) as n FROM applications WHERE job_id = ?').get(jobId)?.n;
    if (employer) {
      sendNewApplicationEmail(employer, job.title, req.user.name, appCount).catch(() => {});
    }

    // Create notification for employer
    const { notifyEmployerOfApplication } = require('../../system/agents/employer-notifier');
    try {
      notifyEmployerOfApplication(applicationId);
    } catch (e) {
      logger.error('Employer notification error', { error: e.message });
    }

    // Log activity
    try {
      db.prepare(
        'INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)'
      ).run(userId, 'job_applied', 'application', applicationId, JSON.stringify({ 
        job_id: jobId, 
        job_title: job.title,
        match_score: compatibility.score 
      }));
    } catch (e) {}

    res.status(201).json({
      success: true,
      application_id: applicationId,
      message: 'Applied! The employer will review your application.',
      match_score: compatibility.score
    });
  } catch (error) {
    logger.error('Quick apply error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

function generateCoverLetter(profile, job, userName) {
  const firstName = userName.split(' ')[0];
  const companyName = job.company_display_name || 'your company';
  
  let letter = `Dear Hiring Manager,\n\n`;
  letter += `I am writing to express my strong interest in the ${job.title} position at ${companyName}.\n\n`;
  
  // Mention skills
  let skills = [];
  try {
    if (profile.skills) {
      const parsed = JSON.parse(profile.skills);
      skills = Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  
  if (skills.length > 0) {
    letter += `With my background in ${skills.slice(0, 3).join(', ')}, I believe I would be a strong fit for this role. `;
  }
  
  // Mention experience
  let workHistory = [];
  try {
    if (profile.work_history) {
      const parsed = JSON.parse(profile.work_history);
      workHistory = Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  
  if (workHistory.length > 0) {
    const latestJob = workHistory[0];
    if (latestJob.title) {
      letter += `My experience as a ${latestJob.title}`;
      if (latestJob.company) {
        letter += ` at ${latestJob.company}`;
      }
      letter += ` has equipped me with the skills and knowledge needed to excel in this position.\n\n`;
    }
  } else {
    letter += `\n\n`;
  }
  
  // Location match
  if (profile.location && job.location && profile.location.toLowerCase() === job.location.toLowerCase()) {
    letter += `Being based in ${profile.location}, I am readily available to work at your ${job.location} location.\n\n`;
  }
  
  letter += `I am particularly excited about this opportunity because it aligns well with my career goals and expertise. `;
  letter += `I would welcome the chance to discuss how my skills and experience can contribute to ${companyName}'s continued success.\n\n`;
  
  letter += `Thank you for considering my application. I look forward to hearing from you.\n\n`;
  letter += `Best regards,\n${firstName}`;
  
  return letter;
}

module.exports = router;
