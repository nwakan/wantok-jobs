const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const router = express.Router();

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const REPO_DIR = '/opt/wantokjobs';
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || 'main';

function verifySignature(rawBody, sig) {
  if (!WEBHOOK_SECRET || !sig) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = 'sha256=' + hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhook/github
 * Uses raw body parser to get exact bytes for HMAC verification
 */
router.post('/github', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body; // Buffer when using express.raw()
  const sig = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  // Verify signature
  if (WEBHOOK_SECRET && !verifySignature(rawBody, sig)) {
    logger.warn('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Ping event — respond OK
  if (event === 'ping') {
    logger.info('GitHub webhook ping received', { zen: body.zen });
    return res.json({ status: 'pong', zen: body.zen });
  }

  // Only deploy on push to main branch
  if (event !== 'push') {
    return res.json({ status: 'ignored', reason: `event: ${event}` });
  }

  const ref = body.ref || '';
  if (ref !== `refs/heads/${DEPLOY_BRANCH}`) {
    return res.json({ status: 'ignored', reason: `branch: ${ref}` });
  }

  const pusher = body.pusher?.name || 'unknown';
  const commits = body.commits?.length || 0;
  const headCommit = body.head_commit?.message || '';

  logger.info('GitHub webhook: deploy triggered', { pusher, commits, headCommit: headCommit.slice(0, 100) });

  // Respond immediately, deploy in background
  res.json({ status: 'deploying', pusher, commits });

  // Deploy: use nohup to fully detach from this process, then pull + build + restart
  const deployCmd = `nohup bash -c 'sleep 3 && cd ${REPO_DIR}/app && git stash 2>/dev/null; git pull origin main && cd client && npx vite build 2>/dev/null; cd .. && systemctl restart wantokjobs' > /var/log/wantokjobs-deploy.log 2>&1 &`;
  exec(deployCmd, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      logger.error('Deploy failed', { error: err.message, stderr });
    } else {
      logger.info('Deploy successful', { output: stdout.trim().slice(0, 200) });
    }
  });
});

module.exports = router;
