const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Default reference check questions
const DEFAULT_QUESTIONS = [
  'How long did you work with the candidate?',
  'What were their key strengths?',
  'What areas could they improve in?',
  'Would you rehire this candidate if given the opportunity?',
  'Overall rating (1-5 stars)'
];

// Helper: Send reference request email
async function sendReferenceRequestEmail(referee, candidate, job, employer, token) {
  try {
    const { sendEmail } = require('../lib/email');
    
    const responseUrl = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/references/respond/${token}`;
    
    const subject = `Reference Check Request for ${candidate.name}`;
    const html = `
      <p>Dear ${referee.referee_name},</p>
      
      <p>${candidate.name} has applied for the position of <strong>${job.title}</strong> at ${employer.company_name || employer.name} and has listed you as a reference.</p>
      
      <p>We would greatly appreciate if you could provide a reference for ${candidate.name} by answering a few questions about your professional relationship.</p>
      
      <p>This should only take a few minutes of your time.</p>
      
      <p><a href="${responseUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Provide Reference</a></p>
      
      <p>Or copy and paste this link into your browser:<br>
      ${responseUrl}</p>
      
      <p>This reference will be kept confidential and used solely for employment evaluation purposes.</p>
      
      <p>Thank you for your time and assistance.</p>
      
      <p>Best regards,<br>
      ${employer.company_name || employer.name}<br>
      WantokJobs Platform</p>
    `;
    
    await sendEmail(referee.referee_email, subject, html);
    console.log(`✓ Reference request email sent to ${referee.referee_email}`);
  } catch (error) {
    console.error('Failed to send reference request email:', error);
  }
}

// Helper: Send reminder email
async function sendReferenceReminderEmail(reference, candidate, job, employer) {
  try {
    const { sendEmail } = require('../lib/email');
    
    const responseUrl = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/references/respond/${reference.token}`;
    
    const subject = `Reminder: Reference Check Request for ${candidate.name}`;
    const html = `
      <p>Dear ${reference.referee_name},</p>
      
      <p>This is a friendly reminder that ${candidate.name} has listed you as a reference for their application at ${employer.company_name || employer.name}.</p>
      
      <p>If you haven't already done so, we would greatly appreciate if you could provide your reference by clicking the link below:</p>
      
      <p><a href="${responseUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Provide Reference</a></p>
      
      <p>Thank you for your time.</p>
      
      <p>Best regards,<br>
      ${employer.company_name || employer.name}</p>
    `;
    
    await sendEmail(reference.referee_email, subject, html);
    console.log(`✓ Reference reminder email sent to ${reference.referee_email}`);
  } catch (error) {
    console.error('Failed to send reference reminder email:', error);
  }
}

// Helper: Send thank you email
async function sendReferenceThankYouEmail(referee) {
  try {
    const { sendEmail } = require('../lib/email');
    
    const subject = 'Thank You for Providing a Reference';
    const html = `
      <p>Dear ${referee.referee_name},</p>
      
      <p>Thank you for taking the time to provide a reference. Your input is valuable and greatly appreciated.</p>
      
      <p>We understand that your time is valuable, and we're grateful for your assistance in helping us make informed hiring decisions.</p>
      
      <p>Best regards,<br>
      WantokJobs Platform</p>
    `;
    
    await sendEmail(referee.referee_email, subject, html);
    console.log(`✓ Thank you email sent to ${referee.referee_email}`);
  } catch (error) {
    console.error('Failed to send thank you email:', error);
  }
}

// POST /api/references - Request a reference (employer only)
router.post('/', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const {
      application_id,
      referee_name,
      referee_email,
      referee_phone,
      referee_company,
      referee_relationship,
      custom_questions
    } = req.body;

    if (!application_id || !referee_name || !referee_email) {
      return res.status(400).json({ error: 'Application ID, referee name, and email are required' });
    }

    // Verify employer owns this application
    const application = db.prepare(`
      SELECT a.*, j.employer_id, j.title as job_title, u.name as candidate_name, u.email as candidate_email
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

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Use custom questions or defaults
    const questions = custom_questions && custom_questions.length > 0 
      ? custom_questions 
      : DEFAULT_QUESTIONS;

    // Create reference check record
    const result = db.prepare(`
      INSERT INTO reference_checks (
        application_id, referee_name, referee_email, referee_phone, referee_company,
        referee_relationship, status, token, questions, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, datetime('now'))
    `).run(
      application_id,
      referee_name,
      referee_email,
      referee_phone || null,
      referee_company || null,
      referee_relationship || 'colleague',
      token,
      JSON.stringify(questions)
    );

    const reference = db.prepare('SELECT * FROM reference_checks WHERE id = ?').get(result.lastInsertRowid);

    // Get employer info
    const employer = db.prepare(`
      SELECT u.name, u.email, pe.company_name
      FROM users u
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE u.id = ?
    `).get(application.employer_id);

    // Send reference request email
    await sendReferenceRequestEmail(
      reference,
      { name: application.candidate_name, email: application.candidate_email },
      { title: application.job_title },
      employer,
      token
    );

    res.status(201).json(reference);
  } catch (error) {
    console.error('Request reference error:', error);
    res.status(500).json({ error: 'Failed to request reference' });
  }
});

// GET /api/references/application/:appId - Get references for an application (employer only)
router.get('/application/:appId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { appId } = req.params;

    // Verify employer owns this application
    const application = db.prepare(`
      SELECT a.*, j.employer_id
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ?
    `).get(appId);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all references for this application
    const references = db.prepare(`
      SELECT * FROM reference_checks WHERE application_id = ? ORDER BY created_at DESC
    `).all(appId);

    // Parse JSON fields
    references.forEach(ref => {
      try {
        ref.questions = ref.questions ? JSON.parse(ref.questions) : [];
        ref.responses = ref.responses ? JSON.parse(ref.responses) : [];
      } catch (e) {
        ref.questions = [];
        ref.responses = [];
      }
    });

    res.json(references);
  } catch (error) {
    console.error('Get references error:', error);
    res.status(500).json({ error: 'Failed to fetch references' });
  }
});

// GET /api/references/respond/:token - Public endpoint to get reference form (no auth)
router.get('/respond/:token', (req, res) => {
  try {
    const { token } = req.params;

    const reference = db.prepare(`
      SELECT rc.*, a.id as app_id, u.name as candidate_name, j.title as job_title
      FROM reference_checks rc
      JOIN applications a ON rc.application_id = a.id
      JOIN users u ON a.jobseeker_id = u.id
      JOIN jobs j ON a.job_id = j.id
      WHERE rc.token = ?
    `).get(token);

    if (!reference) {
      return res.status(404).json({ error: 'Reference request not found or expired' });
    }

    if (reference.status === 'completed') {
      return res.status(400).json({ error: 'Reference already submitted' });
    }

    if (reference.status === 'declined') {
      return res.status(400).json({ error: 'Reference was declined' });
    }

    // Parse questions
    try {
      reference.questions = reference.questions ? JSON.parse(reference.questions) : DEFAULT_QUESTIONS;
    } catch (e) {
      reference.questions = DEFAULT_QUESTIONS;
    }

    // Remove sensitive fields
    delete reference.token;

    res.json(reference);
  } catch (error) {
    console.error('Get reference form error:', error);
    res.status(500).json({ error: 'Failed to fetch reference form' });
  }
});

// POST /api/references/respond/:token - Submit reference response (no auth)
router.post('/respond/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { responses, overall_rating, recommendation } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses are required' });
    }

    const reference = db.prepare(`
      SELECT * FROM reference_checks WHERE token = ?
    `).get(token);

    if (!reference) {
      return res.status(404).json({ error: 'Reference request not found' });
    }

    if (reference.status === 'completed') {
      return res.status(400).json({ error: 'Reference already submitted' });
    }

    // Update reference with responses
    db.prepare(`
      UPDATE reference_checks
      SET responses = ?,
          overall_rating = ?,
          recommendation = ?,
          status = 'completed',
          completed_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(responses),
      overall_rating || null,
      recommendation || null,
      reference.id
    );

    // Send thank you email
    await sendReferenceThankYouEmail({
      referee_name: reference.referee_name,
      referee_email: reference.referee_email
    });

    res.json({ success: true, message: 'Reference submitted successfully' });
  } catch (error) {
    console.error('Submit reference error:', error);
    res.status(500).json({ error: 'Failed to submit reference' });
  }
});

// POST /api/references/:id/remind - Send reminder email (employer only)
router.post('/:id/remind', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const reference = db.prepare(`
      SELECT rc.*, a.id as app_id, j.employer_id, j.title as job_title,
             u.name as candidate_name, emp.name as employer_name,
             pe.company_name
      FROM reference_checks rc
      JOIN applications a ON rc.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN users u ON a.jobseeker_id = u.id
      JOIN users emp ON j.employer_id = emp.id
      LEFT JOIN profiles_employer pe ON emp.id = pe.user_id
      WHERE rc.id = ?
    `).get(id);

    if (!reference) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    if (reference.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (reference.status === 'completed') {
      return res.status(400).json({ error: 'Reference already completed' });
    }

    // Send reminder
    await sendReferenceReminderEmail(
      reference,
      { name: reference.candidate_name },
      { title: reference.job_title },
      { name: reference.employer_name, company_name: reference.company_name }
    );

    res.json({ success: true, message: 'Reminder sent' });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

module.exports = router;
