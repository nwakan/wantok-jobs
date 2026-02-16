#!/bin/bash
# Deploy WantokJobs to VPS
set -e
VPS="root@76.13.190.157"

echo "📦 Pushing to GitHub..."
cd /data/.openclaw/workspace/data/wantok
git add -A && git commit -m "${1:-deploy: update}" 2>/dev/null || true
git push origin main 2>/dev/null

echo "📥 Pulling on VPS..."
ssh $VPS "cd /opt/wantokjobs && git pull origin main"

echo "📦 Installing dependencies..."
ssh $VPS "cd /opt/wantokjobs/app && npm install --production 2>&1 | tail -3"

echo "🔨 Building frontend..."
ssh $VPS "cd /opt/wantokjobs/app/client && npm install 2>&1 | tail -1 && npx vite build --outDir ../server/public 2>&1 | tail -3"

echo "🔄 Restarting service..."
ssh $VPS "systemctl restart wantokjobs"

echo "⏳ Waiting for server to start (5s)..."
sleep 5

echo "✅ Health check..."
if ssh $VPS "curl -sf http://127.0.0.1:3001/health" > /dev/null 2>&1; then
  echo "✅ Server is healthy!"
  ssh $VPS "curl -sf http://127.0.0.1:3001/health" | head -3
  echo "🚀 Deploy complete!"
else
  echo "❌ Health check FAILED - server did not start properly"
  echo "🔙 Attempting rollback..."
  ssh $VPS "cd /opt/wantokjobs && git checkout HEAD~1 -- . && systemctl restart wantokjobs"
  sleep 3
  if ssh $VPS "curl -sf http://127.0.0.1:3001/health" > /dev/null 2>&1; then
    echo "✅ Rollback successful - server restored"
  else
    echo "⚠️  Rollback complete but health check still failing - manual intervention needed"
  fi
  exit 1
fi
