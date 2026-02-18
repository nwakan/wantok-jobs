/**
 * Receipt Photo Handler for Payment Verification
 * Handles receipt image storage and linking to payments
 */

const fs = require('fs');
const path = require('path');
const logger = require('../logger');

/**
 * Save receipt image and link to payment
 * @param {Object} db - Database instance
 * @param {Buffer|string} mediaBufferOrPath - Image buffer or file path
 * @param {string} referenceCode - Payment reference code
 * @param {string} extension - File extension (jpg, png, etc)
 * @returns {Object} - { success: true, path } or { error: 'message' }
 */
function saveReceipt(db, mediaBufferOrPath, referenceCode, extension = 'jpg') {
  try {
    if (!referenceCode) {
      return { error: 'Reference code is required' };
    }

    // Ensure receipts directory exists
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
    const receiptsDir = path.join(dataDir, 'receipts');
    
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Generate filename
    const filename = `${referenceCode}.${extension}`;
    const filepath = path.join(receiptsDir, filename);
    const relativeUrl = `/receipts/${filename}`;

    // Save file
    if (Buffer.isBuffer(mediaBufferOrPath)) {
      fs.writeFileSync(filepath, mediaBufferOrPath);
    } else if (typeof mediaBufferOrPath === 'string') {
      // If it's a path, copy the file
      if (fs.existsSync(mediaBufferOrPath)) {
        fs.copyFileSync(mediaBufferOrPath, filepath);
      } else {
        return { error: 'Source file not found' };
      }
    } else {
      return { error: 'Invalid media data' };
    }

    // Update payment record with receipt URL
    const result = db.prepare(`
      UPDATE sme_payments 
      SET receipt_url = ? 
      WHERE reference_code = ?
    `).run(relativeUrl, referenceCode);

    if (result.changes === 0) {
      logger.warn(`No payment found for reference code: ${referenceCode}`);
      return { 
        success: true, 
        path: relativeUrl,
        warning: 'Receipt saved but no matching payment found'
      };
    }

    logger.info(`Receipt saved for payment ${referenceCode}: ${relativeUrl}`);
    
    return { 
      success: true, 
      path: relativeUrl,
      filename: filename
    };
  } catch (error) {
    logger.error('Failed to save receipt:', error.message);
    return { error: error.message };
  }
}

/**
 * Get receipt for a payment
 * @param {Object} db - Database instance
 * @param {string} referenceCode - Payment reference code
 * @returns {Object|null} - { receipt_url, full_path } or null
 */
function getReceipt(db, referenceCode) {
  try {
    const payment = db.prepare(`
      SELECT receipt_url FROM sme_payments WHERE reference_code = ?
    `).get(referenceCode);

    if (!payment || !payment.receipt_url) {
      return null;
    }

    const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
    const fullPath = path.join(dataDir, payment.receipt_url.replace(/^\//, ''));

    return {
      receipt_url: payment.receipt_url,
      full_path: fullPath,
      exists: fs.existsSync(fullPath)
    };
  } catch (error) {
    logger.error('Failed to get receipt:', error.message);
    return null;
  }
}

/**
 * Delete receipt (if payment is rejected/expired)
 * @param {Object} db - Database instance
 * @param {string} referenceCode - Payment reference code
 * @returns {Object} - { success: true } or { error: 'message' }
 */
function deleteReceipt(db, referenceCode) {
  try {
    const receipt = getReceipt(db, referenceCode);
    
    if (receipt && receipt.exists) {
      fs.unlinkSync(receipt.full_path);
      logger.info(`Receipt deleted: ${receipt.full_path}`);
    }

    // Clear receipt_url from database
    db.prepare(`
      UPDATE sme_payments 
      SET receipt_url = NULL 
      WHERE reference_code = ?
    `).run(referenceCode);

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete receipt:', error.message);
    return { error: error.message };
  }
}

module.exports = {
  saveReceipt,
  getReceipt,
  deleteReceipt,
};
