/**
 * Admin Payment Review API
 * Endpoints for reviewing and approving SME payments via WhatsApp
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const pricing = require('../utils/jean/sme-pricing');
const { sendWhatsAppNotification } = require('../utils/jean/whatsapp-notify');
const { getPaymentDigest } = require('../utils/jean/payment-digest');
const { sendPaymentVerifiedEmail, sendPaymentRejectedEmail } = require('../lib/email');

/**
 * GET /api/admin/payments
 * List all pending payments (admin only)
 * Now includes receipt_url if available
 */
router.get('/', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    const payments = db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        pe.company_name,
        (SELECT balance FROM credit_wallets WHERE user_id = p.user_id) as current_balance
      FROM sme_payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(status, parseInt(limit), parseInt(offset));

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM sme_payments WHERE status = ?
    `).get(status);

    res.json({
      payments,
      total: total.count,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Failed to fetch payments:', error.message);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * GET /api/admin/payments/stats
 * Get payment stats (admin only)
 */
router.get('/stats', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM sme_payments
      GROUP BY status
    `).all();

    const today = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM sme_payments
      WHERE date(created_at) = date('now')
    `).get();

    const week = db.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM sme_payments
      WHERE created_at >= datetime('now', '-7 days')
    `).get();

    res.json({
      by_status: stats,
      today: { count: today.count || 0, total: today.total || 0 },
      week: { count: week.count || 0, total: week.total || 0 },
    });
  } catch (error) {
    logger.error('Failed to fetch payment stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/payments/digest
 * Get daily digest of pending payments (admin only)
 * Returns pending payments older than 6 hours
 */
router.get('/digest', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const digest = getPaymentDigest(db);
    res.json(digest);
  } catch (error) {
    logger.error('Failed to get payment digest:', error.message);
    res.status(500).json({ error: 'Failed to get digest' });
  }
});

/**
 * PUT /api/admin/payments/:id/verify
 * Approve a payment and add credits (admin only)
 */
router.put('/:id/verify', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const payment = db.prepare('SELECT * FROM sme_payments WHERE id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: `Payment already ${payment.status}` });
    }

    // Start transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Update payment status
      db.prepare(`
        UPDATE sme_payments 
        SET status = 'verified', 
            verified_by = ?, 
            verified_at = datetime('now'),
            admin_notes = ?
        WHERE id = ?
      `).run(req.user.id, admin_notes || null, id);

      // Add credits
      const result = pricing.addCredits(db, payment.user_id, payment.package_key, payment.reference_code);
      
      if (result.error) {
        db.prepare('ROLLBACK').run();
        return res.status(500).json({ error: result.error });
      }

      // Create notification for employer
      const notificationMsg = `Your payment of K${payment.amount} has been approved! ${result.credits_added} credit${result.credits_added > 1 ? 's' : ''} added to your account.`;
      
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (?, 'payment_verified', 'Payment Approved', ?, '/dashboard/employer/billing', datetime('now'))
      `).run(payment.user_id, notificationMsg);

      // Get user details for notifications
      const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(payment.user_id);

      // Send WhatsApp notification (if phone exists)
      if (user && user.phone) {
        const whatsappMsg = `✅ *Payment Confirmed!*\n\nYour payment of K${payment.amount} (Ref: ${payment.reference_code}) has been verified!\n\n🎉 *${result.credits_added} credit${result.credits_added > 1 ? 's' : ''}* added to your account.\n💰 New balance: *${result.balance_after} credit${result.balance_after > 1 ? 's' : ''}*\n\nYou can now post jobs via WhatsApp! Just say "post a job" to get started. 🚀`;
        sendWhatsAppNotification(db, user.phone, whatsappMsg);
      }

      // Send email notification (if email exists)
      if (user && user.email) {
        sendPaymentVerifiedEmail(user, payment, result.credits_added, result.balance_after)
          .catch(err => logger.error('Failed to send payment verified email:', err.message));
      }

      db.prepare('COMMIT').run();

      logger.info(`Payment ${id} verified by admin ${req.user.id} for user ${payment.user_id}`);

      res.json({
        success: true,
        payment_id: id,
        credits_added: result.credits_added,
        new_balance: result.balance_after,
      });
    } catch (err) {
      db.prepare('ROLLBACK').run();
      throw err;
    }
  } catch (error) {
    logger.error('Failed to verify payment:', error.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * PUT /api/admin/payments/:id/reject
 * Reject a payment with reason (admin only)
 */
router.put('/:id/reject', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    if (!admin_notes || admin_notes.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason required in admin_notes' });
    }

    const payment = db.prepare('SELECT * FROM sme_payments WHERE id = ?').get(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: `Payment already ${payment.status}` });
    }

    db.prepare(`
      UPDATE sme_payments 
      SET status = 'rejected', 
          verified_by = ?, 
          verified_at = datetime('now'),
          admin_notes = ?
      WHERE id = ?
    `).run(req.user.id, admin_notes, id);

    // Notify employer
    const notificationMsg = `Your payment of K${payment.amount} could not be verified. Reason: ${admin_notes}. Please contact support@wantokjobs.com if you need help.`;
    
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (?, 'payment_rejected', 'Payment Issue', ?, '/dashboard/employer/billing', datetime('now'))
    `).run(payment.user_id, notificationMsg);

    // Get user details for notifications
    const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(payment.user_id);

    // Send WhatsApp notification (if phone exists)
    if (user && user.phone) {
      const whatsappMsg = `❌ *Payment Issue*\n\nYour payment of K${payment.amount} (Ref: ${payment.reference_code}) could not be verified.\n\n*Reason:* ${admin_notes}\n\nPlease contact us at support@wantokjobs.com if you need help, or make a new payment with the correct details. 🙏`;
      sendWhatsAppNotification(db, user.phone, whatsappMsg);
    }

    // Send email notification (if email exists)
    if (user && user.email) {
      sendPaymentRejectedEmail(user, payment, admin_notes)
        .catch(err => logger.error('Failed to send payment rejected email:', err.message));
    }

    logger.info(`Payment ${id} rejected by admin ${req.user.id} for user ${payment.user_id}`);

    res.json({ success: true, payment_id: id, status: 'rejected' });
  } catch (error) {
    logger.error('Failed to reject payment:', error.message);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
});

/**
 * POST /api/admin/payments/expire-stale
 * Expire pending payments older than 72 hours (admin only)
 * Auto-notifies employers via WhatsApp and in-app
 */
router.post('/expire-stale', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const result = pricing.expireStalePayments(db);
    
    logger.info(`Expired ${result.expired_count} stale payments, sent ${result.notifications_sent} WhatsApp notifications`);
    
    res.json({
      success: true,
      expired_count: result.expired_count,
      notifications_sent: result.notifications_sent,
    });
  } catch (error) {
    logger.error('Failed to expire stale payments:', error.message);
    res.status(500).json({ error: 'Failed to expire stale payments' });
  }
});

/**
 * GET /api/admin/payments/:id
 * Get single payment details (admin only)
 * Now includes receipt_url if available
 */
router.get('/:id', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;

    const payment = db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        pe.company_name,
        admin.name as verified_by_name
      FROM sme_payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      LEFT JOIN users admin ON p.verified_by = admin.id
      WHERE p.id = ?
    `).get(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Get user's credit history
    const transactions = db.prepare(`
      SELECT * FROM credit_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(payment.user_id);

    res.json({ payment, recent_transactions: transactions });
  } catch (error) {
    logger.error('Failed to fetch payment details:', error.message);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

module.exports = router;
