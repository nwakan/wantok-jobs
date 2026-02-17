const { stripHtml, sanitizeEmail } = require('../utils/sanitizeHtml');
const logger = require('../utils/logger');
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Default onboarding checklist items
const DEFAULT_CHECKLIST_ITEMS = [
  // Documentation
  { item: 'Employment contract signed', category: 'documentation', sort_order: 1 },
  { item: 'Tax forms (NID/TIN) submitted', category: 'documentation', sort_order: 2 },
  { item: 'Bank details for payroll provided', category: 'documentation', sort_order: 3 },
  { item: 'Emergency contact form completed', category: 'documentation', sort_order: 4 },
  { item: 'Company policy acknowledgment signed', category: 'documentation', sort_order: 5 },
  
  // IT Setup
  { item: 'Email account created', category: 'IT', sort_order: 6 },
  { item: 'System access granted', category: 'IT', sort_order: 7 },
  { item: 'Equipment assigned', category: 'IT', sort_order: 8 },
  
  // Orientation
  { item: 'Welcome meeting scheduled', category: 'orientation', sort_order: 9 },
  { item: 'Office tour completed', category: 'orientation', sort_order: 10 },
  { item: 'Team introduction', category: 'orientation', sort_order: 11 },
  { item: 'Company handbook provided', category: 'orientation', sort_order: 12 },
  
  // Training
  { item: 'Role-specific training plan created', category: 'training', sort_order: 13 },
  { item: 'Mentor assigned', category: 'training', sort_order: 14 },
  { item: '30-60-90 day goals set', category: 'training', sort_order: 15 },
];

// Auto-generate checklist when application is marked as "hired"
function generateOnboardingChecklist(applicationId) {
  try {
    const insertItem = db.prepare(`
      INSERT INTO onboarding_checklists (application_id, item, category, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    for (const checklistItem of DEFAULT_CHECKLIST_ITEMS) {
      insertItem.run(
        applicationId,
        checklistItem.item,
        checklistItem.category,
        checklistItem.sort_order
      );
    }

    logger.info('log', { detail: `✓ Generated onboarding checklist for application ${applicationId}` });
    return true;
  } catch (error) {
    logger.error('Failed to generate onboarding checklist', { error: error.message });
    return false;
  }
}

// Export the generator function for use in applications route
module.exports.generateOnboardingChecklist = generateOnboardingChecklist;

// GET /api/onboarding/:applicationId - Get checklist for an application
router.get('/:applicationId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId } = req.params;

    // Verify employer owns this application
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

    // Get checklist items
    const items = db.prepare(`
      SELECT *
      FROM onboarding_checklists
      WHERE application_id = ?
      ORDER BY sort_order ASC
    `).all(applicationId);

    // Calculate progress
    const totalItems = items.length;
    const completedItems = items.filter(item => item.is_completed).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    res.json({
      applicationId: parseInt(applicationId),
      items,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: progress
      }
    });
  } catch (error) {
    logger.error('Get onboarding checklist error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch onboarding checklist' });
  }
});

// PUT /api/onboarding/:applicationId/item/:itemId - Toggle item completion
router.put('/:applicationId/item/:itemId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId, itemId } = req.params;

    // Verify employer owns this application
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

    // Get current item
    const item = db.prepare(`
      SELECT * FROM onboarding_checklists WHERE id = ? AND application_id = ?
    `).get(itemId, applicationId);

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Toggle completion
    const newCompletedState = item.is_completed ? 0 : 1;
    const completedAt = newCompletedState ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE onboarding_checklists
      SET is_completed = ?,
          completed_at = ?,
          completed_by = ?
      WHERE id = ?
    `).run(newCompletedState, completedAt, newCompletedState ? req.user.id : null, itemId);

    const updated = db.prepare('SELECT * FROM onboarding_checklists WHERE id = ?').get(itemId);

    res.json(updated);
  } catch (error) {
    logger.error('Toggle checklist item error', { error: error.message });
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// POST /api/onboarding/:applicationId/item - Add custom checklist item
router.post('/:applicationId/item', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId } = req.params;
    const { item, category = 'general', due_date, notes } = req.body;

    // Sanitize inputs
    const safeItem = item ? stripHtml(item) : null;
    const safeNotes = notes ? stripHtml(notes) : null;

    if (!safeItem) {
      return res.status(400).json({ error: 'Item text is required' });
    }

    // Verify employer owns this application
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

    // Get max sort_order
    const maxOrder = db.prepare(`
      SELECT MAX(sort_order) as max_order FROM onboarding_checklists WHERE application_id = ?
    `).get(applicationId);

    const sortOrder = (maxOrder?.max_order || 0) + 1;

    // Insert new item
    const result = db.prepare(`
      INSERT INTO onboarding_checklists (application_id, item, category, due_date, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(applicationId, safeItem, category, due_date || null, safeNotes || null, sortOrder);

    const newItem = db.prepare('SELECT * FROM onboarding_checklists WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newItem);
  } catch (error) {
    logger.error('Add checklist item error', { error: error.message });
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
});

// DELETE /api/onboarding/:applicationId/item/:itemId - Remove checklist item
router.delete('/:applicationId/item/:itemId', authenticateToken, requireRole('employer', 'admin'), (req, res) => {
  try {
    const { applicationId, itemId } = req.params;

    // Verify employer owns this application
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
      DELETE FROM onboarding_checklists WHERE id = ? AND application_id = ?
    `).run(itemId, applicationId);

    res.json({ success: true, message: 'Checklist item deleted' });
  } catch (error) {
    logger.error('Delete checklist item error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

module.exports = router;
