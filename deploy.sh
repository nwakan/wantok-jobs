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

echo "✅ Checking health..."
sleep 2
ssh $VPS "curl -sf http://127.0.0.1:3001/health && echo ''"

echo "🚀 Deploy complete!"
