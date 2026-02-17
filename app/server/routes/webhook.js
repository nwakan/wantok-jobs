const express = require('express');
const crypto = require('crypto');
const { execSync, exec } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const router = express.Router();

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const APP_DIR = path.resolve(__dirname, '../..');
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || 'main';

function verifySignature(req) {
  if (!WEBHOOK_SECRET) return false;
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(JSON.stringify(req.body));
  const expected = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * POST /api/webhook/github
 * GitHub push webhook → auto-deploy
 */
router.post('/github', express.json(), (req, res) => {
  const event = req.headers['x-github-event'];

  // Verify signature if secret is configured
  if (WEBHOOK_SECRET && !verifySignature(req)) {
    logger.warn('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Only deploy on push to main branch
  if (event !== 'push') {
    return res.json({ status: 'ignored', reason: `event: ${event}` });
  }

  const ref = req.body.ref || '';
  if (ref !== `refs/heads/${DEPLOY_BRANCH}`) {
    return res.json({ status: 'ignored', reason: `branch: ${ref}` });
  }

  const pusher = req.body.pusher?.name || 'unknown';
  const commits = req.body.commits?.length || 0;
  const headCommit = req.body.head_commit?.message || '';

  logger.info('GitHub webhook: deploy triggered', { pusher, commits, headCommit: headCommit.slice(0, 100) });

  // Respond immediately, deploy in background
  res.json({ status: 'deploying', pusher, commits });

  // Run deploy asynchronously
  const deployScript = path.join(APP_DIR, 'deploy-pull.sh');
  exec(`bash ${deployScript} 2>&1`, { cwd: APP_DIR, timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      logger.error('Deploy failed', { error: err.message, stdout: stdout.slice(-500), stderr: stderr.slice(-500) });
    } else {
      logger.info('Deploy completed', { output: stdout.slice(-200) });
    }
  });
});

module.exports = router;
