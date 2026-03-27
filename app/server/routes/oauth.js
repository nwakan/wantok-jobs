const logger = require('../utils/logger');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { events: notifEvents } = require('../lib/notifications');
const { sendWelcomeEmail } = require('../lib/email');

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function findOrCreateOAuthUser({ email, name, picture, provider, providerId, role }) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (user) {
    if (!user.oauth_provider) {
      db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?')
        .run(provider, providerId, picture, user.id);
    }
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    try {
      db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)')
        .run(user.id, `login_oauth_${provider}`, 'user', user.id);
    } catch (e) {}
    return { user, isNew: false };
  }

  // New user — role required
  if (!role || !['jobseeker', 'employer'].includes(role)) {
    return { user: null, isNew: true, needsRole: true };
  }

  const bcrypt = require('bcryptjs');
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const password_hash = await bcrypt.hash(randomPassword, 10);

  const result = db.prepare(
    'INSERT INTO users (email, password_hash, role, name, email_verified, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(email, password_hash, role, name, 1, provider, providerId, picture);

  const userId = result.lastInsertRowid;

  if (role === 'jobseeker') {
    db.prepare('INSERT INTO profiles_jobseeker (user_id) VALUES (?)').run(userId);
  } else if (role === 'employer') {
    db.prepare('INSERT INTO profiles_employer (user_id) VALUES (?)').run(userId);
  }

  notifEvents.onUserRegistered({ id: userId, email, role, name });
  sendWelcomeEmail({ email, name, role }).catch(e => logger.error('Welcome email error:', { error: e.message }));

  try {
    db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(userId, `register_oauth_${provider}`, 'user', userId, JSON.stringify({ role }));
  } catch (e) {}

  user = { id: userId, email, role, name };
  return { user, isNew: true };
}

function makeJwt(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function dashboardUrl(role) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'employer') return '/dashboard/employer';
  return '/dashboard/jobseeker';
}

// ─── Providers list ─────────────────────────────────────────────────────────

router.get('/providers', (req, res) => {
  const providers = {};

  if (process.env.GOOGLE_CLIENT_ID) {
    providers.google = { clientId: process.env.GOOGLE_CLIENT_ID, enabled: true };
  }

  if (process.env.FACEBOOK_APP_ID) {
    providers.facebook = { appId: process.env.FACEBOOK_APP_ID, enabled: true };
  }

  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    providers.linkedin = { enabled: true };
  }

  res.json({ providers });
});


// ─── Google ──────────────────────────────────────────────────────────────────

router.post('/google', async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token required' });

    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleResponse.ok) {
      logger.error('Google token verification failed:', { detail: googleResponse.status });
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const googleData = await googleResponse.json();
    if (process.env.GOOGLE_CLIENT_ID && googleData.aud !== process.env.GOOGLE_CLIENT_ID) {
      logger.error('Google token audience mismatch');
      return res.status(401).json({ error: 'Invalid token audience' });
    }

    const { email, name, picture, sub: googleId } = googleData;
    if (!email) return res.status(400).json({ error: 'Email not provided by Google' });

    const { user, isNew, needsRole } = await findOrCreateOAuthUser({
      email, name, picture, provider: 'google', providerId: googleId, role
    });

    if (needsRole) return res.status(400).json({ error: 'Role required for new users', needsRole: true });

    const token = makeJwt(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    logger.error('Google OAuth error', { error: error.message });
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

// ─── Facebook ────────────────────────────────────────────────────────────────

router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, role } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Access token required' });

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
    if (!email) return res.status(400).json({ error: 'Email not provided by Facebook. Please grant email permission.' });

    const { user, isNew, needsRole } = await findOrCreateOAuthUser({
      email, name, picture: avatarUrl, provider: 'facebook', providerId: facebookId, role
    });

    if (needsRole) return res.status(400).json({ error: 'Role required for new users', needsRole: true });

    const token = makeJwt(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    logger.error('Facebook OAuth error', { error: error.message });
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

// ─── LinkedIn — OIDC server-side redirect flow ────────────────────────────────
//
// Step 1: GET /api/auth/oauth/linkedin
//   Redirects user to LinkedIn authorization page.
//   Optional query params:
//     ?role=jobseeker|employer   (used when creating new account via /register)
//
// Step 2: GET /api/auth/oauth/linkedin/callback
//   LinkedIn redirects back here with ?code=...&state=...
//   We exchange code for tokens, fetch user info, find/create user, issue JWT.
//   Then redirect to the frontend with the token in the URL.

const LINKEDIN_AUTH_URL  = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USER_URL  = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_SCOPES    = 'r_liteprofile r_emailaddress';

// Generate the public-facing base URL (production vs dev)
function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  return `${proto}://${host}`;
}

// Step 1 — initiate LinkedIn login
router.get('/linkedin', (req, res) => {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    return res.status(503).json({ error: 'LinkedIn OAuth not configured' });
  }

  const role = ['jobseeker', 'employer'].includes(req.query.role) ? req.query.role : 'jobseeker';

  // Encode role inside state using a signed JWT (10-min expiry, also acts as CSRF token)
  const stateToken = jwt.sign({ role, nonce: crypto.randomBytes(8).toString('hex') }, JWT_SECRET, { expiresIn: '10m' });

  const redirectUri = `${getBaseUrl(req)}/api/auth/oauth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINKEDIN_CLIENT_ID,
    redirect_uri:  redirectUri,
    state:         stateToken,
    scope:         LINKEDIN_SCOPES,
  });

  res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
});

// Step 2 — handle LinkedIn callback
router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error: oauthError, error_description } = req.query;

  // Determine frontend base URL for redirects
  const frontendBase = process.env.APP_URL
    ? process.env.APP_URL.replace(/\/$/, '')
    : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;

  // User denied access or LinkedIn returned error
  if (oauthError) {
    logger.warn('LinkedIn OAuth denied by user', { error: oauthError, description: error_description });
    return res.redirect(`${frontendBase}/login?oauth_error=${encodeURIComponent(error_description || oauthError)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendBase}/login?oauth_error=missing_params`);
  }

  // Verify state JWT (CSRF check)
  let statePayload;
  try {
    statePayload = jwt.verify(state, JWT_SECRET);
  } catch (e) {
    logger.warn('LinkedIn OAuth: invalid or expired state token');
    return res.redirect(`${frontendBase}/login?oauth_error=invalid_state`);
  }

  const { role } = statePayload;

  try {
    // Exchange authorization code for access token
    const redirectUri = `${frontendBase}/api/auth/oauth/linkedin/callback`;

    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error('LinkedIn token exchange failed', { status: tokenRes.status, body: errBody });
      return res.redirect(`${frontendBase}/login?oauth_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user info via OIDC userinfo endpoint
    const userRes = await fetch(LINKEDIN_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      logger.error('LinkedIn userinfo fetch failed', { status: userRes.status });
      return res.redirect(`${frontendBase}/login?oauth_error=userinfo_failed`);
    }

    const liUser = await userRes.json();
    const email   = liUser.email;
    const name    = liUser.name || `${liUser.given_name || ''} ${liUser.family_name || ''}`.trim();
    const picture = liUser.picture || null;
    const sub     = liUser.sub; // LinkedIn OIDC subject

    if (!email) {
      logger.warn('LinkedIn OIDC: no email returned', { sub });
      return res.redirect(`${frontendBase}/login?oauth_error=no_email`);
    }

    const { user, isNew, needsRole } = await findOrCreateOAuthUser({
      email, name, picture, provider: 'linkedin', providerId: sub, role
    });

    if (needsRole) {
      // New user — redirect to register page with a temporary LinkedIn token
      // so they can pick their role, then complete registration via POST /api/auth/oauth/linkedin/complete
      const tempToken = jwt.sign(
        { linkedinSub: sub, email, name, picture, type: 'linkedin_pending' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.redirect(`${frontendBase}/register?linkedin_pending=${encodeURIComponent(tempToken)}`);
    }

    const token = makeJwt(user);
    const dest  = dashboardUrl(user.role);
    return res.redirect(`${frontendBase}/login?linkedin_token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(dest)}`);

  } catch (err) {
    logger.error('LinkedIn OAuth callback error', { error: err.message });
    return res.redirect(`${frontendBase}/login?oauth_error=server_error`);
  }
});

// Step 3 (new user only) — complete LinkedIn registration after role selection
// POST /api/auth/oauth/linkedin/complete
// Body: { pendingToken: string, role: 'jobseeker'|'employer' }
router.post('/linkedin/complete', async (req, res) => {
  try {
    const { pendingToken, role } = req.body;

    if (!pendingToken || !role || !['jobseeker', 'employer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    let payload;
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Pending token expired or invalid. Please sign in again.' });
    }

    if (payload.type !== 'linkedin_pending') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    const { linkedinSub, email, name, picture } = payload;

    const { user, isNew, needsRole } = await findOrCreateOAuthUser({
      email, name, picture, provider: 'linkedin', providerId: linkedinSub, role
    });

    if (needsRole) {
      return res.status(400).json({ error: 'Role required for new users', needsRole: true });
    }

    const token = makeJwt(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) {
    logger.error('LinkedIn complete registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
