const logger = require('../utils/logger');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { events: notifEvents } = require('../lib/notifications');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../lib/email');
const { stripHtml, sanitizeEmail, isValidLength } = require('../utils/sanitizeHtml');

const router = express.Router();

// Security: Weak password blocklist
const WEAK_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master',
  'sunshine', 'ashley', 'bailey', 'shadow', 'superman', 'princess',
  'wantokjobs', 'wantok', 'papuanewguinea', 'png123', 'portmoresby'
];

function isWeakPassword(password) {
  const lower = password.toLowerCase();
  return WEAK_PASSWORDS.some(weak => lower.includes(weak));
}

/**
 * Enhanced password strength validation
 * Enforces: 8+ chars, 2 of 4 types (upper/lower/number/symbol)
 * Balanced for PNG market (not overly strict)
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Count character type diversity
  let typeCount = 0;
  if (/[a-z]/.test(password)) typeCount++; // lowercase
  if (/[A-Z]/.test(password)) typeCount++; // uppercase
  if (/[0-9]/.test(password)) typeCount++; // numbers
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password)) typeCount++; // symbols
  
  if (typeCount < 2) {
    errors.push('Password must include at least 2 of: lowercase, uppercase, numbers, symbols');
  }
  
  // Check for simple patterns (all same character)
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character');
  }
  
  // Check for simple sequences
  const sequences = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890',
                     'abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'ghij', 'hijk'];
  const lower = password.toLowerCase();
  if (sequences.some(seq => lower.includes(seq))) {
    errors.push('Password cannot contain simple sequences (1234, abcd, etc.)');
  }
  
  return errors; // Empty array = valid
}

// Security: Maximum failed attempts before lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * GET /api/auth/captcha
 * Generate a simple math-based CAPTCHA
 */
router.get('/captcha', (req, res) => {
  try {
    // Generate random math problem
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer;
    let question;
    
    if (operator === '+') {
      answer = num1 + num2;
      question = `What is ${num1} + ${num2}?`;
    } else {
      // Ensure subtraction doesn't result in negative
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      question = `What is ${larger} - ${smaller}?`;
    }
    
    // Generate unique ID
    const captchaId = crypto.randomBytes(16).toString('hex');
    
    // Store in database with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    db.prepare(`
      INSERT INTO captchas (id, question, answer, expires_at) 
      VALUES (?, ?, ?, ?)
    `).run(captchaId, question, answer.toString(), expiresAt);
    
    // Clean up expired captchas (older than 10 minutes)
    const cleanupTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM captchas WHERE expires_at < ?').run(cleanupTime);
    
    res.json({
      id: captchaId,
      question
    });
  } catch (error) {
    logger.error('CAPTCHA generation error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate CAPTCHA' });
  }
});

/**
 * Helper function to validate CAPTCHA
 */
function validateCaptcha(captchaId, captchaAnswer) {
  if (!captchaId || !captchaAnswer) {
    return { valid: false, error: 'CAPTCHA is required' };
  }
  
  const captcha = db.prepare('SELECT * FROM captchas WHERE id = ?').get(captchaId);
  
  if (!captcha) {
    return { valid: false, error: 'Invalid or expired CAPTCHA. Please refresh.' };
  }
  
  // Check expiry
  if (new Date(captcha.expires_at) < new Date()) {
    db.prepare('DELETE FROM captchas WHERE id = ?').run(captchaId);
    return { valid: false, error: 'CAPTCHA expired. Please refresh.' };
  }
  
  // Check answer (case-insensitive, trimmed)
  if (captcha.answer.trim().toLowerCase() !== captchaAnswer.toString().trim().toLowerCase()) {
    return { valid: false, error: 'Incorrect answer. Please try again.' };
  }
  
  // Delete used CAPTCHA
  db.prepare('DELETE FROM captchas WHERE id = ?').run(captchaId);
  
  return { valid: true };
}

// Register
router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { email, password, role, name, captcha_id, captcha_answer } = req.body;

    // Validate CAPTCHA first
    const captchaValidation = validateCaptcha(captcha_id, captcha_answer);
    if (!captchaValidation.valid) {
      return res.status(400).json({ error: captchaValidation.error });
    }

    // Sanitize inputs to prevent XSS
    const safeName = stripHtml(name);
    const safeEmail = sanitizeEmail(email);

    // Validation
    if (!safeEmail || !password || !role || !safeName) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    if (!isValidLength(safeName, 100, 1)) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    }

    if (!['jobseeker', 'employer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Security: Comprehensive password validation
    const strengthErrors = validatePasswordStrength(password);
    if (strengthErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Password does not meet security requirements',
        details: strengthErrors 
      });
    }
    
    // Security: Check for weak passwords (blocklist)
    if (isWeakPassword(password)) {
      return res.status(400).json({ error: 'Password is too common. Please choose a stronger password.' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(safeEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user (with verification token, email_verified = 0)
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, role, name, verification_token, email_verified) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(safeEmail, password_hash, role, safeName, verificationToken);

    const userId = result.lastInsertRowid;

    // Create profile based on role
    if (role === 'jobseeker') {
      db.prepare('INSERT INTO profiles_jobseeker (user_id) VALUES (?)').run(userId);
    } else if (role === 'employer') {
      db.prepare('INSERT INTO profiles_employer (user_id) VALUES (?)').run(userId);
    }

    // Generate token
    const token = jwt.sign({ id: userId, email: safeEmail, role }, JWT_SECRET, { expiresIn: '7d' });

    // Welcome notification + admin alert
    notifEvents.onUserRegistered({ id: userId, email: safeEmail, role, name: safeName });

    // Send verification email (async, don't block response)
    sendVerificationEmail({ email: safeEmail, name: safeName, role }, verificationToken).catch(e => logger.error('Verification email error:', { error: e.message }));

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)').run(userId, 'register', 'user', userId, JSON.stringify({ role })); } catch(e) {}

    res.status(201).json({
      token,
      user: { id: userId, email: safeEmail, role, name: safeName, email_verified: false },
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error) {
    logger.error('Register error', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Security: Block spam/disabled accounts
    if (user.account_status === 'spam') {
      return res.status(403).json({ error: 'This account has been disabled. Contact support if you believe this is an error.' });
    }

    // Security: Check if account is locked
    if (user.lockout_until) {
      const lockoutTime = new Date(user.lockout_until);
      const now = new Date();
      if (now < lockoutTime) {
        const minutesRemaining = Math.ceil((lockoutTime - now) / 60000);
        return res.status(429).json({ 
          error: `Account locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}.` 
        });
      } else {
        // Lockout expired, clear it
        db.prepare("UPDATE users SET lockout_until = NULL, failed_attempts = 0 WHERE id = ?").run(user.id);
      }
    }

    let valid = false;
    let needsRehash = false;

    // Check if this is a legacy password (format: legacy:md5hash:salt)
    if (user.password_hash.startsWith('legacy:')) {
      const legacyHash = user.password_hash.substring(7); // Remove 'legacy:' prefix
      valid = verifyLegacyPassword(password, legacyHash);
      needsRehash = valid; // Rehash on successful login
    } else {
      // Modern bcrypt password
      valid = await bcrypt.compare(password, user.password_hash);
    }

    if (!valid) {
      // Security: Increment failed attempts
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account
        const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
        db.prepare("UPDATE users SET failed_attempts = ?, lockout_until = ? WHERE id = ?")
          .run(newFailedAttempts, lockoutUntil, user.id);
        
        return res.status(429).json({ 
          error: `Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.` 
        });
      } else {
        // Just increment counter
        db.prepare("UPDATE users SET failed_attempts = ? WHERE id = ?").run(newFailedAttempts, user.id);
        const attemptsRemaining = MAX_FAILED_ATTEMPTS - newFailedAttempts;
        return res.status(401).json({ 
          error: `Invalid credentials. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining before account lockout.` 
        });
      }
    }

    // Migrate legacy password to bcrypt
    if (needsRehash) {
      const newHash = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newHash, user.id);
      logger.info('log', { detail: `✅ Migrated legacy password for user: ${email}` });
    }

    // Update last login and reset failed attempts on successful login
    try { 
      db.prepare("UPDATE users SET last_login = datetime('now'), failed_attempts = 0, lockout_until = NULL WHERE id = ?")
        .run(user.id); 
    } catch(e) {}

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, 'login', 'user', user.id); } catch(e) {}

    // Check if user needs forced password reset
    const forcePasswordReset = !!(user.force_password_reset);

    // Generate token (include fpr claim if forced reset needed)
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    if (forcePasswordReset) tokenPayload.fpr = true;

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    };

    if (forcePasswordReset) response.forcePasswordReset = true;

    res.json(response);
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Verify legacy MD5:salt password format
 * Format: md5hash:salt (e.g., 3a0c33a8800e065d1eaf2c76226028fc:9f)
 * Verification: MD5(salt + password) === md5hash
 */
function verifyLegacyPassword(password, legacyHash) {
  try {
    const crypto = require('crypto');
    const parts = legacyHash.split(':');
    
    if (parts.length !== 2) {
      logger.error('Invalid legacy password format');
      return false;
    }

    const [storedHash, salt] = parts;
    const computedHash = crypto.createHash('md5')
      .update(salt + password)
      .digest('hex');

    return computedHash === storedHash;
  } catch (error) {
    logger.error('Legacy password verification error', { error: error.message });
    return false;
  }
}

// Verify email with token
router.get('/verify-email', (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Find user with this verification token
    const user = db.prepare('SELECT id, email, name, email_verified FROM users WHERE verification_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (user.email_verified) {
      return res.json({ message: 'Email already verified', alreadyVerified: true });
    }

    // Mark email as verified and clear token
    db.prepare("UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = datetime('now') WHERE id = ?").run(user.id);

    // Send welcome email now (after verification)
    sendWelcomeEmail({ email: user.email, name: user.name, role: user.role }).catch(e => logger.error('Welcome email error:', { error: e.message }));

    logger.info('log', { detail: `✅ Email verified for user: ${user.email}` });

    res.json({ 
      message: 'Email verified successfully! You can now log in.', 
      success: true 
    });
  } catch (error) {
    logger.error('Verify email error', { error: error.message });
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, email_verified, verification_token FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.json({ message: 'Email already verified' });
    }

    // Generate new verification token if needed
    let verificationToken = user.verification_token;
    if (!verificationToken) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);
    }

    // Resend verification email
    sendVerificationEmail({ email: user.email, name: user.name, role: user.role }, verificationToken)
      .catch(e => logger.error('Resend verification email error:', { error: e.message }));

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (error) {
    logger.error('Resend verification error', { error: error.message });
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// Forgot password - generate reset token
router.post('/forgot-password', validate(schemas.forgotPassword), (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
    
    // Always return success (don't reveal if email exists)
    if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Security: Hash token before storing (prevent DB compromise attacks)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store hashed token (use a simple approach - store in user record)
    try {
      db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
      db.exec("ALTER TABLE users ADD COLUMN reset_token_expires TEXT");
    } catch(e) { /* columns may already exist */ }

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(tokenHash, expires, user.id);

    // Send reset email
    sendPasswordResetEmail(user, token).catch(e => logger.error('Reset email error:', { error: e.message }));
    logger.info('log', { detail: `🔑 Password reset requested for ${email}` });

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error', { error: error.message });
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', validate(schemas.resetPassword), async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });

    // Security: Comprehensive password validation
    const strengthErrors = validatePasswordStrength(password);
    if (strengthErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Password does not meet security requirements',
        details: strengthErrors 
      });
    }

    // Security: Check for weak passwords (blocklist)
    if (isWeakPassword(password)) {
      return res.status(400).json({ error: 'Password is too common. Please choose a stronger password.' });
    }

    // Security: Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = db.prepare("SELECT id, email, name FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')").get(tokenHash);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const password_hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(password_hash, user.id);

    notifEvents.onPasswordChanged(user);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    logger.error('Reset password error', { error: error.message });
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticateToken, validate(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });

    // Security: Comprehensive password validation
    const strengthErrors = validatePasswordStrength(newPassword);
    if (strengthErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Password does not meet security requirements',
        details: strengthErrors 
      });
    }

    // Security: Check for weak passwords (blocklist)
    if (isWeakPassword(newPassword)) {
      return res.status(400).json({ error: 'Password is too common. Please choose a stronger password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify current password (handle legacy too)
    let valid = false;
    if (user.password_hash.startsWith('legacy:')) {
      valid = verifyLegacyPassword(currentPassword, user.password_hash.substring(7));
    } else {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    }

    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, force_password_reset = 0, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);

    notifEvents.onPasswordChanged(user);
    sendPasswordChangedEmail(user).catch(() => {});

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, role, name, email_verified, created_at FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user error', { error: error.message });
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side handles token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Mount OAuth routes
router.use('/oauth', require('./oauth'));

module.exports = router;
