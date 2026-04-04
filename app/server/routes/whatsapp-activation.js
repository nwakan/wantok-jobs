/**
 * WhatsApp Activation API Routes
 * 
 * Handles WhatsApp account linking via activation codes.
 * Users generate codes, click WhatsApp button, send pre-filled message,
 * and bot validates code to link their WhatsApp number to their account.
 * 
 * Endpoints:
 * - POST /api/whatsapp/generate-activation-code - Generate new activation code
 * - GET /api/whatsapp/activation-status - Check if user has WhatsApp linked
 * - DELETE /api/whatsapp/disconnect - Unlink WhatsApp from account
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Generate unique activation code
 * Format: ABC-12XYZDEF (3 letters, hyphen, 2 digits, 6 alphanumeric)
 * Example: B44-8N2MOZBC
 */
function generateActivationCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  let code = '';
  
  // 3 random letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  code += '-';
  
  // 2 random digits
  for (let i = 0; i < 2; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  // 6 random alphanumeric
  for (let i = 0; i < 6; i++) {
    code += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
  }
  
  return code;
}

/**
 * Generate click-to-chat WhatsApp URL
 * @param {string} activationCode - The unique activation code
 * @returns {string} WhatsApp click-to-chat URL
 */
function generateWhatsAppUrl(activationCode) {
  const businessNumber = process.env.WHATSAPP_BUSINESS_NUMBER || '675XXXXXXXX';
  
  const message = `Hi WantokJobs! I want to connect my account and receive job notifications.

Activation code: ${activationCode}`;
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://api.whatsapp.com/send/?phone=${businessNumber}&text=${encodedMessage}&type=phone_number&app_absent=0`;
}

/**
 * POST /api/whatsapp/generate-activation-code
 * Generate new activation code for authenticated user
 * 
 * Request: {} (no body required, user from JWT)
 * Response: {
 *   success: true,
 *   activation_code: 'ABC-12XYZDEF',
 *   whatsapp_url: 'https://api.whatsapp.com/send/?...',
 *   expires_at: '2026-04-06T18:00:00.000Z'
 * }
 */
router.post('/generate-activation-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user already has a pending activation code
    const existingCode = db.prepare(
      `SELECT * FROM whatsapp_activation_codes 
       WHERE user_id = ? AND status = 'pending' 
       AND datetime(expires_at) > datetime('now')
       ORDER BY created_at DESC LIMIT 1`
    ).get(userId);
    
    if (existingCode) {
      // Return existing valid code instead of creating new one
      const whatsappUrl = generateWhatsAppUrl(existingCode.activation_code);
      return res.json({
        success: true,
        activation_code: existingCode.activation_code,
        whatsapp_url: whatsappUrl,
        expires_at: existingCode.expires_at,
        message: 'Using existing activation code'
      });
    }
    
    // Generate new unique activation code
    let activationCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      activationCode = generateActivationCode();
      
      // Check if code already exists
      const existing = db.prepare(
        'SELECT id FROM whatsapp_activation_codes WHERE activation_code = ?'
      ).get(activationCode);
      
      if (!existing) {
        break; // Code is unique
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate unique activation code'
      });
    }
    
    // Expire any old pending codes for this user
    db.prepare(
      `UPDATE whatsapp_activation_codes 
       SET status = 'expired' 
       WHERE user_id = ? AND status = 'pending'`
    ).run(userId);
    
    // Insert new activation code
    const result = db.prepare(
      `INSERT INTO whatsapp_activation_codes 
       (user_id, activation_code, status, created_at, expires_at) 
       VALUES (?, ?, 'pending', datetime('now'), datetime('now', '+48 hours'))`
    ).run(userId, activationCode);
    
    // Get the created record
    const newCode = db.prepare(
      'SELECT * FROM whatsapp_activation_codes WHERE id = ?'
    ).get(result.lastInsertRowid);
    
    // Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppUrl(activationCode);
    
    res.json({
      success: true,
      activation_code: newCode.activation_code,
      whatsapp_url: whatsappUrl,
      expires_at: newCode.expires_at,
      message: 'Activation code generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating activation code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate activation code'
    });
  }
});

/**
 * GET /api/whatsapp/activation-status
 * Check if user has active WhatsApp connection
 * 
 * Response: {
 *   success: true,
 *   connected: true,
 *   phone_number: '+675XXXXXXXX',
 *   activated_at: '2026-04-04T18:00:00.000Z'
 * }
 */
router.get('/activation-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check for activated code
    const activatedCode = db.prepare(
      `SELECT phone_number, activated_at 
       FROM whatsapp_activation_codes 
       WHERE user_id = ? AND status = 'activated' 
       ORDER BY activated_at DESC LIMIT 1`
    ).get(userId);
    
    if (activatedCode) {
      return res.json({
        success: true,
        connected: true,
        phone_number: activatedCode.phone_number,
        activated_at: activatedCode.activated_at
      });
    }
    
    // Check for pending code
    const pendingCode = db.prepare(
      `SELECT activation_code, expires_at 
       FROM whatsapp_activation_codes 
       WHERE user_id = ? AND status = 'pending' 
       AND datetime(expires_at) > datetime('now') 
       ORDER BY created_at DESC LIMIT 1`
    ).get(userId);
    
    if (pendingCode) {
      return res.json({
        success: true,
        connected: false,
        pending: true,
        activation_code: pendingCode.activation_code,
        expires_at: pendingCode.expires_at
      });
    }
    
    // No connection
    res.json({
      success: true,
      connected: false,
      pending: false
    });
    
  } catch (error) {
    console.error('Error checking activation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check activation status'
    });
  }
});

/**
 * DELETE /api/whatsapp/disconnect
 * Unlink WhatsApp account from user
 * 
 * Response: {
 *   success: true,
 *   message: 'WhatsApp account disconnected successfully'
 * }
 */
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Expire all activation codes for this user
    const result = db.prepare(
      `UPDATE whatsapp_activation_codes 
       SET status = 'expired' 
       WHERE user_id = ? AND status != 'expired'`
    ).run(userId);
    
    res.json({
      success: true,
      message: 'WhatsApp account disconnected successfully',
      codes_expired: result.changes
    });
    
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect WhatsApp account'
    });
  }
});

module.exports = router;
