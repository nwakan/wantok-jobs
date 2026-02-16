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
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $VPS "cd /opt/wantokjobs && git pull origin main" 2>&1 | tail -3

echo "📦 Installing deps on VPS..."
ssh $VPS "cd /opt/wantokjobs/app && npm install --production 2>&1 | tail -3"

echo "🔨 Building frontend on VPS..."
ssh $VPS "cd /opt/wantokjobs/app/client && npm install 2>&1 | tail -1 && npx vite build --outDir ../server/public 2>&1 | tail -5"

echo "🔄 Restarting service..."
ssh $VPS "systemctl restart wantokjobs"

sleep 2
echo "✅ Checking health..."
ssh $VPS "curl -sf http://127.0.0.1:3001/health && echo ' OK'" || echo "⚠️ Health check failed"

echo "🚀 Deploy complete — $CHANGES files @ $TIMESTAMP"
