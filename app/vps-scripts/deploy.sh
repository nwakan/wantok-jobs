#!/bin/bash
#═══════════════════════════════════════════════════════════════
# WantokJobs Deployment Script
# Pulls latest code, builds frontend, and restarts the server
#═══════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Configuration
REPO_DIR="/opt/wantokjobs/app"
LOCKFILE="/tmp/wantokjobs-deploy.lock"
LOGFILE="/var/log/wantokjobs-deploy.log"
MAX_LOG_LINES=1000

# Logging functions
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGFILE"
}

log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOGFILE" >&2
}

# Check if deployment is already running
if [ -f "$LOCKFILE" ]; then
  LOCK_PID=$(cat "$LOCKFILE")
  if ps -p "$LOCK_PID" > /dev/null 2>&1; then
    log_error "Deployment already in progress (PID: $LOCK_PID)"
    exit 1
  else
    log "Removing stale lockfile (PID $LOCK_PID no longer exists)"
    rm -f "$LOCKFILE"
  fi
fi

# Create lockfile
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

log "═══════════════════════════════════════════════════════"
log "Starting deployment"
log "═══════════════════════════════════════════════════════"

# Navigate to repo directory
cd "$REPO_DIR" || {
  log_error "Failed to navigate to $REPO_DIR"
  exit 1
}

# Stash any local changes
log "Stashing local changes..."
git stash push -m "Auto-stash before deploy $(date +%s)" 2>&1 | tee -a "$LOGFILE" || true

# Pull latest code
log "Pulling latest code from main branch..."
if ! git pull origin main 2>&1 | tee -a "$LOGFILE"; then
  log_error "Git pull failed"
  exit 1
fi

# Get latest commit info
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
log "Deployed commit: $COMMIT_HASH - $COMMIT_MSG"

# Install/update dependencies if package.json changed
if git diff HEAD@{1} HEAD --name-only | grep -q "package.json"; then
  log "package.json changed - updating server dependencies..."
  npm install --production 2>&1 | tee -a "$LOGFILE" || {
    log_error "npm install failed"
    exit 1
  }
fi

# Build frontend
log "Building frontend..."
cd client || {
  log_error "Failed to navigate to client directory"
  exit 1
}

# Update client dependencies if needed
if git diff HEAD@{1} HEAD --name-only | grep -q "client/package.json"; then
  log "client/package.json changed - updating frontend dependencies..."
  npm install 2>&1 | tee -a "$LOGFILE" || {
    log_error "npm install (client) failed"
    exit 1
  }
fi

# Run vite build
if ! npx vite build 2>&1 | tee -a "$LOGFILE"; then
  log_error "Frontend build failed"
  exit 1
fi

log "Frontend build complete"

# Return to repo root
cd "$REPO_DIR"

# Copy built files to server/public (if using Docker-style deployment)
if [ -d "server/public" ]; then
  log "Copying built files to server/public..."
  rm -rf server/public/*
  cp -r client/dist/* server/public/
  log "Files copied to server/public"
fi

# Restart the service
log "Restarting wantokjobs service..."
if ! systemctl restart wantokjobs; then
  log_error "Service restart failed"
  exit 1
fi

# Wait for service to be active
sleep 3

# Check service status
if systemctl is-active --quiet wantokjobs; then
  log "✓ Service restarted successfully"
else
  log_error "Service failed to start"
  systemctl status wantokjobs | tee -a "$LOGFILE"
  exit 1
fi

# Health check
log "Running health check..."
sleep 2
if curl -sf http://localhost:3001/health > /dev/null; then
  log "✓ Health check passed"
else
  log_error "Health check failed - service may not be responding"
fi

# Trim log file to prevent it from growing indefinitely
if [ -f "$LOGFILE" ]; then
  tail -n "$MAX_LOG_LINES" "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
fi

log "═══════════════════════════════════════════════════════"
log "Deployment completed successfully!"
log "Commit: $COMMIT_HASH"
log "═══════════════════════════════════════════════════════"

exit 0
