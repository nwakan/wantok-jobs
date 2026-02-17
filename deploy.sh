#!/bin/bash
# WantokJobs Manual Deploy — pushes code + DB to VPS
set -euo pipefail

VPS="root@76.13.190.157"
VPS_APP="/opt/wantokjobs"
VPS_DB="$VPS_APP/app/server/data/wantokjobs.db"
LOCAL_DB="/data/.openclaw/workspace/data/wantok/app/server/data/wantokjobs.db"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes"
MSG="${1:-deploy: manual update}"

log() { echo "[$(date '+%H:%M:%S')] $1"; }
ssh_cmd() { ssh $SSH_OPTS $VPS "$@"; }

# Pre-deploy validation
log "🔍 Running pre-deploy validation..."
cd /data/.openclaw/workspace/data/wantok/app
if ! node scripts/validate.js; then
  log "❌ Pre-deploy validation failed — aborting"
  exit 1
fi

# Check VPS
if ! ssh_cmd "echo ok" >/dev/null 2>&1; then
  log "❌ VPS unreachable"; exit 1
fi

# Push code
log "📤 Pushing to GitHub..."
cd /data/.openclaw/workspace/data/wantok
git add -A && git commit -m "$MSG" 2>/dev/null || true
git push origin main 2>&1 | tail -3

# Backup VPS DB
log "💾 Backing up VPS database..."
ssh_cmd "cp $VPS_DB ${VPS_DB}.pre-deploy-backup 2>/dev/null || true"

# Pull code
log "📥 Pulling on VPS..."
ssh_cmd "cd $VPS_APP && git stash 2>/dev/null; git pull origin main 2>&1 | tail -3"

log "📦 Installing deps..."
ssh_cmd "cd $VPS_APP/app && npm install --production 2>&1 | tail -3"

log "🔨 Building frontend..."
ssh_cmd "cd $VPS_APP/app/client && npm install 2>&1 | tail -1 && npx vite build --outDir ../server/public 2>&1 | tail -5"

# Sync DB (atomic)
log "📊 Syncing database..."
cd /data/.openclaw/workspace/data/wantok/app
node -e "
  const db = require('./node_modules/better-sqlite3')('$LOCAL_DB', {readonly:true});
  db.exec(\"VACUUM INTO '/tmp/wantokjobs-deploy.db'\");
  db.close();
"
ssh_cmd "systemctl stop wantokjobs 2>/dev/null || true"
sleep 1
ssh_cmd "rm -f ${VPS_DB}-wal ${VPS_DB}-shm"
scp $SSH_OPTS /tmp/wantokjobs-deploy.db $VPS:$VPS_DB
ssh_cmd "chown wantokjobs:wantokjobs $VPS_DB 2>/dev/null || true"
rm -f /tmp/wantokjobs-deploy.db

# Restart
log "🔄 Restarting..."
ssh_cmd "systemctl reset-failed wantokjobs 2>/dev/null; systemctl start wantokjobs"

# Health check
HEALTHY=false
for i in 1 2 3 4 5; do
  sleep 3
  if ssh_cmd "curl -sf http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    HEALTHY=true; break
  fi
done

if [ "$HEALTHY" = true ]; then
  HEALTH=$(ssh_cmd "curl -sf http://127.0.0.1:3001/health")
  log "✅ Deploy complete!"
  echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
else
  log "❌ Health check FAILED — rolling back..."
  ssh_cmd "rm -f ${VPS_DB}-wal ${VPS_DB}-shm; cp ${VPS_DB}.pre-deploy-backup $VPS_DB 2>/dev/null; chown wantokjobs:wantokjobs $VPS_DB 2>/dev/null || true"
  ssh_cmd "cd $VPS_APP && git checkout HEAD~1 -- . && cd app && npm install --production 2>&1 | tail -2"
  ssh_cmd "cd $VPS_APP/app/client && npx vite build --outDir ../server/public 2>&1 | tail -3"
  ssh_cmd "systemctl reset-failed wantokjobs 2>/dev/null; systemctl start wantokjobs"
  sleep 5
  if ssh_cmd "curl -sf http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    log "✅ Rollback successful"
  else
    log "⚠️  ROLLBACK FAILED — manual intervention needed"
  fi
  exit 1
fi
