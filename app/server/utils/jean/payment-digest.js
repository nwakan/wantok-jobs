/**
 * Payment Digest Generator
 * Creates daily summary of pending payments for admin review
 */

const logger = require('../logger');

/**
 * Get payment digest for pending payments older than 6 hours
 * @param {Object} db - Database instance
 * @returns {Object} - { count, total_amount, oldest_pending, payments, summary_text }
 */
function getPaymentDigest(db) {
  try {
    // Get all pending payments older than 6 hours
    const payments = db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        pe.company_name,
        ROUND((julianday('now') - julianday(p.created_at)) * 24, 1) as hours_pending
      FROM sme_payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE p.status = 'pending' 
        AND p.created_at < datetime('now', '-6 hours')
      ORDER BY p.created_at ASC
    `).all();

    // Calculate statistics
    const count = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const oldestPending = payments.length > 0 ? payments[0] : null;

    // Format summary text
    let summaryText = '';
    
    if (count === 0) {
      summaryText = '✅ All clear! No pending payments older than 6 hours.';
    } else {
      summaryText = `📊 *Payment Digest*\n\n`;
      summaryText += `⏳ *${count}* pending payment${count > 1 ? 's' : ''} waiting for review\n`;
      summaryText += `💰 Total amount: *K${totalAmount}*\n\n`;
      
      if (oldestPending) {
        summaryText += `⚠️ Oldest pending: *${oldestPending.hours_pending}h ago*\n`;
        summaryText += `   Ref: ${oldestPending.reference_code}\n`;
        summaryText += `   Amount: K${oldestPending.amount}\n`;
        summaryText += `   From: ${oldestPending.user_name || oldestPending.company_name || 'Unknown'}\n\n`;
      }
      
      // List recent pending (up to 5)
      if (count > 1) {
        summaryText += `*Recent pending:*\n`;
        const recent = payments.slice(0, 5);
        recent.forEach((p, i) => {
          summaryText += `${i + 1}. K${p.amount} - ${p.reference_code} (${p.hours_pending}h ago)\n`;
        });
        
        if (count > 5) {
          summaryText += `...and ${count - 5} more\n`;
        }
      }
      
      summaryText += `\nReview at: /admin/payments`;
    }

    logger.info(`Payment digest generated: ${count} pending payments`);

    return {
      count,
      total_amount: totalAmount,
      oldest_pending: oldestPending ? {
        reference_code: oldestPending.reference_code,
        hours_pending: oldestPending.hours_pending,
        amount: oldestPending.amount,
        user_name: oldestPending.user_name,
        company_name: oldestPending.company_name,
      } : null,
      payments: payments.map(p => ({
        id: p.id,
        reference_code: p.reference_code,
        amount: p.amount,
        hours_pending: p.hours_pending,
        user_name: p.user_name,
        company_name: p.company_name,
        user_email: p.user_email,
        user_phone: p.user_phone,
        receipt_url: p.receipt_url,
        created_at: p.created_at,
      })),
      summary_text: summaryText,
    };
  } catch (error) {
    logger.error('Failed to generate payment digest:', error.message);
    return {
      count: 0,
      total_amount: 0,
      oldest_pending: null,
      payments: [],
      summary_text: '❌ Error generating digest',
      error: error.message,
    };
  }
}

/**
 * Get all pending payments (no time filter)
 * @param {Object} db - Database instance
 * @returns {Object} - Similar to getPaymentDigest but includes all pending
 */
function getAllPendingDigest(db) {
  try {
    const payments = db.prepare(`
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        pe.company_name,
        ROUND((julianday('now') - julianday(p.created_at)) * 24, 1) as hours_pending
      FROM sme_payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN profiles_employer pe ON u.id = pe.user_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `).all();

    const count = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    let summaryText = `📊 *All Pending Payments*\n\n`;
    summaryText += `⏳ *${count}* pending payment${count > 1 ? 's' : ''}\n`;
    summaryText += `💰 Total: *K${totalAmount}*\n`;

    return {
      count,
      total_amount: totalAmount,
      payments: payments.map(p => ({
        id: p.id,
        reference_code: p.reference_code,
        amount: p.amount,
        hours_pending: p.hours_pending,
        user_name: p.user_name,
        company_name: p.company_name,
        user_email: p.user_email,
        receipt_url: p.receipt_url,
        created_at: p.created_at,
      })),
      summary_text: summaryText,
    };
  } catch (error) {
    logger.error('Failed to get all pending digest:', error.message);
    return { count: 0, total_amount: 0, payments: [], summary_text: '❌ Error', error: error.message };
  }
}

module.exports = {
  getPaymentDigest,
  getAllPendingDigest,
};
