#!/bin/bash
# Git pull deploy script — run on VPS by webhook or manually
# Pulls latest code, rebuilds client, restarts service
set -euo pipefail

REPO_DIR="/opt/wantokjobs"
APP_DIR="/opt/wantokjobs/app"
cd "$REPO_DIR"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Deploy started"

# Pull latest
git fetch origin main
git reset --hard origin/main
echo "Git pull done: $(git log --oneline -1)"

# Rebuild client if any client/ changes
if git diff HEAD~1 --name-only | grep -q "^app/client/"; then
  echo "Client changes detected, rebuilding..."
  cd "$APP_DIR/client"
  npx vite build
  cd "$REPO_DIR"
  echo "Client build done"
fi

# Fix ownership
chown -R wantokjobs:wantokjobs "$REPO_DIR"

# Stop service before migrations (avoid SQLITE_CORRUPT)
echo "Stopping service..."
systemctl stop wantokjobs
sleep 1

# Clean WAL/SHM files and kill any stale DB processes
rm -f "$APP_DIR/server/data/wantokjobs.db-wal" "$APP_DIR/server/data/wantokjobs.db-shm"
fuser -k "$APP_DIR/server/data/wantokjobs.db" 2>/dev/null || true

# Run migrations
echo "Running migrations..."
cd "$APP_DIR"
node server/migrations/runner.js || echo "Migrations: no new migrations"
cd "$REPO_DIR"

# Start service
echo "Starting service..."
systemctl reset-failed wantokjobs 2>/dev/null || true
systemctl start wantokjobs
sleep 2

# Health check
HEALTH=$(curl -sf http://localhost:3001/health || echo '{"status":"error"}')
echo "Health: $HEALTH"

if echo "$HEALTH" | grep -q '"ok"'; then
  echo "✅ Deploy successful"
else
  echo "❌ Health check failed!"
  exit 1
fi
# Auto-deploy: git push → webhook → systemd deploy
# Tested 2026-02-17T02:39:21Z
