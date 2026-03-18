const logger = require('../utils/logger');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { events: notifEvents } = require('../lib/notifications');
const { sendWelcomeEmail } = require('../lib/email');

const router = express.Router();

/**
 * Get available OAuth providers based on environment config
 */
router.get('/providers', (req, res) => {
  const providers = [];
  
  if (process.env.GOOGLE_CLIENT_ID) {
    providers.push({
      name: 'google',
      clientId: process.env.GOOGLE_CLIENT_ID,
      enabled: true
    });
  }
  
  if (process.env.FACEBOOK_APP_ID) {
    providers.push({
      name: 'facebook',
      appId: process.env.FACEBOOK_APP_ID,
      enabled: true
    });
  }
  
  res.json({ providers });
});

/**
 * Google OAuth Login/Register
 * POST /api/auth/oauth/google
 * Body: { idToken: string, role?: string }
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken, role } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token required' });
    }
    
    // Verify token with Google
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!googleResponse.ok) {
      logger.error('Google token verification failed:', { detail: googleResponse.status });
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    const googleData = await googleResponse.json();
    
    // Validate token audience (client ID)
    if (process.env.GOOGLE_CLIENT_ID && googleData.aud !== process.env.GOOGLE_CLIENT_ID) {
      logger.error('Google token audience mismatch');
      return res.status(401).json({ error: 'Invalid token audience' });
    }
    
    const { email, name, picture, sub: googleId } = googleData;
    
    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }
    
    // Check if user exists with this email
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (user) {
      // Existing user - link OAuth if not already linked
      if (!user.oauth_provider) {
        db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
          .run('google', googleId, picture, user.id);
      }
      
      // Update last login
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
      
      // Log activity
      try {
        db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)')
          .run(user.id, 'login_oauth_google', 'user', user.id);
      } catch(e) {}
      
    } else {
      // New user - register
      if (!role || !['jobseeker', 'employer'].includes(role)) {
        return res.status(400).json({ error: 'Role required for new users', needsRole: true });
      }
      
      // Create user (no password needed for OAuth, set a random one)
      const bcrypt = require('bcryptjs');
      const randomPassword = require('crypto').randomBytes(32).toString('hex');
      const password_hash = await bcrypt.hash(randomPassword, 10);
      
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, role, name, email_verified, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(email, password_hash, role, name, 1, 'google', googleId, picture);
      
      const userId = result.lastInsertRowid;
      
      // Create profile based on role
      if (role === 'jobseeker') {
        db.prepare('INSERT INTO profiles_jobseeker (user_id) VALUES (?)').run(userId);
      } else if (role === 'employer') {
        db.prepare('INSERT INTO profiles_employer (user_id) VALUES (?)').run(userId);
      }
      
      // Welcome notification + admin alert
      notifEvents.onUserRegistered({ id: userId, email, role, name });
      
      // Send welcome email (async)
      sendWelcomeEmail({ email, name, role }).catch(e => logger.error('Welcome email error:', { error: e.message }));
      
      // Log activity
      try {
        db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
          .run(userId, 'register_oauth_google', 'user', userId, JSON.stringify({ role }));
      } catch(e) {}
      
      user = { id: userId, email, role, name };
    }
    
    // Generate JWT
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
    logger.error('Google OAuth error', { error: error.message });
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

/**
 * Facebook OAuth Login/Register
 * POST /api/auth/oauth/facebook
 * Body: { accessToken: string, role?: string }
 */
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, role } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }
    
    // Verify token with Facebook
    const facebookResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    
    if (!facebookResponse.ok) {
      logger.error('Facebook token verification failed:', { detail: facebookResponse.status });
      return res.status(401).json({ error: 'Invalid Facebook token' });
    }
    
    const facebookData = await facebookResponse.json();
    
    if (facebookData.error) {
      logger.error('Facebook API error:', { detail: facebookData.error });
      return res.status(401).json({ error: 'Invalid Facebook token' });
    }
    
    const { id: facebookId, name, email, picture } = facebookData;
    const avatarUrl = picture?.data?.url || null;
    
    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Facebook. Please grant email permission.' });
    }
    
    // Check if user exists with this email
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (user) {
      // Existing user - link OAuth if not already linked
      if (!user.oauth_provider) {
        db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
          .run('facebook', facebookId, avatarUrl, user.id);
      }
      
      // Update last login
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
      
      // Log activity
      try {
        db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)')
          .run(user.id, 'login_oauth_facebook', 'user', user.id);
      } catch(e) {}
      
    } else {
      // New user - register
      if (!role || !['jobseeker', 'employer'].includes(role)) {
        return res.status(400).json({ error: 'Role required for new users', needsRole: true });
      }
      
      // Create user (no password needed for OAuth, set a random one)
      const bcrypt = require('bcryptjs');
      const randomPassword = require('crypto').randomBytes(32).toString('hex');
      const password_hash = await bcrypt.hash(randomPassword, 10);
      
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, role, name, email_verified, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(email, password_hash, role, name, 1, 'facebook', facebookId, avatarUrl);
      
      const userId = result.lastInsertRowid;
      
      // Create profile based on role
      if (role === 'jobseeker') {
        db.prepare('INSERT INTO profiles_jobseeker (user_id) VALUES (?)').run(userId);
      } else if (role === 'employer') {
        db.prepare('INSERT INTO profiles_employer (user_id) VALUES (?)').run(userId);
      }
      
      // Welcome notification + admin alert
      notifEvents.onUserRegistered({ id: userId, email, role, name });
      
      // Send welcome email (async)
      sendWelcomeEmail({ email, name, role }).catch(e => logger.error('Welcome email error:', { error: e.message }));
      
      // Log activity
      try {
        db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
          .run(userId, 'register_oauth_facebook', 'user', userId, JSON.stringify({ role }));
      } catch(e) {}
      
      user = { id: userId, email, role, name };
    }
    
    // Generate JWT
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
    logger.error('Facebook OAuth error', { error: error.message });
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

module.exports = router;
