#!/bin/bash
# WantokJobs Auto-Deploy — Fully autonomous deploy pipeline
# Handles: code changes, DB sync, build, health check, rollback
set -euo pipefail

WORKSPACE="/data/.openclaw/workspace/data/wantok"
APP_DIR="$WORKSPACE/app"
VPS="root@76.13.190.157"
VPS_APP="/opt/wantokjobs"
VPS_DB="$VPS_APP/app/server/data/wantokjobs.db"
LOCAL_DB="$APP_DIR/server/data/wantokjobs.db"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
DB_TIMEOUT=30

log() { echo "[$(date '+%H:%M:%S')] $1"; }
ssh_cmd() { ssh $SSH_OPTS $VPS "$@"; }

# Run a node command with a timeout to prevent orphaned processes holding DB locks
node_with_timeout() {
  timeout "$DB_TIMEOUT" node "$@"
}

# Kill any orphaned node processes holding the local DB lock (NOT the main app)
kill_local_db_holders() {
  if command -v fuser >/dev/null 2>&1 && [ -f "$LOCAL_DB" ]; then
    fuser -k "$LOCAL_DB" 2>/dev/null || true
    fuser -k "${LOCAL_DB}-wal" 2>/dev/null || true
    fuser -k "${LOCAL_DB}-shm" 2>/dev/null || true
  fi
}

# Error trap — clean up temp files on any failure
cleanup() {
  rm -f /tmp/wantokjobs-deploy.db
}
trap cleanup EXIT

# ── Step 0: Check VPS reachability ──
if ! ssh_cmd "echo ok" >/dev/null 2>&1; then
  log "⚠️  VPS unreachable — skipping deploy"
  exit 0
fi

# ── Step 1: Check for code changes ──
cd "$WORKSPACE"
CODE_CHANGES=$(git status --porcelain -- . ':!app/server/data/wantokjobs.db*' | wc -l)

# ── Step 2: Check for DB changes (compare row counts) ──
DB_CHANGED=false
if [ -f "$LOCAL_DB" ]; then
  kill_local_db_holders
  LOCAL_JOBS=$(cd "$APP_DIR" && node_with_timeout -e "
    const db = require('./node_modules/better-sqlite3')('$LOCAL_DB', {readonly:true});
    console.log(db.prepare('SELECT COUNT(*) as c FROM jobs WHERE status=?').get('active').c);
    db.close();
  " 2>/dev/null || echo "0")
  
  VPS_JOBS=$(ssh_cmd "curl -sf http://127.0.0.1:3001/health 2>/dev/null | grep -o '\"jobs\":[0-9]*' | cut -d: -f2" 2>/dev/null || echo "0")
  
  if [ "$LOCAL_JOBS" != "$VPS_JOBS" ] && [ "$LOCAL_JOBS" != "0" ]; then
    DB_CHANGED=true
    log "📊 DB changed: local=$LOCAL_JOBS jobs, VPS=$VPS_JOBS jobs"
  fi
fi

# ── Step 3: Skip if nothing changed ──
if [ "$CODE_CHANGES" -eq 0 ] && [ "$DB_CHANGED" = false ]; then
  echo "No changes to deploy"
  exit 0
fi

log "📦 Found $CODE_CHANGES code changes, DB changed=$DB_CHANGED"

# ── Step 4: Build frontend locally (catches errors before touching VPS) ──
if [ "$CODE_CHANGES" -gt 0 ]; then
  log "🔨 Building frontend locally..."
  cd "$APP_DIR"
  if ! npm run build 2>&1 | tail -5; then
    log "❌ Build failed — NOT deploying"
    exit 1
  fi
  log "✅ Build passed"
  cd "$WORKSPACE"
fi

# ── Step 5: Commit and push code ──
if [ "$CODE_CHANGES" -gt 0 ]; then
  log "📤 Pushing to GitHub..."
  git add -A
  git commit -m "auto-deploy: $CODE_CHANGES files @ $TIMESTAMP" 2>/dev/null || true
  git push origin main 2>&1 | tail -3
fi

# ── Step 6: Backup VPS DB before any changes ──
log "💾 Backing up VPS database..."
ssh_cmd "cp $VPS_DB ${VPS_DB}.pre-deploy-backup 2>/dev/null || true"

# ── Step 7: Deploy code to VPS ──
if [ "$CODE_CHANGES" -gt 0 ]; then
  log "📥 Pulling code on VPS..."
  ssh_cmd "cd $VPS_APP && git stash 2>/dev/null; git pull origin main 2>&1 | tail -3"
  
  log "📦 Installing deps..."
  ssh_cmd "cd $VPS_APP/app && npm install --production 2>&1 | tail -3"
  
  log "🔨 Building frontend on VPS..."
  ssh_cmd "cd $VPS_APP/app/client && npm install 2>&1 | tail -1 && npx vite build --outDir ../server/public 2>&1 | tail -5"
fi

# ── Step 8: Sync DB (atomic — VACUUM INTO clean copy, remove stale WAL/SHM) ──
if [ "$DB_CHANGED" = true ]; then
  log "📊 Creating clean DB snapshot..."
  cd "$APP_DIR"
  rm -f /tmp/wantokjobs-deploy.db
  kill_local_db_holders
  node_with_timeout -e "
    const db = require('./node_modules/better-sqlite3')('$LOCAL_DB', {readonly:true});
    db.exec(\"VACUUM INTO '/tmp/wantokjobs-deploy.db'\");
    db.close();
    console.log('Clean snapshot created');
  "
  
  log "📊 Syncing database to VPS..."
  # Stop service to prevent WAL conflicts
  ssh_cmd "systemctl stop wantokjobs 2>/dev/null || true"
  sleep 1
  
  # Kill any orphaned node processes holding the VPS DB
  ssh_cmd "fuser -k $VPS_DB 2>/dev/null || true; fuser -k ${VPS_DB}-wal 2>/dev/null || true"
  sleep 1
  
  # Remove stale WAL/SHM files BEFORE replacing DB
  ssh_cmd "rm -f ${VPS_DB}-wal ${VPS_DB}-shm"
  
  # Transfer clean DB
  scp $SSH_OPTS /tmp/wantokjobs-deploy.db $VPS:$VPS_DB
  
  # Fix ownership
  ssh_cmd "chown wantokjobs:wantokjobs $VPS_DB 2>/dev/null || true"
  
  log "✅ Database synced"
fi

# ── Step 9: Restart service ──
log "🔄 Restarting service..."
ssh_cmd "systemctl reset-failed wantokjobs 2>/dev/null; systemctl start wantokjobs"

# ── Step 10: Health check (wait up to 30s) ──
log "⏳ Waiting for server..."
HEALTHY=false
for i in $(seq 1 10); do
  sleep 3
  if ssh_cmd "curl -sf http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
done

if [ "$HEALTHY" = true ]; then
  HEALTH=$(ssh_cmd "curl -sf http://127.0.0.1:3001/health")
  LIVE_JOBS=$(echo "$HEALTH" | grep -o '"jobs":[0-9]*' | cut -d: -f2)
  log "✅ Deploy complete — $LIVE_JOBS jobs live"
  log "🚀 $CODE_CHANGES code changes, DB synced=$DB_CHANGED @ $TIMESTAMP"
else
  log "❌ Health check FAILED after 30s — rolling back..."
  
  # Kill any orphaned processes on VPS before rollback
  ssh_cmd "systemctl stop wantokjobs 2>/dev/null || true"
  ssh_cmd "fuser -k $VPS_DB 2>/dev/null || true"
  sleep 1
  
  # Rollback DB
  ssh_cmd "rm -f ${VPS_DB}-wal ${VPS_DB}-shm; cp ${VPS_DB}.pre-deploy-backup $VPS_DB 2>/dev/null; chown wantokjobs:wantokjobs $VPS_DB 2>/dev/null || true"
  
  # Rollback code
  if [ "$CODE_CHANGES" -gt 0 ]; then
    ssh_cmd "cd $VPS_APP && git checkout HEAD~1 -- ."
    ssh_cmd "cd $VPS_APP/app && npm install --production 2>&1 | tail -2"
    ssh_cmd "cd $VPS_APP/app/client && npx vite build --outDir ../server/public 2>&1 | tail -3"
  fi
  
  ssh_cmd "systemctl reset-failed wantokjobs 2>/dev/null; systemctl start wantokjobs"
  sleep 5
  
  if ssh_cmd "curl -sf http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    log "✅ Rollback successful — server restored"
  else
    log "⚠️  ROLLBACK FAILED — manual intervention needed"
    log "⚠️  Check: ssh $VPS 'journalctl -u wantokjobs -n 50'"
  fi
  exit 1
fi
