/**
 * Bank Reconciliation API
 * Upload CSV bank statements and auto-match to pending payments
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');
const pricing = require('../utils/jean/sme-pricing');
const { sendWhatsAppNotification } = require('../utils/jean/whatsapp-notify');
const { sendPaymentVerifiedEmail } = require('../lib/email');

/**
 * Parse CSV content (simple manual parsing)
 * @param {string} csvContent - CSV file content
 * @returns {Array} - Parsed rows as objects
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  // Parse header
  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  // Detect column names (flexible)
  const columnMap = {
    date: headers.findIndex(h => h.includes('date') || h.includes('time')),
    description: headers.findIndex(h => h.includes('description') || h.includes('details') || h.includes('reference')),
    amount: headers.findIndex(h => h.includes('amount') || h.includes('credit') || h.includes('debit')),
    reference: headers.findIndex(h => h.includes('reference') || h.includes('ref') || h.includes('transaction')),
  };

  // If reference column not explicitly found, use description
  if (columnMap.reference === -1) {
    columnMap.reference = columnMap.description;
  }

  // Validate required columns
  if (columnMap.date === -1 || columnMap.description === -1 || columnMap.amount === -1) {
    throw new Error('CSV must have date, description, and amount columns');
  }

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length >= headers.length) {
      const row = {
        date: values[columnMap.date] || '',
        description: values[columnMap.description] || '',
        amount: parseFloat(values[columnMap.amount]?.replace(/[^\d.-]/g, '') || '0'),
        reference: values[columnMap.reference] || '',
      };
      
      // Only include rows with valid amounts
      if (row.amount > 0) {
        rows.push(row);
      }
    }
  }

  logger.info(`Parsed ${rows.length} valid rows from CSV`);
  return rows;
}

/**
 * POST /api/admin/reconcile/upload
 * Upload CSV bank statement and auto-match to pending payments
 * 
 * Accepts: multipart/form-data with 'file' field, or JSON with 'csv_content'
 */
router.post('/upload', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    let csvContent = '';

    // Check if multer is available
    if (req.file && req.file.buffer) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body && req.body.csv_content) {
      csvContent = req.body.csv_content;
    } else {
      return res.status(400).json({ error: 'No CSV file or content provided' });
    }

    // Parse CSV
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No valid data rows found in CSV' });
    }

    // Get all pending payments
    const pendingPayments = db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM sme_payments p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
    `).all();

    const matched = [];
    const unmatched = [];
    const alreadyVerified = [];

    // Try to match each CSV row with a payment
    rows.forEach(row => {
      let matchedPayment = null;

      // Try to find reference code in description or reference field
      for (const payment of pendingPayments) {
        const refCode = payment.reference_code;
        const searchText = (row.description + ' ' + row.reference).toUpperCase();
        
        // Check if reference code is in the text
        if (searchText.includes(refCode.toUpperCase())) {
          // Check amount matches (within 1 kina tolerance)
          const amountDiff = Math.abs(row.amount - payment.amount);
          
          if (amountDiff <= 1) {
            matchedPayment = payment;
            break;
          }
        }
      }

      if (matchedPayment) {
        matched.push({
          csv_row: row,
          payment: {
            id: matchedPayment.id,
            reference_code: matchedPayment.reference_code,
            amount: matchedPayment.amount,
            user_name: matchedPayment.user_name,
            user_email: matchedPayment.user_email,
            package_key: matchedPayment.package_key,
          },
          match_confidence: 'high',
        });

        // Remove from pending list to avoid duplicate matches
        const idx = pendingPayments.indexOf(matchedPayment);
        if (idx > -1) pendingPayments.splice(idx, 1);
      } else {
        // Check if this looks like a WantokJobs reference (starts with WJ)
        const hasWJRef = /WJ\d+/i.test(row.description + ' ' + row.reference);
        
        if (hasWJRef) {
          // Extract the reference code
          const match = (row.description + ' ' + row.reference).match(/WJ\d+[A-Z0-9]*/i);
          if (match) {
            const extractedRef = match[0].toUpperCase();
            
            // Check if already verified
            const existingPayment = db.prepare(`
              SELECT id, status FROM sme_payments WHERE reference_code = ?
            `).get(extractedRef);
            
            if (existingPayment && existingPayment.status === 'verified') {
              alreadyVerified.push({
                csv_row: row,
                reference_code: extractedRef,
                status: existingPayment.status,
              });
            } else {
              unmatched.push({
                csv_row: row,
                reason: 'Reference found but no matching pending payment',
                extracted_reference: extractedRef,
              });
            }
          } else {
            unmatched.push({
              csv_row: row,
              reason: 'WJ reference pattern found but could not extract',
            });
          }
        } else {
          unmatched.push({
            csv_row: row,
            reason: 'No WantokJobs reference found',
          });
        }
      }
    });

    logger.info(`Reconciliation: ${matched.length} matched, ${unmatched.length} unmatched, ${alreadyVerified.length} already verified`);

    res.json({
      success: true,
      matched,
      unmatched,
      already_verified: alreadyVerified,
      summary: {
        total_rows: rows.length,
        matched_count: matched.length,
        unmatched_count: unmatched.length,
        already_verified_count: alreadyVerified.length,
      },
    });
  } catch (error) {
    logger.error('Failed to process bank statement:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/reconcile/confirm
 * Batch verify payments (reuse verify logic from admin-payments)
 * 
 * Body: { payment_ids: [1, 2, 3], admin_notes: 'Bank statement reconciliation' }
 */
router.post('/confirm', authenticateToken, requireRole('admin'), (req, res) => {
  try {
    const { payment_ids, admin_notes = 'Bank statement reconciliation' } = req.body;

    if (!Array.isArray(payment_ids) || payment_ids.length === 0) {
      return res.status(400).json({ error: 'payment_ids array is required' });
    }

    const results = [];
    const errors = [];

    // Process each payment
    payment_ids.forEach(paymentId => {
      try {
        const payment = db.prepare('SELECT * FROM sme_payments WHERE id = ?').get(paymentId);
        
        if (!payment) {
          errors.push({ payment_id: paymentId, error: 'Payment not found' });
          return;
        }

        if (payment.status !== 'pending') {
          errors.push({ payment_id: paymentId, error: `Payment already ${payment.status}` });
          return;
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
          `).run(req.user.id, admin_notes, paymentId);

          // Add credits
          const creditResult = pricing.addCredits(db, payment.user_id, payment.package_key, payment.reference_code);
          
          if (creditResult.error) {
            db.prepare('ROLLBACK').run();
            errors.push({ payment_id: paymentId, error: creditResult.error });
            return;
          }

          // Create notification
          const notificationMsg = `Your payment of K${payment.amount} has been approved! ${creditResult.credits_added} credit${creditResult.credits_added > 1 ? 's' : ''} added to your account.`;
          
          db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, link, created_at)
            VALUES (?, 'payment_verified', 'Payment Approved', ?, '/dashboard/employer/billing', datetime('now'))
          `).run(payment.user_id, notificationMsg);

          // Get user details for notifications
          const user = db.prepare('SELECT name, email, phone FROM users WHERE id = ?').get(payment.user_id);

          // Send WhatsApp notification (if phone exists)
          if (user && user.phone) {
            const whatsappMsg = `✅ *Payment Confirmed!*\n\nYour payment of K${payment.amount} (Ref: ${payment.reference_code}) has been verified!\n\n🎉 *${creditResult.credits_added} credit${creditResult.credits_added > 1 ? 's' : ''}* added to your account.\n💰 New balance: *${creditResult.balance_after} credit${creditResult.balance_after > 1 ? 's' : ''}*\n\nYou can now post jobs via WhatsApp! Just say "post a job" to get started. 🚀`;
            sendWhatsAppNotification(db, user.phone, whatsappMsg);
          }

          // Send email notification (if email exists)
          if (user && user.email) {
            sendPaymentVerifiedEmail(user, payment, creditResult.credits_added, creditResult.balance_after)
              .catch(err => logger.error('Failed to send payment verified email:', err.message));
          }

          db.prepare('COMMIT').run();

          logger.info(`Payment ${paymentId} verified via reconciliation by admin ${req.user.id}`);

          results.push({
            payment_id: paymentId,
            success: true,
            credits_added: creditResult.credits_added,
            new_balance: creditResult.balance_after,
          });
        } catch (err) {
          db.prepare('ROLLBACK').run();
          throw err;
        }
      } catch (error) {
        errors.push({ payment_id: paymentId, error: error.message });
      }
    });

    res.json({
      success: true,
      verified_count: results.length,
      error_count: errors.length,
      results,
      errors,
    });
  } catch (error) {
    logger.error('Failed to batch verify payments:', error.message);
    res.status(500).json({ error: 'Failed to batch verify payments' });
  }
});

module.exports = router;
