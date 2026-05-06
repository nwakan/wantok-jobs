/**
 * Facebook Data Deletion Callback Endpoint
 * 
 * Facebook Platform Policy requires apps to provide a data deletion callback URL
 * to allow users to request deletion of their data collected through Facebook Login.
 * 
 * Documentation: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 * 
 * Required for Facebook App Review compliance.
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Data Deletion Callback Endpoint
 * 
 * Facebook sends POST request to this endpoint when a user requests data deletion.
 * 
 * Request format:
 * {
 *   "signed_request": "<signed_request_string>"
 * }
 * 
 * Signed request contains:
 * {
 *   "user_id": "<facebook_user_id>",
 *   "algorithm": "HMAC-SHA256",
 *   "issued_at": <timestamp>
 * }
 */
router.post('/callback', async (req, res) => {
  try {
    const { signed_request } = req.body;

    if (!signed_request) {
      logger.warn('[Facebook Data Deletion] Missing signed_request parameter');
      return res.status(400).json({ 
        error: 'Missing signed_request parameter',
        url: `https://wantokjobs.com/data-deletion?status=error&reason=invalid_request`
      });
    }

    // Parse signed request
    const [encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    const facebookUserId = data.user_id;

    logger.info('[Facebook Data Deletion] Request received', { 
      facebookUserId,
      algorithm: data.algorithm,
      issuedAt: data.issued_at
    });

    // Validate signature (optional but recommended)
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (appSecret) {
      const expectedSig = crypto
        .createHmac('sha256', appSecret)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const receivedSig = encodedSig
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      if (expectedSig !== receivedSig) {
        logger.error('[Facebook Data Deletion] Invalid signature', { facebookUserId });
        return res.status(400).json({ 
          error: 'Invalid signature',
          url: `https://wantokjobs.com/data-deletion?status=error&reason=invalid_signature`
        });
      }
    }

    // Find user by Facebook ID
    const user = db.prepare(
      'SELECT id, name, email FROM users WHERE facebook_id = ?'
    ).get(facebookUserId);

    if (!user) {
      logger.info('[Facebook Data Deletion] User not found', { facebookUserId });
      // User not in our system or already deleted - return success
      return res.json({
        url: `https://wantokjobs.com/data-deletion?status=success&reason=user_not_found`,
        confirmation_code: crypto.randomBytes(16).toString('hex')
      });
    }

    // Generate deletion confirmation code
    const confirmationCode = crypto.randomBytes(16).toString('hex');

    // Log deletion request
    db.prepare(`
      INSERT INTO data_deletion_requests (
        user_id, 
        facebook_user_id, 
        confirmation_code, 
        status, 
        requested_at
      ) VALUES (?, ?, ?, 'pending', datetime('now'))
    `).run(user.id, facebookUserId, confirmationCode);

    logger.info('[Facebook Data Deletion] Deletion request logged', { 
      userId: user.id,
      facebookUserId,
      confirmationCode
    });

    // OPTION 1: Immediate deletion (recommended for GDPR compliance)
    // Uncomment the following to delete user data immediately:
    /*
    await deleteUserData(user.id, facebookUserId);
    
    db.prepare(
      'UPDATE data_deletion_requests SET status = "completed", completed_at = datetime("now") WHERE confirmation_code = ?'
    ).run(confirmationCode);

    logger.info('[Facebook Data Deletion] User data deleted immediately', { userId: user.id });
    */

    // OPTION 2: Queue for manual review (current implementation)
    // Admin can review and approve deletion from admin dashboard
    // Deletion will be completed within 30 days (Facebook requirement)

    // Return confirmation URL
    return res.json({
      url: `https://wantokjobs.com/data-deletion?status=pending&code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    logger.error('[Facebook Data Deletion] Error processing request', { 
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      url: `https://wantokjobs.com/data-deletion?status=error&reason=internal_error`
    });
  }
});

/**
 * Delete user data (implementation)
 * 
 * This function should delete or anonymize all user data from the database.
 * Adjust based on your data retention policies and legal requirements.
 */
async function deleteUserData(userId, facebookUserId) {
  const tables = [
    // User authentication data
    { table: 'users', condition: 'id = ?' },
    { table: 'sessions', condition: 'user_id = ?' },
    
    // Job seeker data
    { table: 'profiles_jobseeker', condition: 'user_id = ?' },
    { table: 'applications', condition: 'user_id = ?' },
    { table: 'saved_jobs', condition: 'user_id = ?' },
    { table: 'job_alerts', condition: 'user_id = ?' },
    { table: 'saved_searches', condition: 'user_id = ?' },
    
    // Employer data
    { table: 'profiles_employer', condition: 'user_id = ?' },
    { table: 'jobs', condition: 'company_id = ?' },
    
    // Communication data
    { table: 'notifications', condition: 'user_id = ?' },
    { table: 'jean_sessions', condition: 'user_id = ?' },
    { table: 'jean_messages', condition: 'session_id IN (SELECT id FROM jean_sessions WHERE user_id = ?)' },
    
    // WhatsApp data
    { table: 'whatsapp_sessions', condition: 'user_id = ?' },
    
    // Activity logs
    { table: 'audit_logs', condition: 'user_id = ?' },
  ];

  // Delete data from all tables
  for (const { table, condition } of tables) {
    try {
      const result = db.prepare(`DELETE FROM ${table} WHERE ${condition}`).run(userId);
      logger.info(`[Facebook Data Deletion] Deleted from ${table}`, { 
        userId,
        rowsAffected: result.changes
      });
    } catch (error) {
      // Table might not exist or deletion might fail - log and continue
      logger.warn(`[Facebook Data Deletion] Failed to delete from ${table}`, { 
        userId,
        error: error.message
      });
    }
  }

  logger.info('[Facebook Data Deletion] User data deletion completed', { 
    userId,
    facebookUserId
  });
}

/**
 * Get deletion status endpoint (optional)
 * Allows users to check status of their deletion request
 */
router.get('/status/:confirmationCode', async (req, res) => {
  try {
    const { confirmationCode } = req.params;

    const request = db.prepare(`
      SELECT 
        dr.*,
        u.name,
        u.email
      FROM data_deletion_requests dr
      LEFT JOIN users u ON dr.user_id = u.id
      WHERE dr.confirmation_code = ?
    `).get(confirmationCode);

    if (!request) {
      return res.status(404).json({ 
        error: 'Deletion request not found',
        status: 'not_found'
      });
    }

    return res.json({
      status: request.status,
      requested_at: request.requested_at,
      completed_at: request.completed_at,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    logger.error('[Facebook Data Deletion] Error fetching status', { 
      error: error.message
    });
    
    return res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

module.exports = router;
