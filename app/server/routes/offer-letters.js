const { stripHtml, sanitizeEmail } = require('../utils/sanitizeHtml');
const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { sendEmail } = require('../lib/email');

const router = express.Router();

// GET /api/offer-letters/my - Get my offers (jobseeker)
router.get('/my', authenticateToken, requireRole('jobseeker'), (req, res) => {
  try {
    const offers = db.prepare(`
      SELECT ol.*,
             j.title as job_title,
             pe.company_name,
             pe.logo_url,
             u.email as employer_email
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN profiles_employer pe ON j.employer_id = pe.user_id
      JOIN users u ON j.employer_id = u.id
      WHERE a.jobseeker_id = ?
      ORDER BY ol.created_at DESC
    `).all(req.user.id);

    res.json(offers);
  } catch (error) {
    logger.error('Get my offers error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// GET /api/offer-letters/:id - View offer
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const offer = db.prepare(`
      SELECT ol.*,
             a.jobseeker_id,
             j.employer_id,
             j.title as job_title,
             j.location as job_location,
             pe.company_name,
             pe.logo_url,
             pe.website,
             u.name as employer_name,
             u.email as employer_email,
             js.name as candidate_name,
             js.email as candidate_email
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN profiles_employer pe ON j.employer_id = pe.user_id
      JOIN users u ON j.employer_id = u.id
      JOIN users js ON a.jobseeker_id = js.id
      WHERE ol.id = ?
    `).get(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check authorization
    if (req.user.role === 'jobseeker' && offer.jobseeker_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.user.role === 'employer' && offer.employer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(offer);
  } catch (error) {
    logger.error('Get offer error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

// POST /api/offer-letters - Create offer (employer only)
router.post('/', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const {
      application_id,
      salary,
      salary_currency = 'PGK',
      salary_period = 'annual',
      start_date,
      employment_type,
      probation_months = 3,
      benefits,
      additional_terms
    } = req.body;

    if (!application_id) {
      return res.status(400).json({ error: 'Application ID required' });
    }

    // Get application and verify ownership
    const application = db.prepare(`
      SELECT a.*,
             j.title as job_title,
             j.employer_id,
             j.employment_type as job_employment_type,
             j.salary_min,
             j.salary_max,
             j.salary_currency as job_currency,
             u.name as candidate_name
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

    // Check if offer already exists
    const existing = db.prepare('SELECT id FROM offer_letters WHERE application_id = ?').get(application_id);
    if (existing) {
      return res.status(400).json({ error: 'Offer already exists for this application' });
    }

    // Auto-populate from job if not provided
    const finalSalary = salary || application.salary_max || application.salary_min;
    const finalEmploymentType = employment_type || application.job_employment_type;
    const finalCurrency = salary_currency || application.job_currency || 'PGK';

    // Create offer
    const result = db.prepare(`
      INSERT INTO offer_letters (
        application_id, job_title, candidate_name,
        salary, salary_currency, salary_period,
        start_date, employment_type, probation_months,
        benefits, additional_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      application_id,
      application.job_title,
      application.candidate_name,
      finalSalary,
      finalCurrency,
      salary_period,
      start_date,
      finalEmploymentType,
      probation_months,
      benefits ? JSON.stringify(benefits) : null,
      additional_terms
    );

    const offer = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(offer);
  } catch (error) {
    logger.error('Create offer error', { error: error.message });
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// PUT /api/offer-letters/:id - Edit draft offer (employer only)
router.put('/:id', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const {
      salary,
      salary_currency,
      salary_period,
      start_date,
      employment_type,
      probation_months,
      benefits,
      additional_terms
    } = req.body;

    const offer = db.prepare(`
      SELECT ol.*, a.jobseeker_id, j.employer_id
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      WHERE ol.id = ?
    `).get(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft offers' });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (salary !== undefined) {
      updates.push('salary = ?');
      params.push(salary);
    }
    if (salary_currency) {
      updates.push('salary_currency = ?');
      params.push(salary_currency);
    }
    if (salary_period) {
      updates.push('salary_period = ?');
      params.push(salary_period);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (employment_type) {
      updates.push('employment_type = ?');
      params.push(employment_type);
    }
    if (probation_months !== undefined) {
      updates.push('probation_months = ?');
      params.push(probation_months);
    }
    if (benefits !== undefined) {
      updates.push('benefits = ?');
      params.push(benefits ? JSON.stringify(benefits) : null);
    }
    if (additional_terms !== undefined) {
      updates.push('additional_terms = ?');
      params.push(additional_terms);
    }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE offer_letters SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error('Update offer error', { error: error.message });
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// POST /api/offer-letters/:id/send - Send offer (employer only)
router.post('/:id/send', authenticateToken, requireRole('employer', 'admin'), async (req, res) => {
  try {
    const { expires_in_days = 7 } = req.body;

    const offer = db.prepare(`
      SELECT ol.*,
             a.jobseeker_id,
             j.employer_id,
             j.title as job_title,
             pe.company_name,
             u.email as candidate_email,
             u.name as candidate_name
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN profiles_employer pe ON j.employer_id = pe.user_id
      JOIN users u ON a.jobseeker_id = u.id
      WHERE ol.id = ?
    `).get(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.employer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'draft') {
      return res.status(400).json({ error: 'Offer already sent' });
    }

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // Update offer status
    db.prepare(`
      UPDATE offer_letters
      SET status = 'sent',
          sent_at = datetime('now'),
          expires_at = ?
      WHERE id = ?
    `).run(expires_at.toISOString(), req.params.id);

    // Update application status to 'offered'
    db.prepare(`
      UPDATE applications SET status = 'offered', updated_at = datetime('now')
      WHERE id = ?
    `).run(offer.application_id);

    // Send email to candidate
    const emailHtml = `
      <h2>🎉 Job Offer from ${offer.company_name}</h2>
      <p>Dear ${offer.candidate_name},</p>
      <p>Congratulations! We're pleased to offer you the position of <strong>${offer.job_title}</strong>.</p>
      
      <h3>Offer Details:</h3>
      <ul>
        ${offer.salary ? `<li><strong>Salary:</strong> ${offer.salary_currency} ${offer.salary} (${offer.salary_period})</li>` : ''}
        ${offer.employment_type ? `<li><strong>Employment Type:</strong> ${offer.employment_type}</li>` : ''}
        ${offer.start_date ? `<li><strong>Start Date:</strong> ${new Date(offer.start_date).toLocaleDateString()}</li>` : ''}
        ${offer.probation_months ? `<li><strong>Probation Period:</strong> ${offer.probation_months} months</li>` : ''}
      </ul>
      
      ${offer.benefits ? `<h3>Benefits:</h3><p>${offer.benefits}</p>` : ''}
      
      <p><strong>This offer expires on ${new Date(expires_at).toLocaleDateString()}</strong></p>
      
      <p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/offer-letters/${offer.id}" 
           style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
          View Full Offer
        </a>
      </p>
      
      <p>Please review the full offer details and respond at your earliest convenience.</p>
      <p>Best regards,<br>${offer.company_name}</p>
    `;

    await sendEmail({
      to: offer.candidate_email,
      subject: `Job Offer: ${offer.job_title} at ${offer.company_name}`,
      html: emailHtml
    });

    const updated = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error('Send offer error', { error: error.message });
    res.status(500).json({ error: 'Failed to send offer' });
  }
});

// POST /api/offer-letters/:id/respond - Accept/decline offer (jobseeker only)
router.post('/:id/respond', authenticateToken, requireRole('jobseeker'), async (req, res) => {
  try {
    const { response } = req.body; // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'Response must be "accepted" or "declined"' });
    }

    const offer = db.prepare(`
      SELECT ol.*,
             a.jobseeker_id,
             j.employer_id,
             j.title as job_title,
             pe.company_name,
             u.email as employer_email,
             u.name as employer_name
      FROM offer_letters ol
      JOIN applications a ON ol.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN profiles_employer pe ON j.employer_id = pe.user_id
      JOIN users u ON j.employer_id = u.id
      WHERE ol.id = ?
    `).get(req.params.id);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.jobseeker_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'sent') {
      return res.status(400).json({ error: 'Offer has already been responded to or is not active' });
    }

    // Check if expired
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      db.prepare(`UPDATE offer_letters SET status = 'expired' WHERE id = ?`).run(req.params.id);
      return res.status(400).json({ error: 'Offer has expired' });
    }

    // Update offer status
    db.prepare(`
      UPDATE offer_letters
      SET status = ?,
          responded_at = datetime('now')
      WHERE id = ?
    `).run(response, req.params.id);

    // Send email to employer
    const emailHtml = response === 'accepted'
      ? `
        <h2>✅ Offer Accepted</h2>
        <p>Dear ${offer.employer_name},</p>
        <p><strong>${offer.candidate_name}</strong> has accepted your offer for the position of <strong>${offer.job_title}</strong>.</p>
        <p>Next steps: Please coordinate with the candidate regarding onboarding details.</p>
        <p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/employer/applications" 
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Application
          </a>
        </p>
      `
      : `
        <h2>❌ Offer Declined</h2>
        <p>Dear ${offer.employer_name},</p>
        <p><strong>${offer.candidate_name}</strong> has declined your offer for the position of <strong>${offer.job_title}</strong>.</p>
        <p>You may want to reach out to other qualified candidates.</p>
      `;

    await sendEmail({
      to: offer.employer_email,
      subject: `Offer ${response === 'accepted' ? 'Accepted' : 'Declined'}: ${offer.job_title}`,
      html: emailHtml
    });

    const updated = db.prepare('SELECT * FROM offer_letters WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    logger.error('Respond to offer error', { error: error.message });
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

module.exports = router;
