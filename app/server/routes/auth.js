const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { events: notifEvents } = require('../lib/notifications');
const { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../lib/email');

const router = express.Router();

// Register
router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    // Validation
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (!['jobseeker', 'employer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)'
    ).run(email, password_hash, role, name);

    const userId = result.lastInsertRowid;

    // Create profile based on role
    if (role === 'jobseeker') {
      db.prepare('INSERT INTO profiles_jobseeker (user_id) VALUES (?)').run(userId);
    } else if (role === 'employer') {
      db.prepare('INSERT INTO profiles_employer (user_id) VALUES (?)').run(userId);
    }

    // Generate token
    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });

    // Welcome notification + admin alert
    notifEvents.onUserRegistered({ id: userId, email, role, name });

    // Send welcome email (async, don't block response)
    sendWelcomeEmail({ email, name, role }).catch(e => console.error('Welcome email error:', e.message));

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)').run(userId, 'register', 'user', userId, JSON.stringify({ role })); } catch(e) {}

    res.status(201).json({
      token,
      user: { id: userId, email, role, name }
    });
  } catch (error) {
    console.error('Register error:', error);
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Migrate legacy password to bcrypt
    if (needsRehash) {
      const newHash = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .run(newHash, user.id);
      console.log(`✅ Migrated legacy password for user: ${email}`);
    }

    // Update last login
    try { db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id); } catch(e) {}

    // Log activity
    try { db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, 'login', 'user', user.id); } catch(e) {}

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
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
      console.error('Invalid legacy password format');
      return false;
    }

    const [storedHash, salt] = parts;
    const computedHash = crypto.createHash('md5')
      .update(salt + password)
      .digest('hex');

    return computedHash === storedHash;
  } catch (error) {
    console.error('Legacy password verification error:', error);
    return false;
  }
}

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

    // Store token (use a simple approach - store in user record)
    try {
      db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
      db.exec("ALTER TABLE users ADD COLUMN reset_token_expires TEXT");
    } catch(e) { /* columns may already exist */ }

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

    // Send reset email
    sendPasswordResetEmail(user, token).catch(e => console.error('Reset email error:', e.message));
    console.log(`🔑 Password reset requested for ${email}`);

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', validate(schemas.resetPassword), async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = db.prepare("SELECT id, email, name FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')").get(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const password_hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now') WHERE id = ?").run(password_hash, user.id);

    notifEvents.onPasswordChanged(user);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticateToken, validate(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

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
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);

    notifEvents.onPasswordChanged(user);
    sendPasswordChangedEmail(user).catch(() => {});

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, role, name, created_at FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout (client-side handles token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
