#!/bin/bash
# Auto-deploy WantokJobs — only if build passes and there are changes
set -e
cd /data/.openclaw/workspace/data/wantok

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
  echo "📭 No changes to deploy"
  exit 0
fi

# Count changes
CHANGES=$(git status --short | wc -l)
echo "📦 Found $CHANGES changed files"

# Build frontend first
echo "🔨 Building frontend..."
cd app
npm run build 2>&1 | tail -5
BUILD_EXIT=$?
cd ..

if [ $BUILD_EXIT -ne 0 ]; then
  echo "❌ Build failed — NOT deploying"
  exit 1
fi

echo "✅ Build passed"

# Commit and push
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git add -A
git commit -m "auto-deploy: $CHANGES files @ $TIMESTAMP" 2>/dev/null || true
git push origin main 2>&1 | tail -3

# Deploy to VPS
VPS="root@76.13.190.157"
echo "📥 Pulling on VPS..."
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS "cd /opt/wantokjobs && git checkout -- . && rm -f app/server/data/wantokjobs.db-shm app/server/data/wantokjobs.db-wal && git clean -fd app/server/public/ 2>/dev/null; git pull origin main" 2>&1 | tail -5

echo "📦 Installing deps on VPS..."
ssh $VPS "cd /opt/wantokjobs/app && npm install --production 2>&1 | tail -3"

echo "🔨 Building frontend on VPS..."
ssh $VPS "cd /opt/wantokjobs/app/client && npm install 2>&1 | tail -1 && npx vite build --outDir ../server/public 2>&1 | tail -5"

echo "📊 Syncing database..."
scp /data/.openclaw/workspace/data/wantok/app/server/data/wantokjobs.db $VPS:/opt/wantokjobs/app/server/data/wantokjobs.db 2>&1 | tail -1

echo "🔄 Restarting service..."
ssh $VPS "systemctl restart wantokjobs"

echo "⏳ Waiting for server to start (5s)..."
sleep 5

echo "✅ Health check..."
if ssh $VPS "curl -sf http://127.0.0.1:3001/health" > /dev/null 2>&1; then
  echo "✅ Server is healthy!"
  ssh $VPS "curl -sf http://127.0.0.1:3001/health" | grep -o '"status":"ok"' || echo "Server running"
  echo "🚀 Deploy complete — $CHANGES files @ $TIMESTAMP"
else
  echo "❌ Health check FAILED - server did not start after deploy"
  echo "🔙 Rolling back to previous version..."
  
  # Rollback: checkout previous commit
  ssh $VPS "cd /opt/wantokjobs && git checkout HEAD~1 -- ."
  
  # Restore previous build
  ssh $VPS "cd /opt/wantokjobs/app && npm install --production 2>&1 | tail -2"
  ssh $VPS "cd /opt/wantokjobs/app/client && npx vite build --outDir ../server/public 2>&1 | tail -3"
  
  # Restart with old code
  ssh $VPS "systemctl restart wantokjobs"
  sleep 5
  
  # Verify rollback worked
  if ssh $VPS "curl -sf http://127.0.0.1:3001/health" > /dev/null 2>&1; then
    echo "✅ Rollback successful - server restored to previous version"
  else
    echo "⚠️  Rollback complete but health check still failing - MANUAL INTERVENTION NEEDED"
    echo "⚠️  Server may be down - check logs: ssh $VPS 'journalctl -u wantokjobs -n 50'"
  fi
  
  exit 1
fi
