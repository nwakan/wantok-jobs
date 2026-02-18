const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database');
const logger = require('../utils/logger');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sanitizeEmail } = require('../utils/sanitizeHtml');

const router = express.Router();

// Generic email domains that can't be used for verification
const GENERIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'yandex.com', 'zoho.com'
];

/**
 * Extract domain from email address
 */
function extractEmailDomain(email) {
  const parts = email.toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : null;
}

/**
 * Extract domain from URL
 */
function extractWebsiteDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    let domain = parsed.hostname.toLowerCase();
    // Strip www. prefix
    domain = domain.replace(/^www\./, '');
    return domain;
  } catch {
    return null;
  }
}

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Rate limiting helper - track claim attempts
 */
const claimAttempts = new Map();

function checkRateLimit(key) {
  const now = Date.now();
  const attempts = claimAttempts.get(key) || [];
  
  // Filter attempts within last hour
  const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
  
  if (recentAttempts.length >= 3) {
    return false; // Rate limit exceeded
  }
  
  // Update attempts
  recentAttempts.push(now);
  claimAttempts.set(key, recentAttempts);
  
  return true;
}

/**
 * GET /api/employers/:id/claim-status
 * Check if employer profile is claimable
 */
router.get('/:id/claim-status', (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = db.prepare(`
      SELECT id, company_name, claimed, claimed_by, official_email_domain, official_phone
      FROM profiles_employer
      WHERE id = ?
    `).get(id);
    
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employer profile not found' 
      });
    }
    
    res.json({
      success: true,
      claimed: profile.claimed === 1,
      claimable: profile.claimed === 0,
      companyName: profile.company_name,
      hasOfficialDomain: !!profile.official_email_domain,
      hasOfficialPhone: !!profile.official_phone
    });
  } catch (error) {
    logger.error('Claim status check error', { error: error.message, profileId: req.params.id });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check claim status' 
    });
  }
});

/**
 * POST /api/employers/:id/claim/start
 * Start employer claim verification process
 */
router.post('/:id/claim/start', (req, res) => {
  try {
    const { id } = req.params;
    const { method, value } = req.body;
    
    // Validate inputs
    if (!method || !['email', 'phone'].includes(method)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid verification method. Use "email" or "phone".' 
      });
    }
    
    if (!value || typeof value !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: `Please provide a valid ${method}` 
      });
    }
    
    // Rate limiting
    const rateLimitKey = `${req.ip}:${id}`;
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ 
        success: false, 
        error: 'Too many claim attempts. Please try again in an hour.',
        code: 'RATE_LIMIT'
      });
    }
    
    // Get employer profile
    const profile = db.prepare(`
      SELECT id, company_name, claimed, website, official_email_domain, official_phone
      FROM profiles_employer
      WHERE id = ?
    `).get(id);
    
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employer profile not found' 
      });
    }
    
    if (profile.claimed === 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'This profile has already been claimed' 
      });
    }
    
    let verified = false;
    let needsAdminReview = false;
    
    if (method === 'email') {
      const sanitizedEmail = sanitizeEmail(value);
      const emailDomain = extractEmailDomain(sanitizedEmail);
      
      if (!emailDomain) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid email address format' 
        });
      }
      
      // Check if using generic domain
      if (GENERIC_DOMAINS.includes(emailDomain)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Please use your official company email address, not a personal email (Gmail, Yahoo, etc.)' 
        });
      }
      
      // Check if email domain matches official domain or website domain
      const websiteDomain = extractWebsiteDomain(profile.website);
      const officialDomain = profile.official_email_domain;
      
      if (officialDomain && emailDomain === officialDomain) {
        verified = true;
      } else if (websiteDomain && emailDomain === websiteDomain) {
        verified = true;
      } else if (!officialDomain && !websiteDomain) {
        // No official domain on file - allow but flag for admin review
        needsAdminReview = true;
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `Email domain "${emailDomain}" does not match company domain "${officialDomain || websiteDomain}". Please use your official company email.` 
        });
      }
    } else if (method === 'phone') {
      // Normalize phone number (remove spaces, dashes)
      const normalizedPhone = value.replace(/[\s\-()]/g, '');
      const officialPhone = profile.official_phone?.replace(/[\s\-()]/g, '');
      
      if (!officialPhone) {
        return res.status(400).json({ 
          success: false, 
          error: 'No official phone number on file for this company. Please use email verification instead.' 
        });
      }
      
      if (normalizedPhone !== officialPhone) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number does not match our records. Please use the official company phone number.' 
        });
      }
      
      verified = true;
    }
    
    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    
    // Create claim record
    const result = db.prepare(`
      INSERT INTO employer_claims 
      (employer_profile_id, claim_method, verification_value, verification_code, code_expires_at, status, ip_address, admin_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.id, 
      method, 
      value, 
      code, 
      expiresAt, 
      needsAdminReview ? 'pending' : 'pending',
      req.ip,
      needsAdminReview ? 'No official domain on file - needs admin review' : null
    );
    
    logger.info('Employer claim started', {
      claimId: result.lastInsertRowid,
      profileId: profile.id,
      method,
      needsAdminReview
    });
    
    // In production, you would send the code via email/SMS
    // For now, return it in the response for development
    res.json({
      success: true,
      message: method === 'email' 
        ? 'Verification code sent to your email. Please check your inbox.'
        : 'Verification code sent to your phone via SMS.',
      claimId: result.lastInsertRowid,
      // TODO: Remove this in production! Only for development
      code: process.env.NODE_ENV !== 'production' ? code : undefined,
      needsAdminReview,
      expiresAt
    });
  } catch (error) {
    logger.error('Claim start error', { error: error.message, profileId: req.params.id, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start claim process' 
    });
  }
});

/**
 * POST /api/employers/:id/claim/verify
 * Verify OTP and complete claim
 */
router.post('/:id/claim/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, claimId } = req.body;
    
    if (!code || !claimId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code and claim ID are required' 
      });
    }
    
    // Get claim record
    const claim = db.prepare(`
      SELECT ec.*, pe.company_name, pe.claimed, pe.user_id as existing_user_id
      FROM employer_claims ec
      JOIN profiles_employer pe ON ec.employer_profile_id = pe.id
      WHERE ec.id = ? AND ec.employer_profile_id = ?
    `).get(claimId, id);
    
    if (!claim) {
      return res.status(404).json({ 
        success: false, 
        error: 'Claim request not found' 
      });
    }
    
    if (claim.claimed === 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'This profile has already been claimed' 
      });
    }
    
    if (claim.status === 'verified') {
      return res.status(400).json({ 
        success: false, 
        error: 'This claim has already been verified' 
      });
    }
    
    if (claim.status === 'expired' || new Date(claim.code_expires_at) < new Date()) {
      // Mark as expired
      db.prepare('UPDATE employer_claims SET status = ? WHERE id = ?').run('expired', claimId);
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code has expired. Please start a new claim.' 
      });
    }
    
    // Verify code
    if (claim.verification_code !== code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid verification code' 
      });
    }
    
    // Check if needs admin approval
    if (claim.admin_notes && claim.admin_notes.includes('needs admin review')) {
      db.prepare(`
        UPDATE employer_claims 
        SET status = 'pending'
        WHERE id = ?
      `).run(claimId);
      
      return res.json({
        success: true,
        needsApproval: true,
        message: 'Verification successful! Your claim is pending admin review. We will notify you once approved.'
      });
    }
    
    // Create or get user account
    let userId;
    
    if (claim.claim_method === 'email') {
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(claim.verification_value);
      
      if (existingUser) {
        userId = existingUser.id;
        
        // Update role to employer if not already
        db.prepare(`
          UPDATE users 
          SET role = 'employer', updated_at = datetime('now')
          WHERE id = ?
        `).run(userId);
      } else {
        // Create new user account
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        const result = db.prepare(`
          INSERT INTO users (email, password_hash, role, name, email_verified, force_password_reset)
          VALUES (?, ?, 'employer', ?, 1, 1)
        `).run(claim.verification_value, passwordHash, claim.company_name);
        
        userId = result.lastInsertRowid;
        
        // TODO: Send welcome email with password reset link
        logger.info('New employer user created', { userId, email: claim.verification_value });
      }
    } else {
      // Phone verification - need to create account differently
      // For now, create a placeholder account (user can set email/password later)
      const tempEmail = `phone_${claim.verification_value.replace(/[^0-9]/g, '')}@temp.wantokjobs.com`;
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      
      const result = db.prepare(`
        INSERT INTO users (email, password_hash, role, name, phone, email_verified, force_password_reset)
        VALUES (?, ?, 'employer', ?, ?, 0, 1)
      `).run(tempEmail, passwordHash, claim.company_name, claim.verification_value);
      
      userId = result.lastInsertRowid;
    }
    
    // Update employer profile
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE profiles_employer
      SET claimed = 1,
          claimed_by = ?,
          claimed_at = ?,
          claim_method = ?,
          user_id = ?
      WHERE id = ?
    `).run(userId, now, claim.claim_method, userId, id);
    
    // Update claim record
    db.prepare(`
      UPDATE employer_claims
      SET status = 'verified',
          verified_at = ?,
          user_id = ?
      WHERE id = ?
    `).run(now, userId, claimId);
    
    // Generate auth token
    const token = jwt.sign(
      { id: userId, email: claim.verification_value, role: 'employer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('Employer claim verified', {
      claimId,
      userId,
      profileId: id,
      method: claim.claim_method
    });
    
    res.json({
      success: true,
      message: `Congratulations! You now manage ${claim.company_name} on WantokJobs.`,
      token,
      user: {
        id: userId,
        email: claim.verification_value,
        role: 'employer',
        name: claim.company_name
      },
      profileId: id
    });
  } catch (error) {
    logger.error('Claim verify error', { error: error.message, profileId: req.params.id, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify claim' 
    });
  }
});

/**
 * GET /api/admin/employer-claims
 * List all claims (admin only)
 */
router.get('/admin', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        ec.*,
        pe.company_name,
        pe.website,
        u.email as user_email,
        u.name as user_name
      FROM employer_claims ec
      JOIN profiles_employer pe ON ec.employer_profile_id = pe.id
      LEFT JOIN users u ON ec.user_id = u.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE ec.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ec.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const claims = db.prepare(query).all(...params);
    
    const total = db.prepare(`
      SELECT COUNT(*) as count 
      FROM employer_claims ec
      ${status ? 'WHERE ec.status = ?' : ''}
    `).get(status ? status : undefined)?.count || 0;
    
    res.json({
      success: true,
      claims,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Admin claims list error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch claims' 
    });
  }
});

/**
 * PUT /api/admin/employer-claims/:id
 * Approve or reject a claim (admin only)
 */
router.put('/admin/:claimId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const { claimId } = req.params;
    const { status, notes } = req.body;
    
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be "verified" or "rejected"' 
      });
    }
    
    // Get claim
    const claim = db.prepare(`
      SELECT ec.*, pe.company_name
      FROM employer_claims ec
      JOIN profiles_employer pe ON ec.employer_profile_id = pe.id
      WHERE ec.id = ?
    `).get(claimId);
    
    if (!claim) {
      return res.status(404).json({ 
        success: false, 
        error: 'Claim not found' 
      });
    }
    
    if (status === 'verified') {
      // Create user if doesn't exist
      let userId = claim.user_id;
      
      if (!userId) {
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(claim.verification_value);
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const tempPassword = crypto.randomBytes(16).toString('hex');
          const passwordHash = await bcrypt.hash(tempPassword, 10);
          
          const result = db.prepare(`
            INSERT INTO users (email, password_hash, role, name, email_verified, force_password_reset)
            VALUES (?, ?, 'employer', ?, 1, 1)
          `).run(claim.verification_value, passwordHash, claim.company_name);
          
          userId = result.lastInsertRowid;
        }
      }
      
      // Update employer profile
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE profiles_employer
        SET claimed = 1,
            claimed_by = ?,
            claimed_at = ?,
            claim_method = ?,
            user_id = ?
        WHERE id = ?
      `).run(userId, now, claim.claim_method, userId, claim.employer_profile_id);
      
      // Update claim
      db.prepare(`
        UPDATE employer_claims
        SET status = 'verified',
            verified_at = ?,
            user_id = ?,
            admin_notes = ?
        WHERE id = ?
      `).run(now, userId, notes || null, claimId);
      
      logger.info('Admin approved claim', { claimId, adminId: req.user.id });
    } else {
      // Rejected
      db.prepare(`
        UPDATE employer_claims
        SET status = 'rejected',
            admin_notes = ?
        WHERE id = ?
      `).run(notes || 'Rejected by admin', claimId);
      
      logger.info('Admin rejected claim', { claimId, adminId: req.user.id });
    }
    
    res.json({
      success: true,
      message: status === 'verified' ? 'Claim approved successfully' : 'Claim rejected'
    });
  } catch (error) {
    logger.error('Admin claim update error', { error: error.message, claimId: req.params.claimId, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update claim' 
    });
  }
});

/**
 * POST /api/admin/employer-claims/override
 * Manually assign employer profile to user (admin only)
 */
router.post('/admin/override', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }
    
    const { employer_id, user_id } = req.body;
    
    if (!employer_id || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'employer_id and user_id are required' 
      });
    }
    
    // Verify employer profile exists
    const profile = db.prepare('SELECT id, company_name FROM profiles_employer WHERE id = ?').get(employer_id);
    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        error: 'Employer profile not found' 
      });
    }
    
    // Verify user exists
    const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Update user role to employer if needed
    if (user.role !== 'employer') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('employer', user_id);
    }
    
    // Update employer profile
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE profiles_employer
      SET claimed = 1,
          claimed_by = ?,
          claimed_at = ?,
          claim_method = 'admin',
          user_id = ?
      WHERE id = ?
    `).run(user_id, now, user_id, employer_id);
    
    // Create claim record for audit trail
    db.prepare(`
      INSERT INTO employer_claims 
      (employer_profile_id, user_id, claim_method, verification_value, status, verified_at, admin_notes)
      VALUES (?, ?, 'admin_override', ?, 'verified', ?, ?)
    `).run(
      employer_id,
      user_id,
      user.email,
      now,
      `Manually assigned by admin ${req.user.id}`
    );
    
    logger.info('Admin override claim', { 
      employerId: employer_id, 
      userId: user_id, 
      adminId: req.user.id 
    });
    
    res.json({
      success: true,
      message: `${profile.company_name} has been assigned to user ${user.email}`
    });
  } catch (error) {
    logger.error('Admin override error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign employer profile' 
    });
  }
});

module.exports = router;
