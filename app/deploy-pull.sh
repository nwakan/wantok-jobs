#!/bin/bash
# Git pull deploy script — run on VPS by webhook or manually
# Pulls latest code, rebuilds client, restarts service
set -euo pipefail

APP_DIR="/opt/wantokjobs/app"
cd "$APP_DIR"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Deploy started"

# Pull latest
git fetch origin main
git reset --hard origin/main
echo "Git pull done: $(git log --oneline -1)"

# Rebuild client if any client/ changes
if git diff HEAD~1 --name-only | grep -q "^client/"; then
  echo "Client changes detected, rebuilding..."
  cd client
  npx vite build
  cd ..
  echo "Client build done"
fi

# Run migrations
echo "Running migrations..."
node server/migrations/runner.js || echo "Migrations: no new migrations"

# Fix ownership
chown -R wantokjobs:wantokjobs "$APP_DIR"

# Restart service
echo "Restarting service..."
systemctl restart wantokjobs
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
