/**
 * 2FA / TOTP Routes
 * Implements TOTP-based two-factor authentication using speakeasy.
 * 
 * Install: npm install speakeasy qrcode
 * 
 * Endpoints:
 *   POST /api/2fa/setup      - Generate secret + QR code
 *   POST /api/2fa/verify     - Verify TOTP code and enable 2FA
 *   POST /api/2fa/validate   - Validate code during login
 *   POST /api/2fa/disable    - Disable 2FA (requires password)
 *   GET  /api/2fa/status     - Check if 2FA is enabled
 *   POST /api/2fa/backup     - Generate new backup codes
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Lazy-load speakeasy to avoid crash if not installed
function getSpeakeasy() {
  try { return require('speakeasy'); }
  catch(e) { throw new Error('speakeasy not installed. Run: npm install speakeasy qrcode'); }
}
function getQRCode() {
  try { return require('qrcode'); }
  catch(e) { throw new Error('qrcode not installed. Run: npm install speakeasy qrcode'); }
}

// Generate 8 backup codes
function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{4}/g).join('-')
  );
}

/**
 * GET /api/2fa/status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const row = db.prepare('SELECT enabled FROM user_2fa WHERE user_id = ?').get(req.user.id);
    const user = db.prepare('SELECT two_fa_enabled FROM users WHERE id = ?').get(req.user.id);
    res.json({ enabled: !!(row?.enabled || user?.two_fa_enabled) });
  } catch(e) {
    logger.error('2FA status error:', e.message);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /api/2fa/setup
 * Generates TOTP secret and QR code. Does NOT enable 2FA yet.
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const speakeasy = getSpeakeasy();
    const QRCode = getQRCode();
    const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(req.user.id);

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `WantokJobs (${user.email})`,
      issuer: 'WantokJobs',
      length: 20,
    });

    // Store pending secret (not yet enabled)
    db.prepare(`
      INSERT INTO user_2fa (user_id, secret, enabled)
      VALUES (?, ?, 0)
      ON CONFLICT(user_id) DO UPDATE SET secret = excluded.secret, enabled = 0, updated_at = datetime('now')
    `).run(req.user.id, secret.base32);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrDataUrl,
      otpauthUrl: secret.otpauth_url,
      message: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA.'
    });
  } catch(e) {
    logger.error('2FA setup error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/2fa/verify
 * Verify TOTP code and ENABLE 2FA
 */
router.post('/verify', authenticateToken, (req, res) => {
  try {
    const speakeasy = getSpeakeasy();
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP code is required' });

    const row = db.prepare('SELECT secret FROM user_2fa WHERE user_id = ?').get(req.user.id);
    if (!row) return res.status(400).json({ error: '2FA setup not initiated. Call /setup first.' });

    const valid = speakeasy.totp.verify({
      secret: row.secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 2,
    });

    if (!valid) return res.status(400).json({ error: 'Invalid or expired code. Please try again.' });

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    const backupHash = JSON.stringify(
      backupCodes.map(c => bcrypt.hashSync(c, 10))
    );

    db.prepare(`
      UPDATE user_2fa SET enabled = 1, backup_codes = ?, updated_at = datetime('now') WHERE user_id = ?
    `).run(backupHash, req.user.id);
    db.prepare(`UPDATE users SET two_fa_enabled = 1 WHERE id = ?`).run(req.user.id);

    logger.info(`2FA enabled for user ${req.user.id}`);
    res.json({ success: true, backupCodes, message: '2FA enabled! Save these backup codes safely.' });
  } catch(e) {
    logger.error('2FA verify error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/2fa/validate
 * Validate TOTP during login (called after password auth)
 */
router.post('/validate', (req, res) => {
  try {
    const speakeasy = getSpeakeasy();
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId and code required' });

    const row = db.prepare('SELECT secret, backup_codes FROM user_2fa WHERE user_id = ? AND enabled = 1').get(userId);
    if (!row) return res.status(400).json({ error: '2FA not enabled for this user' });

    // Try TOTP first
    const totpValid = speakeasy.totp.verify({
      secret: row.secret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 2,
    });

    if (totpValid) return res.json({ valid: true, method: 'totp' });

    // Try backup codes
    if (row.backup_codes) {
      try {
        const hashes = JSON.parse(row.backup_codes);
        const matchIdx = hashes.findIndex(h => bcrypt.compareSync(code.trim(), h));
        if (matchIdx !== -1) {
          // Invalidate used backup code
          hashes[matchIdx] = 'USED';
          db.prepare('UPDATE user_2fa SET backup_codes = ? WHERE user_id = ?').run(JSON.stringify(hashes), userId);
          return res.json({ valid: true, method: 'backup', warning: 'Backup code used. Generate new ones if running low.' });
        }
      } catch(e) {}
    }

    return res.status(400).json({ valid: false, error: 'Invalid code. Check your authenticator app.' });
  } catch(e) {
    logger.error('2FA validate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA (requires current password confirmation)
 */
router.post('/disable', authenticateToken, (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to disable 2FA' });

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    db.prepare('UPDATE user_2fa SET enabled = 0 WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE users SET two_fa_enabled = 0 WHERE id = ?').run(req.user.id);

    logger.info(`2FA disabled for user ${req.user.id}`);
    res.json({ success: true, message: '2FA has been disabled.' });
  } catch(e) {
    logger.error('2FA disable error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/2fa/backup/regenerate
 * Generate new backup codes (invalidates old ones)
 */
router.post('/backup/regenerate', authenticateToken, (req, res) => {
  try {
    const row = db.prepare('SELECT enabled FROM user_2fa WHERE user_id = ?').get(req.user.id);
    if (!row?.enabled) return res.status(400).json({ error: '2FA must be enabled first' });

    const backupCodes = generateBackupCodes();
    const backupHash = JSON.stringify(backupCodes.map(c => bcrypt.hashSync(c, 10)));
    db.prepare(`UPDATE user_2fa SET backup_codes = ?, updated_at = datetime('now') WHERE user_id = ?`).run(backupHash, req.user.id);

    res.json({ success: true, backupCodes, message: 'New backup codes generated. Previous codes are now invalid.' });
  } catch(e) {
    logger.error('2FA backup error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;