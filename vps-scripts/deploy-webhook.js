#!/usr/bin/env node
/**
 * WantokJobs Auto-Deploy Webhook
 * 
 * Listens for GitHub webhook pushes and auto-deploys.
 * Also supports a simple GET /deploy?token=SECRET for manual triggers.
 * 
 * Install: node /opt/wantokjobs/vps-scripts/deploy-webhook.js
 * Or run as systemd service (see setup script)
 */

const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');

const PORT = process.env.DEPLOY_PORT || 9091;
const SECRET = process.env.DEPLOY_SECRET || 'wantok-deploy-' + crypto.randomBytes(8).toString('hex');
const APP_DIR = '/opt/wantokjobs/app';
const LOG_FILE = '/var/log/wantokjobs-deploy.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

let deploying = false;

function deploy() {
  if (deploying) {
    log('⏳ Deploy already in progress, skipping');
    return { success: false, message: 'Deploy in progress' };
  }
  deploying = true;
  try {
    log('🚀 Starting deploy...');
    
    // Stash any local changes
    try { execSync('git stash', { cwd: APP_DIR, timeout: 10000 }); } catch {}
    
    // Pull latest
    const pullOutput = execSync('git pull origin main', { cwd: APP_DIR, timeout: 30000 }).toString().trim();
    log(`📥 Git pull: ${pullOutput}`);
    
    if (pullOutput.includes('Already up to date')) {
      log('✅ Already up to date, no restart needed');
      deploying = false;
      return { success: true, message: 'Already up to date' };
    }
    
    // Restart service
    execSync('systemctl restart wantokjobs', { timeout: 15000 });
    
    // Verify it's running after 3 seconds
    setTimeout(() => {
      try {
        const status = execSync('systemctl is-active wantokjobs', { timeout: 5000 }).toString().trim();
        if (status === 'active') {
          log('✅ Deploy successful — service active');
        } else {
          log('❌ Deploy WARNING — service status: ' + status);
        }
      } catch (e) {
        log('❌ Deploy FAILED — service not running');
      }
    }, 3000);
    
    deploying = false;
    return { success: true, message: 'Deployed and restarted' };
  } catch (err) {
    log('❌ Deploy error: ' + err.message);
    deploying = false;
    return { success: false, message: err.message };
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', deploying }));
    return;
  }
  
  // Manual deploy trigger (GET with token)
  if (url.pathname === '/deploy' && req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (token !== SECRET) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    log('🔧 Manual deploy triggered');
    const result = deploy();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }
  
  // GitHub webhook (POST)
  if (url.pathname === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // Verify GitHub signature
      const sig = req.headers['x-hub-signature-256'];
      if (sig && !verifySignature(body, sig)) {
        log('⚠️ Invalid webhook signature');
        res.writeHead(401);
        res.end('Invalid signature');
        return;
      }
      
      try {
        const payload = JSON.parse(body);
        // Only deploy on pushes to main
        if (payload.ref === 'refs/heads/main') {
          log(`📨 Webhook: push to main by ${payload.pusher?.name || 'unknown'}`);
          const result = deploy();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(200);
          res.end('Ignored (not main branch)');
        }
      } catch {
        res.writeHead(400);
        res.end('Invalid payload');
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  log(`🚀 Deploy webhook listening on 127.0.0.1:${PORT}`);
  log(`🔑 Deploy secret: ${SECRET}`);
  log(`📡 GitHub webhook URL: http://your-server:${PORT}/webhook`);
  log(`🔧 Manual trigger: curl "http://localhost:${PORT}/deploy?token=${SECRET}"`);
});
