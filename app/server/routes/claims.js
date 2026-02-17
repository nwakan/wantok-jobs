const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { z } = require('zod');
const logger = require('../utils/logger');
const { events: notifEvents } = require('../lib/notifications');

const claimSchema = z.object({
  client_profile_id: z.number().int().positive(),
  evidence: z.string().max(2000).optional(),
});

// POST /api/claims — submit a claim (employer only)
router.post('/', authenticateToken, requireRole('employer'), (req, res) => {
  try {
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Validation failed' });
    }
    const { client_profile_id, evidence } = parsed.data;

    // Verify profile exists and is agency-managed
    const profile = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND deleted_at IS NULL').get(client_profile_id);
    if (!profile) return res.status(404).json({ error: 'Company profile not found' });

    // Check user isn't the agency that owns it
    if (profile.agency_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot claim your own client profile' });
    }

    // Check for existing pending claim
    const existing = db.prepare(
      "SELECT id FROM company_claims WHERE client_profile_id = ? AND claimer_user_id = ? AND status = 'pending'"
    ).get(client_profile_id, req.user.id);
    if (existing) return res.status(400).json({ error: 'You already have a pending claim for this company' });

    const result = db.prepare(`
      INSERT INTO company_claims (client_profile_id, claimer_user_id, claimer_email, evidence)
      VALUES (?, ?, ?, ?)
    `).run(client_profile_id, req.user.id, req.user.email, evidence || null);

    // Notify admins
    try {
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      for (const admin of admins) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES (?, 'company_claim', 'New Company Claim', ?, '/dashboard/admin/claims')
        `).run(admin.id, `${req.user.email} claims ownership of "${profile.company_name}"`);
      }
    } catch (e) { /* notifications table might not exist */ }

    res.status(201).json({ success: true, data: { id: result.lastInsertRowid } });
  } catch (error) {
    logger.error('Submit claim error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// GET /api/claims — list claims (admin only)
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const claims = db.prepare(`
      SELECT cc.*, ac.company_name, ac.agency_id,
        u.name as claimer_name, u.email as claimer_email_display,
        au.name as agency_name
      FROM company_claims cc
      JOIN agency_clients ac ON cc.client_profile_id = ac.id
      JOIN users u ON cc.claimer_user_id = u.id
      LEFT JOIN users au ON ac.agency_id = au.id
      ORDER BY cc.created_at DESC
    `).all();
    res.json({ success: true, data: claims });
  } catch (error) {
    logger.error('List claims error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// PUT /api/claims/:id/approve — approve claim (admin)
router.put('/:id/approve', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const claim = db.prepare("SELECT * FROM company_claims WHERE id = ? AND status = 'pending'").get(id);
    if (!claim) return res.status(404).json({ error: 'Claim not found or already processed' });

    const profile = db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(claim.client_profile_id);
    if (!profile) return res.status(404).json({ error: 'Client profile not found' });

    const transfer = db.transaction(() => {
      // Update claim status
      db.prepare("UPDATE company_claims SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
        .run(req.user.id, id);

      // Update/create employer profile from agency_client data
      const existingProfile = db.prepare('SELECT * FROM profiles_employer WHERE user_id = ?').get(claim.claimer_user_id);
      if (existingProfile) {
        db.prepare(`
          UPDATE profiles_employer SET 
            company_name = COALESCE(?, company_name),
            logo_url = COALESCE(?, logo_url),
            industry = COALESCE(?, industry),
            location = COALESCE(?, location),
            website = COALESCE(?, website)
          WHERE user_id = ?
        `).run(profile.company_name, profile.logo_url, profile.industry, profile.location, profile.website, claim.claimer_user_id);
      }

      // Transfer jobs from agency to claimer
      db.prepare(`
        UPDATE jobs SET employer_id = ?, client_id = NULL
        WHERE client_id = ? AND employer_id = ?
      `).run(claim.claimer_user_id, profile.id, profile.agency_id);

      // Soft-delete the agency client profile
      db.prepare("UPDATE agency_clients SET deleted_at = datetime('now') WHERE id = ?").run(profile.id);
    });

    transfer();

    // Notify claimer
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'claim_approved', 'Company Claim Approved', ?, '/dashboard/employer/profile')
      `).run(claim.claimer_user_id, `Your claim for "${profile.company_name}" has been approved!`);
    } catch (e) { /* ok */ }

    res.json({ success: true, message: 'Claim approved and profile transferred' });
  } catch (error) {
    logger.error('Approve claim error', { error: error.message });
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

// PUT /api/claims/:id/reject — reject claim (admin)
router.put('/:id/reject', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const claim = db.prepare("SELECT * FROM company_claims WHERE id = ? AND status = 'pending'").get(id);
    if (!claim) return res.status(404).json({ error: 'Claim not found or already processed' });

    db.prepare("UPDATE company_claims SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
      .run(req.user.id, id);

    const profile = db.prepare('SELECT company_name FROM agency_clients WHERE id = ?').get(claim.client_profile_id);

    // Notify claimer
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (?, 'claim_rejected', 'Company Claim Rejected', ?)
      `).run(claim.claimer_user_id, `Your claim for "${profile?.company_name || 'Unknown'}" was not approved.`);
    } catch (e) { /* ok */ }

    res.json({ success: true, message: 'Claim rejected' });
  } catch (error) {
    logger.error('Reject claim error', { error: error.message });
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

module.exports = router;
