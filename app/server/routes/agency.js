const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { z } = require('zod');
const logger = require('../utils/logger');
const { stripHtml, isValidLength } = require('../utils/sanitizeHtml');

// Validation schemas
const clientSchema = z.object({
  company_name: z.string().min(1).max(255).trim(),
  logo_url: z.string().max(500).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  contact_name: z.string().max(255).optional().nullable(),
  contact_email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  contact_phone: z.string().max(30).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

function requireAgency(req, res, next) {
  const user = db.prepare('SELECT account_type FROM users WHERE id = ?').get(req.user.id);
  if (!user || user.account_type !== 'agency') {
    return res.status(403).json({ error: 'Agency account required' });
  }
  next();
}

// All routes require auth + employer role + agency account_type
router.use(authenticateToken, requireRole('employer'), requireAgency);

// GET /api/agency/clients — list agency's clients
router.get('/clients', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT ac.*, 
        (SELECT COUNT(*) FROM jobs WHERE client_id = ac.id AND status = 'active') as active_jobs_count
      FROM agency_clients ac
      WHERE ac.agency_id = ? AND ac.deleted_at IS NULL
      ORDER BY ac.created_at DESC
    `).all(req.user.id);
    res.json({ success: true, data: clients });
  } catch (error) {
    logger.error('List agency clients error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/agency/clients — create client
router.post('/clients', (req, res) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Validation failed' });
    }
    const data = parsed.data;
    const safeName = stripHtml(data.company_name);
    if (!isValidLength(safeName, 255, 1)) {
      return res.status(400).json({ error: 'Company name required' });
    }

    const result = db.prepare(`
      INSERT INTO agency_clients (agency_id, company_name, logo_url, industry, location, website, contact_name, contact_email, contact_phone, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, safeName, data.logo_url || null, data.industry || null,
      data.location || null, data.website || null, data.contact_name || null,
      data.contact_email || null, data.contact_phone || null, data.description || null
    );

    const client = db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    logger.error('Create agency client error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PUT /api/agency/clients/:id — update client
router.put('/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND agency_id = ? AND deleted_at IS NULL').get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Validation failed' });
    }
    const data = parsed.data;

    db.prepare(`
      UPDATE agency_clients SET company_name=?, logo_url=?, industry=?, location=?, website=?,
        contact_name=?, contact_email=?, contact_phone=?, description=?, updated_at=datetime('now')
      WHERE id = ? AND agency_id = ?
    `).run(
      stripHtml(data.company_name), data.logo_url || null, data.industry || null,
      data.location || null, data.website || null, data.contact_name || null,
      data.contact_email || null, data.contact_phone || null, data.description || null,
      id, req.user.id
    );

    const updated = db.prepare('SELECT * FROM agency_clients WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update agency client error', { error: error.message });
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/agency/clients/:id — soft delete
router.delete('/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND agency_id = ? AND deleted_at IS NULL').get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    db.prepare("UPDATE agency_clients SET deleted_at = datetime('now') WHERE id = ?").run(id);
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    logger.error('Delete agency client error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// GET /api/agency/clients/:id/jobs — jobs for a client
router.get('/clients/:id/jobs', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM agency_clients WHERE id = ? AND agency_id = ? AND deleted_at IS NULL').get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const jobs = db.prepare(`
      SELECT j.*, 
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count
      FROM jobs j
      WHERE j.client_id = ? AND j.employer_id = ?
      ORDER BY j.created_at DESC
    `).all(id, req.user.id);
    res.json({ success: true, data: jobs });
  } catch (error) {
    logger.error('List client jobs error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch client jobs' });
  }
});

// GET /api/agency/stats — dashboard stats
router.get('/stats', (req, res) => {
  try {
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM agency_clients WHERE agency_id = ? AND deleted_at IS NULL').get(req.user.id).count;
    
    const jobsByClient = db.prepare(`
      SELECT ac.id, ac.company_name,
        COUNT(j.id) as job_count,
        SUM(CASE WHEN j.status = 'active' THEN 1 ELSE 0 END) as active_count
      FROM agency_clients ac
      LEFT JOIN jobs j ON j.client_id = ac.id
      WHERE ac.agency_id = ? AND ac.deleted_at IS NULL
      GROUP BY ac.id
    `).all(req.user.id);

    const applicationsByClient = db.prepare(`
      SELECT ac.id, ac.company_name,
        COUNT(a.id) as application_count
      FROM agency_clients ac
      LEFT JOIN jobs j ON j.client_id = ac.id
      LEFT JOIN applications a ON a.job_id = j.id
      WHERE ac.agency_id = ? AND ac.deleted_at IS NULL
      GROUP BY ac.id
    `).all(req.user.id);

    res.json({ success: true, data: { totalClients, jobsByClient, applicationsByClient } });
  } catch (error) {
    logger.error('Agency stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
